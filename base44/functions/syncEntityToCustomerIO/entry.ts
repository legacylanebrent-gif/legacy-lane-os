import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// syncEntityToCustomerIO
// Entity automation bridge: receives entity create/update events
// and fires the appropriate Customer.io identify/track events.
// Inlines Customer.io API calls to avoid function-to-function auth issues.
// ─────────────────────────────────────────────

function getCustomerIoConfig() {
  const enabled = Deno.env.get('CUSTOMERIO_ENABLED') === 'true';
  const pipelinesWriteKey = Deno.env.get('CUSTOMERIO_API_KEY') || '';
  const configured = enabled && !!pipelinesWriteKey;
  return { enabled, configured, pipelinesWriteKey };
}

// Direct Customer.io Pipelines API: identify a person
async function cioIdentify(profile, config) {
  if (!config.configured) {
    console.log('[CIO SKIPPED] identify — not configured:', profile.email);
    return { skipped: true };
  }
  const payload = {
    userId: profile.user_id || profile.email,
    traits: {
      email: profile.email,
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      role: profile.role || 'consumer',
      subscription_tier: profile.subscription_tier || 'none',
      subscription_status: profile.subscription_status || 'none',
      zip_code: profile.zip_code || '',
      city: profile.city || '',
      state: profile.state || '',
      source: profile.source || 'entity_sync',
      updated_at: new Date().toISOString(),
    },
  };
  const res = await fetch('https://cdp.customer.io/v1/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CIO identify failed: ${res.status} — ${err}`);
  }
  return { sent: true };
}

// Direct Customer.io Pipelines API: track an event
async function cioTrack({ userId, email, eventName, data }, config) {
  if (!config.configured) {
    console.log(`[CIO SKIPPED] track — not configured: ${eventName}`);
    return { skipped: true };
  }
  const payload = {
    userId: userId || email,
    event: eventName,
    properties: { ...data, triggered_at: new Date().toISOString() },
  };
  const res = await fetch('https://cdp.customer.io/v1/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CIO track failed: ${res.status} — ${err}`);
  }
  return { sent: true };
}

