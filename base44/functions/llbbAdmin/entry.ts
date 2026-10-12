// Legacy Lane Business Builder — admin control plane (Phase 4A).
// Actions: portfolio | overview | company_search | slug_check | workflow |
// set_manager | site_preview.
// Authorization: control actions are PLATFORM-ADMIN ONLY (user.role==='admin').
// site_preview additionally allows tenant company members via the certified
// assertTenantAccess chain. Server-side truth only: company/tenant identity
// for authorization is ALWAYS derived server-side; LLBB workflow actions are
// restricted to created_via='llbb' tenants (REAL LEGACY LANE FREEZE).
// Draft privacy: draft sites resolve ONLY through this authenticated preview —
// the public runtime fails closed for non-'active' tenants.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  RESERVED_SLUGS,
  SITES_HOST,
  normalizeSlug,
  evaluateWebsiteEntitlement,
  validateLifecycleTransition,
  assertTenantAccess
} from '../../shared/websiteTenantService.ts';
import { projectPublicSettings } from '../../shared/websiteSettingsService.ts';
import { computeReadiness } from '../../shared/llbbSetupEngine.ts';
import {
  LLBB_WORKFLOW_STATUSES,
  WORKFLOW_LABELS,
  validateWorkflowTransition,
  allowedWorkflowTransitions,
  technicalStatusForWorkflow,
  inferWorkflowFromTechnical
} from '../../shared/llbbWorkflowModel.ts';
import {
  getPublicSettingsForContext,
  listPublicSales,
  getPublicLeadContext,
  buildPublicWebsiteContext
} from '../../shared/websiteRuntimeService.ts';
import {
  publishSaleToDestination,
  unpublishSaleFromDestination
} from '../../shared/publicationService.ts';

