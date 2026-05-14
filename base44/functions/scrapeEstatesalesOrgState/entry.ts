import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://estatesales.org';

// No hardcoded city map needed — we extract dynamically from the state page

async function fetchPage(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

function extractCityLinks(html, stateAbbr) {
  // Extract city slugs from the state page — handles both relative and absolute URLs
  const cityLinks = [];
  // Matches: href="/estate-sale-companies/al/city" OR href="https://estatesales.org/estate-sale-companies/al/city"
  const regex = new RegExp(`href="(?:https?://estatesales\\.org)?/estate-sale-companies/${stateAbbr}/([^"#?]+)"`, 'gi');
  let match;
  while ((match = regex.exec(html)) !== null) {
    const slug = match[1].replace(/\/$/, ''); // strip trailing slash
    if (slug && !slug.includes('/') && slug.toLowerCase() !== stateAbbr.toLowerCase()) {
      cityLinks.push(slug);
    }
  }
  return [...new Set(cityLinks)];
}

function parseListingPage(html, stateAbbr, citySlug) {
  const companies = [];

  // Extract elite/platinum companies (no phone/website shown)
  const eliteRegex = /<h3[^>]*>\s*<a[^>]+href="(\/estate-sale-companies\/([^"]+))"[^>]*>([^<]+)<\/a>/gi;
  let match;
  while ((match = eliteRegex.exec(html)) !== null) {
    const profilePath = match[1];
    const slug = match[2];
    const name = match[3].trim();
    if (!slug || !name || slug.includes('signup')) continue;

    const idMatch = slug.match(/(\d+)$/);
    const companyId = idMatch ? idMatch[1] : null;

    // Determine tier
    let tier = 'unknown';
    const contextStart = Math.max(0, match.index - 200);
    const contextEnd = Math.min(html.length, match.index + 500);
    const context = html.substring(contextStart, contextEnd).toLowerCase();
    if (context.includes('elite')) tier = 'elite';
    else if (context.includes('platinum')) tier = 'platinum';
    else if (context.includes('basic')) tier = 'basic';

    // Extract years in business
    const yearsMatch = context.match(/(\d+)\s+years?\s+in\s+business/i);
    const years = yearsMatch ? parseInt(yearsMatch[1]) : null;

    // Extract sales posted
    const salesMatch = context.match(/sales\s+posted.*?(\d[\d,]*)/i) || context.match(/(\d[\d,]*)\s+sales?\s+posted/i);
    const salesPosted = salesMatch ? parseInt(salesMatch[1].replace(/,/g, '')) : null;

    // Extract base city — try "based out of" pattern, fall back to city slug
    const cityMatch = context.match(/based\s+out\s+of\s+([^,<\n]+)/i);
    let cityName, cityState;
    if (cityMatch) {
      const baseCity = cityMatch[1].trim().replace(/\\n/g, '').trim();
      const parts = baseCity.split(',');
      cityName = parts[0].trim();
      cityState = parts[1] ? parts[1].trim() : stateAbbr.toUpperCase();
    } else {
      // Convert city slug to readable name (e.g. "new-york-city" -> "New York City")
      cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      cityState = stateAbbr.toUpperCase();
    }

    // Extract phone (basic tier)
    const phoneMatch = context.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Extract website (basic tier)
    const websiteMatch = context.match(/href="(https?:\/\/[^"]+)"\s*\n?[^>]*>[^<]*<\/a>\s*(?:\n|Member since)/i);
    const website = websiteMatch ? websiteMatch[1] : null;

    // Extract member since
    const memberSinceMatch = context.match(/member\s+since\s+([^<\n]+)/i);
    const memberSince = memberSinceMatch ? memberSinceMatch[1].trim() : null;

    // Extract logo
    const logoMatch = html.substring(match.index, match.index + 600).match(/src="(https?:\/\/estatesales\.org\/uploads\/[^"]+)"/i);
    const logo = logoMatch ? logoMatch[1] : null;

    companies.push({
      company_name: name,
      company_id: companyId,
      profile_url: `${BASE_URL}${profilePath}`,
      membership_tier: tier,
      base_city: cityName,
      base_state: cityState,
      phone: phone,
      website_url: website,
      member_since: memberSince,
      years_in_business: years,
      sales_posted: salesPosted,
      logo_image_url: logo,
      source_state: stateAbbr.toUpperCase(),
      scraped_city: citySlug,
      scrape_status: 'listing_only',
      last_scraped_at: new Date().toISOString(),
    });
  }

  return companies;
}

