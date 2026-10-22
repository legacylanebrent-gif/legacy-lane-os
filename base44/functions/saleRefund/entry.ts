import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// saleRefund — Chapter 21 P1 REFUND RECORD (the app's refund truth).
// EstateSalen RECORDS refunds; it does not EXECUTE provider refunds — the
// provider action happens in the merchant's payment dashboard and its result
// is recorded here. A refund is ALWAYS linked to its original Order (and the
// canonical PaymentAttempt when one exists) — never a disconnected negative
// sale. Authority: the sale OPERATOR or a platform admin (backend-enforced —
// a sale-team member cannot record a refund). Recording a refund NEVER
// changes Item status: financial reversal is not physical return.
// ─────────────────────────────────────────────

// Chapter 21 — sensitive-data guardrail: refuse card numbers / CVV-style
// secrets in ordinary text fields. Never store full card numbers or CVV.
function containsSensitivePaymentData(...texts) {
  const joined = texts.filter(Boolean).join(' \n ');
  if (/\d[\d\s-]{12,18}\d/.test(joined.replace(/[^\d\s-]/g, ' '))) return true; // 13-19 digit runs
  if (/\b(?:cvv|cvc|security\s*code|card\s*number|full\s*card)\b/i.test(joined)) return true;
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      order_id, amount, refund_type, refund_method, reason,
      status, provider_ref, notes, item_consequence, requested_by_name,
    } = body;

    if (!order_id || typeof amount !== 'number' || amount <= 0) {
      return Response.json({ error: 'order_id and a positive amount are required' }, { status: 400 });
    }
    if (containsSensitivePaymentData(reason, notes, item_consequence, provider_ref)) {
      return Response.json({ error: 'Refund text may not contain card numbers, CVV, or security codes. Never record card details — use the provider reference instead.' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders[0];
    if (!order) return Response.json({ error: 'Original order not found — a refund never floats free of its transaction.' }, { status: 404 });

    // Derive sale ownership for authority (sale_id first, legacy fallback via item).
    let sale = null;
    if (order.sale_id) {
      const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: order.sale_id });
      sale = sales[0] || null;
    }
    if (!sale) {
      const firstItemId = (order.items || []).map((ci) => ci.item_id).find(Boolean);
      if (firstItemId) {
        const items = await base44.asServiceRole.entities.Item.filter({ id: firstItemId });
        if (items[0]?.estate_sale_id) {
          const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: items[0].estate_sale_id });
          sale = sales[0] || null;
        }
      }
    }

    const isAdmin = user.role === 'admin';
    const isOperator = sale && sale.operator_id === user.id;
    if (!isAdmin && !isOperator) {
      return Response.json({ error: 'Only the sale operator (or an admin) may record a refund.' }, { status: 403 });
    }

    // Never over-refund: sum of live refunds may not exceed the original total.
    const existing = await base44.asServiceRole.entities.SaleRefund.filter({ order_id });
    const already = (existing || []).filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    if (already + amount > (Number(order.total) || 0) + 0.001) {
      return Response.json({ error: `Refund would exceed the original order. Already refunded: $${already.toFixed(2)} of $${Number(order.total).toFixed(2)}.` }, { status: 400 });
    }

    // Link the canonical APPROVED attempt when one exists (provider evidence chain).
    let payment_attempt_id = null;
    try {
      const attempts = await base44.asServiceRole.entities.PaymentAttempt.filter({ order_id });
      const approved = (attempts || []).find((a) => a.status === 'APPROVED') || (attempts || [])[0] || null;
      payment_attempt_id = approved ? approved.id : null;
    } catch (e) {
      console.error('[saleRefund] attempt lookup failed:', e.message);
    }

    const refund = await base44.asServiceRole.entities.SaleRefund.create({
      sale_id: sale ? sale.id : (order.sale_id || ''),
      operator_id: sale ? sale.operator_id : '',
      company_id: sale?.company_id || null,
      sale_team_ids: sale ? (sale.sale_team || []) : [],
      order_id,
      payment_attempt_id,
      amount,
      refund_type: refund_type === 'FULL' ? 'FULL' : 'PARTIAL',
      refund_method: refund_method || 'other',
      reason: reason || '',
      provider: 'base44_payments',
      provider_ref: provider_ref || null,
      status: ['RECORDED', 'PROVIDER_PENDING', 'PROVIDER_COMPLETED', 'CANCELLED'].includes(status) ? status : 'RECORDED',
      requested_by_name: requested_by_name || null,
      authorized_by: user.id,
      authorized_by_name: user.full_name || '',
      item_consequence: item_consequence || null,
      notes: notes || null,
      refunded_at: new Date().toISOString(),
    });

    console.log(`[saleRefund] ${refund.id} recorded by ${user.id} against order ${order_id}: $${amount}`);

    // Doctrine reminder in the response: financial reversal is not physical return.
    return Response.json({
      success: true,
      refund_id: refund.id,
      already_refunded: Number((already + amount).toFixed(2)),
      order_total: Number(order.total) || 0,
      reminder: 'A refund record NEVER changes Item status. If merchandise returns to sellable, that is an explicit operator decision about custody and policy.',
    });
  } catch (error) {
    console.error('saleRefund error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});