// Chapter 7 P2 — COMPLETED-SALE PORTFOLIO PROJECTION (server seam).
// SaleCaseStudy is ONE small public projection of a COMPLETED sale — proof
// from real work. Privacy is absolute by design: no client names, no exact
// address, no proceeds/profitability. Metrics are computed from canonical
// records (SaleRecap / EstateSale) at PUBLISH time and stored as a snapshot —
// a metric with no record support is never offered. The testimonial invariant
// (permission_to_publish AND APPROVED/PUBLISHED) is enforced at publish and
// snapshotted — the public surface never re-reads the private record.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sanitizeMarketingText } from '../../shared/brandTruthGuard.ts';
import { jerr, pageOf, cap, loadAuthorizedSale } from '../../shared/saleAccess.ts';

const EDITABLE = ['DRAFT', 'READY'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    if (action === 'list') return await list(service, user);
    if (action === 'create') return await create(service, user, body);
    if (action === 'update') return await update(service, user, body);
    if (action === 'publish') return await publish(service, user, body);
    if (action === 'archive') return await archive(service, user, body);
    return jerr('unknown_action', 'Supported actions: list, create, update, publish, archive', 400);
  } catch (error) {
    console.error('saleCaseStudies error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}

// Chapter 6 sensitive-material guardrails: skipped / do-not-search photos are
// never eligible for public projection, regardless of operator selection.
function eligibleSalePhotos(sale) {
  return (sale.images || []).filter(img =>
    img && img.url && img.skip_item !== true && img.skip_serp_search !== true &&
    img.serp_search_status !== 'do_not_search'
  ).map(img => img.url);
}

const guardInput = () => ({ business: { years_experience: null }, verified_credentials: [], has_approved_testimonials: false });
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

async function loadStudy(service, id) {
  if (!id) return null;
  return await service.entities.SaleCaseStudy.get(id).catch(() => null);
}

async function list(service, user) {
  const [studies, salePage, testimonialPage] = await Promise.all([
    service.entities.SaleCaseStudy.filter({ operator_id: user.id }, { sort: '-updated_date', limit: 200 }).then(pageOf),
    service.entities.EstateSale.filter({ operator_id: user.id, status: 'completed' }, { sort: '-updated_date', limit: 100 }).then(pageOf),
    service.entities.ClientTestimonial.filter(
      { operator_id: user.id, permission_to_publish: true, status: { $in: ['APPROVED', 'PUBLISHED'] } },
      { limit: 100 }
    ).then(pageOf)
  ]);
  const studiedIds = new Set(studies.map(s => s.sale_id));
  const sales = salePage.map(s => {
    const addr = s.property_address || {};
    return {
      id: s.id, title: s.title, sale_type: s.sale_type || null,
      city: addr.city || null, state: addr.state || null,
      photos: eligibleSalePhotos(s).slice(0, 12),
      has_study: studiedIds.has(s.id)
    };
  });
  return Response.json({
    ok: true,
    studies,
    sales,
    testimonials: testimonialPage.map(t => ({
      id: t.id,
      public_display_name: cap(t.public_display_name || t.client_display_name, 80),
      text: t.testimonial_text
    }))
  });
}

async function create(service, user, body) {
  const loaded = await loadAuthorizedSale(service, user, body.sale_id);
  if (loaded.error) return loaded.error;
  const sale = loaded.sale;
  if (sale.status !== 'completed') return jerr('sale_not_completed', 'Case studies project completed sales only', 400);

  const existing = pageOf(await service.entities.SaleCaseStudy.filter({ sale_id: sale.id }, { limit: 5 }));
  if (existing.length > 0) return jerr('already_exists', 'This sale already has a case study', 409);

  // Scope services are a STARTING POINT only — the operator edits before publishing.
  const scopePage = await service.entities.SaleScope.filter({ sale_id: sale.id, status: 'ACTIVE' }, { limit: 1 }).then(pageOf);
  const scope = scopePage[0] || null;
  const addr = sale.property_address || {};

  const study = await service.entities.SaleCaseStudy.create({
    sale_id: sale.id,
    operator_id: sale.operator_id,
    company_id: sale.company_id || null,
    sale_team_ids: sale.sale_team || [],
    public_title: cap(body.public_title, 120) || cap(sale.title, 120) || 'Completed Estate Sale',
    generalized_location: [addr.city, addr.state].filter(Boolean).join(', ') || null,
    sale_type: sale.sale_type || null,
    services_performed: scope
      ? (scope.scope_items || []).filter(i => i.included !== false).map(i => cap(i.display_name, 100)).filter(Boolean)
      : [],
    challenge_context: '',
    merchandise_highlights: [],
    approved_photo_urls: [],
    operator_summary: '',
    status: 'DRAFT'
  });
  return Response.json({ ok: true, study });
}

async function update(service, user, body) {
  const study = await loadStudy(service, body.id);
  if (!study) return jerr('not_found', 'Case study not found', 404);
  const loaded = await loadAuthorizedSale(service, user, study.sale_id);
  if (loaded.error) return loaded.error;
  if (!EDITABLE.includes(study.status)) {
    return jerr('not_editable', 'Only draft case studies can be edited — archive it to start over', 400);
  }

  const patch = {};
  if (body.public_title !== undefined) {
    const t = cap(body.public_title, 120);
    if (!t) return jerr('title_required', 'A public title is required', 400);
    patch.public_title = t;
  }
  if (body.generalized_location !== undefined) patch.generalized_location = cap(body.generalized_location, 120) || null;
  if (body.challenge_context !== undefined) patch.challenge_context = cap(body.challenge_context, 2000);

  const wordList = (v, max) => (Array.isArray(v) ? v : []).slice(0, max).map(s => cap(String(s), 100)).filter(Boolean);
  if (body.services_performed !== undefined) patch.services_performed = wordList(body.services_performed, 20);
  if (body.merchandise_highlights !== undefined) patch.merchandise_highlights = wordList(body.merchandise_highlights, 20);

  let removals = null;
  if (body.operator_summary !== undefined) {
    const cleaned = sanitizeMarketingText(cap(body.operator_summary, 2000), guardInput());
    patch.operator_summary = cleaned.text;
    removals = cleaned.removed;
  }
  if (body.testimonial_id !== undefined) patch.testimonial_id = body.testimonial_id ? String(body.testimonial_id) : null;
  if (body.metric_notes !== undefined) {
    patch.metrics = Object.assign({}, study.metrics || {}, { notes: cap(body.metric_notes, 600) || null });
  }
  if (body.approved_photo_urls !== undefined) {
    const eligible = eligibleSalePhotos(loaded.sale);
    const requested = Array.isArray(body.approved_photo_urls) ? body.approved_photo_urls : [];
    patch.approved_photo_urls = requested.filter(u => eligible.includes(u)).slice(0, 12);
  }

  const updated = await service.entities.SaleCaseStudy.update(study.id, patch);
  return Response.json({ ok: true, study: updated, removals });
}

async function publish(service, user, body) {
  const study = await loadStudy(service, body.id);
  if (!study) return jerr('not_found', 'Case study not found', 404);
  const loaded = await loadAuthorizedSale(service, user, study.sale_id);
  if (loaded.error) return loaded.error;
  if (study.status === 'PUBLISHED') return jerr('already_published', 'This case study is already published', 409);
  if (!cap(study.public_title, 3)) return jerr('title_required', 'Add a public title before publishing', 400);
  const sale = loaded.sale;

  // Metrics — computed from canonical records at publish time, stored as the
  // publish snapshot. A metric with no record support is never invented.
  const metrics = Object.assign({}, study.metrics || {});
  const recapPage = await service.entities.SaleRecap.filter({ sale_id: sale.id }, { limit: 1 }).then(pageOf);
  const recap = recapPage[0] || null;
  if (recap) {
    const totalItems = num(recap.total_items);
    const totalSold = num(recap.total_sold);
    metrics.total_items = totalItems;
    metrics.total_sold = totalSold;
    metrics.total_views = num(recap.total_views);
    if (totalItems > 0 && totalSold !== null) {
      metrics.sell_through_pct = Math.round((totalSold / totalItems) * 1000) / 10;
    }
  }
  metrics.sale_days = (sale.sale_dates || []).filter(d => d && d.date).length;

  // Testimonial invariant — verified at publish, then snapshotted. The public
  // projection only ever reads the snapshot, never the private record.
  let snapshot = {};
  if (study.testimonial_id) {
    const t = await service.entities.ClientTestimonial.get(study.testimonial_id).catch(() => null);
    if (!t || t.operator_id !== sale.operator_id || !t.permission_to_publish ||
        !['APPROVED', 'PUBLISHED'].includes(t.status)) {
      return jerr('testimonial_not_allowed', 'The linked testimonial is not approved for publication — remove it or approve the testimonial first', 400);
    }
    snapshot = {
      public_display_name: cap(t.public_display_name || t.client_display_name, 80),
      text: cap(t.testimonial_text, 1200)
    };
  }

  // Brand-truth guard runs again at publish — the public summary never
  // carries unsupported claims, and removals are reported, never silent.
  const cleaned = sanitizeMarketingText(study.operator_summary || '', guardInput());

  const updated = await service.entities.SaleCaseStudy.update(study.id, {
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    archived_at: null,
    metrics,
    testimonial_snapshot: snapshot,
    operator_summary: cleaned.text
  });
  return Response.json({ ok: true, study: updated, removals: cleaned.removed });
}

async function archive(service, user, body) {
  const study = await loadStudy(service, body.id);
  if (!study) return jerr('not_found', 'Case study not found', 404);
  const loaded = await loadAuthorizedSale(service, user, study.sale_id);
  if (loaded.error) return loaded.error;
  const updated = await service.entities.SaleCaseStudy.update(study.id, {
    status: 'ARCHIVED',
    archived_at: new Date().toISOString()
  });
  return Response.json({ ok: true, study: updated });
}