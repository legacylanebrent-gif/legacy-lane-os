// WebsiteTenantSettings service (Phase 3D.1 + Phase 4B extension).
// Presentation configuration belonging to a WebsiteTenant. NOT operational
// Company truth, NOT canonical Sale truth. Ownership flows through
// WebsiteTenant → Company → membership; company_id is always derived
// server-side from the tenant (never trusted from the client).
// Phase 4B adds the Setup Studio sections: business profile, hero variants,
// homepage section registry, why-choose-us, how-it-works, trust indicators,
// team, gallery, structured policies, navigation manager, footer manager,
// design presets, service library, and strict URL/icon validation.

import { assertTenantAccess } from './websiteTenantService.ts';

// Platform defaults — a tenant renders fully WITHOUT a settings record
// (presentation optionality, Part 16).
export function defaultPublicSettings(company) {
  return {
    site_title: null,
    display_business_name: company ? (company.display_name || company.legal_name || null) : null,
    tagline: null,
    branding: { logo_url: null, alternate_logo_url: null, favicon_url: null, primary_color: null, secondary_color: null, accent_color: null, background_color: null, text_color: null, heading_font_family: null, body_font_family: null, design_preset: null },
    contact: { phone: null, sms_number: null, email: null, inquiry_email: null, mailing_address: null, address_display: null, show_address: true, business_hours: null, contact_cta_label: null },
    social: { facebook: null, instagram: null, twitter: null, youtube: null, pinterest: null, tiktok: null, linkedin: null },
    business: { short_description: null, long_description: null, year_founded: null, years_experience: null, owner_name: null, business_type_label: null, primary_city: null, primary_county: null, counties_served: [], cities_served: [], states_served: [], service_area_notes: null, show_address: false },
    homepage: { hero_headline: null, hero_subheadline: null, hero_image_url: null, hero_layout: null, intro_copy: null, cta_label: null, cta_link: null, secondary_cta_text: null, secondary_cta_link: null, sections: [] },
    why_choose_us: { headline: null, items: [] },
    how_it_works: { headline: null, intro: null, steps: [] },
    trust: { headline: null, items: [] },
    about: { headline: null, body: null, mission: null, owner_bio: null, owner_photo_url: null, team_intro: null, team_photo_url: null, team_members: [] },
    services: { headline: null, intro: null, items: [] },
    gallery: { headline: null, intro: null, items: [] },
    cta: { label: null, sublabel: null, link: null },
    seo: { default_title: null, default_description: null, social_image_url: null },
    faq: { headline: null, items: [] },
    testimonials: { headline: null, items: [] },
    policies: { items: [] },
    navigation: { items: [] },
    footer: { logo_url: null, description: null, copyright_name: null, show_powered_by: true },
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

// ── Controlled vocabularies (platform-owned, never tenant-supplied) ──────────
export const HOMEPAGE_SECTION_KEYS = ['intro', 'services', 'sales', 'why_choose_us', 'how_it_works', 'testimonials', 'service_area', 'cta'];
export const HERO_LAYOUTS = ['overlay', 'centered', 'text_left', 'full_background'];
export const ICON_KEYS = ['users', 'shield', 'heart', 'star', 'package', 'truck', 'tag', 'camera', 'award', 'phone', 'check', 'clock', 'map', 'key', 'briefcase', 'handshake', 'sparkles', 'search', 'dollar', 'archive', 'home', 'wrench', 'calendar', 'clipboard'];
export const NAV_PATHS = ['/site', '/site/sales', '/site/services', '/site/about', '/site/gallery', '/site/faq', '/site/contact', '/site/legal'];
export const GALLERY_CATEGORIES = ['past_sales', 'interesting_finds', 'before_after', 'homes', 'team_at_work', 'success_stories', 'other'];
export const MEDIA_CATEGORIES = ['logo', 'hero', 'company', 'owner_team', 'services', 'gallery', 'testimonials', 'other'];

// ── Public projection helpers ────────────────────────────────────────────────
const httpsUrl = (v) => (typeof v === 'string' && /^https:\/\/\S+$/i.test(v.trim()) && v.length <= 1000) ? v.trim() : null;
const cleanStr = (v, cap) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t.slice(0, cap || 20000);
};
const cleanBool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);
const cleanStrArray = (arr) => (Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.trim() !== '').slice(0, 60).map(x => x.trim().slice(0, 80)) : []);

