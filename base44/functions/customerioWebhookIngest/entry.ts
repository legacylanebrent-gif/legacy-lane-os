import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────
// Customer.io Reporting Webhook Ingest
// Receives real-time message activity events from Customer.io
// Docs: https://customer.io/docs/cdp/sources/reporting-webhooks/
// ─────────────────────────────────────────────

const EVENT_MAP = {
  sent: 'email_sent',
  delivered: 'email_delivered',
  opened: 'email_opened',
  human_opened: 'email_human_opened',
  clicked: 'email_clicked',
  human_clicked: 'email_human_clicked',
  converted: 'email_converted',
  bounced: 'email_bounced',
  dropped: 'email_failed',
  failed: 'email_failed',
  spammed: 'email_spam_complaint',
  unsubscribed: 'email_unsubscribed',
  suppressed: 'email_suppressed',
};

// Validate webhook signature (HMAC-SHA256)
async function validateWebhookSignature(bodyText, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(bodyText);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  // Customer.io sends signature as hex
  const sigBytes = new Uint8Array(signatureHeader.match(/.{1,2}/g).map(b => parseInt(b, 16)));
  return crypto.subtle.verify('HMAC', cryptoKey, sigBytes, messageData);
}

// Extract tracking params from a URL
function extractTrackingParams(url) {
  if (!url) return {};
  try {
    const u = new URL(url);
    return {
      ll_operator_id: u.searchParams.get('ll_operator_id') || null,
      ll_sale_id: u.searchParams.get('ll_sale_id') || null,
      ll_territory_id: u.searchParams.get('ll_territory_id') || null,
      ll_campaign: u.searchParams.get('ll_campaign') || null,
    };
  } catch {
    return {};
  }
}

// Classify link type from URL
function classifyLink(url) {
  if (!url) return 'unknown';
  if (/maps|directions|google\.com\/maps/i.test(url)) return 'directions';
  if (/EstateSaleDetail|sale-detail/i.test(url)) return 'sale_page';
  if (/gallery|images|photos/i.test(url)) return 'image_gallery';
  if (/save|watchlist|favorite/i.test(url)) return 'save_sale';
  if (/share/i.test(url)) return 'share';
  return 'other';
}