// Log a marketing event to MarketingEventLog
async function logEvent(base44, { eventName, consumerUserId, consumerEmail, operatorId, saleId, payloadJson, status, errorMessage }) {
  try {
    await base44.asServiceRole.entities.MarketingEventLog.create({
      event_name: eventName,
      consumer_user_id: consumerUserId || null,
      consumer_email: consumerEmail || null,
      operator_id: operatorId || null,
      sale_id: saleId || null,
      payload_json: payloadJson || {},
      provider: 'customerio',
      provider_response: {},
      status: status || 'pending',
      error_message: errorMessage || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[syncEntityToCustomerIO] logEvent failed:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const eventType = body?.event?.type;
    const entityName = body?.event?.entity_name;
    const data = body?.data;
    const oldData = body?.old_data;
    const changedFields = body?.changed_fields || [];

    if (!entityName || !eventType) {
      return Response.json({ error: 'Missing event.entity_name or event.type' }, { status: 400 });
    }

    const config = getCustomerIoConfig();
    const results = [];

    const track = async ({ userId, email, eventName, data: evData, operatorId, saleId }) => {
      let status = 'sent', errorMessage = null;
      try {
        await cioTrack({ userId, email, eventName, data: evData }, config);
      } catch (err) {
        status = 'failed'; errorMessage = err.message;
      }
      await logEvent(base44, { eventName, consumerUserId: userId, consumerEmail: email, operatorId, saleId, payloadJson: evData, status, errorMessage });
      results.push({ event: eventName, status });
    };

    const identify = async (profile) => {
      let status = 'sent', errorMessage = null;
      try {
        await cioIdentify(profile, config);
      } catch (err) {
        status = 'failed'; errorMessage = err.message;
      }
      await logEvent(base44, { eventName: 'consumer.identified', consumerEmail: profile.email, payloadJson: profile, status, errorMessage });
      results.push({ action: 'identify', email: profile.email, status });
    };

    // Helper to get user info
    const getUser = async (userId) => {
      if (!userId) return null;
      try {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        return users[0] || null;
      } catch { return null; }
    };

    // ── EstateSale ──
    if (entityName === 'EstateSale') {
      if (eventType === 'create') {
        await track({
          userId: data?.operator_id,
          eventName: 'sale.created',
          data: {
            sale_id: data?.id,
            sale_title: data?.title,
            sale_city: data?.property_address?.city || '',
            sale_state: data?.property_address?.state || '',
            operator_id: data?.operator_id,
          },
          operatorId: data?.operator_id,
          saleId: data?.id,
        });
      } else if (eventType === 'update' && changedFields.includes('status')) {
        const newStatus = data?.status;
        const oldStatus = oldData?.status;
        if (newStatus === 'active' && oldStatus !== 'active') {
          await track({ userId: data?.operator_id, eventName: 'sale.approved', data: { sale_id: data?.id, sale_title: data?.title }, operatorId: data?.operator_id, saleId: data?.id });
        } else if (newStatus === 'completed' && oldStatus !== 'completed') {
          await track({ userId: data?.operator_id, eventName: 'sale.completed', data: { sale_id: data?.id }, operatorId: data?.operator_id, saleId: data?.id });
        } else {
          await track({ userId: data?.operator_id, eventName: 'sale.updated', data: { sale_id: data?.id, sale_title: data?.title, new_status: newStatus }, operatorId: data?.operator_id, saleId: data?.id });
        }
      }
    }

    // ── Item (inventory) ──
    if (entityName === 'Item' && eventType === 'create') {
      const user = await getUser(data?.seller_id);
      await track({
        userId: data?.seller_id,
        email: user?.email,
        eventName: 'item_uploaded',
        data: { item_title: data?.title, category: data?.category, price: data?.price, estate_sale_id: data?.estate_sale_id },
      });
    }

    // ── MarketplaceItem ──
    if (entityName === 'MarketplaceItem' && eventType === 'create') {
      await track({
        userId: data?.seller_id,
        eventName: 'item_uploaded',
        data: { item_title: data?.title, marketplace: true },
      });
    }

    // ── Connection (CRM contact created) ──
    if (entityName === 'Connection' && eventType === 'create') {
      await identify({
        user_id: data?.connected_user_id,
        email: data?.connected_user_email,
        source: 'crm_connection',
      });
      await track({
        userId: data?.account_owner_id,
        eventName: 'contact_created',
        data: { connected_user_email: data?.connected_user_email, connection_type: data?.connection_type },
      });
    }

    // ── CheckIn ──
    if (entityName === 'CheckIn' && eventType === 'create') {
      await track({
        userId: data?.user_id,
        eventName: 'sale_checked_in',
        data: { sale_id: data?.sale_id },
      });
    }

    // ── Offer ──
    if (entityName === 'Offer' && eventType === 'create') {
      await track({
        userId: data?.buyer_id,
        eventName: 'offer_received',
        data: { item_id: data?.item_id, offer_amount: data?.amount },
      });
    }

    // ── CoolFindStory published ──
    if (entityName === 'CoolFindStory' && eventType === 'update') {
      if (changedFields.includes('status') && data?.status === 'published') {
        await track({
          userId: data?.author_id,
          eventName: 'story_published',
          data: { story_title: data?.title, slug: data?.slug },
        });
      }
    }

    // ── Subscription created ──
    if (entityName === 'Subscription' && eventType === 'create') {
      const user = await getUser(data?.user_id);
      await identify({
        user_id: data?.user_id,
        email: user?.email,
        role: user?.primary_account_type,
        subscription_tier: data?.tier,
        subscription_status: data?.status,
        source: 'subscription_created',
      });
      await track({
        userId: data?.user_id,
        email: user?.email,
        eventName: 'subscription.activated',
        data: { tier: data?.tier, plan_type: data?.plan_type, price: data?.price },
      });
    }

    return Response.json({ success: true, entity: entityName, event: eventType, results });
  } catch (error) {
    console.error('syncEntityToCustomerIO error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});