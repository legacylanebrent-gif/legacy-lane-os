// saleEntitlementAdmin — admin lifecycle control for paid sale entitlements.
// Refund, dispute, revocation and reactivation are deliberate human actions with
// full audit history. Retiring an entitlement never deletes a sale, its photos,
// transactions, reports or post-sale reconciliation.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { retireEntitlement, appendAudit, nowIso } from '../../shared/saleEntitlement.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const entitlementId = body.entitlement_id;

    if (action === 'list') {
      const rows = await base44.asServiceRole.entities.SaleEntitlement.list('-created_date', body.limit || 100);
      const items = Array.isArray(rows) ? rows : rows?.items || [];
      return Response.json({ ok: true, items });
    }

    if (!entitlementId) return Response.json({ error: 'entitlement_id_required' }, { status: 400 });
    const record = await base44.asServiceRole.entities.SaleEntitlement.get(entitlementId).catch((e) =>
      e.status === 404 ? null : Promise.reject(e),
    );
    if (!record) return Response.json({ error: 'entitlement_not_found' }, { status: 404 });

    const actorName = user.full_name || user.email;

    if (['refund', 'dispute', 'revoke'].includes(action)) {
      const status = action === 'refund' ? 'refunded' : action === 'dispute' ? 'disputed' : 'revoked';
      const updated = await retireEntitlement(base44, record, {
        status,
        reason: body.reason || '',
        actorName,
        note: body.note || `${action} recorded by ${actorName}`,
      });
      return Response.json({ ok: true, entitlement: updated });
    }

    if (action === 'reactivate') {
      const audit = appendAudit(record, {
        action: 'reactivated',
        status_from: record.status,
        status_to: record.bound_sale_id ? 'bound' : 'active',
        actor_id: user.id,
        actor_name: actorName,
        note: body.note || 'Admin restored publishing rights.',
      });
      const updated = await base44.asServiceRole.entities.SaleEntitlement.update(entitlementId, {
        status: record.bound_sale_id ? 'bound' : 'active',
        revoked_at: null,
        revoked_reason: null,
        audit,
      });
      return Response.json({ ok: true, entitlement: updated });
    }

    if (action === 'note') {
      const audit = appendAudit(record, {
        action: 'note',
        actor_id: user.id,
        actor_name: actorName,
        note: body.note || '',
      });
      const updated = await base44.asServiceRole.entities.SaleEntitlement.update(entitlementId, { audit });
      return Response.json({ ok: true, entitlement: updated });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('[saleEntitlementAdmin] error:', error?.message || error);
    return Response.json({ error: error?.message || 'admin_action_failed' }, { status: 500 });
  }
}