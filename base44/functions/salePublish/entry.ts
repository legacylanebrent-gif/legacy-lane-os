// salePublish — the ONLY sanctioned way a sale leaves draft and appears publicly.
// Every account type goes through this server gate:
//   • professional accounts publish on their company subscription (unchanged rights)
//   • guests publish on one paid One-Time Estate Sale package, permanently bound
//     to that sale; rescheduling the same weekend is free, a second sale is not.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  authorizePublish,
  bindEntitlement,
  recordRepublication,
  loadSale,
  canActForSale,
  boundEntitlementForSale,
  claimableEntitlement,
  pendingEntitlement,
  GUEST_SALE_PACKAGE,
  nowIso,
} from '../../shared/saleEntitlement.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'publish';

    // ── Account: what does this buyer hold? (no sale needed) ──
    if (action === 'account') {
      const claimable = await claimableEntitlement(base44, user.id);
      const awaiting = await pendingEntitlement(base44, user.id);
      const boundRows = await base44.asServiceRole.entities.SaleEntitlement.filter({
        user_id: user.id,
        kind: GUEST_SALE_PACKAGE.kind,
        status: 'bound',
      });
      return Response.json({
        ok: true,
        package: GUEST_SALE_PACKAGE,
        claimable: claimable || null,
        awaiting_payment: awaiting || null,
        bound: boundRows || [],
      });
    }

    const saleId = body.sale_id;
    if (!saleId) return Response.json({ error: 'sale_id_required' }, { status: 400 });

    const sale = await loadSale(base44, saleId);
    if (!sale) return Response.json({ error: 'sale_not_found' }, { status: 404 });

    if (!canActForSale(user, sale)) {
      return Response.json({ error: 'not_your_sale' }, { status: 403 });
    }

    const bound = await boundEntitlementForSale(base44, saleId);
    const ownerId = sale.operator_id || user.id;

    // ── Status: what does this sale need to go live? ──
    if (action === 'status') {
      return Response.json({
        ok: true,
        sale_status: sale.status,
        entitlement: bound || (await claimableEntitlement(base44, ownerId)) || (await pendingEntitlement(base44, ownerId)),
        has_unused_package: !!(await claimableEntitlement(base44, ownerId)),
        awaiting_payment: !!(await pendingEntitlement(base44, ownerId)),
        package: GUEST_SALE_PACKAGE,
      });
    }

    // ── Unpublish: back to draft; nothing is deleted ──
    if (action === 'unpublish') {
      await base44.asServiceRole.entities.EstateSale.update(saleId, { status: 'draft' });
      return Response.json({ ok: true, status: 'draft' });
    }

    // ── Publish ──
    // A finished engagement is history, never a fresh event.
    if (['completed', 'archived'].includes(sale.status)) {
      return Response.json({
        ok: false,
        reason: 'completed_sale_cannot_be_republished',
        message: 'A completed sale cannot go back on the public listing. Create a new sale for a new event.',
      });
    }

    const auth = await authorizePublish(base44, user, sale);
    if (!auth.allowed) {
      const message =
        auth.reason === 'sale_package_required'
          ? 'A One-Time Estate Sale package is required to publish this sale.'
          : auth.reason === 'no_active_subscription'
            ? 'Your company subscription is not active. Renew your plan to publish.'
            : 'You cannot publish this sale.';
      return Response.json({
        ok: false,
        reason: auth.reason,
        message,
        purchase_url: auth.purchase_url || '/OperatorPackages',
        package: GUEST_SALE_PACKAGE,
      });
    }

    // Bind BEFORE the sale goes live so the publishing verification (which reads
    // the bound entitlement) can never see a live sale without its paid right.
    if (auth.source === 'entitlement' && auth.entitlement) {
      if (auth.reuse) {
        await recordRepublication(base44, auth.entitlement, sale, user);
      } else {
        await bindEntitlement(base44, auth.entitlement, sale, user, auth.source);
      }
    }

    const desiredStatus = body.status === 'active' ? 'active' : 'upcoming';
    await base44.asServiceRole.entities.EstateSale.update(saleId, { status: desiredStatus });

    console.log(
      `[salePublish] sale ${saleId} -> ${desiredStatus} via ${auth.source}${auth.entitlement ? ` (entitlement ${auth.entitlement.id})` : ''} by ${user.email} at ${nowIso()}`,
    );

    return Response.json({
      ok: true,
      status: desiredStatus,
      approval_source: auth.source,
      reused_entitlement: !!auth.reuse,
    });
  } catch (error) {
    console.error('[salePublish] error:', error?.message || error);
    return Response.json({ error: error?.message || 'publish_failed' }, { status: 500 });
  }
}