function jerr(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'portfolio';

    // site_preview: tenant member OR platform admin (client collaboration later
    // builds on this seam — authorization is never bypassed by mode).
    if (action === 'site_preview') return await sitePreview(service, user, body);

    // Every other action is platform-admin only.
    if (user.role !== 'admin') return jerr('admin_only', 'Legacy Lane Business Builder is admin-only', 403);

    if (action === 'portfolio') return await portfolio(service);
    if (action === 'overview') return await overview(service, body);
    if (action === 'company_search') return await companySearch(service, body);
    if (action === 'slug_check') return await slugCheck(service, body);
    if (action === 'workflow') return await workflow(service, user, body);
    if (action === 'set_manager') return await setManager(service, body);
    // Phase 4C — Estate Sales management + Leads dashboard.
    if (action === 'sales_list') return await salesList(service, body);
    if (action === 'set_publish_policy') return await setPublishPolicy(service, body);
    if (action === 'publish_sale') return await salePublishAction(service, body, 'publish');
    if (action === 'unpublish_sale') return await salePublishAction(service, body, 'unpublish');
    if (action === 'leads_list') return await leadsList(service, body);
    if (action === 'lead_detail') return await leadDetail(service, user, body);
    return jerr('unknown_action', 'Supported actions: portfolio, overview, company_search, slug_check, workflow, set_manager, site_preview, sales_list, set_publish_policy, publish_sale, unpublish_sale, leads_list, lead_detail', 400);
  } catch (error) {
    console.error('llbbAdmin error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}

// ── Portfolio (Part 2/13) ─────────────────────────────────────────────────────
async function portfolio(service) {
  const page = await service.entities.WebsiteTenant.filter({}, { limit: 500, sort: '-updated_date' });
  const tenants = page.items || page;
  const rows = await composeRows(service, tenants);
  const summary = { total: rows.length };
  for (const s of LLBB_WORKFLOW_STATUSES) summary[s] = rows.filter(r => r.workflow_status === s).length;
  const attentionCount = rows.filter(r => r.attention).length;
  return Response.json({ ok: true, rows, summary, attention_count: attentionCount });
}

async function composeRows(service, tenants) {
  const ids = tenants.map(t => t.id);
  const companyIds = [...new Set(tenants.map(t => t.company_id).filter(Boolean))];
  const domPage = ids.length ? await service.entities.WebsiteDomain.filter({ website_tenant_id: { $in: ids } }, { limit: 500 }) : { items: [] };
  const domains = domPage.items || domPage;
  const setPage = ids.length ? await service.entities.WebsiteTenantSettings.filter({ website_tenant_id: { $in: ids }, is_active: true }, { limit: 500 }) : { items: [] };
  const settingsRows = setPage.items || setPage;
  const companies = {};
  for (const cid of companyIds) {
    const c = await service.entities.Company.get(cid).catch(() => null);
    if (c) companies[cid] = c;
  }
  const destIds = [...new Set(tenants.map(t => t.destination_id).filter(Boolean))];
  const destinations = {};
  for (const did of destIds) {
    const d = await service.entities.Destination.get(did).catch(() => null);
    if (d) destinations[did] = d;
  }
  const pubPage = destIds.length ? await service.entities.Publication.filter({ destination_id: { $in: destIds } }, { limit: 1000 }) : { items: [] };
  const pubs = pubPage.items || pubPage;

  return tenants.map((t) => buildRow(t, domains, settingsRows, companies, destinations, pubs));
}

function buildRow(t, allDomains, settingsRows, companies, destinations, pubs) {
  const tDom = allDomains.filter(d => d.website_tenant_id === t.id);
  const platformDomain = tDom.find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const customDomains = tDom.filter(d => d.domain_type === 'custom_domain');
  const settings = settingsRows.find(s => s.website_tenant_id === t.id) || null;
  const destination = t.destination_id ? destinations[t.destination_id] || null : null;
  const company = companies[t.company_id] || null;
  const readiness = computeReadiness({
    tenant: t,
    settings: projectPublicSettings(settings, company),
    destination,
    domains: tDom
  });
  const tPubs = pubs.filter(p => p.destination_id === t.destination_id);
  const workflow = t.workflow_status || inferWorkflowFromTechnical(t.status);
  const alerts = buildAlerts(t, workflow, readiness, customDomains, tPubs);
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    company: company ? { id: company.id, display_name: company.display_name || company.legal_name, status: company.status } : null,
    status: t.status,
    workflow_status: workflow,
    management_mode: t.management_mode || 'admin_managed',
    setup_manager_user_id: t.setup_manager_user_id || null,
    created_via: t.created_via || 'legacy',
    template: { id: t.template_id || null, version: t.template_version || 1 },
    platform_hostname: platformDomain ? platformDomain.hostname : `${t.slug}.${SITES_HOST}`,
    custom_domains: customDomains.map(d => ({ hostname: d.hostname, status: d.status, verification_status: d.verification_status, is_primary: !!d.is_primary })),
    domain_status: customDomains.length === 0 ? 'none' : (customDomains.some(d => d.status === 'verified' || d.status === 'active') ? 'connected' : 'action_required'),
    auto_publish_enabled: t.auto_publish_enabled !== false,
    updated_date: t.updated_date || null,
    activated_at: t.activated_at || null,
    readiness: { percent: readiness.percent, blockers: readiness.blockers.map(b => ({ key: b.key, label: b.label, reason: b.reason })) },
    alerts,
    attention: alerts.length > 0,
    publication_health: {
      published: tPubs.filter(p => p.status === 'published').length,
      failed: tPubs.filter(p => p.status === 'failed').length,
      update_pending: tPubs.filter(p => p.status === 'update_pending').length
    }
  };
}

function buildAlerts(t, workflow, readiness, customDomains, tPubs) {
  const alerts = [];
  if (t.management_mode === 'client_managed' && workflow === 'setup_in_progress') {
    alerts.push({ code: 'waiting_for_client', label: 'Waiting for Client' });
  }
  if (workflow === 'ready_for_review' || workflow === 'changes_requested') {
    alerts.push({ code: 'waiting_for_review', label: 'Waiting for Review' });
  }
  if (customDomains.some(d => d.status === 'reserved' || d.status === 'verification_pending')) {
    alerts.push({ code: 'domain_action_required', label: 'Domain Action Required' });
  }
  if (readiness.blockers.length > 0) {
    alerts.push({ code: 'setup_incomplete', label: 'Setup Incomplete' });
  }
  if (tPubs.some(p => p.status === 'failed' || p.status === 'update_pending')) {
    alerts.push({ code: 'publication_problem', label: 'Publication Problem' });
  }
  if (t.status === 'suspended') {
    alerts.push({ code: 'site_suspended', label: 'Site Suspended' });
  }
  return alerts;
}

// ── Overview (Website Manager load) ───────────────────────────────────────────
async function overview(service, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  if (!company) return jerr('company_not_found', 'Company not found', 404);
  const domPage = await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 50 });
  const domains = domPage.items || domPage;
  const destination = tenant.destination_id ? await service.entities.Destination.get(tenant.destination_id).catch(() => null) : null;
  const settingsRow = await (async () => {
    const p = await service.entities.WebsiteTenantSettings.filter({ website_tenant_id: tenant.id, is_active: true }, { limit: 5, sort: 'created_date' });
    return (p.items || p)[0] || null;
  })();
  const readiness = computeReadiness({
    tenant,
    settings: projectPublicSettings(settingsRow, company),
    destination,
    domains
  });
  const workflow = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  const tPubs = destination
    ? await (async () => {
        const p = await service.entities.Publication.filter({ destination_id: destination.id }, { limit: 500 });
        return p.items || p;
      })()
    : [];
  const platformDomain = domains.find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const customDomains = domains.filter(d => d.domain_type === 'custom_domain');
  return Response.json({
    ok: true,
    tenant: {
      id: tenant.id, company_id: tenant.company_id, name: tenant.name, slug: tenant.slug,
      status: tenant.status, workflow_status: workflow,
      management_mode: tenant.management_mode || 'admin_managed',
      setup_manager_user_id: tenant.setup_manager_user_id || null,
      created_via: tenant.created_via || 'legacy',
      template: { id: tenant.template_id || null, version: tenant.template_version || 1 },
      auto_publish_enabled: tenant.auto_publish_enabled !== false,
      updated_date: tenant.updated_date || null, activated_at: tenant.activated_at || null
    },
    company: { id: company.id, display_name: company.display_name || company.legal_name, legal_name: company.legal_name, status: company.status, city: company.city || null, state: company.state || null, logo_url: company.logo_url || null, phone: company.phone || null, email: company.email || null },
    domains: domains.map(d => ({ id: d.id, hostname: d.hostname, domain_type: d.domain_type, status: d.status, verification_status: d.verification_status, is_primary: !!d.is_primary })),
    destination: destination ? { id: destination.id, name: destination.name, status: destination.status, delivery_mode: (destination.configuration || {}).delivery_mode || 'webhook' } : null,
    readiness,
    workflow_status: workflow,
    allowed_transitions: allowedWorkflowTransitions(workflow),
    alerts: buildAlerts(tenant, workflow, readiness, customDomains, tPubs),
    published_sales_count: tPubs.filter(p => p.status === 'published').length,
    publication_health: {
      published: tPubs.filter(p => p.status === 'published').length,
      failed: tPubs.filter(p => p.status === 'failed').length,
      update_pending: tPubs.filter(p => p.status === 'update_pending').length
    }
  });
}

