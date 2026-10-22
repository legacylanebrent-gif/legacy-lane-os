import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { completeApprovedPosAttempt } from '../../shared/posPayment.ts';

// ─────────────────────────────────────────────
// resolvePaymentAttempt — Chapter 21 P1 PAYMENT VERIFICATION WORKFLOW.
// When a customer says "paid" but the provider result is PROCESSING/UNKNOWN,
// the answer is: DO NOT RELEASE → VERIFY THE MERCHANT RECORD (the Base44
// Payments dashboard — never the customer's phone/screenshot) → RESOLVE.
// Only the sale OPERATOR (or a platform admin) may resolve an ambiguous
// attempt. 'verified_approved' completes the order through the SAME shared
// path the webhook uses (so late webhook + merchant verification can never
// double-complete); 'merchant_declined'/'merchant_failed' resolve the attempt
// and unblock a safe retry; 'still_unknown' only records what was checked.
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { attempt_id, action, note, provider_ref } = body;
    if (!attempt_id || !action) {
      return Response.json({ error: 'attempt_id and action are required' }, { status: 400 });
    }

    const attempts = await base44.asServiceRole.entities.PaymentAttempt.filter({ id: attempt_id });
    const attempt = attempts[0];
    if (!attempt) return Response.json({ error: 'Payment attempt not found' }, { status: 404 });

    // Authority: consequential financial action — operator of the sale or admin.
    const isAdmin = user.role === 'admin';
    const isOperator = attempt.operator_id === user.id;
    if (!isAdmin && !isOperator) {
      return Response.json({ error: 'Only the sale operator (or an admin) may resolve an ambiguous payment attempt. Verify with the merchant record first.' }, { status: 403 });
    }

    if (attempt.status === 'APPROVED') {
      return Response.json({ error: 'This attempt is already APPROVED — no resolution needed.', status: attempt.status, order_id: attempt.order_id || null }, { status: 409 });
    }

    if (action === 'verified_approved') {
      // The operator verified the merchant record shows a completed charge.
      // Complete through the shared path — idempotent, availability-guarded,
      // duplicate-success detecting.
      const cartRows = await base44.asServiceRole.entities.Cart.filter({ id: attempt.cart_id });
      const cart = cartRows[0] || null;
      let buyerName = 'Customer';
      if (cart) {
        try {
          const buyerRows = await base44.asServiceRole.entities.User.filter({ id: cart.user_id });
          if (buyerRows[0]?.full_name) buyerName = buyerRows[0].full_name;
        } catch (e) {
          console.error('[resolvePaymentAttempt] buyer name lookup failed:', e.message);
        }
      }
      const result = await completeApprovedPosAttempt(base44.asServiceRole, {
        attempt,
        cart,
        buyerName,
        providerRefs: { provider_payment_ref: provider_ref || null },
        resolutionVia: 'merchant_verification',
        resolvedBy: { id: user.id, name: user.full_name || '' },
        resolutionNote: note || null,
      });
      console.log(`[resolvePaymentAttempt] attempt ${attempt_id} verified-approved by ${user.id}: ${result.result}`);
      return Response.json({ success: true, ...result });
    }

    if (action === 'merchant_declined' || action === 'merchant_failed') {
      const status = action === 'merchant_declined' ? 'DECLINED' : 'FAILED';
      await base44.asServiceRole.entities.PaymentAttempt.update(attempt.id, {
        status,
        failure_info: `Operator verified with the merchant record: ${status.toLowerCase()}.`,
        resolution_via: 'merchant_verification',
        resolution_note: note || null,
        resolved_by: user.id,
        resolved_by_name: user.full_name || '',
        resolved_at: new Date().toISOString(),
      });
      console.log(`[resolvePaymentAttempt] attempt ${attempt_id} resolved ${status} by ${user.id}`);
      return Response.json({ success: true, status, message: `Attempt marked ${status}. A new payment attempt may now be started.` });
    }

    if (action === 'still_unknown') {
      // UNKNOWN IS DATA: the operator checked, it is still ambiguous. Record the
      // check; the attempt stays UNKNOWN and still blocks release/retry.
      await base44.asServiceRole.entities.PaymentAttempt.update(attempt.id, {
        resolution_note: `[${new Date().toISOString()}] ${user.full_name || user.id}: checked the merchant record — still unresolved. ${note || ''}`.trim(),
      });
      return Response.json({ success: true, status: 'UNKNOWN', message: 'Attempt remains UNKNOWN — checked and noted.' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('resolvePaymentAttempt error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});