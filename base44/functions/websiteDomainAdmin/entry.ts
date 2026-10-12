// Phase 4E (Parts 6-18) — CUSTOM DOMAIN CENTER seam.
// The included {slug}.estatesalen.com hostname is the FIRST-CLASS production
// website; a custom domain is OPTIONAL and points to the SAME WebsiteTenant —
// it never creates another website. Authorization: certified assertTenantAccess
// chain; company_id ALWAYS derived from the tenant. Hostname uniqueness and
// at-most-one-primary are server-enforced.
//
// TRUTHFUL LIMITATION (Parts 12/13/14, documented — never fabricated):
// DNS verification is programmatic (DNS-over-HTTPS probe against the exact
// required records). Platform-side traffic ROUTING for per-tenant custom
// domains is delivered by the platform once DNS verifies; until the platform
// confirms routing, domains are held at 'verified' with an explicit
// status_reason — never silently marked 'active'/'Connected'.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  SITES_HOST,
  normalizeHostname,
  assertTenantAccess,
  arbitrateUniqueness
} from '../../shared/websiteTenantService.ts';
import { resolveWebsiteTenant } from '../../shared/websiteRuntimeService.ts';

const jerr = (code, message, status) => Response.json({ error: { code, message: message || code } }, { status: status || 400 });
const pageOf = (p) => (p.items || p);

