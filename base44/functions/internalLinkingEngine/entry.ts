import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://estatesalen.com';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function saleUrl(sale) {
  return sale.seo_slug || `/EstateSaleDetail?id=${sale.id}`;
}

function itemUrl(item) {
  return item.slug ? `/items/${item.slug}` : null;
}

function brandUrl(brand) {
  return `/brands/${toSlug(brand)}`;
}

function categoryUrl(cat) {
  return `/categories/${toSlug(cat)}`;
}

function cityUrl(city, state) {
  return `/estate-sales/${toSlug(city)}-${toSlug(state)}`;
}

// Build markdown link block from an array of { label, url, description? }
function buildLinksSection(heading, links) {
  if (!links.length) return '';
  const items = links.map(l => `- [${l.label}](${l.url})${l.description ? ' — ' + l.description : ''}`).join('\n');
  return `\n\n## ${heading}\n\n${items}`;
}

// Inject / replace the "Related Links" section at the end of main_content
function injectLinks(existingContent, sections) {
  const marker = '<!-- internal-links-start -->';
  const base = existingContent ? existingContent.replace(/<!-- internal-links-start -->[\s\S]*$/, '').trimEnd() : '';
  const injected = sections.filter(Boolean).join('');
  if (!injected) return existingContent;
  return `${base}\n\n${marker}${injected}`;
}

// ─── Link builders per page type ─────────────────────────────────────────────

async function linksForItem(base44, page) {
  const item = (await base44.asServiceRole.entities.SEOItemProfile.filter({ id: page.entity_id }))[0];
  if (!item) return [];

  const sections = [];

  // Sale page
  if (item.sale_id) {
    const sale = (await base44.asServiceRole.entities.EstateSale.filter({ id: item.sale_id }))[0];
    if (sale) {
      sections.push(buildLinksSection('From This Estate Sale', [{
        label: sale.title,
        url: saleUrl(sale),
        description: [sale.property_address?.city, sale.property_address?.state].filter(Boolean).join(', '),
      }]));
    }
  }

  // Brand page
  if (item.brand_name) {
    sections.push(buildLinksSection('More From This Brand', [{
      label: `${item.brand_name} at Estate Sales`,
      url: brandUrl(item.brand_name),
    }]));
  }

  // Category page
  if (item.category_name) {
    sections.push(buildLinksSection('Browse This Category', [{
      label: `${item.category_name} Estate Sale Items`,
      url: categoryUrl(item.category_name),
    }]));
  }

  // City page — look up sale for location
  if (item.sale_id) {
    const sale = (await base44.asServiceRole.entities.EstateSale.filter({ id: item.sale_id }))[0];
    const city = sale?.property_address?.city;
    const state = sale?.property_address?.state;
    if (city && state) {
      sections.push(buildLinksSection('Estate Sales Near Here', [{
        label: `Estate Sales in ${city}, ${state}`,
        url: cityUrl(city, state),
      }]));
    }
  }

  return sections;
}

async function linksForSale(base44, page) {
  const sale = (await base44.asServiceRole.entities.EstateSale.filter({ id: page.entity_id }))[0];
  if (!sale) return [];

  const sections = [];
  const city = sale.property_address?.city;
  const state = sale.property_address?.state;

  // Featured item pages
  const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: sale.id }, '-created_date', 12);
  const itemLinks = items.filter(i => i.slug && i.item_name).map(i => ({
    label: [i.item_name, i.brand_name].filter(Boolean).join(' — '),
    url: itemUrl(i),
  })).filter(l => l.url);
  if (itemLinks.length) sections.push(buildLinksSection('Featured Items From This Sale', itemLinks));

  // Company page
  if (sale.operator_name) {
    sections.push(buildLinksSection('Estate Sale Company', [{
      label: sale.operator_name,
      url: `/BrowseOperators?company=${encodeURIComponent(sale.operator_name)}`,
    }]));
  }

  // City + county + state pages
  if (city && state) {
    const localLinks = [
      { label: `Estate Sales in ${city}, ${state}`, url: cityUrl(city, state) },
    ];
    const county = sale.property_address?.region;
    if (county) localLinks.push({ label: `${county} Estate Sales`, url: `/estate-sales/${toSlug(state)}-${toSlug(county)}-county` });
    localLinks.push({ label: `${state} Estate Sales`, url: `/SearchByState?state=${state}` });
    sections.push(buildLinksSection('More Estate Sales Nearby', localLinks));
  }

  // Category pages
  const cats = (sale.categories || []).slice(0, 6);
  if (cats.length) {
    sections.push(buildLinksSection('Item Categories at This Sale', cats.map(c => ({
      label: c,
      url: categoryUrl(c),
    }))));
  }

  // Brand pages from item profiles
  const brands = [...new Set(items.map(i => i.brand_name).filter(Boolean))].slice(0, 6);
  if (brands.length) {
    sections.push(buildLinksSection('Featured Brands', brands.map(b => ({
      label: b,
      url: brandUrl(b),
    }))));
  }

  return sections;
}

