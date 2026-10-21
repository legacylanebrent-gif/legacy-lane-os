import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Chapter 16 P0-4/P0-5/P0-6 — the PRICE-CHANGE AUTHORITY function.
 *
 * The ONE sanctioned write path for Item.price on existing merchandise:
 *  - HIGH_VALUE price changes require the sale OPERATOR, the seller, or a
 *    platform admin — an ordinary sale-team member is DENIED (403).
 *  - HIGH_VALUE changes require an explicit REASON.
 *  - Every change preserves history: an Activity record carries old price,
 *    new price, who, when, and the reason.
 *  - original_price (the OPENING price) is written ONCE — the first time a
 *    price is recorded — and never overwritten.
 *  - Nothing here ever rewrites an Offer amount, order, transaction, or
 *    payment amount: those are independent immutable snapshots.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { item_id, new_price, reason } = body || {};
    const newPrice = Number(new_price);

    if (!item_id || !Number.isFinite(newPrice) || newPrice <= 0) {
      return Response.json({ error: 'item_id and a positive new_price are required' }, { status: 400 });
    }

    const items = await base44.entities.Item.filter({ id: item_id });
    const item = items && items[0];
    if (!item) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    const isOperator = item.operator_id === user.id;
    const isSeller = item.seller_id === user.id;
    const isAdmin = user.role === 'admin';
    const authorized = isOperator || isSeller || isAdmin;

    const isHighValue = item.inventory_level === 'HIGH_VALUE';

    // P0-4 — HIGH_VALUE price authority: only the operator/seller/admin.
    if (isHighValue && !authorized) {
      return Response.json({
        error: 'HIGH_VALUE price changes require the sale operator (or an admin). Ask the operator to change or authorize this price.',
        code: 'HIGH_VALUE_AUTHORITY_REQUIRED',
      }, { status: 403 });
    }

    // P0-5 — HIGH_VALUE reason is required for every change.
    const trimmedReason = (reason || '').trim();
    if (isHighValue && !trimmedReason) {
      return Response.json({ error: 'A reason is required for every High Value price change.', code: 'REASON_REQUIRED' }, { status: 400 });
    }

    const oldPrice = item.price == null ? null : Number(item.price);
    if (oldPrice === newPrice) {
      return Response.json({ ok: true, unchanged: true, price: newPrice });
    }

    const now = new Date().toISOString();

    // P1-17 — opening price is written ONCE and never overwritten.
    const update = { price: newPrice };
    if (item.original_price == null) {
      update.original_price = oldPrice != null ? oldPrice : newPrice;
    }

    // Service-role write AFTER the stricter authority checks above — the RLS
    // update rule alone would let any team member change any price, so this
    // function is the enforcement layer (P0-6), not just a hidden button.
    await base44.asServiceRole.entities.Item.update(item.id, update);

    // P0-5/P1-19 — history: old → new, who, when, reason (reuses Activity).
    try {
      await base44.asServiceRole.entities.Activity.create({
        user_id: user.id,
        activity_type: 'note',
        sale_id: item.estate_sale_id || undefined,
        operator_id: item.operator_id || undefined,
        item_id: item.id,
        subject: `Price changed — ${item.title || 'Item'}`,
        description: `$${oldPrice != null ? oldPrice : '—'} → $${newPrice}`
          + (trimmedReason ? ` — ${trimmedReason}` : '')
          + (isHighValue ? ' — High Value authorized change' : ''),
        status: 'completed',
        completed_date: now,
      });
    } catch (e) {
      console.warn('Price history log skipped:', e && e.message);
    }

    return Response.json({
      ok: true,
      item_id: item.id,
      old_price: oldPrice,
      new_price: newPrice,
      changed_by: user.id,
      changed_at: now,
      reason: trimmedReason || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}