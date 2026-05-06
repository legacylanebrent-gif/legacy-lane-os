import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────
// Customer.io Service Layer
// Legacy Lane OS — Marketing Automation Engine
// ─────────────────────────────────────────────
// Environment variables required (add when ready):
//   CUSTOMERIO_ENABLED=false
//   CUSTOMERIO_API_MODE=pipelines
//   CUSTOMERIO_PIPELINES_WRITE_KEY=
//   CUSTOMERIO_TRACK_SITE_ID=
//   CUSTOMERIO_TRACK_API_KEY=
//   CUSTOMERIO_APP_API_KEY=
//   CUSTOMERIO_REGION=us
//   CUSTOMERIO_WEBHOOK_SIGNING_SECRET=
//   CUSTOMERIO_DEFAULT_FROM_EMAIL=
//   CUSTOMERIO_DEFAULT_FROM_NAME=Legacy Lane Alerts
// ─────────────────────────────────────────────

function getCustomerIoConfig() {
  const enabled = Deno.env.get('CUSTOMERIO_ENABLED') === 'true';
  const apiMode = Deno.env.get('CUSTOMERIO_API_MODE') || 'pipelines';
  const region = Deno.env.get('CUSTOMERIO_REGION') || 'us';
  const pipelinesWriteKey = Deno.env.get('CUSTOMERIO_PIPELINES_WRITE_KEY') || '';
  const trackSiteId = Deno.env.get('CUSTOMERIO_TRACK_SITE_ID') || '';
  const trackApiKey = Deno.env.get('CUSTOMERIO_TRACK_API_KEY') || '';
  const appApiKey = Deno.env.get('CUSTOMERIO_APP_API_KEY') || '';
  const fromEmail = Deno.env.get('CUSTOMERIO_DEFAULT_FROM_EMAIL') || '';
  const fromName = Deno.env.get('CUSTOMERIO_DEFAULT_FROM_NAME') || 'Legacy Lane Alerts';

  const configured = enabled && (
    (apiMode === 'pipelines' && !!pipelinesWriteKey) ||
    (apiMode === 'track' && !!trackSiteId && !!trackApiKey)
  );

  return { enabled, configured, apiMode, region, pipelinesWriteKey, trackSiteId, trackApiKey, appApiKey, fromEmail, fromName };
}

function getPipelinesEndpoint(region) {
  return region === 'eu'
    ? 'https://cdp.customer.io/v1'
    : 'https://cdp.customer.io/v1';
}

function getTrackEndpoint(region) {
  return region === 'eu'
    ? 'https://track-eu.customer.io/api/v1'
    : 'https://track.customer.io/api/v1';
}

// Identify (create/update) a person in Customer.io
async function identifyConsumer(profile, config) {
  if (!config.configured) {
    console.log('[CustomerIO SKIPPED] identifyConsumer — not configured. Would identify:', profile.email);
    return { skipped: true, reason: 'not_configured' };
  }

  const payload = {
    userId: profile.user_id || profile.email,
    traits: {
      email: profile.email,
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      zip_code: profile.zip_code || '',
      city: profile.city || '',
      state: profile.state || '',
      preferred_radius_miles: profile.preferred_radius_miles || 25,
      global_marketing_opt_in: profile.global_marketing_opt_in ?? true,
      estate_sale_alerts_opt_in: profile.estate_sale_alerts_opt_in ?? true,
      vip_alerts_opt_in: profile.vip_alerts_opt_in ?? false,
      weekly_digest_opt_in: profile.weekly_digest_opt_in ?? false,
      followed_operator_ids: profile.followed_operator_ids || [],
      followed_operator_names: profile.followed_operator_names || [],
      active_operator_count: profile.active_operator_count || 0,
      source: profile.source || 'website_signup',
      updated_at: new Date().toISOString(),
    }
  };

  if (config.apiMode === 'pipelines') {
    const endpoint = `${getPipelinesEndpoint(config.region)}/identify`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Customer.io identify failed: ${res.status} — ${err}`);
    }
    return { sent: true, mode: 'pipelines' };
  } else {
    // Track API mode
    const endpoint = `${getTrackEndpoint(config.region)}/customers/${encodeURIComponent(payload.userId)}`;
    const auth = btoa(`${config.trackSiteId}:${config.trackApiKey}`);
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload.traits),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Customer.io identify (track) failed: ${res.status} — ${err}`);
    }
    return { sent: true, mode: 'track' };
  }
}