async function scrapeDetailPage(profileUrl) {
  try {
    const html = await fetchPage(profileUrl);
    const details = {};

    // Phone
    const phoneMatch = html.match(/href="tel:(\d+)"/i);
    if (phoneMatch) {
      const d = phoneMatch[1];
      details.phone = `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    }

    // Bonded & insured
    details.bonded_insured = /bonded\s+and\s+insured/i.test(html);

    // Award winner
    details.award_winner = /aw-w-winner/i.test(html);

    // Website — look for "Visit Company Website" link
    const websiteMatch = html.match(/href="(https?:\/\/(?!estatesales\.org)[^"]+)"[^>]*>[^<]*Visit Company Website/i)
      || html.match(/Visit Company Website[^<]*<\/a>[\s\S]{0,30}href="(https?:\/\/(?!estatesales\.org)[^"]+)"/i)
      || html.match(/<a[^>]+href="(https?:\/\/(?!estatesales\.org)[^"]+)"[^>]*>\s*Visit/i);
    if (websiteMatch) details.website_url = websiteMatch[1];

    // Member since & tier
    const memberMatch = html.match(/(Elite|Platinum|Basic)\s+member\s+since\s+([A-Za-z]+\s+\d+,?\s+\d{4})/i);
    if (memberMatch) {
      details.membership_tier = memberMatch[1].toLowerCase();
      details.member_since = memberMatch[2];
    }

    // Years in business
    const yearsMatch = html.match(/(\d+)\s+years?\s+in\s+business/i);
    if (yearsMatch) details.years_in_business = parseInt(yearsMatch[1]);

    // Has Facebook
    details.has_facebook = /facebook\.com/i.test(html);

    // About text - get content of the About section
    const aboutMatch = html.match(/About[^<]*<\/h2>\s*(?:<p[^>]*>)?([\s\S]{50,2000}?)(?:<h[23]|<hr|<div class="row)/i);
    if (aboutMatch) {
      details.about_text = aboutMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000);
    }

    // Services offered
    const servicesMatch = html.match(/Services Offered[\s\S]{0,100}<ul[^>]*>([\s\S]+?)<\/ul>/i);
    if (servicesMatch) {
      const items = [...servicesMatch[1].matchAll(/<li[^>]*>([^<]+)<\/li>/gi)];
      details.services_offered = items.map(m => m[1].trim()).filter(Boolean);
    }

    // Memberships
    const membershipsMatch = html.match(/Memberships[^<]*<\/h4>[\s\S]{0,100}<ul[^>]*>([\s\S]+?)<\/ul>/i);
    if (membershipsMatch) {
      const items = [...membershipsMatch[1].matchAll(/<li[^>]*>([^<]+)<\/li>/gi)];
      details.memberships = items.map(m => m[1].trim()).filter(Boolean);
    }

    // Credentials
    const credentialsMatch = html.match(/Credentials[\s\S]{0,100}<ul[^>]*>([\s\S]+?)<\/ul>/i);
    if (credentialsMatch) {
      const items = [...credentialsMatch[1].matchAll(/<li[^>]*>([^<]+)<\/li>/gi)];
      details.credentials = items.map(m => m[1].trim()).filter(Boolean);
    }

    // Service area cities
    const serviceAreaMatch = html.match(/Service areas[\s\S]{0,200}(also serving[\s\S]+?)(?:<hr|\* \*)/i);
    if (serviceAreaMatch) {
      const cityLinks = [...serviceAreaMatch[1].matchAll(/\/estate-sale-companies\/[a-z]{2}\/([^"]+)"/gi)];
      details.service_area_cities = cityLinks.map(m => m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }

    // Base city — "Based out of City, ST" on profile page
    const basedOutOfMatch = html.match(/[Bb]ased\s+out\s+of\s+([^,<\n]+),?\s*([A-Z]{2})?/);
    if (basedOutOfMatch) {
      details.base_city = basedOutOfMatch[1].replace(/<[^>]+>/g, '').trim();
      if (basedOutOfMatch[2]) details.base_state = basedOutOfMatch[2];
    }

    // Sales counts
    const salesCountMatch = html.match(/Past Sales\s*\((\d+)\)/i);
    if (salesCountMatch) details.sales_posted = parseInt(salesCountMatch[1]);
    const activeSalesMatch = html.match(/Sales\s*\((\d+)\)/i);
    if (activeSalesMatch) details.active_sales_count = parseInt(activeSalesMatch[1]);

    details.scrape_status = 'detail_scraped';
    details.last_scraped_at = new Date().toISOString();

    return details;
  } catch (e) {
    return { scrape_status: 'failed', last_scraped_at: new Date().toISOString() };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const stateAbbr = (body.state || 'nj').toLowerCase();
    const mode = body.mode || 'listing'; // 'listing' or 'detail'
    const detailLimit = body.detail_limit || 50; // how many detail pages to scrape per run
    const specificCities = body.cities || null; // optional city slug array override

    if (mode === 'counts') {
      // Return scrape progress counts — optionally for a specific state or all states
      const targetState = body.state ? stateAbbr.toUpperCase() : null;
      const filter = targetState ? { source_state: targetState } : {};
      const all = await base44.asServiceRole.entities.EstatesalesOrgOperator.filter(filter, '-created_date', 5000);
      const total = all.length;
      const detail_scraped = all.filter(r => r.scrape_status === 'detail_scraped').length;
      const listing_only = all.filter(r => r.scrape_status === 'listing_only').length;
      const failed = all.filter(r => r.scrape_status === 'failed').length;
      // Per-state breakdown
      const byState = {};
      all.forEach(r => {
        const s = r.source_state || 'unknown';
        if (!byState[s]) byState[s] = { total: 0, detail_scraped: 0, listing_only: 0, failed: 0 };
        byState[s].total++;
        byState[s][r.scrape_status] = (byState[s][r.scrape_status] || 0) + 1;
      });
      return Response.json({ total, detail_scraped, listing_only, failed, byState });

    } else if (mode === 'listing') {
      // Step 1: Get all city slugs from state page
      const stateHtml = await fetchPage(`${BASE_URL}/estate-sale-companies/${stateAbbr}`);
      let cityLinks = extractCityLinks(stateHtml, stateAbbr);

      // If dynamic extraction found nothing, also try the /all page variant
      if (cityLinks.length === 0) {
        try {
          const allPageHtml = await fetchPage(`${BASE_URL}/estate-sale-companies/${stateAbbr}/all`);
          cityLinks = extractCityLinks(allPageHtml, stateAbbr);
        } catch (e) { /* ignore */ }
      }

      const citiesToScrape = specificCities || cityLinks;

      // Pre-fetch all existing company_ids for this state in one query to avoid per-record DB calls
      const existingRecords = await base44.asServiceRole.entities.EstatesalesOrgOperator.filter(
        { source_state: stateAbbr.toUpperCase() }, '-created_date', 5000
      );
      const existingIds = new Set(existingRecords.map(r => r.company_id).filter(Boolean));

      let totalNew = 0;
      let totalSkipped = 0;
      const errors = [];

      for (const citySlug of citiesToScrape) {
        try {
          const cityUrl = `${BASE_URL}/estate-sale-companies/${stateAbbr}/${citySlug}`;
          const cityHtml = await fetchPage(cityUrl);
          const companies = parseListingPage(cityHtml, stateAbbr, citySlug);

          for (const company of companies) {
            if (!company.company_id) continue;
            if (existingIds.has(company.company_id)) {
              totalSkipped++;
              continue;
            }
            await base44.asServiceRole.entities.EstatesalesOrgOperator.create(company);
            existingIds.add(company.company_id); // prevent duplicate within same run
            totalNew++;
          }

          // Delay between city requests to avoid rate limiting
          await new Promise(r => setTimeout(r, 600));
        } catch (e) {
          errors.push({ city: citySlug, error: e.message });
        }
      }

      return Response.json({
        mode: 'listing',
        state: stateAbbr.toUpperCase(),
        cities_scraped: citiesToScrape.length,
        new_records: totalNew,
        skipped: totalSkipped,
        errors: errors.slice(0, 10),
      });

    } else if (mode === 'detail') {
      // Step 2: Enrich records that only have listing data
      const pending = await base44.asServiceRole.entities.EstatesalesOrgOperator.filter(
        { source_state: stateAbbr.toUpperCase(), scrape_status: 'listing_only' },
        '-created_date',
        detailLimit
      );

      let enriched = 0;
      let failed = 0;

      for (const record of pending) {
        if (!record.profile_url) continue;
        const details = await scrapeDetailPage(record.profile_url);
        await base44.asServiceRole.entities.EstatesalesOrgOperator.update(record.id, details);
        if (details.scrape_status === 'detail_scraped') enriched++;
        else failed++;
        // Delay between detail page requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 700));
      }

      return Response.json({
        mode: 'detail',
        state: stateAbbr.toUpperCase(),
        enriched,
        failed,
        remaining_to_enrich: pending.length - enriched - failed,
      });

    } else {
      return Response.json({ error: 'Invalid mode. Use listing or detail.' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});