// PUBLIC PROJECTION (Part 18): allowlist only. NEVER exposes: notes,
// member_user_ids, internal record ids, or any Company operational internals.
// Contact presentation is operator-authored display copy; Company values flow
// through ONLY when the operator explicitly opted in (use_company_*).
export function projectPublicSettings(settings, company) {
  if (!settings) return defaultPublicSettings(company);
  const b = settings.branding || {}, c = settings.contact || {}, so = settings.social || {},
    biz = settings.business || {}, h = settings.homepage || {}, ab = settings.about || {},
    sv = settings.services || {}, wcu = settings.why_choose_us || {}, hiw = settings.how_it_works || {},
    tr = settings.trust || {}, gal = settings.gallery || {}, ct = settings.cta || {},
    seo = settings.seo || {}, faq = settings.faq || {}, ts = settings.testimonials || {},
    pol = settings.policies || {}, nav = settings.navigation || {}, ft = settings.footer || {},
    lg = settings.legal || {}, sd = settings.sale_display || {}, idp = settings.inventory_display || {};
  const companyPhone = company ? (company.phone || null) : null;
  const companyEmail = company ? (company.email || null) : null;

  // Services: only ENABLED services are public; dedicated pages require a slug.
  const serviceItems = (Array.isArray(sv.items) ? sv.items : [])
    .filter(it => it && cleanBool(it.enabled, true))
    .map(it => ({
      title: cleanStr(it.title, 200),
      description: cleanStr(it.description, 2000),
      long_description: cleanStr(it.long_description, 20000),
      icon: it && ICON_KEYS.includes(it.icon) ? it.icon : null,
      image_url: httpsUrl(it.image_url),
      show_on_homepage: cleanBool(it.show_on_homepage, true),
      cta_label: cleanStr(it.cta_label, 100),
      cta_link: safeLink(it.cta_link),
      seo_slug: cleanStr(it.seo_slug, 80),
      dedicated_page: cleanBool(it.dedicated_page, false) && !!cleanStr(it.seo_slug, 80)
    }));

  const testimonialItems = (Array.isArray(ts.items) ? ts.items : [])
    .filter(it => it && cleanBool(it.visible, true) && (it.quote || it.name))
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 20)
    .map(it => ({
      quote: cleanStr(it.quote, 2000), name: cleanStr(it.name, 120),
      location: cleanStr(it.location, 120), context: cleanStr(it.context, 200),
      photo_url: httpsUrl(it.photo_url), featured: !!it.featured
    }));

  const faqItems = (Array.isArray(faq.items) ? faq.items : [])
    .filter(it => it && cleanBool(it.visible, true) && it.question).slice(0, 30)
    .map(it => ({ question: cleanStr(it.question, 500), answer: cleanStr(it.answer, 5000) }));

  const galleryItems = (Array.isArray(gal.items) ? gal.items : [])
    .filter(it => it && cleanBool(it.visible, true) && httpsUrl(it.image_url)).slice(0, 100)
    .map(it => ({
      image_url: httpsUrl(it.image_url), caption: cleanStr(it.caption, 300),
      alt_text: cleanStr(it.alt_text, 300), category: it && GALLERY_CATEGORIES.includes(it.category) ? it.category : 'other'
    }));

  const homepageSections = (Array.isArray(h.sections) ? h.sections : [])
    .filter(it => it && cleanBool(it.visible, true) && HOMEPAGE_SECTION_KEYS.includes(it.key))
    .slice(0, HOMEPAGE_SECTION_KEYS.length)
    .map(it => ({ key: it.key, label: cleanStr(it.label, 100) || it.key }));

  const navItems = (Array.isArray(nav.items) ? nav.items : [])
    .filter(it => it && cleanBool(it.visible, true) && NAV_PATHS.includes(it.path))
    .slice(0, 12)
    .map(it => ({ key: it.key || it.path, label: cleanStr(it.label, 60) || defaultNavLabel(it.path), path: it.path }));

  return {
    site_title: cleanStr(settings.site_title, 200),
    display_business_name: cleanStr(settings.display_business_name, 200) || (company ? (company.display_name || company.legal_name || null) : null),
    tagline: cleanStr(settings.tagline, 300),
    branding: {
      logo_url: httpsUrl(b.logo_url), alternate_logo_url: httpsUrl(b.alternate_logo_url), favicon_url: httpsUrl(b.favicon_url),
      primary_color: cleanStr(b.primary_color, 20), secondary_color: cleanStr(b.secondary_color, 20), accent_color: cleanStr(b.accent_color, 20),
      background_color: cleanStr(b.background_color, 20), text_color: cleanStr(b.text_color, 20),
      heading_font_family: cleanStr(b.heading_font_family, 200), body_font_family: cleanStr(b.body_font_family, 200),
      design_preset: cleanStr(b.design_preset, 40)
    },
    contact: {
      phone: c.use_company_phone === false ? (cleanStr(c.phone_display, 40) || null) : (companyPhone || cleanStr(c.phone_display, 40) || null),
      sms_number: cleanStr(c.sms_number, 40),
      email: c.use_company_email === false ? (cleanStr(c.email_display, 200) || null) : (companyEmail || cleanStr(c.email_display, 200) || null),
      inquiry_email: cleanStr(c.inquiry_email, 200),
      mailing_address: cleanStr(c.mailing_address, 300),
      address_display: cleanStr(c.address_display, 300),
      show_address: cleanBool(c.show_address, true),
      business_hours: cleanStr(c.business_hours, 2000),
      contact_cta_label: cleanStr(c.contact_cta_label, 100)
    },
    social: {
      facebook: httpsUrl(so.facebook), instagram: httpsUrl(so.instagram), twitter: httpsUrl(so.twitter),
      youtube: httpsUrl(so.youtube), pinterest: httpsUrl(so.pinterest), tiktok: httpsUrl(so.tiktok), linkedin: httpsUrl(so.linkedin)
    },
    business: {
      short_description: cleanStr(biz.short_description, 500),
      long_description: cleanStr(biz.long_description, 20000),
      year_founded: cleanStr(biz.year_founded, 10),
      years_experience: cleanStr(biz.years_experience, 20),
      owner_name: cleanStr(biz.owner_name, 200),
      business_type_label: cleanStr(biz.business_type_label, 100),
      primary_city: cleanStr(biz.primary_city, 100),
      primary_county: cleanStr(biz.primary_county, 100),
      counties_served: cleanStrArray(biz.counties_served),
      cities_served: cleanStrArray(biz.cities_served),
      states_served: cleanStrArray(biz.states_served),
      service_area_notes: cleanStr(biz.service_area_notes, 2000),
      show_address: cleanBool(biz.show_address, false)
    },
    homepage: {
      hero_headline: cleanStr(h.hero_headline, 300),
      hero_subheadline: cleanStr(h.hero_subheadline, 500),
      hero_image_url: httpsUrl(h.hero_image_url),
      hero_layout: HERO_LAYOUTS.includes(h.hero_layout) ? h.hero_layout : null,
      intro_copy: cleanStr(h.intro_copy, 5000),
      cta_label: cleanStr(h.cta_label, 100),
      cta_link: safeLink(h.cta_link),
      secondary_cta_text: cleanStr(h.secondary_cta_text, 100),
      secondary_cta_link: safeLink(h.secondary_cta_link),
      sections: homepageSections
    },
    why_choose_us: {
      headline: cleanStr(wcu.headline, 200),
      items: (Array.isArray(wcu.items) ? wcu.items : [])
        .filter(it => it && cleanStr(it.title, 200)).slice(0, 6)
        .map(it => ({ title: cleanStr(it.title, 200), description: cleanStr(it.description, 1000), icon: it && ICON_KEYS.includes(it.icon) ? it.icon : null }))
    },
    how_it_works: {
      headline: cleanStr(hiw.headline, 200), intro: cleanStr(hiw.intro, 2000),
      steps: (Array.isArray(hiw.steps) ? hiw.steps : [])
        .filter(it => it && cleanBool(it.visible, true) && cleanStr(it.title, 200)).slice(0, 8)
        .map(it => ({ title: cleanStr(it.title, 200), description: cleanStr(it.description, 1000) }))
    },
    trust: {
      headline: cleanStr(tr.headline, 200),
      items: (Array.isArray(tr.items) ? tr.items : [])
        .filter(it => it && cleanStr(it.label, 200)).slice(0, 8)
        .map(it => ({ label: cleanStr(it.label, 200), detail: cleanStr(it.detail, 500) }))
    },
    about: {
      headline: cleanStr(ab.headline, 300), body: cleanStr(ab.body, 20000),
      mission: cleanStr(ab.mission, 3000), owner_bio: cleanStr(ab.owner_bio, 5000),
      owner_photo_url: httpsUrl(ab.owner_photo_url), team_intro: cleanStr(ab.team_intro, 2000),
      team_photo_url: httpsUrl(ab.team_photo_url),
      team_members: (Array.isArray(ab.team_members) ? ab.team_members : [])
        .filter(it => it && cleanStr(it.name, 200)).slice(0, 12)
        .map(it => ({ name: cleanStr(it.name, 200), role: cleanStr(it.role, 120), photo_url: httpsUrl(it.photo_url), bio: cleanStr(it.bio, 1000) }))
    },
    services: { headline: cleanStr(sv.headline, 200), intro: cleanStr(sv.intro, 3000), items: serviceItems },
    gallery: { headline: cleanStr(gal.headline, 200), intro: cleanStr(gal.intro, 2000), items: galleryItems },
    cta: { label: cleanStr(ct.label, 200), sublabel: cleanStr(ct.sublabel, 500), link: safeLink(ct.link) },
    seo: {
      default_title: cleanStr(seo.default_title, 200), default_description: cleanStr(seo.default_description, 500),
      social_image_url: httpsUrl(seo.social_image_url)
    },
    faq: { headline: cleanStr(faq.headline, 200), items: faqItems },
    testimonials: { headline: cleanStr(ts.headline, 200), items: testimonialItems },
    policies: {
      items: (Array.isArray(pol.items) ? pol.items : [])
        .filter(it => it && cleanBool(it.visible, true) && cleanStr(it.title, 300)).slice(0, 12)
        .map(it => ({ key: cleanStr(it.key, 60), title: cleanStr(it.title, 300), body: cleanStr(it.body, 20000) }))
    },
    navigation: { items: navItems },
    footer: {
      logo_url: httpsUrl(ft.logo_url), description: cleanStr(ft.description, 1000),
      copyright_name: cleanStr(ft.copyright_name, 200),
      show_powered_by: cleanBool(ft.show_powered_by, true)
    },
    legal: { privacy_policy_text: cleanStr(lg.privacy_policy_text, 20000), terms_text: cleanStr(lg.terms_text, 20000) },
    sale_display: { show_sold_items: cleanBool(sd.show_sold_items, true), show_prices: cleanBool(sd.show_prices, true) },
    inventory_display: { show_prices: cleanBool(idp.show_prices, true), show_condition: cleanBool(idp.show_condition, true) },
    settings_version: settings.settings_version || 1
  };
}

