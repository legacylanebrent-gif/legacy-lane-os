// WebsiteTenantSettings service (Phase 3D.1 — Parts 2/4/18).
// Presentation configuration belonging to a WebsiteTenant. NOT operational
// Company truth, NOT canonical Sale truth. Ownership flows through
// WebsiteTenant → Company → membership; company_id is always derived
// server-side from the tenant (never trusted from the client).

import { assertTenantAccess } from './websiteTenantService.ts';

// Platform defaults — a tenant renders fully WITHOUT a settings record
// (presentation optionality, Part 16).
export function defaultPublicSettings(company) {
  return {
    site_title: null,
    display_business_name: company ? (company.display_name || company.legal_name || null) : null,
    tagline: null,
    branding: { logo_url: null, alternate_logo_url: null, favicon_url: null, primary_color: null, secondary_color: null, accent_color: null, background_color: null, text_color: null, heading_font_family: null, body_font_family: null },
    contact: { phone: null, email: null, address_display: null, contact_cta_label: null },
    social: { facebook: null, instagram: null, twitter: null, youtube: null, pinterest: null },
    homepage: { hero_headline: null, hero_subheadline: null, hero_image_url: null, intro_copy: null, cta_label: null, cta_link: null },
    about: { headline: null, body: null },
    services: { headline: null, intro: null, items: [] },
    cta: { label: null, sublabel: null, link: null },
    seo: { default_title: null, default_description: null, social_image_url: null },
    faq: { headline: null, items: [] },
    testimonials: { headline: null, items: [] },
    legal: { privacy_policy_text: null, terms_text: null },
    sale_display: { show_sold_items: true, show_prices: true },
    inventory_display: { show_prices: true, show_condition: true },
    settings_version: 1
  };
}

export async function getTenantSettings(service, tenantId) {
  const page = await service.entities.WebsiteTenantSettings.filter(
    { website_tenant_id: tenantId, is_active: true }, { limit: 5, sort: 'created_date' });
  const rows = page.items || page;
  return rows[0] || null; // MVP: one active configuration; oldest is authoritative
}

// PUBLIC PROJECTION (Part 18): allowlist only. NEVER exposes: notes,
// member_user_ids, internal record ids, or any Company operational internals.
// Contact presentation is operator-authored display copy; Company values flow
// through ONLY when the operator explicitly opted in (use_company_*).
export function projectPublicSettings(settings, company) {
  if (!settings) return defaultPublicSettings(company);
  const b = settings.branding || {}, c = settings.contact || {}, so = settings.social || {},
    h = settings.homepage || {}, ab = settings.about || {}, sv = settings.services || {},
    ct = settings.cta || {}, seo = settings.seo || {}, faq = settings.faq || {},
    ts = settings.testimonials || {},
    lg = settings.legal || {}, sd = settings.sale_display || {}, idp = settings.inventory_display || {};
  const companyPhone = company ? (company.phone || null) : null;
  const companyEmail = company ? (company.email || null) : null;
  return {
    site_title: settings.site_title || null,
    display_business_name: settings.display_business_name || (company ? (company.display_name || company.legal_name || null) : null),
    tagline: settings.tagline || null,
    branding: {
      logo_url: b.logo_url || null, alternate_logo_url: b.alternate_logo_url || null, favicon_url: b.favicon_url || null,
      primary_color: b.primary_color || null, secondary_color: b.secondary_color || null, accent_color: b.accent_color || null,
      background_color: b.background_color || null, text_color: b.text_color || null,
      heading_font_family: b.heading_font_family || null, body_font_family: b.body_font_family || null
    },
    contact: {
      phone: c.use_company_phone === false ? (c.phone_display || null) : (companyPhone || c.phone_display || null),
      email: c.use_company_email === false ? (c.email_display || null) : (companyEmail || c.email_display || null),
      address_display: c.address_display || null,
      contact_cta_label: c.contact_cta_label || null
    },
    social: {
      facebook: so.facebook || null, instagram: so.instagram || null, twitter: so.twitter || null,
      youtube: so.youtube || null, pinterest: so.pinterest || null
    },
    homepage: {
      hero_headline: h.hero_headline || null, hero_subheadline: h.hero_subheadline || null,
      hero_image_url: h.hero_image_url || null, intro_copy: h.intro_copy || null,
      cta_label: h.cta_label || null, cta_link: h.cta_link || null
    },
    about: { headline: ab.headline || null, body: ab.body || null },
    services: {
      headline: sv.headline || null, intro: sv.intro || null,
      items: (Array.isArray(sv.items) ? sv.items : []).map(it => ({
        title: it && it.title || null, description: it && it.description || null
      }))
    },
    cta: { label: ct.label || null, sublabel: ct.sublabel || null, link: ct.link || null },
    seo: {
      default_title: seo.default_title || null, default_description: seo.default_description || null,
      social_image_url: seo.social_image_url || null
    },
    faq: {
      headline: faq.headline || null,
      items: (Array.isArray(faq.items) ? faq.items : []).map(qa => ({
        question: qa && qa.question || null, answer: qa && qa.answer || null
      }))
    },
    testimonials: {
      headline: ts.headline || null,
      items: (Array.isArray(ts.items) ? ts.items : []).slice(0, 20).map(t => ({
        quote: t && t.quote || null, name: t && t.name || null, context: t && t.context || null
      }))
    },
    legal: { privacy_policy_text: lg.privacy_policy_text || null, terms_text: lg.terms_text || null },
    sale_display: { show_sold_items: sd.show_sold_items !== false, show_prices: sd.show_prices !== false },
    inventory_display: { show_prices: idp.show_prices !== false, show_condition: idp.show_condition !== false },
    settings_version: settings.settings_version || 1
  };
}

