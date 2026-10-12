// Phase 4E (Parts 19–27) — WEBSITE SEO CENTER shared engine.
// Non-expert-safe: deterministic safe defaults, honest health scoring, and
// page-level presentation SEO. The included EstateSalen subdomain is ALWAYS a
// valid, launchable, indexable identity — a custom domain is optional.
import { SITES_HOST } from './websiteTenantService.ts';

// Platform-controlled template page vocabulary (Part 21). Never arbitrary.
export const PAGE_SEO_KEYS = ['home', 'estate_sales', 'sale_detail', 'services', 'service_detail', 'about', 'gallery', 'faq', 'contact'];

const clean = (v) => (v == null ? '' : String(v).trim());

export function businessNameOf(settings, company) {
  return (settings && settings.display_business_name)
    || (company && (company.display_name || company.legal_name))
    || (settings && settings.site_title)
    || 'Estate Sale Company';
}

// ── Deterministic safe defaults (Part 22) ─────────────────────────────────────
// Every operator gets sane, non-expert SEO with zero configuration.
export function pageSeoDefaults(kind, opts = {}) {
  const settings = opts.settings || {};
  const company = opts.company || {};
  const name = businessNameOf(settings, company);
  const city = (settings.business && settings.business.primary_city) || company.city || null;
  const state = (settings.business && settings.business.states_served && settings.business.states_served[0]) || company.state || null;
  const where = city ? ` in ${city}${state ? ', ' + state : ''}` : '';
  const shortDesc = (settings.business && settings.business.short_description) || null;
  const baseDesc = (settings.seo && settings.seo.default_description) || shortDesc
    || `Professional estate sale services${where}. Browse upcoming estate sales, services and contact ${name}.`;

  switch (kind) {
    case 'home':
      return { title: (settings.tagline ? `${name} | ${settings.tagline}` : name).slice(0, 200), description: baseDesc.slice(0, 500) };
    case 'estate_sales':
      return { title: `Estate Sales | ${name}`, description: `Upcoming estate sales from ${name}${where}. Dates, locations and featured items.`.slice(0, 500) };
    case 'sale_detail':
      return { title: `${opts.saleTitle || 'Estate Sale'} | Estate Sale | ${name}`.slice(0, 200), description: (opts.saleDescription || baseDesc).slice(0, 500) };
    case 'services':
      return { title: `Services | ${name}`, description: `Estate sale services offered by ${name}${where}.`.slice(0, 500) };
    case 'service_detail':
      return { title: `${opts.serviceTitle || 'Service'} | Services | ${name}`.slice(0, 200), description: (opts.serviceDescription || baseDesc).slice(0, 500) };
    case 'about': return { title: `About | ${name}`, description: `About ${name}${where}.` };
    case 'gallery': return { title: `Gallery | ${name}`, description: `Photos from past estate sales by ${name}.` };
    case 'faq': return { title: `FAQ | ${name}`, description: `Frequently asked questions about working with ${name}.` };
    case 'contact': return { title: `Contact | ${name}`, description: `Contact ${name}${where}.` };
    default: return { title: name, description: baseDesc };
  }
}

// ── Page SEO resolution (Parts 21/22/23) ─────────────────────────────────────
// Operator overrides (settings.page_seo[key]) win; blanks fall back to
// deterministic defaults. Canonical URL is built from the PRIMARY public
// hostname (Part 23) — switching primary re-canonicalizes every page.
export function resolvePageSeo(kind, { settings, company, domains, saleTitle, saleDescription, serviceTitle, serviceDescription, pathSuffix }) {
  const defaults = pageSeoDefaults(kind, { settings, company, saleTitle, saleDescription, serviceTitle, serviceDescription });
  const overrides = (settings && settings.page_seo && settings.page_seo[kind]) || {};
  const socialDefault = (settings && settings.seo && settings.seo.social_image_url)
    || (settings && settings.branding && settings.branding.logo_url) || null;
  const origin = canonicalOrigin(domains, settings);
  return {
    title: (overrides.title || defaults.title || '').slice(0, 200),
    description: (overrides.description || defaults.description || '').slice(0, 500),
    social_image_url: overrides.social_image_url || socialDefault,
    canonical_url: `${origin}${pathSuffix || ''}`,
    origin
  };
}

