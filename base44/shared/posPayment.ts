// Chapter 21 P0/P1 — SHARED POS PAYMENT COMPLETION PATH.
// The provider webhook AND the authorized merchant-verification resolver call
// the SAME function, so an approved payment always resolves identically.
//
// Doctrines enforced here:
// - P0-1: attempts are immutable history; a late webhook for attempt A still
//   resolves through A's provider reference after attempt B exists.
// - P0-3: webhook replays have zero additional financial effect.
// - P0-4: a late second success is PRESERVED and surfaced as a POSSIBLE
//   DUPLICATE PAYMENT exception — never silently discarded, never refunded.
// - P0-6/P0-7: canonical Item availability is re-checked at the write layer;
//   an approved payment whose merchandise is no longer available preserves the
//   payment success and raises a manager-resolution exception instead of
//   overwriting Item ownership.

export const UNRESOLVED_ATTEMPT_STATUSES = ['PROCESSING', 'UNKNOWN'];

export function releasedCount(item: any): number {
  return ((item && item.releases) || []).reduce((s: number, r: any) => s + (Number(r.quantity) || 0), 0);
}

export function remainingCount(item: any): number {
  return Math.max(0, (Number(item?.quantity) || 1) - releasedCount(item));
}

interface ProviderRefs {
  provider_order_id?: string;
  provider_payment_ref?: string;
  provider_event_id?: string;
  fee_amount?: number;
}

interface CompletionOpts {
  attempt: any | null;
  cart: any | null;
  buyerName: string;
  providerRefs: ProviderRefs;
  resolutionVia: 'webhook' | 'merchant_verification';
  resolvedBy?: { id: string; name: string } | null;
  resolutionNote?: string;
}

// Creates the operational/financial exception (SaleIssue reuse — there is no
// PaymentIncident entity).
async function raisePaymentIssue(
  base44: any,
  p: {
    sale_id: string; operator_id: string; sale_team_ids: string[];
    title: string; description: string;
  },
  sourceId?: string
): Promise<string> {
  const created = await base44.entities.SaleIssue.create({
    sale_id: p.sale_id,
    operator_id: p.operator_id,
    sale_team_ids: p.sale_team_ids || [],
    title: p.title,
    description: p.description,
    category: 'payment',
    urgency: 'IMPORTANT',
    status: 'OPEN',
    source_type: 'MANUAL',
    source_id: sourceId || null,
    source_label: 'Chapter 21 payment-truth exception',
  });
  return created.id;
}

