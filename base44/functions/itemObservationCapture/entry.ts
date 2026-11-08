import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  saleCaptureStatus,
  captureOverview,
  retrySaleCapture,
  refreshSaleObservations,
  queueSaleCapture,
  startBackfill,
  processBackfillStep,
  runCaptureBatch,
  srOf,
} from '../../shared/itemObservation.ts';

/**
 * Central item database — operator and admin surface.
 *
 * Operators may only act on their OWN sale (capture status, retry, refresh); every
 * cross-operator read is admin-only. The heavy lifting lives in the shared capture
 * engine, which is also called directly by the publish pipeline, so publishing never
 * depends on a browser request.
 */

function page(res) {
  return (res && res.items) ? res.items : (res || []);
}

async function authorizeSale(base44, user, saleId) {
  const sr = srOf(base44);
  const sale = await sr.entities.EstateSale.get(saleId).catch(() => null);
  if (!sale) return { sale: null, allowed: false, reason: 'Sale not found' };
  if (user.role === 'admin') return { sale, allowed: true };
  if (sale.operator_id && sale.operator_id === user.id) return { sale, allowed: true };
  if (sale.created_by_id && sale.created_by_id === user.id) return { sale, allowed: true };
  if (sale.company_id) {
    const company = await sr.entities.Company.get(sale.company_id).catch(() => null);
    if (company && (company.primary_contact_user_id === user.id || (Array.isArray(company.member_user_ids) && company.member_user_ids.includes(user.id)))) {
      return { sale, allowed: true };
    }
  }
  return { sale, allowed: false, reason: 'You do not have access to this sale' };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'status');
    const isAdmin = user.role === 'admin';
    const sr = srOf(base44);

    if (['overview', 'list', 'backfill_start', 'backfill_step'].includes(action) && !isAdmin) {
      return Response.json({ error: 'Administrator access required' }, { status: 403 });
    }

    if (action === 'overview') {
      return Response.json(await captureOverview(base44));
    }

    if (action === 'list') {
      const query = {};
      if (body.operator_id) query.operator_id = String(body.operator_id);
      if (body.state) query.state = String(body.state);
      if (body.city) query.city = String(body.city);
      if (body.category) query.category = String(body.category);
      if (body.outcome) query.outcome = String(body.outcome);
      if (body.capture_status) query.capture_status = String(body.capture_status);
      if (body.representation) query.representation = String(body.representation);
      if (body.sale_id) query.source_sale_id = String(body.sale_id);
      if (body.active_only === true) query.active_for_pricing = true;
      if (body.title) query.title = { $regex: String(body.title).slice(0, 80) };
      if (body.from || body.to) {
        query.created_date = {};
        if (body.from) query.created_date.$gte = String(body.from);
        if (body.to) query.created_date.$lte = String(body.to);
      }
      const options = { limit: Math.max(1, Math.min(Number(body.limit) || 40, 100)), sort: '-last_captured_at' };
      if (body.cursor) options.cursor = String(body.cursor);
      const res = await sr.entities.ItemObservation.filter(query, options);
      return Response.json({
        items: page(res),
        next_cursor: res && res.next_cursor ? res.next_cursor : null,
        has_more: !!(res && res.has_more),
      });
    }

    if (action === 'backfill_start') {
      return Response.json(await startBackfill(base44, { limit: body.limit, includeCompleted: body.include_completed }));
    }

    if (action === 'backfill_step') {
      if (!body.job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
      return Response.json(await processBackfillStep(base44, String(body.job_id), { maxUnits: body.max_units }));
    }

    if (action === 'process') {
      if (!body.job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
      return Response.json(await runCaptureBatch(base44, String(body.job_id), { maxUnits: body.max_units }));
    }

    const saleId = String(body.sale_id || '').trim();
    if (!saleId) return Response.json({ error: 'sale_id required' }, { status: 400 });
    const auth = await authorizeSale(base44, user, saleId);
    if (!auth.sale) return Response.json({ error: 'Sale not found' }, { status: 404 });
    if (!auth.allowed) return Response.json({ error: auth.reason }, { status: 403 });

    if (action === 'status') {
      return Response.json(await saleCaptureStatus(base44, saleId));
    }

    if (action === 'retry') {
      const result = await retrySaleCapture(base44, saleId);
      const status = await saleCaptureStatus(base44, saleId);
      return Response.json({ result, status });
    }

    if (action === 'refresh') {
      const result = await refreshSaleObservations(base44, saleId);
      const status = await saleCaptureStatus(base44, saleId);
      return Response.json({ result, status });
    }

    if (action === 'queue') {
      const result = await queueSaleCapture(base44, saleId, { trigger: 'manual', maxUnits: body.max_units });
      const status = await saleCaptureStatus(base44, saleId);
      return Response.json({ result, status });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('itemObservationCapture failed:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}