async function linksForCompany(base44, page) {
  const companyName = page.h1 || page.title || '';
  if (!companyName) return [];

  const sections = [];

  // Active sales by this company
  const activeSales = await base44.asServiceRole.entities.EstateSale.filter(
    { operator_name: companyName, status: { $in: ['upcoming', 'active'] } }, '-created_date', 6
  );
  if (activeSales.length) {
    sections.push(buildLinksSection('Active Estate Sales', activeSales.map(s => ({
      label: s.title,
      url: saleUrl(s),
      description: [s.property_address?.city, s.property_address?.state].filter(Boolean).join(', '),
    }))));
  }

  // Past completed sales
  const pastSales = await base44.asServiceRole.entities.EstateSale.filter(
    { operator_name: companyName, status: 'completed' }, '-updated_date', 6
  );
  if (pastSales.length) {
    sections.push(buildLinksSection('Past Estate Sales', pastSales.map(s => ({
      label: s.title,
      url: saleUrl(s),
    }))));
  }

  // Sold items
  const allSaleIds = [...activeSales, ...pastSales].map(s => s.id);
  if (allSaleIds.length) {
    const soldItems = (await Promise.all(
      allSaleIds.slice(0, 3).map(id => base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: id, sold_status: 'sold' }, '-updated_date', 4))
    )).flat().filter(i => i.slug && i.item_name).slice(0, 8);

    if (soldItems.length) {
      sections.push(buildLinksSection('Notable Sold Items', soldItems.map(i => ({
        label: [i.item_name, i.brand_name].filter(Boolean).join(' — '),
        url: itemUrl(i),
      })).filter(l => l.url)));
    }

    // Cities served
    const cities = [...new Set(
      [...activeSales, ...pastSales]
        .filter(s => s.property_address?.city && s.property_address?.state)
        .map(s => `${s.property_address.city}||${s.property_address.state}`)
    )].slice(0, 6);

    if (cities.length) {
      sections.push(buildLinksSection('Cities Served', cities.map(c => {
        const [city, state] = c.split('||');
        return { label: `Estate Sales in ${city}, ${state}`, url: cityUrl(city, state) };
      })));
    }
  }

  return sections;
}