// ── Company search (Launch Wizard Step 1) ─────────────────────────────────────
async function companySearch(service, body) {
  const q = String(body.q || '').trim();
  let companies;
  if (q) {
    const page = await service.entities.Company.filter(
      { $or: [{ display_name: { $regex: q, $options: 'i' } }, { legal_name: { $regex: q, $options: 'i' } }] },
      { limit: 20 });
    companies = page.items || page;
  } else {
    const page = await service.entities.Company.filter({}, { limit: 25, sort: '-updated_date' });
    companies = page.items || page;
  }
  const ids = companies.map(c => c.id);
  const tenantPage = ids.length ? await service.entities.WebsiteTenant.filter({ company_id: { $in: ids } }, { limit: 500 }) : { items: [] };
  const allTenants = tenantPage.items || tenantPage;
  const out = [];
  for (const c of companies) {
    const ent = await evaluateWebsiteEntitlement(service, c);
    const cTenants = allTenants.filter(t => t.company_id === c.id);
    const liveCount = cTenants.filter(t => t.status !== 'archived').length;
    let owner = null;
    if (c.primary_contact_user_id) {
      owner = await service.entities.User.get(c.primary_contact_user_id).catch(() => null);
    }
    out.push({
      id: c.id,
      display_name: c.display_name || c.legal_name,
      legal_name: c.legal_name,
      status: c.status,
      city: c.city || null, state: c.state || null,
      owner: owner ? { id: owner.id, full_name: owner.full_name || null, email: owner.email || null } : null,
      entitlement: { allowed: !!ent.allowed, tier: ent.tier || null, allowance: ent.allowance ?? 0, reason: ent.reason || null },
      existing_tenants: cTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug, status: t.status, workflow_status: t.workflow_status || inferWorkflowFromTechnical(t.status), created_via: t.created_via || 'legacy' })),
      live_tenant_count: liveCount,
      can_launch: !!ent.allowed && c.status === 'active' && (ent.allowance === 'unlimited' || liveCount < ent.allowance)
    });
  }
  return Response.json({ ok: true, companies: out });
}

