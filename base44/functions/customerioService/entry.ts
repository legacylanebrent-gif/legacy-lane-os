import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────
// Customer.io Service Layer
// EstateSalen — Marketing Automation Engine
// Track API mode (matches Houszu Atlas cross-app standard)
// ─────────────────────────────────────────────
// Environment variables:
//   CUSTOMERIO_ENABLED=true
//   CUSTOMERIO_SITE_ID=          (Track API Site ID)
//   CUSTOMERIO_API_KEY=           (Track API Key)
//   CUSTOMERIO_APP_API_KEY=      (App API Key for messages/segments)
//   CUSTOMERIO_REGION=us|eu
//   CUSTOMERIO_WEBHOOK_KEY=       (shared secret for inbound webhooks)
//   CUSTOMERIO_DEFAULT_FROM_EMAIL=
//   CUSTOMERIO_DEFAULT_FROM_NAME=
// ─────────────────────────────────────────────

function getCustomerIoConfig() {
  const enabled = Deno.env.get('CUSTOMERIO_ENABLED') === 'true';
  const region = Deno.env.get('CUSTOMERIO_REGION') || 'us';
  const siteId = Deno.env.get('CUSTOMERIO_SITE_ID') || '';
  const apiKey = Deno.env.get('CUSTOMERIO_API_KEY') || '';
  const appApiKey = Deno.env.get('CUSTOMERIO_APP_API_KEY') || '';
  const fromEmail = Deno.env.get('CUSTOMERIO_DEFAULT_FROM_EMAIL') || '';
  const fromName = Deno.env.get('CUSTOMERIO_DEFAULT_FROM_NAME') || 'EstateSalen Alerts';

  const configured = enabled && !!siteId && !!apiKey;
  const baseUrl = region === 'eu' ? 'https://track-eu.customer.io' : 'https://track.customer.io';
  const appBaseUrl = region === 'eu' ? 'https://api-eu.customer.io' : 'https://api.customer.io';

  return { enabled, configured, region, siteId, apiKey, appApiKey, fromEmail, fromName, baseUrl, appBaseUrl };
}

function authHeader(config) {
  return 'Basic ' + btoa(config.siteId + ':' + config.apiKey);
}

function appAuthHeader(config) {
  return 'Bearer ' + config.appApiKey;
}

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : '';
}

function normalizePhone(phone) {
  if (!phone) return '';
  let c = phone.replace(/[^\d+]/g, '');
  if (c.length === 10) c = '+1' + c;
  if (!c.startsWith('+') && c.length === 11) c = '+' + c;
  return c;
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || (res.status !== 429 && res.status < 500)) return res;
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, (i + 1) * 1000));
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, (i + 1) * 500));
    }
  }
  return null;
}