async function linksForCity(base44, page) {
  // Derive city/state from the page slug or h1
  const cityHub = (await base44.asServiceRole.entities.SEOCityHub.filter({ slug: page.slug.replace(/^\/estate-sales\//, '') }))[0]
    || (await base44.asServiceRole.entities.SEOCityHub.filter({ slug: page.entity_id }))[0];

  const city = cityHub?.city || page.h1?.replace(/ Estate Sales.*/, '') || '';
  const state = cityHub?.state || '';
  const county = cityHub?.county || '';

  const sections = [];

  // Upcoming sales in this city
  if (city && state) {
    const sales = await base44.asServiceRole.entities.EstateSale.filter(
      { 'property_address.city': city, 'property_address.state': state, status: { $in: ['upcoming', 'active'] } },
      '-created_date', 6
    );
    if (sales.length) {
      sections.push(buildLinksSection('Upcoming Estate Sales', sales.map(s => ({
        label: s.title,
        url: saleUrl(s),
      }))));
    }

    // Recent items found in this city
    const saleIds = sales.map(s => s.id);
    if (saleIds.length) {
      const items = (await Promise.all(
        saleIds.slice(0, 3).map(id => base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: id }, '-created_date', 4))
      )).flat().filter(i => i.slug && i.item_name).slice(0, 8);

      if (items.length) {
        sections.push(buildLinksSection('Recent Item Finds', items.map(i => ({
          label: [i.item_name, i.brand_name].filter(Boolean).join(' — '),
          url: itemUrl(i),
        })).filter(l => l.url)));
      }
    }
  }

  // County + state links
  const geoLinks = [];
  if (county && state) geoLinks.push({ label: `${county} County Estate Sales`, url: `/estate-sales/${toSlug(state)}-${toSlug(county)}-county` });
  if (state) geoLinks.push({ label: `${state} Estate Sales`, url: `/SearchByState?state=${state}` });
  if (geoLinks.length) sections.push(buildLinksSection('Explore More', geoLinks));

  return sections;
}

async function linksForBrand(base44, page) {
  const brandHub = (await base44.asServiceRole.entities.SEOBrandHub.filter({ id: page.entity_id }))[0];
  const brandName = brandHub?.brand_name || page.h1 || '';
  if (!brandName) return [];

  const sections = [];

  // Matching items
  const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ brand_name: brandName }, '-created_date', 10);
  const itemLinks = items.filter(i => i.slug && i.item_name).map(i => ({
    label: i.item_name,
    url: itemUrl(i),
    description: i.sold_price ? `Sold $${i.sold_price}` : i.value_low ? `Est. $${i.value_low}–$${i.value_high}` : '',
  })).filter(l => l.url);
  if (itemLinks.length) sections.push(buildLinksSection('Items From This Brand', itemLinks));

  // Sold examples
  const soldItems = items.filter(i => i.sold_status === 'sold' && i.sold_price > 0 && i.slug).slice(0, 5);
  if (soldItems.length) {
    sections.push(buildLinksSection('Sold Examples', soldItems.map(i => ({
      label: `${i.item_name} — Sold $${i.sold_price}`,
      url: itemUrl(i),
    })).filter(l => l.url)));
  }

  // Related categories
  const cats = [...new Set(items.map(i => i.category_name).filter(Boolean))].slice(0, 5);
  if (cats.length) {
    sections.push(buildLinksSection('Related Categories', cats.map(c => ({
      label: c,
      url: categoryUrl(c),
    }))));
  }

  // Related blog posts
  const brandSlug = toSlug(brandName);
  const blogPages = await base44.asServiceRole.entities.SEOPage.filter({ page_type: 'blog', status: 'published' }, '-published_at', 50);
  const relatedBlogs = blogPages.filter(p =>
    (p.slug || '').includes(brandSlug) ||
    (p.title || '').toLowerCase().includes(brandName.toLowerCase())
  ).slice(0, 4);
  if (relatedBlogs.length) {
    sections.push(buildLinksSection('Related Guides & Articles', relatedBlogs.map(p => ({
      label: p.h1 || p.title,
      url: p.canonical_url || p.slug,
    }))));
  }

  return sections;
}

async function linksForCategory(base44, page) {
  const catHub = (await base44.asServiceRole.entities.SEOCategoryHub.filter({ id: page.entity_id }))[0];
  const catName = catHub?.category_name || page.h1 || '';
  if (!catName) return [];

  const sections = [];

  // Matching items
  const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ category_name: catName }, '-created_date', 10);
  const itemLinks = items.filter(i => i.slug && i.item_name).map(i => ({
    label: [i.item_name, i.brand_name].filter(Boolean).join(' — '),
    url: itemUrl(i),
  })).filter(l => l.url);
  if (itemLinks.length) sections.push(buildLinksSection('Items In This Category', itemLinks));

  // Brand pages in this category
  const brands = [...new Set(items.map(i => i.brand_name).filter(Boolean))].slice(0, 8);
  if (brands.length) {
    sections.push(buildLinksSection('Top Brands', brands.map(b => ({
      label: b,
      url: brandUrl(b),
    }))));
  }

  // Related blog posts
  const catSlug = toSlug(catName);
  const blogPages = await base44.asServiceRole.entities.SEOPage.filter({ page_type: 'blog', status: 'published' }, '-published_at', 50);
  const relatedBlogs = blogPages.filter(p =>
    (p.slug || '').includes(catSlug) ||
    (p.title || '').toLowerCase().includes(catName.toLowerCase())
  ).slice(0, 4);
  if (relatedBlogs.length) {
    sections.push(buildLinksSection('Guides & Articles', relatedBlogs.map(p => ({
      label: p.h1 || p.title,
      url: p.canonical_url || p.slug,
    }))));
  }

  // City pages with inventory for this category
  const saleIds = [...new Set(items.map(i => i.sale_id).filter(Boolean))].slice(0, 10);
  if (saleIds.length) {
    const sales = (await Promise.all(saleIds.map(id => base44.asServiceRole.entities.EstateSale.filter({ id })))).flat();
    const cities = [...new Map(
      sales.filter(s => s.property_address?.city && s.property_address?.state)
        .map(s => [`${s.property_address.city}||${s.property_address.state}`, s])
    ).values()].slice(0, 6);

    if (cities.length) {
      sections.push(buildLinksSection('Cities With This Category', cities.map(s => ({
        label: `${catName} in ${s.property_address.city}, ${s.property_address.state}`,
        url: cityUrl(s.property_address.city, s.property_address.state),
      }))));
    }
  }

  return sections;
}