// Track an event in Customer.io
async function trackEvent({ userId, email, eventName, data }, config) {
  if (!config.configured) {
    console.log(`[CustomerIO SKIPPED] trackEvent — not configured. Event: ${eventName} for ${email}`);
    return { skipped: true, reason: 'not_configured' };
  }

  const resolvedUserId = userId || email;

  if (config.apiMode === 'pipelines') {
    const endpoint = `${getPipelinesEndpoint(config.region)}/track`;
    const payload = {
      userId: resolvedUserId,
      event: eventName,
      properties: {
        ...data,
        triggered_at: new Date().toISOString(),
      }
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Customer.io track event failed: ${res.status} — ${err}`);
    }
    return { sent: true, mode: 'pipelines', event: eventName };
  } else {
    const endpoint = `${getTrackEndpoint(config.region)}/customers/${encodeURIComponent(resolvedUserId)}/events`;
    const auth = btoa(`${config.trackSiteId}:${config.trackApiKey}`);
    const payload = {
      name: eventName,
      data: { ...data, triggered_at: new Date().toISOString() }
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Customer.io track event (track api) failed: ${res.status} — ${err}`);
    }
    return { sent: true, mode: 'track', event: eventName };
  }
}

// Helper to log events to the MarketingEventLog entity
async function logEvent(base44, { eventName, consumerUserId, consumerEmail, operatorId, saleId, payloadJson, status, errorMessage, providerResponse }) {
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
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, ...params } = body;

  const config = getCustomerIoConfig();

  // ── getConfig ──
  if (action === 'getConfig') {
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    return Response.json({
      enabled: config.enabled,
      configured: config.configured,
      apiMode: config.apiMode,
      region: config.region,
      fromName: config.fromName,
      hasCredentials: config.configured,
      status: config.configured ? 'connected' : 'not_configured',
    });
  }

  // ── testConnection ──
  if (action === 'testConnection') {
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!config.configured) {
      return Response.json({ success: false, message: 'Customer.io infrastructure is installed but credentials have not been added yet.', configured: false });
    }
    try {
      const testResult = await identifyConsumer({
        user_id: 'legacy_lane_test_user',
        email: 'test@legacylane-internal.com',
        first_name: 'Test',
        last_name: 'Connection',
        source: 'admin_added',
      }, config);
      await base44.asServiceRole.entities.MarketingIntegrationSettings.create({
        provider: 'customerio',
        enabled: config.enabled,
        status: 'connected',
        api_mode: config.apiMode,
        region: config.region,
        last_tested_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        updated_by: user.email,
      });
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
        await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email: profile.email }).then(async (rows) => {
          if (rows.length > 0) {
            await base44.asServiceRole.entities.ConsumerMarketingProfile.update(rows[0].id, { last_synced_to_customerio_at: new Date().toISOString() });
          }
        });
      }
    } catch (err) {
      status = 'failed'; errorMessage = err.message; result = { error: err.message };
    }
    await logEvent(base44, { eventName: 'consumer.identified', consumerEmail: profile.email, payloadJson: profile, status, errorMessage });
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
    await logEvent(base44, { eventName, consumerUserId: userId, consumerEmail: email, operatorId, saleId, payloadJson: data, status, errorMessage });
    return Response.json({ success: status !== 'failed', result });
  }

  // ── syncOperatorSubscription ──
  if (action === 'syncOperatorSubscription') {
    const { subscription, eventType } = params; // eventType: 'subscribed' | 'unsubscribed' | 'paused'
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

    let status = 'sent', errorMessage = null;
    try {
      const result = await trackEvent({
        userId: subscription.consumer_user_id,
        email: subscription.consumer_email,
        eventName,
        data: eventData,
      }, config);
      status = result.skipped ? 'skipped' : 'sent';
    } catch (err) {
      status = 'failed'; errorMessage = err.message;
    }

    // Update last_synced_to_customerio_at on subscription record
    if (subscription.id && status !== 'failed') {
      await base44.asServiceRole.entities.OperatorFollowerSubscription.update(subscription.id, {
        last_synced_to_customerio_at: new Date().toISOString(),
      });
    }

    await logEvent(base44, { eventName, consumerUserId: subscription.consumer_user_id, consumerEmail: subscription.consumer_email, operatorId: subscription.operator_id, payloadJson: eventData, status, errorMessage });
    return Response.json({ success: status !== 'failed' });
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

    // Create trigger record
    const trigger = await base44.asServiceRole.entities.SaleMarketingTrigger.create({
      sale_id: sale.id,
      operator_id: sale.operator_id,
      trigger_type: triggerType,
      customerio_event_name: customerioEventName,
      status: 'pending',
      payload_json: sale,
    });

    // Find eligible consumers: globally opted in + estate_sale_alerts + subscribed to this operator + not suppressed
    const subscribers = await base44.asServiceRole.entities.OperatorFollowerSubscription.filter({
      operator_id: sale.operator_id,
      subscription_status: 'active',
    });

    let sentCount = 0;
    for (const sub of subscribers) {
      // Check global opt-in
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
        sale_url: `https://legacylane.com/EstateSaleDetail?id=${sale.id}`,
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

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
});