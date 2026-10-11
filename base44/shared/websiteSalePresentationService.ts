// WebsiteSalePresentation service (Phase 3D.1 — Parts 12-16).
// Website-specific presentation metadata ENHANCING a canonical Sale.
// Canonical Sale data always wins for operational facts; presentation
// contributes only approved website fields. Never an operational authority.

import { stripMarkdownText } from './publicationPayload.ts';

export function projectPublicPresentation(p) {
  if (!p) return null;
  return {
    featured: !!p.featured,
    featured_order: typeof p.featured_order === 'number' ? p.featured_order : null,
    marketing_intro: stripMarkdownText(p.marketing_intro) || null,
    display_highlights: (Array.isArray(p.display_highlights) ? p.display_highlights.slice(0, 20) : [])
      .map(h => stripMarkdownText(h) || null),
    hero_image_url: p.hero_image_url || null,
    photo_captions: (Array.isArray(p.photo_captions) ? p.photo_captions : []).map(c => ({
      image_index: c && Number.isInteger(c.image_index) ? c.image_index : null,
      caption: c && c.caption || null
    })),
    presentation_cta_label: p.presentation_cta_label || null,
    presentation_cta_link: p.presentation_cta_link || null,
    seo_title: stripMarkdownText(p.seo_title) || null,
    seo_description: stripMarkdownText(p.seo_description) || null,
    sort_order: typeof p.sort_order === 'number' ? p.sort_order : null
  };
}

export async function getActivePresentation(service, tenantId, saleId) {
  const page = await service.entities.WebsiteSalePresentation.filter(
    { website_tenant_id: tenantId, sale_id: saleId, status: 'active' }, { limit: 2, sort: 'created_date' });
  const rows = page.items || page;
  return rows[0] || null; // MVP one-per enforced upstream; oldest wins on a race
}

// Part 14 — target invariant: the Sale must belong to the tenant's Company.
export async function assertPresentationTarget(service, tenant, saleId) {
  if (!saleId) return { error: 'sale_id_required' };
  const sale = await service.entities.EstateSale.get(saleId).catch(() => null);
  if (!sale) return { error: 'sale_not_found' };
  if (sale.company_id !== tenant.company_id) return { error: 'cross_company_presentation' };
  return { sale };
}

// Part 15 — concurrent duplicate creation converges safely: the OLDEST active
// presentation is kept, duplicates collapse.
export async function arbitrateSinglePresentation(service, tenantId, saleId, createdId) {
  const page = await service.entities.WebsiteSalePresentation.filter(
    { website_tenant_id: tenantId, sale_id: saleId, status: 'active' },
    { limit: 10, sort: 'created_date' });
  const rows = page.items || page;
  for (const r of rows) {
    if (r.id !== createdId) await service.entities.WebsiteSalePresentation.delete(r.id).catch(() => {});
  }
  return { kept: createdId, converged: rows.length > 1 };
}

// Presentation fields that may be written from the admin surface (Part 13 —
// never canonical dates/address/prices/sold state).
const PRESENTATION_KEYS = ['featured', 'featured_order', 'marketing_intro', 'display_highlights', 'hero_image_url', 'photo_captions', 'presentation_cta_label', 'presentation_cta_link', 'seo_title', 'seo_description', 'sort_order', 'status', 'notes'];

export function sanitizePresentationPayload(payload) {
  const out = {};
  for (const k of PRESENTATION_KEYS) {
    if (payload[k] === undefined) continue;
    if (k === 'display_highlights') {
      if (Array.isArray(payload[k])) out[k] = payload[k].slice(0, 20).map(v => String(v || '').slice(0, 300));
    } else if (k === 'photo_captions') {
      if (Array.isArray(payload[k])) out[k] = payload[k].slice(0, 100).map(c => ({
        image_index: Number.isInteger(c && c.image_index) ? c.image_index : null,
        caption: String(c && c.caption || '').slice(0, 300)
      }));
    } else if (k === 'status') {
      if (payload[k] === 'active' || payload[k] === 'inactive') out[k] = payload[k];
    } else if (k === 'featured' || k === 'featured_order' || k === 'sort_order') {
      if (k === 'featured') out[k] = payload[k] === true;
      else if (Number.isInteger(payload[k])) out[k] = payload[k];
    } else {
      out[k] = String(payload[k] || '').slice(0, 20000);
    }
  }
  return out;
}