// Controlled provisioning service for WebsiteTenants (Phase 3B, extended 4A).
// WebsiteTenant creation MUST go through this function — generic client CRUD
// is admin-only (RLS create). Authorization: authenticated user → strict
// Company membership → Company status → website entitlement → slug policy.
// Idempotent via idempotency_key; slug races resolved by post-create arbitration.
// IDEMPOTENT REPLAY RESOLVES BEFORE CAPACITY ENFORCEMENT (Phase 3B invariant).
//
// Phase 4A (LLBB) extension — created_via === 'llbb' + platform admin:
//   - membership check is replaced by direct admin company selection (admins
//     are NOT members of client companies), but Company status, entitlement,
//     capacity, slug policy, and replay ordering are IDENTICAL — never bypassed.
//   - provisions the FULL LLBB stack: runtime_served Destination (no webhook
//     delivery, no receiver), platform_subdomain WebsiteDomain
//     ({slug}.estatesalen.com), and Company-seeded WebsiteTenantSettings.
//     Presentation data is seeded ONLY from canonical Company truth — never
//     invented. Canonical Company is never modified.
//   - product workflow starts at draft; technical status stays 'setup' → the
//     runtime fails closed (site_not_live) until an explicit launch.
// Legacy path (no created_via) is byte-for-byte behavior-preserved.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  RESERVED_SLUGS,
  SITES_HOST,
  normalizeSlug,
  getCompanyForMember,
  evaluateWebsiteEntitlement,
  validateLifecycleTransition,
  arbitrateUniqueness
} from '../../shared/websiteTenantService.ts';

const MANAGEMENT_MODES = ['admin_managed', 'client_managed', 'collaborative'];

function err(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return err('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'provision';

    if (action === 'provision') return await provision(base44, service, user, body);
    if (action === 'attach_destination') return await attachDestination(service, user, body);
    if (action === 'set_status') return await setStatus(service, user, body);
    return err('unknown_action', 'Supported actions: provision, attach_destination, set_status', 400);
  } catch (error) {
    console.error('provisionWebsiteTenant error:', error && error.message);
    return err('internal_error', 'Unexpected error', 500);
  }
}

