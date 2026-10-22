import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Chapter 20 P1-20..P1-23 — the ONE sanctioned HOLD path for live-sale
 * merchandise. There is NO Hold entity: the Item remains the merchandise
 * truth (status 'reserved' + the hold detail block). A hold NEVER records
 * payment and never alters price — HOLD ≠ SOLD ≠ PAID ≠ RELEASED.
 *
 * Authority (enforced here, then again by Item RLS):
 *   create  — operator/seller/admin anywhere; a sale-team member may hold
 *             AVAILABLE non-HIGH_VALUE merchandise of their sale.
 *             HIGH_VALUE holds require the operator/seller/admin.
 *   extend  — operator/seller/admin only.
 *   clear   — active hold: operator/seller/admin or the hold's creator;
 *             EXPIRED hold: any of the above (it is no longer a commitment).
 *
 * Every action records a factual Activity note (who/what/when) — never a
 * payment, price, or legal claim.
 */
const logActivity = async (base44, { user, item, subject, description }) => {
  try {
    await base44.entities.Activity.create({
      user_id: user.id,
      sale_id: item.estate_sale_id || '',
      operator_id: item.operator_id || '',
      item_id: item.id,
      activity_type: 'note',
      subject,
      description,
      status: 'completed',
      completed_date: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('hold activity log failed:', (e && e.message) || e);
  }
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action; // create | clear | extend
    const itemId = body.item_id;
    if (!action || !itemId) {
      return Response.json({ error: 'action and item_id are required' }, { status: 400 });
    }

    const items = await base44.entities.Item.filter({ id: itemId }, { limit: 5 });
    const item = (Array.isArray(items) ? items : items.items || [])[0];
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    const priv = user.role === 'admin' || item.operator_id === user.id || item.seller_id === user.id;
    let team = false;
    if (!priv && item.estate_sale_id) {
      const sales = await base44.entities.EstateSale.filter({ id: item.estate_sale_id }, { limit: 1 });
      const sale = (Array.isArray(sales) ? sales : sales.items || [])[0];
      team = !!(sale && Array.isArray(sale.sale_team) && sale.sale_team.includes(user.id));
    }
    if (!priv && !team) {
      return Response.json({ error: 'You are not on this sale team' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const hold = item.hold && item.hold.created_at ? item.hold : null;
    const expired = !!(hold && hold.expires_at && hold.expires_at < now);

    if (action === 'create') {
      if (item.status !== 'available') {
        return Response.json({ error: `Item is ${item.status} — only AVAILABLE merchandise can be held.` }, { status: 409 });
      }
      if (hold) return Response.json({ error: 'This item is already held.' }, { status: 409 });
      if (item.inventory_level === 'HIGH_VALUE' && !priv) {
        return Response.json({ error: 'High-Value merchandise may only be held by the operator.' }, { status: 403 });
      }
      const minutes = body.expires_minutes ? Number(body.expires_minutes) : null;
      const expires_at = minutes && minutes > 0 ? new Date(Date.now() + minutes * 60000).toISOString() : null;
      const block = {
        held_by: user.id,
        held_by_name: user.full_name || user.email || '',
        buyer_name: String(body.buyer_name || '').slice(0, 120),
        buyer_contact: String(body.buyer_contact || '').slice(0, 120),
        reason: String(body.reason || '').slice(0, 300),
        created_at: now,
        expires_at,
      };
      await base44.entities.Item.update(item.id, { status: 'reserved', hold: block });
      await logActivity(base44, { user, item, subject: 'Hold created',
        description: `${user.full_name || user.email} held "${item.title}"${body.buyer_name ? ` for ${body.buyer_name}` : ''}${expires_at ? ` until ${expires_at}` : ' (no expiry)'}. No payment is recorded by a hold.` });
      return Response.json({ ok: true, item_id: item.id, hold: block });
    }

    if (action === 'clear') {
      if (!hold && item.status !== 'reserved' && item.status !== 'pending') {
        return Response.json({ error: 'No hold to clear on this item.' }, { status: 409 });
      }
      if (item.status === 'sold') {
        return Response.json({ error: 'Item is sold — there is no hold to clear.' }, { status: 409 });
      }
      const allowed = priv || expired || (hold && hold.held_by === user.id);
      if (!allowed) {
        return Response.json({ error: 'Only the operator or the hold creator can clear an active hold.' }, { status: 403 });
      }
      await base44.entities.Item.update(item.id, { status: 'available', hold: {} });
      await logActivity(base44, { user, item, subject: 'Hold cleared',
        description: `${user.full_name || user.email} cleared the hold on "${item.title}"${expired ? ' (it had expired)' : ''}. The item is AVAILABLE again. No payment was recorded.` });
      return Response.json({ ok: true, item_id: item.id, hold: null });
    }

    if (action === 'extend') {
      if (!hold) return Response.json({ error: 'No hold to extend on this item.' }, { status: 409 });
      if (!priv) {
        return Response.json({ error: 'Only the operator/seller/admin may extend a hold.' }, { status: 403 });
      }
      const minutes = body.expires_minutes ? Number(body.expires_minutes) : 60;
      const newExpiry = new Date(Date.now() + minutes * 60000).toISOString();
      const block = { ...hold, expires_at: newExpiry };
      await base44.entities.Item.update(item.id, { hold: block });
      await logActivity(base44, { user, item, subject: 'Hold extended',
        description: `${user.full_name || user.email} extended the hold on "${item.title}" until ${newExpiry}. No payment is recorded by a hold.` });
      return Response.json({ ok: true, item_id: item.id, hold: block });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('itemHold error:', error && error.message);
    return Response.json({ error: (error && error.message) || 'Server error' }, { status: 500 });
  }
}