// ── Slug check (Launch Wizard Step 4) ─────────────────────────────────────────
async function slugCheck(service, body) {
  const slug = normalizeSlug(body.slug || body.name || '');
  if (!slug) return Response.json({ ok: true, available: false, normalized: null, reason: 'Slug must be 3-63 chars of letters, digits and hyphens' });
  if (RESERVED_SLUGS.includes(slug)) return Response.json({ ok: true, available: false, normalized: slug, reason: 'This name is reserved' });
  const tPage = await service.entities.WebsiteTenant.filter({ slug }, { limit: 5 });
  if ((tPage.items || tPage).length > 0) return Response.json({ ok: true, available: false, normalized: slug, reason: 'Already in use by another website' });
  const dPage = await service.entities.WebsiteDomain.filter({ hostname: `${slug}.${SITES_HOST}` }, { limit: 5 });
  if ((dPage.items || dPage).length > 0) return Response.json({ ok: true, available: false, normalized: slug, reason: 'Platform hostname unavailable' });
  return Response.json({ ok: true, available: true, normalized: slug, hostname: `${slug}.${SITES_HOST}`, reason: null });
}

// ── Product workflow transitions (Part 6) ─────────────────────────────────────
async function workflow(service, user, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  // REAL LEGACY LANE FREEZE — LLBB workflow only for LLBB-provisioned tenants.
  if (tenant.created_via !== 'llbb') {
    return jerr('not_llbb_tenant', 'Workflow control is only available for Business Builder websites', 403);
  }
  const from = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  const to = body.to;
  const check = validateWorkflowTransition(from, to);
  if (!check.ok) return jerr(check.reason, `Cannot move ${from} → ${to}`, 409);

  const now = new Date().toISOString();
  const patch = { workflow_status: to, workflow_updated_at: now, workflow_updated_by: user.id };
  const desiredTechnical = technicalStatusForWorkflow(to);

  if (desiredTechnical !== tenant.status) {
    const tech = validateLifecycleTransition(tenant.status, desiredTechnical);
    if (!tech.ok) return jerr(tech.reason, `Technical lifecycle cannot move ${tenant.status} → ${desiredTechnical}`, 409);
    patch.status = desiredTechnical;
    if (desiredTechnical === 'active') patch.activated_at = tenant.activated_at || now;
    if (desiredTechnical === 'suspended') { patch.suspended_at = now; patch.suspended_by = user.id; }
    if (desiredTechnical === 'archived') { patch.archived_at = now; patch.archived_by = user.id; }
  }

  // Launch gate: explicit readiness blockers must be clear before LIVE.
  if (to === 'live') {
    const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
    const domPage = await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 50 });
    const domains = domPage.items || domPage;
    const destination = tenant.destination_id ? await service.entities.Destination.get(tenant.destination_id).catch(() => null) : null;
    const p = await service.entities.WebsiteTenantSettings.filter({ website_tenant_id: tenant.id, is_active: true }, { limit: 5, sort: 'created_date' });
    const settingsRow = (p.items || p)[0] || null;
    const readiness = computeReadiness({ tenant, settings: projectPublicSettings(settingsRow, company), destination, domains });
    if (readiness.blockers.length > 0) {
      return Response.json({
        error: {
          code: 'launch_blockers',
          message: 'Launch blocked — required setup sections incomplete',
          blockers: readiness.blockers.map(b => ({ key: b.key, label: b.label, reason: b.reason }))
        }
      }, { status: 409 });
    }
  }

  const updated = await service.entities.WebsiteTenant.update(tenant.id, patch);
  return Response.json({ ok: true, tenant: updated });
}

