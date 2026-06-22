import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import jwt from 'npm:jsonwebtoken@9.0.2';

// ─────────────────────────────────────────────
// wix-payments-webhook
// Handles Wix Payments ORDER_APPROVED webhook.
// When an operator purchases additional email profiles,
// adds 1,000 to their OperatorEmailQuota.additional_purchased.
// ─────────────────────────────────────────────

const PROFILES_PER_BLOCK = 1000;

Deno.serve(async (req) => {
  try {
    const publicKey = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
    if (!publicKey) {
      console.error('Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
      return new Response('Missing public key', { status: 500 });
    }

    const requestBody = await req.text();

    // Step 1: Verify JWT signature — fail closed
    let rawPayload;
    try {
      rawPayload = jwt.verify(requestBody, publicKey, { algorithms: ['RS256'] });
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return new Response('Invalid signature', { status: 401 });
    }

    // Step 2: Parse double-nested JSON
    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);

    // Step 3: Route by event type
    if (event.eventType === 'wix.ecom.v1.order_approved') {
      const order = eventData.actionEvent?.body?.order;
      if (!order) {
        console.error('No order in webhook payload');
        return new Response('OK', { status: 200 });
      }

      const checkoutId = order.checkoutId;
      if (!checkoutId) {
        console.error('No checkoutId in order');
        return new Response('OK', { status: 200 });
      }

      // Find the operator quota record with this pending checkout ID
      const base44 = createClientFromRequest(req);
      const quotaRecords = await base44.asServiceRole.entities.OperatorEmailQuota.filter({
        pending_checkout_id: checkoutId,
      });

      if (quotaRecords.length === 0) {
        console.log(`No quota record found for checkoutId: ${checkoutId}`);
        return new Response('OK', { status: 200 });
      }

      const quota = quotaRecords[0];

      // Add 1,000 additional profiles and clear the pending checkout
      await base44.asServiceRole.entities.OperatorEmailQuota.update(quota.id, {
        additional_purchased: quota.additional_purchased + PROFILES_PER_BLOCK,
        pending_checkout_id: null,
        last_purchase_at: new Date().toISOString(),
      });

      console.log(`Added ${PROFILES_PER_BLOCK} profiles to operator ${quota.operator_id}`);
      return new Response('OK', { status: 200 });
    }

    // Unhandled event type — acknowledge anyway
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('wix-payments-webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});