import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://estatesalen.com';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

function escapeXml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlEntry(loc, priority = '0.5', changefreq = 'weekly', images = []) {
  const imageXml = images.slice(0, 10).map(img => `    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`).join('\n');

  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${imageXml}
  </url>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all public data in parallel
    const [sales, operators] = await Promise.all([
      base44.asServiceRole.entities.EstateSale.filter({ status: { $in: ['upcoming', 'active'] } }, '-created_date', 500),
      base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', 1000),
    ]);

    const entries = [];

    // Static high-priority pages
    entries.push(urlEntry(`${BASE_URL}/`, '1.0', 'daily'));
    entries.push(urlEntry(`${BASE_URL}/SearchByState`, '0.9', 'weekly'));
    entries.push(urlEntry(`${BASE_URL}/BrowseOperators`, '0.9', 'weekly'));
    entries.push(urlEntry(`${BASE_URL}/BrowseItems`, '0.8', 'weekly'));
    entries.push(urlEntry(`${BASE_URL}/OperatorPackages`, '0.8', 'monthly'));
    entries.push(urlEntry(`${BASE_URL}/StartYourCompany`, '0.8', 'monthly'));
    entries.push(urlEntry(`${BASE_URL}/CompareEstateSales`, '0.7', 'monthly'));
    entries.push(urlEntry(`${BASE_URL}/HowToUse`, '0.6', 'monthly'));

    // State pages
    for (const state of US_STATES) {
      entries.push(urlEntry(`${BASE_URL}/StateCities?state=${state}`, '0.8', 'weekly'));
    }

    // Active / upcoming sale pages with full image data — highest SEO value
    for (const sale of sales) {
      const city = sale.property_address?.city || '';
      const state = sale.property_address?.state || '';
      const location = city && state ? `${city}, ${state}` : '';

      const images = (sale.images || [])
        .filter(img => {
          const url = typeof img === 'string' ? img : img?.url;
          return url && url.startsWith('http');
        })
        .map(img => {
          const url = typeof img === 'string' ? img : img?.url;
          const name = typeof img === 'object' ? (img.name || '') : '';
          const desc = typeof img === 'object' ? (img.description || '') : '';
          return {
            url,
            title: name || `${sale.title}${location ? ` — ${location}` : ''} estate sale item`,
            caption: desc || `Estate sale item from ${sale.title}${location ? ` in ${location}` : ''}. ${(sale.categories || []).slice(0, 3).join(', ')}.`
          };
        });

      entries.push(urlEntry(`${BASE_URL}/EstateSaleDetail?id=${sale.id}`, '0.9', 'daily', images));
    }

    // State finder pages
    const statesWithOperators = [...new Set(operators.map(op => op.state).filter(Boolean))];
    for (const state of statesWithOperators) {
      entries.push(urlEntry(`${BASE_URL}/EstateSaleFinder?state=${state}`, '0.7', 'weekly'));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response(`Error generating sitemap: ${error.message}`, { status: 500 });
  }
});