// ── Setup manager assignment ──────────────────────────────────────────────────
async function setManager(service, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  if (tenant.created_via !== 'llbb') return jerr('not_llbb_tenant', 'Only Business Builder websites support setup managers', 403);
  let managerId = null;
  if (body.setup_manager_user_id) {
    const u = await service.entities.User.get(body.setup_manager_user_id).catch(() => null);
    if (!u) return jerr('user_not_found', 'Setup manager user not found', 404);
    managerId = u.id;
  }
  const updated = await service.entities.WebsiteTenant.update(tenant.id, { setup_manager_user_id: managerId });
  return Response.json({ ok: true, tenant: updated });
}

// ── Phase 4C — Estate Sales (Part 2) ──────────────────────────────────────────
// Canonical sales of the tenant's Company joined with THIS tenant's
// Publication state. Never a second sale editor — operational editing routes
// to canonical EstateSalen Sale management (the manager links out).
function pageOf(res) {
  return (res && res.items) ? res.items : (res || []);
}

async function salesList(service, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  if (!company) return jerr('company_not_found', 'Company not found', 404);

  const salePage = await service.entities.EstateSale.filter(
    { company_id: tenant.company_id }, { limit: 500, sort: '-updated_date' });
  const sales = pageOf(salePage);

  const tPubs = tenant.destination_id
    ? pageOf(await service.entities.Publication.filter({ destination_id: tenant.destination_id }, { limit: 1000 }))
    : [];
  const pubBySale = {};
  for (const p of tPubs) if (!pubBySale[p.sale_id]) pubBySale[p.sale_id] = p; // oldest = canonical relationship

  // Presentation-owned featured state (never the canonical premium_listing).
  const presPage = await service.entities.WebsiteSalePresentation.filter(
    { website_tenant_id: tenant.id }, { limit: 500 });
  const presBySale = {};
  for (const pr of pageOf(presPage)) presBySale[pr.sale_id] = pr;

  // Inventory counts server-side (never load full inventory into the manager).
  const ids = sales.map(s => s.id);
  const counts = {};
  if (ids.length > 0) {
    const agg = await service.entities.Item.aggregate(
      { query: { estate_sale_id: { $in: ids } }, groupBy: 'estate_sale_id' }).catch(() => ({ rows: [] }));
    for (const r of (agg.rows || [])) counts[r.estate_sale_id] = r.count;
  }

  const platformDomain = pageOf(await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 20 }))
    .find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const siteBase = platformDomain ? `https://${platformDomain.hostname}` : null;

  const rows = sales.map(s => {
    const pub = pubBySale[s.id] || null;
    const pres = presBySale[s.id] || null;
    const visible = !!(pub && pub.status === 'published' && tenant.status === 'active' && s.status !== 'draft' && s.status !== 'archived');
    const thumbs = s.image_thumbnails || {};
    const thumbnail = (Object.values(thumbs)[0]) || ((s.images || [])[0] || {}).url || null;
    const attention = [];
    if (pub && (pub.status === 'failed' || pub.status === 'update_pending')) attention.push(pub.status);
    if (pub && pub.status === 'published' && (s.status === 'draft' || s.status === 'archived')) attention.push('hidden_by_lifecycle');
    return {
      id: s.id,
      title: s.title,
      thumbnail,
      dates: s.sale_dates || [],
      status: s.status,
      inventory_count: counts[s.id] || 0,
      publication: pub ? { id: pub.id, status: pub.status, published_at: pub.published_at, last_success_at: pub.last_success_at, last_error: pub.last_error, error_category: pub.error_category } : null,
      visible,
      website_url: visible && siteBase ? `${siteBase}/site/sale/${s.website_slug || s.id}` : null,
      featured: !!(pres && pres.featured),
      updated_date: s.updated_date || null,
      attention
    };
  });

  return Response.json({
    ok: true,
    auto_publish_enabled: tenant.auto_publish_enabled !== false,
    destination: tenant.destination_id || null,
    platform_hostname: siteBase,
    sales: rows
  });
}