// Controlled link: internal template path OR https URL. Never javascript:/data:.
export function safeLink(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > 500) return null;
  if (/^https:\/\//i.test(t)) return t;
  if (NAV_PATHS.includes(t)) return t;
  if (/^\/site\/sales\//.test(t)) return t; // canonical sale detail path
  return null;
}

function defaultNavLabel(path) {
  return { '/site': 'Home', '/site/sales': 'Estate Sales', '/site/services': 'Services', '/site/about': 'About', '/site/gallery': 'Gallery', '/site/faq': 'FAQ', '/site/contact': 'Contact', '/site/legal': 'Legal' }[path] || path;
}

export async function getPublicWebsiteSettingsProjection(service, ctx) {
  const settings = await getTenantSettings(service, ctx.tenant.id);
  return projectPublicSettings(settings, ctx.company);
}

// Admin/member edit authorization: tenant access (admin role OR company member).
export function assertSettingsAccess(user, tenant) {
  return assertTenantAccess(user, tenant);
}

// ── Update sanitizer (Parts 4/6 + 4B) ────────────────────────────────────────
// Strict key allowlist — no arbitrary CSS, no unknown categories, no
// operational Company fields. Structured arrays validated per-section shape.
const SUB_KEYS = {
  branding: ['logo_url', 'alternate_logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color', 'heading_font_family', 'body_font_family', 'design_preset'],
  contact: ['use_company_phone', 'phone_display', 'sms_number', 'use_company_email', 'email_display', 'inquiry_email', 'mailing_address', 'address_display', 'show_address', 'business_hours', 'contact_cta_label'],
  social: ['facebook', 'instagram', 'twitter', 'youtube', 'pinterest', 'tiktok', 'linkedin'],
  business: ['short_description', 'long_description', 'year_founded', 'years_experience', 'owner_name', 'business_type_label', 'primary_city', 'primary_county', 'counties_served', 'cities_served', 'states_served', 'service_area_notes', 'show_address'],
  homepage: ['hero_headline', 'hero_subheadline', 'hero_image_url', 'hero_layout', 'intro_copy', 'cta_label', 'cta_link', 'secondary_cta_text', 'secondary_cta_link', 'sections'],
  why_choose_us: ['headline', 'items'],
  how_it_works: ['headline', 'intro', 'steps'],
  trust: ['headline', 'items'],
  about: ['headline', 'body', 'mission', 'owner_bio', 'owner_photo_url', 'team_intro', 'team_photo_url', 'team_members'],
  services: ['headline', 'intro', 'items'],
  gallery: ['headline', 'intro', 'items'],
  cta: ['label', 'sublabel', 'link'],
  seo: ['default_title', 'default_description', 'social_image_url'],
  faq: ['headline', 'items'],
  testimonials: ['headline', 'items'],
  policies: ['items'],
  navigation: ['items'],
  footer: ['logo_url', 'description', 'copyright_name', 'show_powered_by'],
  legal: ['privacy_policy_text', 'terms_text'],
  sale_display: ['show_sold_items', 'show_prices'],
  inventory_display: ['show_prices', 'show_condition']
};
const TOP_KEYS = ['site_title', 'display_business_name', 'tagline', ...Object.keys(SUB_KEYS), 'settings_version', 'notes'];
const str = v => (typeof v === 'string' ? v.slice(0, 20000) : undefined);
const hexColor = v => (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : undefined);
const iconVal = v => (ICON_KEYS.includes(v) ? v : undefined);
const heroLayoutVal = v => (HERO_LAYOUTS.includes(v) ? v : undefined);
const navPathVal = v => (NAV_PATHS.includes(v) ? v : undefined);

// Per-section item sanitizers: each returns a clean item (or null to drop).
const ITEM_SANITIZERS = {
  services(it) {
    const slugRaw = typeof it.seo_slug === 'string' ? it.seo_slug.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) : '';
    return {
      title: str(it.title) || '', description: str(it.description) || '',
      long_description: str(it.long_description) || '',
      icon: iconVal(it.icon), image_url: httpsUrl(it.image_url) || '',
      enabled: it.enabled !== false, show_on_homepage: it.show_on_homepage !== false,
      dedicated_page: it.dedicated_page === true && !!slugRaw,
      seo_slug: slugRaw,
      cta_label: str(it.cta_label) || '', cta_link: safeLink(it.cta_link) || '',
      library_key: str(it.library_key) || ''
    };
  },
  testimonials(it) {
    return {
      quote: str(it.quote) || '', name: str(it.name) || '', location: str(it.location) || '',
      context: str(it.context) || '', photo_url: httpsUrl(it.photo_url) || '',
      featured: it.featured === true, visible: it.visible !== false
    };
  },
  faq(it) {
    return { question: str(it.question) || '', answer: str(it.answer) || '', visible: it.visible !== false };
  },
  gallery(it) {
    return {
      image_url: httpsUrl(it.image_url) || '', media_id: str(it.media_id) || '',
      caption: str(it.caption) || '', alt_text: str(it.alt_text) || '',
      category: GALLERY_CATEGORIES.includes(it.category) ? it.category : 'other',
      visible: it.visible !== false
    };
  },
  why_choose_us(it) {
    return { title: str(it.title) || '', description: str(it.description) || '', icon: iconVal(it.icon) };
  },
  how_it_works(it) {
    return { title: str(it.title) || '', description: str(it.description) || '', visible: it.visible !== false };
  },
  trust(it) {
    return { label: str(it.label) || '', detail: str(it.detail) || '' };
  },
  policies(it) {
    return { key: str(it.key) || '', title: str(it.title) || '', body: str(it.body) || '', visible: it.visible !== false };
  },
  navigation(it) {
    return { key: str(it.key) || '', label: str(it.label) || '', path: navPathVal(it.path) || null, visible: it.visible !== false };
  },
  about_team_members(it) {
    return { name: str(it.name) || '', role: str(it.role) || '', photo_url: httpsUrl(it.photo_url) || '', bio: str(it.bio) || '' };
  },
  homepage_sections(it) {
    return { key: str(it.key) || '', label: str(it.label) || '', visible: it.visible !== false };
  }
};
const ITEM_LIMITS = { services: 30, testimonials: 20, faq: 30, gallery: 100, why_choose_us: 6, how_it_works: 8, trust: 8, policies: 12, navigation: 12, about_team_members: 12, homepage_sections: 12 };