async function provision(base44, service, user, body) {
  const name = String(body.name || '').trim();
  if (!name || name.length > 120) return err('name_required', 'A website name (1-120 chars) is required', 400);

  const createdViaLlbb = body.created_via === 'llbb';
  const adminLlbb = createdViaLlbb && user.role === 'admin';

  // 1-3: identity resolution. LLBB admin path selects an existing Company
  // directly (admins are not members of client companies); everything else is
  // the certified strict-membership path, unchanged.
  let company;
  if (adminLlbb) {
    company = await service.entities.Company.get(body.company_id || '').catch(() => null);
    if (!company) return err('company_not_found', 'Company not found', 404);
  } else {
    const resolved = await getCompanyForMember(service, user, body.company_id || null);
    if (resolved.error) return Response.json({ error: resolved.error }, { status: resolved.status || 403 });
    company = resolved.company;
  }

  // 4: Company status must permit operation.
  if (company.status !== 'active') return err('company_not_eligible', `Company status is '${company.status}' — provisioning denied`, 403);

  // Idempotent replay — short-circuits BEFORE entitlement/capacity checks.
  if (body.idempotency_key) {
    const replayPage = await service.entities.WebsiteTenant.filter(
      { company_id: company.id, idempotency_key: body.idempotency_key }, { limit: 1 });
    const replay = replayPage.items || replayPage;
    if (replay.length > 0) {
      return Response.json({ ok: true, idempotent_replay: true, tenant: replay[0] });
    }
  }

  // 5-7: website entitlement exists and capacity is available.
  const ent = await evaluateWebsiteEntitlement(service, company);
  if (!ent.allowed) return err(ent.reason, 'No operator_website entitlement for this Company', 403);
  const tenantsPage = await service.entities.WebsiteTenant.filter({ company_id: company.id }, { limit: 500 });
  const tenants = tenantsPage.items || tenantsPage;
  const liveCount = tenants.filter(t => t.status !== 'archived').length;
  if (ent.allowance !== 'unlimited' && liveCount >= ent.allowance) {
    return err('entitlement_capacity_exhausted', `Entitlement allows ${ent.allowance} website(s); ${liveCount} in use`, 403);
  }

  // 8-9: slug normalization, reserved policy, availability.
  const slug = normalizeSlug(body.slug || name);
  if (!slug) return err('slug_invalid', 'Slug must be 3-63 chars of letters, digits and hyphens', 400);
  if (RESERVED_SLUGS.includes(slug)) return err('slug_reserved', 'This slug is reserved', 409);

  const slugPage = await service.entities.WebsiteTenant.filter({ slug }, { limit: 5 });
  if ((slugPage.items || slugPage).length > 0) return err('slug_taken', 'This slug is already in use', 409);

  // Management mode is stored explicitly for LLBB tenants (controls UI access
  // only — never server authorization).
  const managementMode = MANAGEMENT_MODES.includes(body.management_mode) ? body.management_mode : 'admin_managed';

  // Create (service role — the ONLY tenant-creation path).
  const created = await service.entities.WebsiteTenant.create({
    company_id: company.id,
    name,
    slug,
    status: 'setup',
    member_user_ids: company.member_user_ids || [],
    auto_publish_enabled: body.auto_publish_enabled === false ? false : true,
    settings_version: 1,
    entitlement_tier: ent.tier || null,
    idempotency_key: body.idempotency_key || null,
    ...(createdViaLlbb ? {
      management_mode: managementMode,
      workflow_status: 'draft',
      workflow_updated_at: new Date().toISOString(),
      workflow_updated_by: user.id,
      setup_manager_user_id: body.setup_manager_user_id || user.id,
      created_via: 'llbb'
    } : {})
  });

  // Concurrency arbitration: oldest tenant with this slug wins.
  const arb = await arbitrate(service, 'WebsiteTenant', { slug }, created.id);
  if (arb.collided) return Response.json({ error: arb.error }, { status: 409 });

  // Phase 4A — LLBB resource stack. Non-LLBB tenants take the certified legacy
  // path with NO new records (Legacy Lane freeze respected).
  if (createdViaLlbb) {
    const tenant = arb.record || created;
    const stack = await provisionLlbbStack(service, tenant, company, user, slug);
    if (stack.error) return Response.json({ error: stack.error }, { status: stack.status || 409 });
    return Response.json({
      ok: true,
      tenant: stack.tenant,
      destination: stack.destination,
      domain: stack.domain,
      entitlement: { tier: ent.tier, allowance: ent.allowance, used: liveCount + 1 }
    });
  }

  return Response.json({
    ok: true,
    tenant: arb.record || created,
    entitlement: { tier: ent.tier, allowance: ent.allowance, used: liveCount + (arb.collided ? 0 : 1) }
  });
}

// ── Phase 4A: runtime_served Destination + platform subdomain + seed settings ──
async function provisionLlbbStack(service, tenant, company, user, slug) {
  // Destination: runtime_served — the certified adapter returns a no-op
  // delivery success; NO webhook_url, NO auth secret, NO receiver.
  const destination = await service.entities.Destination.create({
    company_id: company.id, // Destination Company invariant
    name: `${tenant.name} Website`,
    destination_type: 'operator_website',
    status: 'active',
    configuration: { delivery_mode: 'runtime_served' },
    capabilities: ['sale_details', 'inventory', 'media', 'pricing', 'sold_status', 'cancellation', 'completion'],
    notes: 'LLBB runtime-served destination (Phase 4A) — canonical rendering, no external receiver.'
  });

  // Platform subdomain — included product hostname. Domain record exists, but
  // the runtime fails closed while the tenant is in 'setup' (draft privacy).
  const hostname = `${slug}.${SITES_HOST}`;
  const domain = await service.entities.WebsiteDomain.create({
    website_tenant_id: tenant.id,
    company_id: company.id,
    hostname,
    domain_type: 'platform_subdomain',
    status: 'active',
    is_primary: true,
    member_user_ids: tenant.member_user_ids || []
  });
  const domArb = await arbitrateUniqueness(service, 'WebsiteDomain', { hostname }, domain.id, 'hostname_taken', 409);
  if (domArb.collided) {
    // Compensate: remove this provisioning's partial records.
    await service.entities.Destination.delete(destination.id).catch(() => {});
    await service.entities.WebsiteTenant.delete(tenant.id).catch(() => {});
    return { error: { code: 'slug_taken', message: 'Platform hostname unavailable — concurrent reservation lost' }, status: 409 };
  }

  // Seed presentation from canonical Company truth — never invent data.
  const logo = (company.logo_url && typeof company.logo_url === 'string' && company.logo_url.startsWith('http')) ? company.logo_url : null;
  const settings = await service.entities.WebsiteTenantSettings.create({
    website_tenant_id: tenant.id,
    company_id: company.id, // derived server-side — never client-supplied
    is_active: true,
    member_user_ids: tenant.member_user_ids || [],
    site_title: tenant.name,
    display_business_name: company.display_name || company.legal_name || tenant.name,
    branding: { logo_url: logo },
    contact: {
      use_company_phone: !!company.phone,
      use_company_email: !!company.email,
      phone_display: null,
      email_display: null,
      address_display: [company.city, company.state].filter(Boolean).join(', ') || null
    },
    settings_version: 1
  });

  const updated = await service.entities.WebsiteTenant.update(tenant.id, { destination_id: destination.id });
  return { tenant: updated, destination, domain, settings };
}