// Publication policy (Part 3) — explicit LLBB tenant preference.
async function setPublishPolicy(service, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  if (tenant.created_via !== 'llbb') return jerr('not_llbb_tenant', 'Publication policy is only configurable on Business Builder websites', 403);
  if (typeof body.auto_publish_enabled !== 'boolean') return jerr('invalid_policy', 'auto_publish_enabled must be a boolean', 400);
  const updated = await service.entities.WebsiteTenant.update(tenant.id, { auto_publish_enabled: body.auto_publish_enabled });
  return Response.json({ ok: true, auto_publish_enabled: updated.auto_publish_enabled });
}

// Publish / unpublish through the CERTIFIED publication service — the manager
// never mutates Publications directly (Part 12, publication never bypassed).
async function salePublishAction(service, body, kind) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  if (!tenant.destination_id) return jerr('destination_required', 'This website has no destination attached', 400);
  const sale = await service.entities.EstateSale.get(body.sale_id || '').catch(() => null);
  if (!sale) return jerr('sale_not_found', 'Sale not found', 404);
  if (sale.company_id !== tenant.company_id) return jerr('company_mismatch', 'Sale does not belong to this website company', 403);
  const r = kind === 'publish'
    ? await publishSaleToDestination(service, sale.id, tenant.destination_id)
    : await unpublishSaleFromDestination(service, sale.id, tenant.destination_id);
  if (!r.ok) return jerr(r.error, `Cannot ${kind} sale`, r.http || 400);
  return Response.json({ ok: true, publication: r.publication });
}

// ── Phase 4C — Leads dashboard (Parts 27/28/29) ───────────────────────────────
async function leadsList(service, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  const leadPage = await service.entities.WebsiteLead.filter(
    { website_tenant_id: tenant.id }, { limit: 300, sort: '-created_date' });
  const leads = pageOf(leadPage);

  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const within = (days) => leads.filter(l => l.created_date && (now - new Date(l.created_date).getTime()) <= days * DAY).length;
  const byType = {};
  for (const l of leads) byType[l.lead_type] = (byType[l.lead_type] || 0) + 1;

  // Sale titles for sale-attributed leads (labels only, canonical data).
  const saleIds = [...new Set(leads.map(l => l.sale_id).filter(Boolean))];
  const saleTitles = {};
  for (const sid of saleIds) {
    const s = await service.entities.EstateSale.get(sid).catch(() => null);
    if (s) saleTitles[sid] = s.title;
  }

  return Response.json({
    ok: true,
    summary: {
      today: within(1),
      this_week: within(7),
      this_month: within(30),
      total: leads.length,
      by_type: byType
    },
    recent: leads.slice(0, 100).map(l => ({
      id: l.id,
      lead_type: l.lead_type,
      service_requested: l.service_requested || null,
      name: [l.contact_first_name, l.contact_last_name].filter(Boolean).join(' ') || null,
      email: l.contact_email || null,
      phone: l.contact_phone || null,
      city: (l.property_info || {}).city || null,
      created_date: l.created_date || null,
      source_url: l.source_url || null,
      sale_id: l.sale_id || null,
      sale_title: l.sale_id ? (saleTitles[l.sale_id] || null) : null,
      preferred_contact_method: l.preferred_contact_method || 'any',
      status: l.status || 'new'
    }))
  });
}

