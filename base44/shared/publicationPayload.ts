// Canonical publication payload builder.
// Single source of truth for what a canonical EstateSalen Sale looks like when published
// to any destination. Privacy filtering lives here — destination adapters never build
// payloads from raw database records.

export const PUBLICATION_SCHEMA_VERSION = 'estatesalen.publication.v1';

// Deterministic currentness marker: sale update time + inventory signature.
// A publication is current when this equals the stored source_version.
export function computeSourceVersion(sale, items) {
  let latestItem = '';
  let soldCount = 0;
  for (const it of items) {
    if (it.updated_date && it.updated_date > latestItem) latestItem = it.updated_date;
    if (it.status === 'sold') soldCount += 1;
  }
  return `${sale.updated_date || ''}|${items.length}|${soldCount}|${latestItem}`;
}

// Public-safe media: strip operator-internal image metadata (AI synopsis, skip flags,
// internal pricing intelligence).
function publicImage(img) {
  if (!img) return null;
  if (typeof img === 'string') return { url: img, name: null, description: null };
  return {
    url: img.url || null,
    name: img.name || null,
    description: img.description || null
  };
}

// Public-safe item: canonical item ID + approved public fields only.
// NEVER expose: buyer_name, buyer_contact, payment_method_used, payment_notes,
// included_in_settlement, internal pricing intelligence, marketplace sync metadata.
export function publicItem(it) {
  return {
    id: it.id,
    title: it.title || null,
    description: it.description || null,
    category: it.category || null,
    subcategory: it.subcategory || null,
    brand: it.brand || null,
    condition: it.condition || null,
    price: typeof it.price === 'number' ? it.price : null,
    sold_status: it.status || 'available',
    sold_price: typeof it.sold_price === 'number' ? it.sold_price : null,
    featured: !!it.featured,
    images: (it.images || []).map(publicImage),
    updated_date: it.updated_date || null
  };
}

// Phase 3D.3 — markdown-safe public text. Canonical descriptions may contain
// presentation markdown (**bold**, [links], headings, code). Meta/SEO
// projections must never leak raw markup.
export function stripMarkdownBody(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Single-line variant for title/meta/OG/structured-data fields.
export function stripMarkdownText(text) {
  if (typeof text !== 'string') return null;
  const out = stripMarkdownBody(text).replace(/\s+/g, ' ').trim();
  return out || null;
}

// Public-safe sale: operational truth only.
// NEVER expose: commission fields, revenue, estimated_value, SEO internals,
// schema_json, views/saves, featured pricing, admin metadata.
export function publicSale(sale) {
  const addr = sale.property_address || {};
  return {
    id: sale.id,
    company_id: sale.company_id || null,
    title: sale.title || null,
    description: sale.description || null,
    status: sale.status || null,
    sale_type: sale.sale_type || null,
    sale_dates: sale.sale_dates || [],
    address: {
      street: addr.street || null,
      city: addr.city || null,
      state: addr.state || null,
      zip: addr.zip || null,
      region: addr.region || null,
      formatted_address: addr.formatted_address || null
    },
    location: sale.location || null,
    categories: sale.categories || [],
    payment_methods: sale.payment_methods || [],
    total_items: sale.total_items || 0,
    parking_info: sale.parking_info || null,
    special_notes: sale.special_notes || null,
    images: (sale.images || []).map(publicImage)
  };
}

export function buildCanonicalSalePayload({ sale, items, company, publication, event }) {
  return {
    schema: PUBLICATION_SCHEMA_VERSION,
    event: event || 'publish',
    generated_at: new Date().toISOString(),
    company: {
      id: (company && company.id) || sale.company_id || null,
      legal_name: (company && company.legal_name) || null,
      display_name: (company && company.display_name) || null
    },
    publication: {
      id: (publication && publication.id) || null,
      status: (publication && publication.status) || null,
      external_reference: (publication && publication.external_reference) || null,
      source_version: computeSourceVersion(sale, items)
    },
    sale: publicSale(sale),
    items: (items || []).map(publicItem)
  };
}