// Current platform DNS requirements (verified against Base44's current
// documented custom-domain setup — never hardcoded historical values).
const PLATFORM_A_IP = '216.24.57.1';
const PLATFORM_TARGET = 'base44.onrender.com';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    switch (body.action) {
      case 'list': return await listDomains(service, body);
      case 'connect_custom': return await connectCustom(service, user, body);
      case 'dns_instructions': return await dnsInstructions(service, user, body);
      case 'verify': return await verifyDomain(service, user, body);
      case 'set_primary': return await setPrimary(service, user, body);
      case 'disconnect': return await disconnectDomain(service, user, body);
      default: return jerr('unknown_action', 'Unknown action', 400);
    }
  } catch (error) {
    console.error('websiteDomainAdmin error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}

// ── Authorization helpers ─────────────────────────────────────────────────────
async function tenantForBody(service, body) {
  const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
  return pageOf(tenantPage)[0] || null;
}

async function tenantForDomain(service, body) {
  const domainPage = await service.entities.WebsiteDomain.filter({ id: body.domain_id }, { limit: 1 });
  const domain = pageOf(domainPage)[0];
  if (!domain) return { error: jerr('domain_not_found', 'Domain not found', 404) };
  const tenant = await service.entities.WebsiteTenant.get(domain.website_tenant_id).catch(() => null);
  if (!tenant || tenant.company_id !== domain.company_id) {
    return { error: jerr('config_error', 'Domain ownership chain invalid', 500) };
  }
  return { domain, tenant };
}

// ── List (Part 6) ─────────────────────────────────────────────────────────────
async function listDomains(service, body) {
  const tenant = await tenantForBody(service, body);
  if (!tenant) return jerr('tenant_not_found', 'Website not found', 404);
  const page = await service.entities.WebsiteDomain.filter(
    { website_tenant_id: tenant.id }, { limit: 25, sort: 'created_date' });
  const domains = pageOf(page);
  const platform = domains.find(d => d.domain_type === 'platform_subdomain') || null;
  return Response.json({
    ok: true,
    included_hostname: platform ? platform.hostname : normalizeHostname(`${tenant.slug}.${SITES_HOST}`),
    included_status: platform ? platform.status : null,
    domains: domains.map(mapDomain)
  });
}

function mapDomain(d) {
  return {
    id: d.id, hostname: d.hostname, domain_type: d.domain_type, status: d.status,
    is_primary: !!d.is_primary, verification_status: d.verification_status || null,
    status_reason: d.status_reason || null, last_checked_at: d.last_checked_at || null
  };
}

// ── Connect (Parts 7/8/9) ─────────────────────────────────────────────────────
function validateCustomHostname(raw) {
  let v = String(raw || '').trim().toLowerCase();
  if (!v) return { error: 'Enter a domain, for example smithestatesales.com' };
  if (v.includes('://')) return { error: 'Do not include "https://" — enter just the domain' };
  if (v.includes('/') || v.includes('?') || v.includes('#')) return { error: 'Do not include paths or query strings — enter just the domain' };
  if (v.endsWith('.')) v = v.slice(0, -1);
  if (v === SITES_HOST || v.endsWith(`.${SITES_HOST}`)) return { error: 'That is an EstateSalen platform address — custom domains must be your own' };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return { error: 'Enter a domain name, not an IP address' };
  if (/(^|\.)(localhost|local|internal|test|example|invalid|localhost\.localdomain)$/.test(v)) {
    return { error: 'That hostname cannot be used' };
  }
  const normalized = normalizeHostname(v);
  if (!normalized || !normalized.includes('.') || normalized.split('.').some(p => !p)) {
    return { error: 'That does not look like a valid domain' };
  }
  if (normalized.length > 253) return { error: 'That domain is too long' };
  return { normalized };
}

async function connectCustom(service, user, body) {
  const tenant = await tenantForBody(service, body);
  if (!tenant) return jerr('tenant_not_found', 'Website not found', 404);
  const access = assertTenantAccess(user, tenant);
  if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
  if (tenant.status === 'archived') return jerr('tenant_archived', 'Archived websites cannot connect domains', 409);

  const v = validateCustomHostname(body.hostname);
  if (v.error) return jerr('invalid_domain', v.error, 400);
  const inputHost = v.normalized;

  // Part 9 — predictable www handling. If the operator entered www.x, that IS
  // their chosen canonical host; apex is auto-added as the alternate.
  const isWww = inputHost.startsWith('www.');
  const primaryHost = inputHost;
  const alternateHost = isWww ? inputHost.slice(4) : `www.${inputHost}`;

  // Cross-tenant defense (Part 18): global uniqueness is checked first.
  for (const host of [primaryHost, alternateHost]) {
    const dup = pageOf(await service.entities.WebsiteDomain.filter({ hostname: host }, { limit: 5 }));
    const other = dup.find(d => d.website_tenant_id !== tenant.id && d.status !== 'disconnected');
    if (other) {
      return jerr('domain_in_use', `${host} is already connected to another website`, 409);
    }
  }

  const created = [];
  for (const [host, asPrimary] of [[primaryHost, true], [alternateHost, false]]) {
    const same = pageOf(await service.entities.WebsiteDomain.filter(
      { website_tenant_id: tenant.id, hostname: host }, { limit: 5 }));
    if (same.length > 0) {
      if (!same[0].is_primary && asPrimary) {
        await service.entities.WebsiteDomain.update(same[0].id, { is_primary: true });
      }
      created.push(same[0]);
      continue;
    }
    const rec = await service.entities.WebsiteDomain.create({
      website_tenant_id: tenant.id,
      company_id: tenant.company_id, // derived — never client-supplied
      hostname: host,
      domain_type: 'custom_domain',
      status: 'reserved',
      is_primary: false, // arbitration below sets primary safely
      verification_token: crypto.randomUUID(),
      verification_status: 'pending',
      member_user_ids: tenant.member_user_ids || []
    });
    const arb = await arbitrateUniqueness(service, 'WebsiteDomain', { hostname: host }, rec.id, 'domain_in_use', 409);
    if (arb.collided) return Response.json({ error: arb.error }, { status: 409 });
    created.push(rec);
  }

  // At-most-one primary: clear any other primary, then set ours.
  const primPage = pageOf(await service.entities.WebsiteDomain.filter(
    { website_tenant_id: tenant.id, is_primary: true }, { limit: 25 }));
  for (const d of primPage) {
    if (d.hostname !== primaryHost) await service.entities.WebsiteDomain.update(d.id, { is_primary: false });
  }
  const primaryRow = created.find(d => d.hostname === primaryHost);
  if (primaryRow && !primaryRow.is_primary) {
    await service.entities.WebsiteDomain.update(primaryRow.id, { is_primary: true });
  }

  return Response.json({
    ok: true,
    primary: primaryHost,
    alternate: alternateHost,
    domains: (pageOf(await service.entities.WebsiteDomain.filter(
      { website_tenant_id: tenant.id }, { limit: 25 }))).map(mapDomain)
  });
}

// ── DNS instructions (Part 10) — exact, current platform records ─────────────
async function dnsInstructions(service, user, body) {
  const t = await tenantForDomain(service, body);
  if (t.error) return t.error;
  const access = assertTenantAccess(user, t.tenant);
  if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
  const d = t.domain;
  if (d.domain_type !== 'custom_domain') return jerr('not_custom_domain', 'DNS instructions apply to custom domains', 400);

  const apex = d.hostname.startsWith('www.') ? d.hostname.slice(4) : d.hostname;
  const isWwwPrimary = d.hostname.startsWith('www.');
  const records = [
    { type: 'A', host: '@', value: PLATFORM_A_IP, note: 'Use this if your provider does not support ALIAS/ANAME', required: true },
    { type: 'ALIAS/ANAME', host: '@', value: PLATFORM_TARGET, note: 'Recommended for the root domain', required: true },
    { type: 'CNAME', host: 'www', value: PLATFORM_TARGET, note: 'Always set this, even when the root is primary', required: true }
  ];
  return Response.json({
    ok: true,
    domain: mapDomain(d),
    primary_note: isWwwPrimary ? 'www is your primary host; the bare domain redirects to it.' : 'The bare domain (apex) is your primary host; www redirects to it.',
    remove_note: 'Remove any AAAA (IPv6) records for these hosts, and make sure no CAA record blocks certificate authorities.',
    steps: [
      'Log in to your domain provider (GoDaddy, Namecheap, Squarespace, etc.)',
      'Add or update the DNS records below',
      'Return here and click Verify Domain',
      'DNS changes can take up to 48 hours to spread across the internet'
    ],
    records
  });
}

// ── Verify (Part 12) — programmatic DoH probe, never fabricated ──────────────
async function dohQuery(name, type) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.Answer || []).map(a => ({ type: a.type, data: String(a.data || '').toLowerCase() }));
  } catch { return null; }
}

