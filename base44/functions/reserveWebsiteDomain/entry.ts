// WebsiteDomain reservation (Phase 3B) — secure identity/lifecycle model only.
// NO DNS provisioning, NO SSL configuration, NO traffic routing.
// Validates: authenticated user → tenant → Company membership chain; normalizes
// hostname; enforces global hostname uniqueness and the at-most-one-primary
// invariant via post-create arbitration; derives company_id from the tenant.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  SITES_HOST,
  normalizeHostname,
  assertTenantAccess,
  arbitrateUniqueness
} from '../../shared/websiteTenantService.ts';

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

    if (body.action === 'detach') return await detachDomain(service, user, body);

    const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
    const tenant = (tenantPage.items || tenantPage)[0];
    const access = assertTenantAccess(user, tenant);
    if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
    if (tenant.status === 'archived') return err('tenant_archived', 'Archived tenants cannot reserve domains', 409);

    // company_id is ALWAYS derived from the tenant — never from the client.
    const companyId = tenant.company_id;
    const domainType = body.domain_type || 'platform_subdomain';
    if (!['platform_subdomain', 'custom_domain'].includes(domainType)) {
      return err('invalid_domain_type', 'domain_type must be platform_subdomain or custom_domain', 400);
    }

    const hostname = normalizeHostname(body.hostname);
    if (!hostname) return err('invalid_hostname', 'Hostname could not be normalized to a valid form', 400);

    if (domainType === 'platform_subdomain') {
      const expected = `${tenant.slug}.${SITES_HOST}`;
      if (hostname !== expected) {
        return err('subdomain_mismatch', `Platform subdomains must be <tenant-slug>.${SITES_HOST} (expected ${expected})`, 400);
      }
    } else {
      if (hostname.endsWith(`.${SITES_HOST}`) || hostname === SITES_HOST) {
        return err('reserved_platform_host', 'The EstateSalen platform host cannot be used as a custom domain', 409);
      }
    }

    // Same tenant + hostname → idempotent return.
    const samePage = await service.entities.WebsiteDomain.filter(
      { website_tenant_id: tenant.id, hostname }, { limit: 5 });
    const same = samePage.items || samePage;
    if (same.length > 0) return Response.json({ ok: true, idempotent_replay: true, domain: same[0] });

    // Primary invariant pre-check (unless the existing primary is this request).
    let isPrimary = body.is_primary === true;
    if (isPrimary) {
      const primPage = await service.entities.WebsiteDomain.filter(
        { website_tenant_id: tenant.id, is_primary: true }, { limit: 10 });
      const primaries = (primPage.items || primPage).filter(d => !['error', 'disconnected'].includes(d.status));
      if (primaries.length > 0) return err('primary_domain_exists', 'This tenant already has a primary domain', 409);
    }

    const created = await service.entities.WebsiteDomain.create({
      website_tenant_id: tenant.id,
      company_id: companyId,
      hostname,
      domain_type: domainType,
      status: 'reserved',
      is_primary: isPrimary,
      verification_token: domainType === 'custom_domain' ? crypto.randomUUID() : null,
      verification_status: 'pending',
      member_user_ids: tenant.member_user_ids || []
    });

    // Global hostname uniqueness arbitration: oldest reservation wins.
    const hostArb = await arbitrateUniqueness(service, 'WebsiteDomain', { hostname }, created.id, 'hostname_taken', 409);
    if (hostArb.collided) return Response.json({ error: hostArb.error }, { status: 409 });

    // Primary invariant post-create arbitration.
    if (isPrimary) {
      const primArbPage = await service.entities.WebsiteDomain.filter(
        { website_tenant_id: tenant.id, is_primary: true }, { limit: 25, sort: 'created_date' });
      const primArb = primArbPage.items || primArbPage;
      if (primArb.length > 1 && primArb[0].id !== created.id) {
        await service.entities.WebsiteDomain.delete(created.id);
        return err('primary_domain_exists', 'Concurrent primary reservation lost — tenant already has a primary domain', 409);
      }
    }

    const finalPage = await service.entities.WebsiteDomain.filter({ id: created.id }, { limit: 1 });
    const finalDomain = (finalPage.items || finalPage)[0] || created;
    return Response.json({ ok: true, domain: finalDomain });
  } catch (error) {
    console.error('reserveWebsiteDomain error:', error && error.message);
    return err('internal_error', 'Unexpected error', 500);
  }
}

async function detachDomain(service, user, body) {
  const domainPage = await service.entities.WebsiteDomain.filter({ id: body.domain_id }, { limit: 1 });
  const domain = (domainPage.items || domainPage)[0];
  if (!domain) return err('domain_not_found', 'Domain not found', 404);
  const tenantPage = await service.entities.WebsiteTenant.filter({ id: domain.website_tenant_id }, { limit: 1 });
  const tenant = (tenantPage.items || tenantPage)[0];
  const access = assertTenantAccess(user, tenant);
  if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
  const updated = await service.entities.WebsiteDomain.update(domain.id, {
    status: 'disconnected',
    is_primary: false,
    status_reason: body.reason || 'disconnected_by_request',
    last_checked_at: new Date().toISOString()
  });
  return Response.json({ ok: true, domain: updated });
}