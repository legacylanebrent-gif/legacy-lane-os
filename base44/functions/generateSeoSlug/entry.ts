import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function toSlugPart(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[''""]/g, '')           // remove smart quotes / apostrophes
    .replace(/[^a-z0-9\s-]/g, ' ')   // remove remaining punctuation
    .trim()
    .replace(/\s+/g, '-')             // spaces → hyphens
    .replace(/-+/g, '-')              // collapse duplicate hyphens
    .replace(/^-+|-+$/g, '');         // trim leading/trailing hyphens
}

function truncate(slug, max = 90) {
  if (slug.length <= max) return slug;
  const cut = slug.substring(0, max);
  const lastHyphen = cut.lastIndexOf('-');
  return lastHyphen > max * 0.5 ? cut.substring(0, lastHyphen) : cut;
}

function buildSlug({ page_type, title, city, state, company_name, item_name, brand_name, category_name, entity_id }) {
  const s = (v) => toSlugPart(v || '');

  switch (page_type) {
    case 'sale': {
      // /estate-sales/{state}/{county?}/{city}/{title}
      const parts = ['estate-sales'];
      if (state) parts.push(s(state));
      if (city)  parts.push(s(city));
      if (title) parts.push(truncate(s(title)));
      return parts.join('/');
    }

    case 'item': {
      // /items/{item-name}-{entity_id}
      const base = s(item_name || title || '');
      const id   = entity_id ? String(entity_id).toLowerCase() : '';
      return 'items/' + truncate(base + (id ? '-' + id : ''));
    }

    case 'brand': {
      // /brands/{brand-name}
      return 'brands/' + truncate(s(brand_name || title || ''));
    }

    case 'category': {
      // /categories/{category-name}
      return 'categories/' + truncate(s(category_name || title || ''));
    }

    case 'company': {
      // /companies/{company-name}
      return 'companies/' + truncate(s(company_name || title || ''));
    }

    case 'city': {
      // /estate-sales/{city}-{state}
      const cityPart = s(city || '');
      const statePart = s(state || '');
      const combined = [cityPart, statePart].filter(Boolean).join('-');
      return 'estate-sales/' + truncate(combined);
    }

    case 'county': {
      // /estate-sales/{state}/{county}
      const parts = ['estate-sales'];
      if (state) parts.push(s(state));
      if (city)  parts.push(s(city));   // county passed in city field
      return parts.join('/');
    }

    case 'state': {
      // /estate-sales/{state}
      return 'estate-sales/' + s(state || title || '');
    }

    case 'blog': {
      // /blog/{title-slug}
      return 'blog/' + truncate(s(title || ''));
    }

    case 'report': {
      // /reports/{title-slug}
      return 'reports/' + truncate(s(title || ''));
    }

    default: {
      return truncate(s(title || ''));
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      page_type,
      title,
      city,
      state,
      company_name,
      item_name,
      brand_name,
      category_name,
      entity_id,
    } = payload;

    if (!page_type) {
      return Response.json({ error: 'page_type is required' }, { status: 400 });
    }

    let slug = buildSlug({ page_type, title, city, state, company_name, item_name, brand_name, category_name, entity_id });

    // Ensure leading slash
    if (!slug.startsWith('/')) slug = '/' + slug;

    // Check for existing slug collision in SEOPage entity
    const existing = await base44.asServiceRole.entities.SEOPage.filter({ slug });
    if (existing.length > 0 && entity_id) {
      // Append entity_id to disambiguate
      const idSuffix = '-' + String(entity_id).toLowerCase().replace(/[^a-z0-9]/g, '');
      // Re-truncate the base part to leave room for suffix
      const basePath = slug.substring(0, slug.lastIndexOf('/') + 1);
      const leafPart = slug.substring(slug.lastIndexOf('/') + 1);
      const truncatedLeaf = truncate(leafPart, 90 - idSuffix.length);
      slug = basePath + truncatedLeaf + idSuffix;
    }

    return Response.json({ slug });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});