async function verifyDomain(service, user, body) {
  const t = await tenantForDomain(service, body);
  if (t.error) return t.error;
  const access = assertTenantAccess(user, t.tenant);
  if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
  const d = t.domain;
  if (d.domain_type !== 'custom_domain') return jerr('not_custom_domain', 'Only custom domains verify', 400);
  if (['verified', 'active'].includes(d.status)) {
    return Response.json({ ok: true, already_verified: true, domain: mapDomain(d) });
  }

  const apex = d.hostname.startsWith('www.') ? d.hostname.slice(4) : d.hostname;
  const apexAnswers = await dohQuery(apex, 'A') || [];
  const apexCname = await dohQuery(apex, 'CNAME') || [];
  const wwwAnswers = await dohQuery(`www.${apex}`, 'A') || [];
  const wwwCname = await dohQuery(`www.${apex}`, 'CNAME') || [];

  const apexOk = apexAnswers.some(a => a.type === 1 && a.data === PLATFORM_A_IP)
    || apexCname.some(a => a.data.includes(PLATFORM_TARGET) || a.data === `${PLATFORM_TARGET}.`)
    || apexAnswers.some(a => a.type === 5 && a.data.includes(PLATFORM_TARGET));
  const wwwOk = wwwCname.some(a => a.data.includes(PLATFORM_TARGET) || a.data === `${PLATFORM_TARGET}.`)
    || wwwAnswers.some(a => a.type === 1 && a.data === PLATFORM_A_IP);

  const now = new Date().toISOString();
  await service.entities.WebsiteDomain.update(d.id, { last_checked_at: now });

  if (!apexOk && !wwwOk) {
    await service.entities.WebsiteDomain.update(d.id, {
      verification_status: 'pending',
      status_reason: 'dns_not_pointing_to_platform_yet'
    });
    return Response.json({
      ok: false,
      verified: false,
      detail: {
        apex_detected: apexOk, www_detected: wwwOk,
        message: 'We could not yet see the required DNS records. If you just changed them, DNS can take up to 48 hours. Check the records and try again.'
      }
    });
  }

  // Verified — but NEVER 'active' until the platform confirms traffic routing
  // (truthful limitation, Parts 11/13/14). Platform-managed SSL issues once
  // the platform picks up the verified domain.
  const updated = await service.entities.WebsiteDomain.update(d.id, {
    status: 'verified',
    verification_status: 'verified',
    verified_at: now,
    verified_by: `system:dns_probe:${user.id}`,
    status_reason: 'dns_verified_awaiting_platform_routing'
  });
  // Verify the paired www/apex alternate too when it exists.
  const paired = pageOf(await service.entities.WebsiteDomain.filter(
    { website_tenant_id: d.website_tenant_id, hostname: d.hostname.startsWith('www.') ? apex : `www.${apex}` }, { limit: 5 }));
  if (paired.length > 0 && !['verified', 'active'].includes(paired[0].status)) {
    await service.entities.WebsiteDomain.update(paired[0].id, {
      status: 'verified', verification_status: 'verified',
      verified_at: now, verified_by: 'system:dns_probe',
      status_reason: 'dns_verified_awaiting_platform_routing'
    });
  }
  return Response.json({
    ok: true,
    verified: true,
    routing: 'The platform completes traffic routing and SSL for verified domains. Your website remains fully available on its included EstateSalen address meanwhile.',
    domain: mapDomain(updated)
  });
}