async function attachDestination(service, user, body) {
  if (user.role !== 'admin') return err('admin_only', 'Destination association is platform-admin controlled', 403);
  const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
  const tenant = (tenantPage.items || tenantPage)[0];
  if (!tenant) return err('tenant_not_found', 'Website tenant not found', 404);
  if (tenant.status === 'archived') return err('tenant_archived', 'Archived tenants cannot change associations', 409);
  if (!body.destination_id) {
    const detached = await service.entities.WebsiteTenant.update(tenant.id, { destination_id: null });
    return Response.json({ ok: true, tenant: detached });
  }
  const destPage = await service.entities.Destination.filter({ id: body.destination_id }, { limit: 1 });
  const destination = (destPage.items || destPage)[0];
  if (!destination) return err('destination_not_found', 'Destination not found', 404);
  // Cross-company invariant: fail closed.
  if (destination.company_id !== tenant.company_id) {
    return err('cross_company_destination', 'Destination belongs to a different Company — attachment denied', 403);
  }
  if (destination.destination_type !== 'operator_website') {
    return err('unsupported_destination_type', 'Only operator_website destinations can attach to a website tenant', 400);
  }
  const otherPage = await service.entities.WebsiteTenant.filter({ destination_id: destination.id }, { limit: 25 });
  const others = (otherPage.items || otherPage).filter(t => t.id !== tenant.id && t.status !== 'archived');
  if (others.length > 0) return err('destination_already_attached', 'Destination is already associated with another active tenant', 409);
  const updated = await service.entities.WebsiteTenant.update(tenant.id, { destination_id: destination.id });
  return Response.json({ ok: true, tenant: updated });
}

async function setStatus(service, user, body) {
  const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
  const tenant = (tenantPage.items || tenantPage)[0];
  if (!tenant) return err('tenant_not_found', 'Website tenant not found', 404);
  // Authorization chain: Company membership (via tenant projection) or platform admin.
  const isAdmin = user.role === 'admin';
  const isMember = (tenant.member_user_ids || []).includes(user.id);
  if (!isAdmin && !isMember) return err('not_tenant_member', 'Caller is not authorized for this website tenant', 403);
  const target = body.status;
  const check = validateLifecycleTransition(tenant.status, target);
  if (!check.ok) return err(check.reason, `Cannot transition ${tenant.status} → ${target}`, 409);
  const now = new Date().toISOString();
  const patch = { status: target, status_reason: body.reason || null };
  if (target === 'active') patch.activated_at = tenant.activated_at || now;
  if (target === 'suspended') { patch.suspended_at = now; patch.suspended_by = user.id; }
  if (target === 'archived') { patch.archived_at = now; patch.archived_by = user.id; }
  const updated = await service.entities.WebsiteTenant.update(tenant.id, patch);
  return Response.json({ ok: true, tenant: updated });
}

async function arbitrate(service, entityName, filter, createdId) {
  const page = await service.entities[entityName].filter(filter, { limit: 25, sort: 'created_date' });
  const rows = page.items || page;
  if (rows.length > 1) {
    const oldest = rows[0];
    if (oldest.id !== createdId) {
      await service.entities[entityName].delete(createdId);
      return { collided: true, error: { code: 'slug_taken', message: 'slug taken — concurrent reservation lost' } };
    }
  }
  return { collided: false, record: rows.length === 1 ? rows[0] : createdId };
}