// Item-array field name inside each section.
const ITEM_FIELD = { why_choose_us: 'items', how_it_works: 'steps', trust: 'items', about: 'team_members', services: 'items', gallery: 'items', faq: 'items', testimonials: 'items', policies: 'items', navigation: 'items', homepage: 'sections' };

export function sanitizeSettingsPayload(payload) {
  const out = {};
  for (const k of TOP_KEYS) {
    if (payload[k] === undefined) continue;
    if (SUB_KEYS[k]) {
      const v = payload[k];
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
      const cleaned = {};
      const arrayKey = ITEM_FIELD[k];
      for (const sk of SUB_KEYS[k]) {
        if (v[sk] === undefined) continue;
        if (arrayKey && sk === arrayKey) continue; // handled below
        if (typeof v[sk] === 'boolean') { cleaned[sk] = v[sk]; continue; }
        // URL-validated fields
        if (['logo_url', 'alternate_logo_url', 'favicon_url', 'hero_image_url', 'owner_photo_url', 'team_photo_url', 'social_image_url'].includes(sk)) {
          const u = httpsUrl(v[sk]); if (u !== null) cleaned[sk] = u; else if (v[sk] === null) cleaned[sk] = null;
          continue;
        }
        if (k === 'branding' && (sk === 'primary_color' || sk === 'secondary_color' || sk === 'accent_color' || sk === 'background_color' || sk === 'text_color')) {
          const cVal = hexColor(v[sk]) ?? (v[sk] === null ? null : undefined);
          if (cVal !== undefined) cleaned[sk] = cVal;
          continue;
        }
        if (k === 'branding' && sk === 'design_preset') {
          const pv = ['classic', 'modern', 'elegant', 'bold'].includes(v[sk]) ? v[sk] : (v[sk] === null ? null : undefined);
          if (pv !== undefined) cleaned[sk] = pv;
          continue;
        }
        if (k === 'homepage' && sk === 'hero_layout') {
          const hv = heroLayoutVal(v[sk]) ?? (v[sk] === null ? null : undefined);
          if (hv !== undefined) cleaned[sk] = hv;
          continue;
        }
        if (k === 'social') {
          // Strict https validation (Part 32) — invalid URLs are REJECTED (dropped).
          const sv2 = httpsUrl(v[sk]);
          if (sv2 !== null) cleaned[sk] = sv2;
          else if (v[sk] === null || v[sk] === '') cleaned[sk] = null;
          continue;
        }
        if (sk === 'cta_link' || sk === 'secondary_cta_link') {
          const lv = safeLink(v[sk]) ?? (v[sk] === null || v[sk] === '' ? null : undefined);
          if (lv !== undefined) cleaned[sk] = lv;
          continue;
        }
        if (k === 'business' && ['counties_served', 'cities_served', 'states_served'].includes(sk)) {
          cleaned[sk] = cleanStrArray(v[sk]);
          continue;
        }
        const s = str(v[sk]);
        if (s !== undefined) cleaned[sk] = s;
      }
      if (arrayKey && ITEM_SANITIZERS[arrayKey === 'team_members' ? 'about_team_members' : (arrayKey === 'sections' ? 'homepage_sections' : k)]) {
        const shape = arrayKey === 'team_members' ? 'about_team_members' : (arrayKey === 'sections' ? 'homepage_sections' : k);
        if (Array.isArray(v[arrayKey])) {
          cleaned[arrayKey] = v[arrayKey].slice(0, ITEM_LIMITS[shape]).map(ITEM_SANITIZERS[shape]);
        } else if (v[arrayKey] === null) {
          cleaned[arrayKey] = [];
        }
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