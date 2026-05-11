import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://estatesalen.com';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

function urlEntry(loc, priority = '0.5', changefreq = 'weekly') {
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
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

    // Active / upcoming sale pages — highest SEO value
    for (const sale of sales) {
      entries.push(urlEntry(`${BASE_URL}/EstateSaleDetail?id=${sale.id}`, '0.9', 'daily'));
    }

    // Operator profile pages via BrowseOperators state filter
    const statesWithOperators = [...new Set(operators.map(op => op.state).filter(Boolean))];
    for (const state of statesWithOperators) {
      entries.push(urlEntry(`${BASE_URL}/EstateSaleFinder?state=${state}`, '0.7', 'weekly'));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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