export async function getPublicWebsiteSettingsProjection(service, ctx) {
  const settings = await getTenantSettings(service, ctx.tenant.id);
  return projectPublicSettings(settings, ctx.company);
}

// Admin/member edit authorization: tenant access (admin role OR company member).
export function assertSettingsAccess(user, tenant) {
  return assertTenantAccess(user, tenant);
}

// Structure-safe update sanitizer (Parts 4/6): strict key allowlist — no
// arbitrary CSS, no unknown categories, no operational Company fields.
const SUB_KEYS = {
  branding: ['logo_url', 'alternate_logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color', 'heading_font_family', 'body_font_family'],
  contact: ['use_company_phone', 'phone_display', 'use_company_email', 'email_display', 'address_display', 'contact_cta_label'],
  social: ['facebook', 'instagram', 'twitter', 'youtube', 'pinterest'],
  homepage: ['hero_headline', 'hero_subheadline', 'hero_image_url', 'intro_copy', 'cta_label', 'cta_link'],
  about: ['headline', 'body'],
  services: ['headline', 'intro', 'items'],
  cta: ['label', 'sublabel', 'link'],
  seo: ['default_title', 'default_description', 'social_image_url'],
  faq: ['headline', 'items'],
  testimonials: ['headline', 'items'],
  legal: ['privacy_policy_text', 'terms_text'],
  sale_display: ['show_sold_items', 'show_prices'],
  inventory_display: ['show_prices', 'show_condition']
};
const TOP_KEYS = ['site_title', 'display_business_name', 'tagline', ...Object.keys(SUB_KEYS), 'settings_version', 'notes'];
const str = v => (typeof v === 'string' ? v.slice(0, 20000) : undefined);

export function sanitizeSettingsPayload(payload) {
  const out = {};
  for (const k of TOP_KEYS) {
    if (payload[k] === undefined) continue;
    if (SUB_KEYS[k]) {
      const v = payload[k];
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      const cleaned = {};
      for (const sk of SUB_KEYS[k]) {
        if (v[sk] === undefined) continue;
        if (sk === 'items') continue; // handled below (structured arrays)
        if (typeof v[sk] === 'boolean') cleaned[sk] = v[sk];
        else { const s = str(v[sk]); if (s !== undefined) cleaned[sk] = s; }
      }
      if (Array.isArray(v.items)) {
        cleaned.items = v.items.slice(0, 50).map(it => {
          const o = it && typeof it === 'object' ? it : {};
          if (k === 'services') return { title: str(o.title) || '', description: str(o.description) || '' };
          if (k === 'testimonials') return { quote: str(o.quote) || '', name: str(o.name) || '', context: str(o.context) || '' };
          return { question: str(o.question) || '', answer: str(o.answer) || '' };
        });
      }
      out[k] = cleaned;
    } else if (k === 'settings_version') {
      if (Number.isInteger(payload[k])) out[k] = payload[k];
    } else {
      const s = str(payload[k]);
      if (s !== undefined) out[k] = s;
    }
  }
  return out;
}