// Primary public hostname: the tenant's chosen primary domain, else the
// included platform subdomain (Parts 15/23). Preview hosts never win.
export function canonicalOrigin(domains, settings) {
  const list = (domains || []).filter(d => d && d.status !== 'disconnected');
  const primary = list.find(d => d.is_primary) || list.find(d => d.domain_type === 'platform_subdomain');
  return `https://${primary ? primary.hostname : `${(settings && settings.tenant_slug) || 'site'}.${SITES_HOST}`}`;
}

// ── SEO HEALTH SCORE (Parts 19/20) ────────────────────────────────────────────
// Honest, non-punitive: the included subdomain is a fully valid identity, so a
// missing custom domain is INFORMATIONAL, never a deduction (Part 19).
export function seoHealth({ settings, domains, tenant }) {
  const s = settings || {};
  const seo = s.seo || {};
  const items = [];
  let score = 100;
  const deduct = (n) => { score = Math.max(0, score - n); };

  const titleOk = !!(seo.default_title || s.site_title || s.display_business_name);
  items.push({ key: 'site_title', label: 'Site title', status: titleOk ? 'pass' : 'missing', detail: titleOk ? (seo.default_title || s.display_business_name) : 'Add a default SEO title.' });
  if (!titleOk) deduct(20);

  const descOk = !!(seo.default_description || (s.business && s.business.short_description));
  items.push({ key: 'description', label: 'Description', status: descOk ? 'pass' : 'missing', detail: descOk ? 'Default description set.' : 'Add a default meta description.' });
  if (!descOk) deduct(15);

  // Template #1 is responsive by construction — informational pass.
  items.push({ key: 'mobile', label: 'Mobile friendly', status: 'pass', detail: 'The website template is responsive on all devices.' });

  items.push({ key: 'sitemap', label: 'Sitemap', status: 'pass', detail: 'A tenant sitemap is generated automatically for live websites.' });
  items.push({ key: 'secure', label: 'Secure website', status: 'pass', detail: 'Served over HTTPS with platform-managed SSL.' });

  // Missing alt text across gallery items + services images (capped warning).
  let missingAlt = 0;
  for (const it of ((s.gallery && s.gallery.items) || [])) {
    if (it && it.image_url && !String(it.alt_text || '').trim()) missingAlt++;
  }
  for (const it of ((s.services && s.services.items) || [])) {
    if (it && it.image_url && !String(it.alt_text || '').trim()) missingAlt++;
  }
  if ((s.homepage && s.homepage.hero_image_url) && !((s.homepage || {}).hero_alt_text)) missingAlt++;
  items.push({
    key: 'alt_text', label: 'Image alt text',
    status: missingAlt === 0 ? 'pass' : 'warning',
    detail: missingAlt === 0 ? 'All images have alt text.' : `Missing alt text on ${missingAlt} image${missingAlt === 1 ? '' : 's'}.`
  });
  deduct(Math.min(missingAlt * 3, 12));

  const custom = (domains || []).filter(d => d.domain_type === 'custom_domain' && d.status !== 'disconnected');
  items.push({
    key: 'custom_domain', label: 'Custom domain',
    status: custom.length > 0 ? 'pass' : 'info',
    detail: custom.length > 0
      ? custom.map(d => d.hostname).join(', ')
      : 'Custom domain not connected — your included EstateSalen address is fully valid and searchable.'
  });

  const searchVisibility = seo.search_visibility === 'noindex' ? 'noindex' : 'index';
  items.push({
    key: 'search_visibility', label: 'Search visibility',
    status: searchVisibility === 'index' ? 'pass' : 'warning',
    detail: searchVisibility === 'index' ? 'Search engines may index the website.' : 'Search indexing is turned off — the website will not appear in search results.'
  });
  if (searchVisibility === 'noindex') deduct(25);

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 85 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Work';
  return { score, grade, items, search_visibility: searchVisibility };
}