// Lead detail — company isolation enforced by tenant membership on the record.
async function leadDetail(service, user, body) {
  const lead = await service.entities.WebsiteLead.get(body.lead_id || '').catch(() => null);
  if (!lead) return jerr('lead_not_found', 'Lead not found', 404);
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant || lead.website_tenant_id !== tenant.id) {
    return jerr('forbidden', 'Lead does not belong to this website', 403); // cross-tenant isolation
  }
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });

  // Private seller photos: signed URLs only, short-lived, tenant-scoped seam.
  const photos = [];
  for (const uri of (lead.photo_file_uris || []).slice(0, 8)) {
    try {
      const r = await base44_asSigned(service, uri);
      photos.push({ uri, signed_url: r });
    } catch (e) {
      photos.push({ uri, signed_url: null });
    }
  }

  let saleTitle = null;
  if (lead.sale_id) {
    const s = await service.entities.EstateSale.get(lead.sale_id).catch(() => null);
    if (s && s.company_id === tenant.company_id) saleTitle = s.title; // canonical attribution only
  }

  return Response.json({
    ok: true,
    lead: {
      id: lead.id,
      lead_type: lead.lead_type,
      service_requested: lead.service_requested || null,
      timeline: lead.timeline || null,
      property_info: lead.property_info || {},
      preferred_contact_method: lead.preferred_contact_method || 'any',
      contact_first_name: lead.contact_first_name,
      contact_last_name: lead.contact_last_name,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      message: lead.message,
      status: lead.status,
      marketing_opt_in: !!lead.marketing_opt_in,
      vip_opt_in: !!lead.vip_opt_in,
      sms_opt_in: !!lead.sms_opt_in,
      consent_captured_at: lead.consent_captured_at || null,
      source_url: lead.source_url || null,
      referrer: lead.referrer || null,
      created_date: lead.created_date || null,
      sale_id: lead.sale_id || null,
      sale_title: saleTitle,
      photos
    }
  });
}

async function base44_asSigned(service, uri) {
  const r = await service.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 });
  return r && r.signed_url ? r.signed_url : null;
}

// ── Authenticated draft preview (Part 5) ──────────────────────────────────────
// Same certified runtime projections, resolved from an AUTHENTICATED tenant
// reference instead of a public hostname. Draft/suspended tenants never resolve
// through the public runtime; this is the ONLY draft rendering path.
async function sitePreview(service, user, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });

  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  if (!company) return jerr('company_not_found', 'Company not found', 404);
  const domPage = await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 50 });
  const domains = domPage.items || domPage;
  const domain = domains.find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected')
    || domains.find(d => d.status !== 'disconnected') || null;
  const destination = tenant.destination_id ? await service.entities.Destination.get(tenant.destination_id).catch(() => null) : null;
  const ctx = {
    ok: true,
    hostname: domain ? domain.hostname : `${tenant.slug}.${SITES_HOST}`,
    domain,
    tenant,
    company,
    destination: (destination && destination.status === 'active' && destination.company_id === tenant.company_id) ? destination : null
  };
  const settings = await getPublicSettingsForContext(service, ctx);
  const sales = await listPublicSales(service, ctx);
  const leadContext = await getPublicLeadContext(service, ctx);
  const template = { id: tenant.template_id || null, version: tenant.template_version || 1 };
  return Response.json({
    ok: true,
    website: buildPublicWebsiteContext({ ctx, sales, settings, template }),
    lead_context: leadContext,
    tenant_status: tenant.status,
    workflow_status: tenant.workflow_status || inferWorkflowFromTechnical(tenant.status)
  });
}