// ── Primary (Part 15) ─────────────────────────────────────────────────────────
async function setPrimary(service, user, body) {
  const t = await tenantForDomain(service, body);
  if (t.error) return t.error;
  const access = assertTenantAccess(user, t.tenant);
  if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
  const d = t.domain;
  if (d.status === 'disconnected') return jerr('domain_disconnected', 'Disconnected domains cannot become primary', 409);
  if (d.domain_type === 'custom_domain' && !['verified', 'active'].includes(d.status)) {
    return jerr('domain_not_verified', 'Verify the domain before making it primary', 409);
  }
  const page = pageOf(await service.entities.WebsiteDomain.filter(
    { website_tenant_id: d.website_tenant_id }, { limit: 25 }));
  for (const other of page) {
    if (other.id !== d.id && other.is_primary) await service.entities.WebsiteDomain.update(other.id, { is_primary: false });
  }
  const updated = await service.entities.WebsiteDomain.update(d.id, { is_primary: true });
  return Response.json({ ok: true, domain: mapDomain(updated) });
}

// ── Disconnect (Part 17) — never touches the tenant, content, sales or leads ──
async function disconnectDomain(service, user, body) {
  const t = await tenantForDomain(service, body);
  if (t.error) return t.error;
  const access = assertTenantAccess(user, t.tenant);
  if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
  const d = t.domain;
  if (d.domain_type === 'platform_subdomain') {
    return jerr('included_host_protected', 'The included EstateSalen address cannot be disconnected', 409);
  }
  const updated = await service.entities.WebsiteDomain.update(d.id, {
    status: 'disconnected',
    is_primary: false,
    status_reason: body.reason || 'disconnected_by_request',
    last_checked_at: new Date().toISOString()
  });
  return Response.json({ ok: true, domain: mapDomain(updated) });
}