export async function completeApprovedPosAttempt(
  base44: any, // a SERVICE-ROLE client (base44.asServiceRole)
  opts: CompletionOpts
): Promise<{ result: string; orderId?: string; issueId?: string; message: string }> {
  const { attempt, cart, buyerName, providerRefs, resolutionVia, resolvedBy, resolutionNote } = opts;

  // ── Idempotency (P0-3): this attempt already produced its financial effect.
  if (attempt && attempt.order_id && attempt.status === 'APPROVED') {
    return { result: 'already_completed', orderId: attempt.order_id, message: 'This payment already completed — replay ignored.' };
  }

  // ── Preserve the payment success on the attempt BEFORE anything else (P0-4/P0-5).
  if (attempt) {
    await base44.entities.PaymentAttempt.update(attempt.id, {
      status: 'APPROVED',
      provider_order_id: providerRefs.provider_order_id || attempt.provider_order_id || null,
      provider_payment_ref: providerRefs.provider_payment_ref || attempt.provider_payment_ref || null,
      provider_event_id: providerRefs.provider_event_id || attempt.provider_event_id || null,
      fee_amount: typeof providerRefs.fee_amount === 'number' ? providerRefs.fee_amount : attempt.fee_amount ?? null,
      resolution_via: resolutionVia,
      resolution_note: resolutionNote || attempt.resolution_note || null,
      resolved_by: resolvedBy?.id || attempt.resolved_by || null,
      resolved_by_name: resolvedBy?.name || attempt.resolved_by_name || null,
      resolved_at: new Date().toISOString(),
    });
  }

  const cartId = attempt ? attempt.cart_id : cart ? cart.id : null;
  if (!cartId) {
    return { result: 'cart_missing', message: 'No cart reference for this payment.' };
  }

  const saleId = attempt?.sale_id || '';
  const operatorId = attempt?.operator_id || '';
  const teamIds = attempt?.sale_team_ids || [];

  // ── P0-4 LATE SUCCESS: another attempt for the SAME cart already completed.
  // More than one successful payment for the same order is an EXCEPTION, not a
  // second sale. Preserve both provider facts; surface manager review.
  const cartAttempts = await base44.entities.PaymentAttempt.filter({ cart_id: cartId });
  const otherApproved = (cartAttempts || []).filter((a: any) => a.id !== attempt?.id && a.status === 'APPROVED');
  if (otherApproved.length > 0) {
    // Replay dedupe (P0-3): the same attempt's event raised its exception already.
    const existingIssues = await base44.entities.SaleIssue.filter({ source_id: attempt?.id || '', category: 'payment' });
    if ((existingIssues || []).length === 0) {
      const other = otherApproved[0];
      const issueId = await raisePaymentIssue(base44, {
        sale_id: saleId,
        operator_id: operatorId,
        sale_team_ids: teamIds,
        title: 'POSSIBLE DUPLICATE PAYMENT — manager review required',
        description:
          `Two payment attempts for the same cart were both approved by the provider.\n` +
          `Attempt 1: ${other.id} — session ${other.provider_session_id || '—'}${other.provider_order_id ? `, provider order ${other.provider_order_id}` : ''} — $${other.amount} (completed order ${(other.order_id || '—')}).\n` +
          `Attempt 2: ${attempt?.id || '—'} — session ${attempt?.provider_session_id || '—'}${providerRefs.provider_order_id ? `, provider order ${providerRefs.provider_order_id}` : ''} — $${attempt?.amount ?? '—'} (this approval).\n` +
          `The second charge is PRESERVED as provider truth but created NO duplicate Order and sold no merchandise twice. Check the payment dashboard (All Payments) and refund the extra charge there if confirmed; record the refund against the order.`,
      }, attempt?.id || '');
      return { result: 'duplicate_payment', issueId, message: 'Second approved payment preserved and surfaced as a possible duplicate payment.' };
    }
    return { result: 'duplicate_payment', message: 'Possible duplicate payment already surfaced for this attempt — replay ignored.' };
  }

  // ── Resolve the cart (fresh).
  let liveCart = cart;
  if (!liveCart) {
    const carts = await base44.entities.Cart.filter({ id: cartId });
    liveCart = carts[0] || null;
  }
  if (!liveCart) {
    if (saleId) {
      const issueId = await raisePaymentIssue(base44, {
        sale_id: saleId, operator_id: operatorId, sale_team_ids: teamIds,
        title: 'APPROVED payment — cart no longer available',
        description:
          `Payment attempt ${attempt?.id || '—'} (session ${attempt?.provider_session_id || '—'}) was APPROVED but its cart can no longer be found. ` +
          `The payment success is preserved on the attempt. Manager: verify the charge in the payment dashboard and resolve (record the order manually or refund).`,
      });
      return { result: 'cart_missing', issueId, message: 'Approved payment preserved; cart missing — exception raised.' };
    }
    return { result: 'cart_missing', message: 'Approved payment preserved on the attempt; cart missing.' };
  }

  // ── P0-6 DO-NOT-SELL GUARD at the write layer: re-check canonical availability.
  const itemIds = [...new Set((liveCart.items || []).map((ci: any) => ci.item_id).filter(Boolean))];
  const freshItems = await Promise.all(itemIds.map((id: string) => base44.entities.Item.filter({ id }).then((r: any) => r[0] || null).catch(() => null)));
  const unavailable = freshItems.filter((it: any) => it && it.status !== 'available');
  if (unavailable.length > 0) {
    const facts = unavailable
      .map((it: any) => `${it.title} (#${it.item_number ?? '—'}) is currently ${it.status}`)
      .join('; ');
    // Replay dedupe (P0-3): one exception per attempt, no stacking on redelivery.
    const existingConflicts = await base44.entities.SaleIssue.filter({ source_id: attempt?.id || '', category: 'payment' });
    if ((existingConflicts || []).length > 0) {
      return { result: 'item_conflict', message: 'Conflict already surfaced for this attempt — replay ignored.' };
    }
    const issueId = await raisePaymentIssue(base44, {
      sale_id: saleId, operator_id: operatorId, sale_team_ids: teamIds,
      title: 'PAYMENT/ITEM CONFLICT — approved charge but merchandise unavailable',
      description:
        `The provider APPROVED the payment (attempt ${attempt?.id || '—'}, session ${attempt?.provider_session_id || '—'}${providerRefs.provider_order_id ? `, provider order ${providerRefs.provider_order_id}` : ''}, $${attempt?.amount ?? liveCart.total}), ` +
        `but at completion: ${facts}. Item ownership was NOT overwritten and no Order was created. The payment success is preserved. ` +
        `Manager: resolve the charge in the payment dashboard (refund there if appropriate) and record it against the merchandise decision.`,
    }, attempt?.id || '');
    return { result: 'item_conflict', issueId, message: 'Payment preserved; merchandise unavailable — exception raised, no resale.' };
  }

  // ── Normal completion: Order (paid — the ONLY writer of online POS paid truth
  //    besides the cashier's offline completion), Item sold sync, attempt link, cart clear.
  const order = await base44.entities.Order.create({
    order_number: `POS-${Date.now()}`,
    buyer_id: liveCart.user_id,
    buyer_name: buyerName || 'Customer',
    items: liveCart.items,
    sale_id: saleId || null,
    subtotal: liveCart.total,
    total: liveCart.total,
    status: 'paid',
    payment_method: 'online',
    fulfillment_method: 'pickup',
    provider_order_id: providerRefs.provider_order_id || null,
  });

  for (const it of freshItems) {
    if (!it) continue;
    await base44.entities.Item.update(it.id, {
      status: 'sold',
      sold_date: new Date().toISOString(),
      buyer_name: buyerName || 'Customer',
      payment_method_used: 'online',
    });
  }

  if (attempt) {
    await base44.entities.PaymentAttempt.update(attempt.id, { order_id: order.id });
  }

  await base44.entities.Cart.delete(liveCart.id);

  return { result: 'completed', orderId: order.id, message: `Order ${order.order_number} completed.` };
}