async function linksForBlog(base44, page) {
  const content = (page.main_content || page.intro_content || '').toLowerCase();
  const sections = [];

  // Brands mentioned in content
  const allBrands = await base44.asServiceRole.entities.SEOBrandHub.filter({ status: 'published' }, '-updated_date', 200);
  const mentionedBrands = allBrands.filter(b => content.includes(b.brand_name.toLowerCase())).slice(0, 6);
  if (mentionedBrands.length) {
    sections.push(buildLinksSection('Featured Brands', mentionedBrands.map(b => ({
      label: b.brand_name,
      url: `/brands/${b.slug}`,
    }))));
  }

  // Categories mentioned
  const allCats = await base44.asServiceRole.entities.SEOCategoryHub.filter({ status: 'published' }, '-updated_date', 200);
  const mentionedCats = allCats.filter(c => content.includes(c.category_name.toLowerCase())).slice(0, 6);
  if (mentionedCats.length) {
    sections.push(buildLinksSection('Browse Categories', mentionedCats.map(c => ({
      label: c.category_name,
      url: `/categories/${c.slug}`,
    }))));
  }

  // Items linked via entity_id (sale)
  if (page.entity_id) {
    const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: page.entity_id }, '-created_date', 8);
    const itemLinks = items.filter(i => i.slug && i.item_name).map(i => ({
      label: [i.item_name, i.brand_name].filter(Boolean).join(' — '),
      url: itemUrl(i),
    })).filter(l => l.url).slice(0, 6);
    if (itemLinks.length) sections.push(buildLinksSection('Items Featured In This Article', itemLinks));

    // Sale
    const sale = (await base44.asServiceRole.entities.EstateSale.filter({ id: page.entity_id }))[0];
    if (sale) {
      sections.push(buildLinksSection('Browse This Estate Sale', [{
        label: sale.title,
        url: saleUrl(sale),
        description: [sale.property_address?.city, sale.property_address?.state].filter(Boolean).join(', '),
      }]));

      // City
      const city = sale.property_address?.city;
      const state = sale.property_address?.state;
      if (city && state) {
        sections.push(buildLinksSection('Estate Sales In This Area', [{
          label: `Estate Sales in ${city}, ${state}`,
          url: cityUrl(city, state),
        }]));
      }
    }
  }

  return sections;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
async function buildLinks(base44, page) {
  switch (page.page_type) {
    case 'item':     return linksForItem(base44, page);
    case 'sale':     return linksForSale(base44, page);
    case 'company':  return linksForCompany(base44, page);
    case 'city':     return linksForCity(base44, page);
    case 'brand':    return linksForBrand(base44, page);
    case 'category': return linksForCategory(base44, page);
    case 'blog':     return linksForBlog(base44, page);
    default:         return [];
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accepts: { slug } OR { page_id } OR entity automation payload
    const slug = body?.slug || body?.data?.slug;
    const pageId = body?.page_id || body?.data?.id || body?.event?.entity_id;

    let page = null;
    if (slug) {
      const results = await base44.asServiceRole.entities.SEOPage.filter({ slug });
      page = results[0];
    } else if (pageId) {
      const results = await base44.asServiceRole.entities.SEOPage.filter({ id: pageId });
      page = results[0];
    }

    if (!page) return Response.json({ error: 'SEOPage not found' }, { status: 404 });
    if (page.status !== 'published') return Response.json({ message: 'Page not published — skipping', slug: page.slug });

    // Build link sections
    const sections = await buildLinks(base44, page);

    if (!sections.length) return Response.json({ message: 'No links to inject', slug: page.slug });

    // Inject into main_content
    const updatedContent = injectLinks(page.main_content || '', sections);
    await base44.asServiceRole.entities.SEOPage.update(page.id, { main_content: updatedContent });

    return Response.json({
      success: true,
      slug: page.slug,
      page_type: page.page_type,
      sections_injected: sections.filter(Boolean).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});