// Calculate interest score from aggregated stats
function calculateInterestScore(stats) {
  const {
    human_opened = 0, human_clicked = 0, direction_clicks = 0,
    save_clicks = 0, repeat_clicks = 0, vip_clicks = 0,
    final_day_clicks = 0, delivered = 0
  } = stats;

  if (delivered === 0) return 0;

  let raw = 0;
  raw += human_opened * 2;
  raw += human_clicked * 5;
  raw += direction_clicks * 10;
  raw += save_clicks * 8;
  raw += repeat_clicks * 4;
  raw += vip_clicks * 6;
  raw += final_day_clicks * 3;

  // Normalize: assume 100 delivered, perfect engagement would be ~100+ points
  const max = delivered * 10;
  return Math.min(100, Math.round((raw / Math.max(max, 1)) * 100));
}

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const bodyText = await req.text();
  const webhookSecret = Deno.env.get('CUSTOMERIO_WEBHOOK_SIGNING_SECRET') || '';
  const enabled = Deno.env.get('CUSTOMERIO_ENABLED') === 'true';

  // Signature validation
  if (webhookSecret) {
    const sigHeader = req.headers.get('x-cio-signature') || req.headers.get('x-customerio-signature') || '';
    const isValid = await validateWebhookSignature(bodyText, sigHeader, webhookSecret).catch(() => false);
    if (!isValid) {
      console.warn('[CustomerIO Webhook] Invalid signature — rejecting request');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (enabled) {
    // Secret not set but enabled — log warning but allow (for initial setup)
    console.warn('[CustomerIO Webhook] CUSTOMERIO_WEBHOOK_SIGNING_SECRET not set. Consider setting it for security.');
  }

  // Parse body
  let events = [];
  try {
    const parsed = JSON.parse(bodyText);
    // Customer.io sends either a single event object or array
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error('[CustomerIO Webhook] Failed to parse JSON:', err.message);
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Return 200 immediately — process async
  const base44 = createClientFromRequest(req);

  // Process each event
  const results = [];
  for (const rawEvent of events) {
    let mappingStatus = 'unmapped';
    let processingStatus = 'received';
    let errorMessage = null;
    let consumerUserId = null;
    let operatorId = null;
    let saleId = null;
    let territoryId = null;

    try {
      const rawType = rawEvent.event_type || rawEvent.type || rawEvent.metric || '';
      const normalizedType = EVENT_MAP[rawType] || null;
      const eventTs = rawEvent.timestamp
        ? new Date(rawEvent.timestamp * 1000).toISOString()
        : new Date().toISOString();

      // Extract identifiers from payload
      const email = rawEvent.data?.identifiers?.email
        || rawEvent.data?.customer_id
        || rawEvent.customer_email
        || rawEvent.email
        || null;

      const cioCustomerId = rawEvent.data?.customer_id || rawEvent.customer_id || null;

      // Extract URL for click events
      const linkUrl = rawEvent.data?.href
        || rawEvent.data?.link_url
        || rawEvent.href
        || null;

      const trackingParams = extractTrackingParams(linkUrl);
      const linkType = classifyLink(linkUrl);

      // Extract campaign metadata from payload
      const campaignId = rawEvent.data?.campaign_id || rawEvent.campaign_id || trackingParams.ll_campaign || null;
      const campaignName = rawEvent.data?.campaign_name || rawEvent.campaign_name || null;
      const deliveryId = rawEvent.data?.delivery_id || rawEvent.delivery_id || null;
      const messageId = rawEvent.data?.message_id || rawEvent.message_id || null;
      const actionId = rawEvent.data?.action_id || rawEvent.action_id || null;

      // Extract embedded metadata from sale event payloads
      const embeddedMetadata = rawEvent.data?.properties || rawEvent.properties || {};
      saleId = embeddedMetadata.sale_id || trackingParams.ll_sale_id || rawEvent.sale_id || null;
      operatorId = embeddedMetadata.operator_id || trackingParams.ll_operator_id || rawEvent.operator_id || null;
      territoryId = embeddedMetadata.territory_id || trackingParams.ll_territory_id || rawEvent.territory_id || null;
      consumerUserId = embeddedMetadata.consumer_user_id || rawEvent.consumer_user_id || null;

      // Try to resolve consumer from email or CIO ID
      if (email && !consumerUserId) {
        const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email }).catch(() => []);
        if (profiles[0]) consumerUserId = profiles[0].user_id;
      }

      // Try to resolve sale → operator → territory if missing
      if (saleId && (!operatorId || !territoryId)) {
        const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId }).catch(() => []);
        if (sales[0]) {
          operatorId = operatorId || sales[0].operator_id;
        }
      }

      // Determine mapping status
      const hasConsumer = !!(email || consumerUserId);
      const hasSale = !!saleId;
      const hasOperator = !!operatorId;

      if (!normalizedType) {
        mappingStatus = 'unmapped';
      } else if (hasConsumer && hasOperator && hasSale) {
        mappingStatus = 'mapped';
      } else if (hasConsumer || hasOperator) {
        mappingStatus = 'partially_mapped';
      } else {
        mappingStatus = 'unmapped';
      }

      // ── Suppression / unsubscribe handling ──
      if (normalizedType === 'email_unsubscribed' && email) {
        const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email }).catch(() => []);
        if (profiles[0]) {
          // If no operator context, treat as global unsubscribe
          if (!operatorId) {
            await base44.asServiceRole.entities.ConsumerMarketingProfile.update(profiles[0].id, {
              global_marketing_opt_in: false,
              suppression_status: 'unsubscribed_all',
              updated_at: new Date().toISOString(),
            });
          } else {
            // Operator-scoped unsubscribe only
            const subs = await base44.asServiceRole.entities.OperatorFollowerSubscription.filter({ consumer_email: email, operator_id: operatorId }).catch(() => []);
            if (subs[0]) {
              await base44.asServiceRole.entities.OperatorFollowerSubscription.update(subs[0].id, {
                subscription_status: 'unsubscribed',
                unsubscribed_at: new Date().toISOString(),
                unsubscribe_reason: 'customerio_webhook',
              });
            }
          }
        }
      }

      if (['email_bounced', 'email_spam_complaint', 'email_suppressed'].includes(normalizedType) && email) {
        const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email }).catch(() => []);
        if (profiles[0]) {
          const suppressionStatus = normalizedType === 'email_bounced' ? 'bounced'
            : normalizedType === 'email_spam_complaint' ? 'complained' : 'suppressed';
          await base44.asServiceRole.entities.ConsumerMarketingProfile.update(profiles[0].id, {
            suppression_status: suppressionStatus,
            global_marketing_opt_in: false,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Build geo/device from payload
      const geo = rawEvent.data?.geo || {};
      const device = rawEvent.data?.device || {};

      // Store engagement log
      await base44.asServiceRole.entities.MarketingEngagementLog.create({
        provider: 'customerio',
        raw_event_type: rawType,
        normalized_event_type: normalizedType || rawType,
        event_timestamp: eventTs,
        customerio_delivery_id: deliveryId,
        customerio_campaign_id: campaignId,
        customerio_campaign_name: campaignName,
        customerio_message_id: messageId,
        customerio_action_id: actionId,
        consumer_user_id: consumerUserId,
        consumer_email: email,
        operator_id: operatorId,
        sale_id: saleId,
        territory_id: territoryId,
        link_url: linkUrl,
        link_text: rawEvent.data?.link_text || null,
        user_agent: device.user_agent || rawEvent.data?.user_agent || null,
        ip_address: geo.ip_address || rawEvent.data?.ip_address || null,
        device_type: device.type || null,
        city: geo.city || null,
        state: geo.state || null,
        zip_code: geo.zip || null,
        metadata_json: { link_type: linkType, tracking_params: trackingParams, embedded: embeddedMetadata },
        raw_payload_json: rawEvent,
        mapping_status: mappingStatus,
        processing_status: 'processed',
        created_at: new Date().toISOString(),
      });

      processingStatus = 'processed';
      results.push({ raw_type: rawType, normalized: normalizedType, mapping: mappingStatus, email });
    } catch (err) {
      errorMessage = err.message;
      processingStatus = 'failed';
      console.error('[CustomerIO Webhook] Processing error:', err.message);
      results.push({ error: err.message, raw: rawEvent?.event_type });
      // Store failed event for admin review
      await base44.asServiceRole.entities.MarketingEngagementLog.create({
        provider: 'customerio',
        raw_event_type: rawEvent?.event_type || 'unknown',
        normalized_event_type: null,
        raw_payload_json: rawEvent,
        mapping_status: 'failed',
        processing_status: 'failed',
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  return Response.json({ received: events.length, processed: results.length, results });
});