// Identify (create/update) a person in Customer.io via Track API
// Uses PUT /api/v1/customers/{identifier} — creates the person immediately
async function identifyConsumer(profile, config) {
  if (!config.configured) {
    console.log('[CustomerIO SKIPPED] identifyConsumer — not configured. Would identify:', profile.email);
    return { skipped: true, reason: 'not_configured' };
  }

  const email = normalizeEmail(profile.email);
  if (!email) {
    return { skipped: true, reason: 'no_email' };
  }

  const identifier = email;
  const phone = normalizePhone(profile.phone);

  const attrs = {
    email,
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone: phone || '',
    // ── Role & Subscription ──
    role: profile.role || profile.primary_account_type || 'consumer',
    subscription_tier: profile.subscription_tier || 'none',
    subscription_status: profile.subscription_status || 'none',
    // ── Location ──
    zip_code: profile.zip_code || '',
    city: profile.city || '',
    state: profile.state || '',
    notification_radius_miles: profile.notification_radius_miles || profile.preferred_radius_miles || 25,
    // ── Notification Preferences ──
    estate_salen_marketing: profile.estate_salen_marketing ?? true,
    local_sale_notifications: profile.local_sale_notifications ?? true,
    company_direct_emails: profile.company_direct_emails ?? true,
    cool_finds_blog_email: profile.cool_finds_blog_email ?? false,
    cool_finds_blog_in_app: profile.cool_finds_blog_in_app ?? false,
    // ── Legacy opt-in flags ──
    global_marketing_opt_in: profile.global_marketing_opt_in ?? true,
    estate_sale_alerts_opt_in: profile.estate_sale_alerts_opt_in ?? true,
    vip_alerts_opt_in: profile.vip_alerts_opt_in ?? false,
    weekly_digest_opt_in: profile.weekly_digest_opt_in ?? false,
    // ── Favorite Companies ──
    followed_operator_ids: profile.followed_operator_ids || [],
    followed_operator_names: profile.followed_operator_names || [],
    active_operator_count: profile.active_operator_count || 0,
    source: profile.source || 'website_signup',
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const url = `${config.baseUrl}/api/v1/customers/${encodeURIComponent(identifier)}`;
  const res = await fetchWithRetry(url, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader(config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(attrs),
  });

  const responseText = res ? await res.text() : '';
  console.log(`[CustomerIO identify] status=${res?.status} identifier=${identifier} email=${email} response=${responseText}`);

  if (!res || !res.ok) {
    throw new Error(`Customer.io identify failed (${res?.status}): ${responseText}`);
  }

  return { sent: true, mode: 'track_api', httpStatus: res.status, identifier, response: responseText || '(empty)' };
}

// Track an event in Customer.io via Track API
// Uses POST /api/v1/customers/{identifier}/events
async function trackEvent({ userId, email, eventName, data }, config) {
  if (!config.configured) {
    console.log(`[CustomerIO SKIPPED] trackEvent — not configured. Event: ${eventName} for ${email}`);
    return { skipped: true, reason: 'not_configured' };
  }

  const normalizedEmail = normalizeEmail(email);
  const identifier = normalizedEmail || userId;
  if (!identifier) {
    return { skipped: true, reason: 'no_identifier' };
  }

  const url = `${config.baseUrl}/api/v1/customers/${encodeURIComponent(identifier)}/events`;
  const payload = {
    name: eventName,
    data: {
      ...data,
      triggered_at: new Date().toISOString(),
    },
  };

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = res ? await res.text() : '';
  console.log(`[CustomerIO track] status=${res?.status} identifier=${identifier} event=${eventName} response=${responseText}`);

  if (!res || !res.ok) {
    throw new Error(`Customer.io track event failed (${res?.status}): ${responseText}`);
  }

  return { sent: true, mode: 'track_api', event: eventName, identifier };
}

// Helper to log events to the MarketingEventLog entity
async function logEvent(base44, { eventName, consumerUserId, consumerEmail, operatorId, saleId, payloadJson, status, errorMessage, providerResponse }) {
  try {
    await base44.asServiceRole.entities.MarketingEventLog.create({
      event_name: eventName,
      consumer_user_id: consumerUserId || null,
      consumer_email: consumerEmail || null,
      operator_id: operatorId || null,
      sale_id: saleId || null,
      payload_json: payloadJson || {},
      provider: 'customerio',
      provider_response: providerResponse || {},
      status: status || 'pending',
      error_message: errorMessage || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[CustomerIO logEvent] failed to write MarketingEventLog:', e.message);
  }
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const rawBody = await req.text();
    let body;
    try { body = JSON.parse(rawBody); } catch { body = {}; }
    const { action, ...params } = body;

    const config = getCustomerIoConfig();

    // ── Inbound webhook from CustomerIO (signature-verified, no user auth) ──
    const webhookKey = Deno.env.get('CUSTOMERIO_WEBHOOK_KEY');
    const sigHeader = req.headers.get('x-customerio-signature');
    const queryKey = new URL(req.url).searchParams.get('key');
    if (webhookKey && (sigHeader || queryKey) && !action) {
      let valid = false;
      if (sigHeader) {
        const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(rawBody));
        const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        valid = sigHeader === expected;
      } else if (queryKey) {
        valid = queryKey === webhookKey;
      }
      if (!valid) return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });

      const event = body;
      const eventType = event.event_type || event.name || 'unknown';
      const contactIdentifier = event.data?.identifiers?.id || event.data?.email || event.recipient;

      // Try to find a ConsumerMarketingProfile matching this identifier
      let profile = null;
      if (contactIdentifier) {
        const normalizedEmail = normalizeEmail(contactIdentifier);
        const matches = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({
          $or: [{ email: normalizedEmail }, { customerio_id: contactIdentifier }],
        }, '-updated_date', 1);
        profile = matches[0];
      }
      if (profile) {
        await base44.asServiceRole.entities.MarketingEventLog.create({
          event_name: `customerio.${eventType}`,
          consumer_user_id: profile.user_id || null,
          consumer_email: profile.email || null,
          payload_json: event.data || {},
          provider: 'customerio',
          provider_response: event,
          status: 'received',
          created_at: new Date().toISOString(),
        });
      }
      return Response.json({ received: true });
    }

    // Admin-only actions require authenticated admin user
    const ADMIN_ONLY_ACTIONS = ['getConfig', 'testConnection', 'listSegments', 'getSegment', 'addCustomersToSegment', 'removeCustomersFromSegment'];
    let user = null;
    if (ADMIN_ONLY_ACTIONS.includes(action)) {
      try {
        user = await base44.auth.me();
      } catch { /* no user */ }
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── getConfig ──
    if (action === 'getConfig') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json({
        enabled: config.enabled,
        configured: config.configured,
        apiMode: 'track_api',
        region: config.region,
        fromName: config.fromName,
        hasCredentials: config.configured,
        status: config.configured ? 'connected' : 'not_configured',
      });
    }

    // ── testConnection ──
    if (action === 'testConnection') {
      if (!config.configured) {
        return Response.json({ success: false, message: 'Customer.io infrastructure is installed but credentials have not been added yet.', configured: false });
      }
      try {
        const testResult = await identifyConsumer({
          email: 'test@estatesalen-internal.com',
          first_name: 'Test',
          last_name: 'Connection',
          source: 'admin_test',
        }, config);
        try {
          await base44.asServiceRole.entities.MarketingIntegrationSettings.create({
            provider: 'customerio',
            enabled: config.enabled,
            status: 'connected',
            api_mode: 'track_api',
            region: config.region,
            last_tested_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            updated_by: user.email,
          });
        } catch (e) { console.error('[CustomerIO testConnection] settings log failed:', e.message); }
        return Response.json({ success: true, message: 'Customer.io connection successful!', result: testResult });
      } catch (err) {
        return Response.json({ success: false, message: err.message, configured: false });
      }
    }

    // ── identifyConsumer ──
    if (action === 'identifyConsumer') {
      const { profile } = params;
      if (!profile || !profile.email) return Response.json({ error: 'Missing profile.email' }, { status: 400 });
      let result, status = 'sent', errorMessage = null;
      try {
        result = await identifyConsumer(profile, config);
        status = result.skipped ? 'skipped' : 'sent';
        if (!result.skipped) {
          try {
            const rows = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email: normalizeEmail(profile.email) });
            if (rows.length > 0) {
              await base44.asServiceRole.entities.ConsumerMarketingProfile.update(rows[0].id, {
                last_synced_to_customerio_at: new Date().toISOString(),
                customerio_id: result.identifier,
              });
            }
          } catch (e) { console.error('[CustomerIO identifyConsumer] profile update failed:', e.message); }
        }
      } catch (err) {
        status = 'failed'; errorMessage = err.message; result = { error: err.message };
      }
      await logEvent(base44, { eventName: 'consumer.identified', consumerEmail: profile.email, payloadJson: profile, status, errorMessage, providerResponse: result });
      return Response.json({ success: status !== 'failed', result });
    }

    // ── trackEvent ──
    if (action === 'trackEvent') {
      const { userId, email, eventName, data, saleId, operatorId } = params;
      if (!eventName) return Response.json({ error: 'Missing eventName' }, { status: 400 });
      let result, status = 'sent', errorMessage = null;
      try {
        result = await trackEvent({ userId, email, eventName, data }, config);
        status = result.skipped ? 'skipped' : 'sent';
      } catch (err) {
        status = 'failed'; errorMessage = err.message; result = { error: err.message };
      }
      await logEvent(base44, { eventName, consumerUserId: userId, consumerEmail: email, operatorId, saleId, payloadJson: data, status, errorMessage, providerResponse: result });
      return Response.json({ success: status !== 'failed', result });
    }

    // ── syncOperatorSubscription ──
    if (action === 'syncOperatorSubscription') {
      const { subscription, eventType } = params;
      if (!subscription) return Response.json({ error: 'Missing subscription' }, { status: 400 });

      const eventName = eventType === 'unsubscribed'
        ? 'consumer.unsubscribed_from_operator'
        : eventType === 'paused'
          ? 'consumer.paused_operator_alerts'
          : 'consumer.subscribed_to_operator';

      const eventData = {
        operator_id: subscription.operator_id,
        operator_name: subscription.operator_name,
        subscription_status: subscription.subscription_status,
        alert_types: subscription.alert_types || [],
        triggered_at: new Date().toISOString(),
      };

      let status = 'sent', errorMessage = null, result = null;
      try {
        result = await trackEvent({
          userId: subscription.consumer_user_id,
          email: subscription.consumer_email,
          eventName,
          data: eventData,
        }, config);
        status = result.skipped ? 'skipped' : 'sent';
      } catch (err) {
        status = 'failed'; errorMessage = err.message;
      }

      if (subscription.id && status !== 'failed') {
        try {
          await base44.asServiceRole.entities.OperatorFollowerSubscription.update(subscription.id, {
            last_synced_to_customerio_at: new Date().toISOString(),
          });
        } catch (e) { console.error('[CustomerIO syncOperatorSubscription] sub update failed:', e.message); }
      }

      await logEvent(base44, { eventName, consumerUserId: subscription.consumer_user_id, consumerEmail: subscription.consumer_email, operatorId: subscription.operator_id, payloadJson: eventData, status, errorMessage, providerResponse: result });
      return Response.json({ success: status !== 'failed', result });
    }

    // ── syncSaleEvent ──
    if (action === 'syncSaleEvent') {
      const { sale, triggerType } = params;
      if (!sale || !triggerType) return Response.json({ error: 'Missing sale or triggerType' }, { status: 400 });

      const eventNameMap = {
        sale_created: 'sale.created',
        sale_updated: 'sale.updated',
        sale_approved: 'sale.approved',
        sale_reminder: 'sale.reminder_due',
        sale_final_day: 'sale.final_day',
        sale_cancelled: 'sale.cancelled',
      };
      const customerioEventName = eventNameMap[triggerType] || `sale.${triggerType}`;

      const trigger = await base44.asServiceRole.entities.SaleMarketingTrigger.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        trigger_type: triggerType,
        customerio_event_name: customerioEventName,
        status: 'pending',
        payload_json: sale,
      });

      const subscribers = await base44.asServiceRole.entities.OperatorFollowerSubscription.filter({
        operator_id: sale.operator_id,
        subscription_status: 'active',
      });

      let sentCount = 0;
      for (const sub of subscribers) {
        const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email: sub.consumer_email });
        const profile = profiles[0];
        if (!profile) continue;
        if (!profile.global_marketing_opt_in) continue;
        if (!profile.estate_sale_alerts_opt_in) continue;
        if (profile.suppression_status !== 'active') continue;

        const eventPayload = {
          operator_id: sale.operator_id,
          operator_name: sale.operator_name || '',
          sale_id: sale.id,
          sale_title: sale.title,
          sale_city: sale.property_address?.city || '',
          sale_state: sale.property_address?.state || '',
          sale_zip: sale.property_address?.zip || '',
          sale_start_date: sale.sale_dates?.[0]?.date || '',
          sale_end_date: sale.sale_dates?.[sale.sale_dates.length - 1]?.date || '',
          sale_url: `https://estatesalen.com/EstateSaleDetail?id=${sale.id}`,
          hero_image_url: sale.images?.[0]?.url || '',
          categories: sale.categories || [],
          triggered_at: new Date().toISOString(),
        };

        let evStatus = 'sent', evError = null;
        try {
          const res = await trackEvent({ userId: sub.consumer_user_id, email: sub.consumer_email, eventName: customerioEventName, data: eventPayload }, config);
          evStatus = res.skipped ? 'skipped' : 'sent';
          if (!res.skipped) sentCount++;
        } catch (err) {
          evStatus = 'failed'; evError = err.message;
        }

        await logEvent(base44, { eventName: customerioEventName, consumerUserId: sub.consumer_user_id, consumerEmail: sub.consumer_email, operatorId: sale.operator_id, saleId: sale.id, payloadJson: eventPayload, status: evStatus, errorMessage: evError });
      }

      await base44.asServiceRole.entities.SaleMarketingTrigger.update(trigger.id, {
        status: 'processed',
        processed_at: new Date().toISOString(),
        eligible_consumer_count: subscribers.length,
        events_sent_count: sentCount,
      });

      return Response.json({ success: true, triggerType, customerioEventName, eligible: subscribers.length, sent: sentCount });
    }

    // ── listSegments (App API — Bearer auth with App API Key) ──
    if (action === 'listSegments') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!config.appApiKey) return Response.json({ error: 'CUSTOMERIO_APP_API_KEY not configured' }, { status: 400 });
      try {
        const res = await fetch(`${config.appBaseUrl}/v1/segments?per=100`, {
          method: 'GET',
          headers: { 'Authorization': appAuthHeader(config) },
        });
        if (!res.ok) {
          const err = await res.text();
          return Response.json({ error: `Customer.io listSegments failed: ${res.status} — ${err}` }, { status: res.status });
        }
        const data = await res.json();
        return Response.json({ success: true, segments: data.segments || data || [] });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── getSegment ──
    if (action === 'getSegment') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { segmentId } = params;
      if (!segmentId) return Response.json({ error: 'Missing segmentId' }, { status: 400 });
      if (!config.appApiKey) return Response.json({ error: 'CUSTOMERIO_APP_API_KEY not configured' }, { status: 400 });
      try {
        const res = await fetch(`${config.appBaseUrl}/v1/segments/${segmentId}`, {
          method: 'GET',
          headers: { 'Authorization': appAuthHeader(config) },
        });
        if (!res.ok) {
          const err = await res.text();
          return Response.json({ error: `Customer.io getSegment failed: ${res.status} — ${err}` }, { status: res.status });
        }
        const data = await res.json();
        return Response.json({ success: true, segment: data });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── addCustomersToSegment (manual segments only) ──
    if (action === 'addCustomersToSegment') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { segmentId, customerIds } = params;
      if (!segmentId || !customerIds || !Array.isArray(customerIds)) return Response.json({ error: 'Missing segmentId or customerIds[]' }, { status: 400 });
      if (!config.appApiKey) return Response.json({ error: 'CUSTOMERIO_APP_API_KEY not configured' }, { status: 400 });
      try {
        const res = await fetch(`${config.appBaseUrl}/v1/segments/${segmentId}/add_customers`, {
          method: 'POST',
          headers: { 'Authorization': appAuthHeader(config), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: customerIds }),
        });
        if (!res.ok) {
          const err = await res.text();
          return Response.json({ error: `Customer.io addCustomersToSegment failed: ${res.status} — ${err}` }, { status: res.status });
        }
        return Response.json({ success: true, added: customerIds.length });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // ── removeCustomersFromSegment (manual segments only) ──
    if (action === 'removeCustomersFromSegment') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { segmentId, customerIds } = params;
      if (!segmentId || !customerIds || !Array.isArray(customerIds)) return Response.json({ error: 'Missing segmentId or customerIds[]' }, { status: 400 });
      if (!config.appApiKey) return Response.json({ error: 'CUSTOMERIO_APP_API_KEY not configured' }, { status: 400 });
      try {
        const res = await fetch(`${config.appBaseUrl}/v1/segments/${segmentId}/remove_customers`, {
          method: 'POST',
          headers: { 'Authorization': appAuthHeader(config), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: customerIds }),
        });
        if (!res.ok) {
          const err = await res.text();
          return Response.json({ error: `Customer.io removeCustomersFromSegment failed: ${res.status} — ${err}` }, { status: res.status });
        }
        return Response.json({ success: true, removed: customerIds.length });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[CustomerIO customerioService] unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});