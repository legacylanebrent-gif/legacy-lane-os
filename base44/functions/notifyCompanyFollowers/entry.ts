// notifyCompanyFollowers — tells a company's followers about a sale that just went live.
// Called from onSalePublished (the EstateSale publish orchestrator), service role.
//
// Two things decide delivery, and they belong to two different people:
//   The company (operator profile) chooses WHEN its official alert goes out — instantly at
//     publish, or at a set time of day (follower_alert_mode / follower_alert_time).
//   Each follower chooses whether they want it instantly, and can turn instant off so the
//     company's new sales reach them only through EstateSalen's daily roundup.
// Alerts are on-site notifications only — no email. Idempotency and the notification text live
// in base44/shared/followerAlerts.ts so the scheduled release path behaves identically.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { deliverFollowerAlerts, nextEtOccurrence, DEFAULT_ALERT_TIME } from '../../shared/followerAlerts.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;
    if (!saleId) return Response.json({ error: 'sale_id required' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.EstateSale.get(saleId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // Only a live listing is worth an alert.
    if (!['upcoming', 'active'].includes(sale.status)) {
      return Response.json({ skipped: true, reason: `status=${sale.status}` });
    }
    if (!sale.operator_id) return Response.json({ skipped: true, reason: 'sale has no operator' });

    // The company's own chosen release time comes from its operator profile.
    const operator = await base44.asServiceRole.entities.User.get(sale.operator_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    const releaseMode = operator?.follower_alert_mode === 'scheduled' ? 'scheduled' : 'instant';

    if (releaseMode === 'scheduled') {
      const existing = await base44.asServiceRole.entities.SaleAlertDispatch.filter({ sale_id: sale.id });
      const live = (existing || []).find((d) => d.status === 'pending' || d.status === 'sent');
      if (live) {
        return Response.json({ queued: true, already: true, status: live.status, scheduled_for: live.scheduled_for });
      }

      const scheduledFor = nextEtOccurrence(operator?.follower_alert_time || DEFAULT_ALERT_TIME);
      const dispatch = await base44.asServiceRole.entities.SaleAlertDispatch.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_name: sale.operator_name || '',
        sale_title: sale.title || '',
        city: sale.property_address?.city || '',
        state: sale.property_address?.state || '',
        scheduled_for: scheduledFor,
        status: 'pending',
        note: `Company releases follower alerts at ${operator?.follower_alert_time || DEFAULT_ALERT_TIME} ET`
      });
      return Response.json({ queued: true, dispatch_id: dispatch.id, scheduled_for: scheduledFor });
    }

    const result = await deliverFollowerAlerts(base44, sale, { instantOnly: true });
    return Response.json({ sale_id: sale.id, ...result });
  } catch (error) {
    console.error('notifyCompanyFollowers failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}