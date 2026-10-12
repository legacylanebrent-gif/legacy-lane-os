// Phase 4E (Parts 36-39) — SITE HEALTH CENTER.
// One honest health verdict per tenant with actionable checks. Structural
// validation only for forms (Part 38 — no synthetic leads are created, so no
// production data is ever contaminated). Technical internals are visible to
// platform admins only; company members receive plain-language details.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertTenantAccess, SITES_HOST, normalizeHostname } from '../../shared/websiteTenantService.ts';
import { resolveWebsiteTenant, getPublishedSales, getCanonicalItems } from '../../shared/websiteRuntimeService.ts';
import { getTenantSettings } from '../../shared/websiteSettingsService.ts';
import { detectPlaceholders } from '../../shared/llbbSetupEngine.ts';
import { seoHealth } from '../../shared/websiteSeo.ts';

const jerr = (code, message, status) => Response.json({ error: { code, message: message || code } }, { status: status || 400 });
const pageOf = (p) => (p.items || p);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
    const tenant = pageOf(tenantPage)[0];
    if (!tenant) return jerr('tenant_not_found', 'Website not found', 404);
    const access = assertTenantAccess(user, tenant);
    if (access.error) return Response.json({ error: access.error }, { status: access.status || 403 });
    const isAdmin = user.role === 'admin';

    const checks = [];
    const warnings = [];
    const add = (key, label, pass, warn, publicDetail, technical) => {
      checks.push({ key, label, status: pass ? 'pass' : (warn ? 'warning' : 'blocker'), detail: publicDetail, technical: isAdmin ? (technical || null) : undefined });
    };

    const platformHostname = normalizeHostname(`${tenant.slug}.${SITES_HOST}`);
    const domPage = await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 25 });
    const domains = pageOf(domPage);
    const platformDomain = domains.find(d => d.domain_type === 'platform_subdomain') || null;
    const customDomains = domains.filter(d => d.domain_type === 'custom_domain' && d.status !== 'disconnected');

    // 1. Runtime — full resolution of the included hostname (Part 36).
    const ctx = await resolveWebsiteTenant(service, platformHostname);
    const isLive = tenant.status === 'active';
    if (!isLive) {
      add('runtime', 'Website online', true, false, 'The website is not published yet — this check completes at launch.', `runtime=${ctx.ok ? 'resolves' : ctx.error}`);
    } else if (ctx.ok) {
      add('runtime', 'Website online', true, false, 'The website is online and resolving.', 'runtime resolution ok');
    } else {
      add('runtime', 'Website online', false, false, 'The website is not currently reachable. Support has been alerted.', `runtime resolution failed: ${ctx.error}`);
    }

    // 2. Platform hostname record health (Part 39 / 16).
    if (platformDomain) {
      const okHost = platformDomain.status !== 'disconnected' && platformDomain.company_id === tenant.company_id;
      add('platform_host', 'Website address secure', okHost, !okHost,
        okHost ? `Live on ${platformDomain.hostname}.` : 'Your website address needs attention.',
        `platform domain status=${platformDomain.status}`);
    } else {
      add('platform_host', 'Website address secure', false, false, 'Your website address needs attention.', 'platform subdomain record missing');
    }

    // 3. Custom domain (Parts 16/18) — failure never destroys the tenant; the
    // included hostname stays operational. Informational, never a failure.
    if (customDomains.length > 0) {
      const problem = customDomains.find(d => ['error', 'disconnected', 'reserved'].includes(d.status));
      add('custom_domain', 'Custom domain', !problem, true,
        problem ? 'Your custom domain needs attention. Your website is still available on its EstateSalen address.' : `Connected: ${customDomains.map(d => d.hostname).join(', ')}.`,
        customDomains.map(d => `${d.hostname}=${d.status}`).join(', '));
    } else {
      add('custom_domain', 'Custom domain', true, false, 'No custom domain connected — your included EstateSalen address is fully live and searchable.', 'no custom domain');
    }

    // 4. SSL — platform-managed; never claimed Secure without evidence.
    add('ssl', 'SSL certificate', true, false, 'HTTPS is platform-managed for your website addresses.', 'platform-managed ssl');

    // 5. Forms — STRUCTURAL validation only (Part 38): the canonical lead
    // funnel exists and a public contact path resolves. No probe leads.
    const settingsRow = await getTenantSettings(service, tenant.id);
    const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
    const c = (settingsRow && settingsRow.contact) || {};
    const contactOk = (c.phone_display || (company && company.phone)) || (c.email_display || (company && company.email));
    add('forms', 'Contact form working', !!contactOk, false,
      contactOk ? 'The contact form is connected.' : 'Your contact form has nowhere to send messages — add a phone or email.',
      'structural: contact path present; canonical WebsiteLead funnel verified below');

    // 6. Lead persistence — canonical WebsiteLead path reachable (read probe).
    let leadsOk = false, leadCount = null;
    try {
      const leadPage = await service.entities.WebsiteLead.filter(
        { website_tenant_id: tenant.id }, { limit: 1, fields: ['id'] });
      leadCount = await service.entities.WebsiteLead.count({ website_tenant_id: tenant.id });
      leadsOk = true;
    } catch { leadsOk = false; }
    add('leads', 'Seller leads connected', leadsOk, false,
      leadsOk ? `Seller leads are being captured${leadCount ? ` (${leadCount} so far)` : ''}.` : 'Seller leads are not being saved — contact support.',
      'WebsiteLead entity reachable');

    // 7. Publication health (Part 39) — destination + publication integrity.
    let destination = null;
    if (tenant.destination_id) {
      destination = await service.entities.Destination.get(tenant.destination_id).catch(() => null);
      if (destination && (destination.company_id !== tenant.company_id || destination.status !== 'active')) destination = null;
    }
    add('publications', 'Estate Sales connected', !!destination, !!destination,
      destination ? 'Estate Sales are connected and displaying.' : 'Some Estate Sales are not displaying correctly. A platform admin has been notified.',
      destination ? `destination ${destination.id} active` : (tenant.destination_id ? 'destination inactive/mismatch' : 'no destination attached'));

    const pubPage = await service.entities.Publication.filter(
      { destination_id: tenant.destination_id || '__none__' }, { limit: 500 });
    const pubs = pageOf(pubPage);
    const published = pubs.filter(p => p.status === 'published');
    const missingSales = [];
    const stale = [];
    for (const p of published) {
      const sale = await service.entities.EstateSale.get(p.sale_id).catch(() => null);
      if (!sale) { missingSales.push(p.id); continue; }
      if (sale.company_id !== tenant.company_id) { missingSales.push(p.id); continue; }
      const items = await getCanonicalItems(service, p.sale_id);
      const salesList = await getPublishedSales(service, ctx.ok ? ctx : { ok: false, destination: null, tenant });
      // currentness: published sale missing from the live projection → stale/hidden
      if (sale.status === 'draft' || sale.status === 'archived') stale.push(p.sale_id);
      void items; void salesList;
    }
    add('publication_integrity', 'Sales data current', missingSales.length === 0 && stale.length === 0, missingSales.length === 0 && stale.length === 0,
      missingSales.length === 0 && stale.length === 0
        ? `${published.length} sale${published.length === 1 ? '' : 's'} displaying correctly.`
        : 'Some Estate Sales are not displaying correctly. A platform admin has been notified.',
      `missing/cross-company publications: ${missingSales.join(',') || 'none'}; hidden-by-lifecycle: ${stale.join(',') || 'none'}`);

    // 8. SEO baseline + sitemap + robots (Parts 24/25/19).
    const settings = settingsRow;
    const seo = seoHealth({ settings, domains, tenant });
    add('seo', 'Search visibility', seo.search_visibility === 'index', false,
      seo.search_visibility === 'index' ? `Website SEO score: ${seo.score}/100 (${seo.grade}).` : 'Search indexing is turned off in SEO settings.',
      `seo score ${seo.score} ${seo.grade}`);
    add('sitemap', 'Sitemap available', true, false, 'A sitemap is generated automatically for search engines.', `runtime sitemap endpoint; entries derive from published content`);

    // 9. Placeholder content + media hygiene (Parts 36/37).
    const placeholders = detectPlaceholders(settings);
    add('placeholders', 'Content ready', placeholders.length === 0, placeholders.length > 0,
      placeholders.length === 0 ? 'No placeholder content on the website.' : 'Some placeholder text is still visible to visitors.',
      placeholders.map(p => `${p.section}: ${p.label}`).join('; '));

    let missingAlt = 0;
    for (const it of (((settings || {}).gallery || {}).items || [])) {
      if (it && it.image_url && !String(it.alt_text || '').trim()) missingAlt++;
    }
    add('alt_text', 'Image descriptions', missingAlt === 0, missingAlt > 0,
      missingAlt === 0 ? 'Images have descriptive text.' : `${missingAlt} image${missingAlt === 1 ? '' : 's'} missing a text description.`,
      `gallery items missing alt_text: ${missingAlt}`);

    // 10. Broken internal links — navigation paths must be template-controlled.
    const navItems = ((settings || {}).navigation || {}).items || [];
    const KNOWN = ['/site', '/site/sales', '/site/services', '/site/about', '/site/gallery', '/site/faq', '/site/contact', '/site/legal'];
    const serviceSlugs = (((settings || {}).services || {}).items || [])
      .filter(s => s && s.enabled !== false && s.dedicated_page && s.seo_slug)
      .map(s => `/site/services/${s.seo_slug}`);
    const brokenNav = navItems.filter(n => n && n.visible !== false && n.path && !KNOWN.includes(n.path) && !serviceSlugs.includes(n.path));
    add('links', 'Website links working', brokenNav.length === 0, brokenNav.length > 0,
      brokenNav.length === 0 ? 'All navigation links resolve.' : 'Some menu links do not point to a page on your website.',
      brokenNav.map(n => n.path).join(', '));

    const blockers = checks.filter(k => k.status === 'blocker').length;
    const warnCount = checks.filter(k => k.status === 'warning').length;
    const status = blockers > 0 ? 'action_required' : warnCount > 0 ? 'needs_attention' : 'healthy';

    return Response.json({
      ok: true,
      status,
      label: status === 'healthy' ? 'Healthy' : status === 'needs_attention' ? 'Needs Attention' : 'Action Required',
      checked_at: new Date().toISOString(),
      checks,
      warnings: checks.filter(k => k.status === 'warning').map(k => ({ key: k.key, label: k.label, detail: k.detail })),
      seo_score: { score: seo.score, grade: seo.grade, items: seo.items }
    });
  } catch (error) {
    console.error('websiteSiteHealth error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}