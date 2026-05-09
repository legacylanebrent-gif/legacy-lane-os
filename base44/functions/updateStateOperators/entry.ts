import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Generic state operator updater.
// Accepts { state: "AR" } in the request body.
// Re-scrapes estatesales.net for that state, upserts records, then deduplicates by phone.

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchHtml(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OperatorScraper/1.0)' }
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(t);
    return null;
  }
}

function parseCompaniesFromHtml(html, state, cityUrl) {
  const companies = [];
  const cityFromUrl = cityUrl.split('/').pop().replace(/-/g, ' ');
  const blocks = html.split('<app-company-city-view-row');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    try {
      let nameMatch = block.match(new RegExp(`href="\\/companies\\/${state}\\/[^"]+\\/\\d{5}\\/\\d+"[^>]*>([^<]+)<\\/a>`));
      if (!nameMatch) nameMatch = block.match(/itemprop="name"[^>]*>([^<]+)</);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (!name) continue;

      const urlMatch = block.match(new RegExp(`href="(\\/companies\\/${state}\\/[^"]+\\/\\d{5}\\/\\d+)"`));
      const companyUrl = urlMatch ? `https://www.estatesales.net${urlMatch[1]}` : null;

      const phoneMatch = block.match(/itemprop="telephone"[^>]*>(\([0-9]{3}\)\s[0-9]{3}-[0-9]{4})/);
      const phone = phoneMatch ? phoneMatch[1] : null;

      const websiteMatch = block.match(/href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*>([a-zA-Z0-9\-\.]+\.[a-z]{2,})/i);
      const website = websiteMatch ? websiteMatch[1] : null;

      const memberMatch = block.match(/Member.*Since\s+(\d{4})/i);
      const memberSince = memberMatch ? memberMatch[1] : null;

      const packageMatch = block.match(/alt="(Gold|Silver|Bronze|Platinum)\s+Package"/i);
      const packageType = packageMatch ? packageMatch[1] : null;

      const facebookMatch = block.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/);
      const twitterMatch = block.match(/href="(https?:\/\/(?:www\.)?twitter\.com\/[^"]+)"/);
      const instagramMatch = block.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/);
      const youtubeMatch = block.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/);
      const pinterestMatch = block.match(/href="(https?:\/\/(?:www\.)?pinterest\.com\/[^"]+)"/);

      companies.push({
        company_name: name,
        city: cityFromUrl,
        state,
        phone,
        website,
        member_since: memberSince,
        package_type: packageType,
        facebook: facebookMatch ? facebookMatch[1] : null,
        twitter: twitterMatch ? twitterMatch[1] : null,
        instagram: instagramMatch ? instagramMatch[1] : null,
        youtube: youtubeMatch ? youtubeMatch[1] : null,
        pinterest: pinterestMatch ? pinterestMatch[1] : null,
        source_url: companyUrl,
        source_state: state
      });
    } catch { /* skip bad block */ }
  }
  return companies;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const state = (body.state || '').toUpperCase();
    if (!state || state.length !== 2) {
      return Response.json({ error: 'state (2-letter code) is required' }, { status: 400 });
    }

    // ── Step 1: Get city list ────────────────────────────────────────────────
    console.log(`Fetching main page for ${state}...`);
    const mainHtml = await fetchHtml(`https://www.estatesales.net/companies/${state}`);
    if (!mainHtml) return Response.json({ error: `Could not fetch state page for ${state}` }, { status: 500 });

    const cityLinkRegex = new RegExp(`href="(\\/companies\\/${state}\\/[^"]+)"`, 'g');
    const cityLinks = [...mainHtml.matchAll(cityLinkRegex)]
      .map(m => `https://www.estatesales.net${m[1]}`)
      .filter((url, idx, arr) => arr.indexOf(url) === idx);

    console.log(`Found ${cityLinks.length} cities for ${state}`);

    // ── Step 2: Scrape each city ─────────────────────────────────────────────
    const allCompanies = [];
    for (const cityUrl of cityLinks) {
      const html = await fetchHtml(cityUrl, 12000);
      if (html) {
        const companies = parseCompaniesFromHtml(html, state, cityUrl);
        allCompanies.push(...companies);
      }
      await sleep(300); // polite delay between city requests
    }

    console.log(`Scraped ${allCompanies.length} companies for ${state}`);

    // ── Step 3: Load existing records for state (paginated) ──────────────────
    let existingAll = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.FutureEstateOperator.filter(
        { state }, '-created_date', 500, skip
      );
      existingAll = existingAll.concat(batch);
      if (batch.length < 500) break;
      skip += 500;
    }

    const existingByUrl = new Map(existingAll.filter(o => o.source_url).map(o => [o.source_url, o]));
    const existingByPhone = new Map(existingAll.filter(o => o.phone).map(o => [o.phone.replace(/\D/g, ''), o]));

    let inserted = 0;
    let updated = 0;

    for (const company of allCompanies) {
      const normPhone = company.phone ? company.phone.replace(/\D/g, '') : null;
      const existing = (company.source_url && existingByUrl.get(company.source_url))
        || (normPhone && existingByPhone.get(normPhone));

      if (existing) {
        await base44.asServiceRole.entities.FutureEstateOperator.update(existing.id, company);
        updated++;
      } else {
        await base44.asServiceRole.entities.FutureEstateOperator.create(company);
        inserted++;
      }
      await sleep(80); // rate limit protection
    }

    console.log(`Upserted: ${inserted} new, ${updated} updated`);

    // ── Step 4: Deduplicate by phone within state ────────────────────────────
    let dedupeAll = [];
    skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.FutureEstateOperator.filter(
        { state }, '-created_date', 500, skip
      );
      dedupeAll = dedupeAll.concat(batch);
      if (batch.length < 500) break;
      skip += 500;
    }

    const phoneMap = {};
    for (const op of dedupeAll) {
      const phone = op.phone ? op.phone.replace(/\D/g, '') : null;
      if (!phone || phone.length < 7) continue;
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(op);
    }

    let duplicatesDeleted = 0;
    for (const group of Object.values(phoneMap)) {
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        const sA = Object.values(a).filter(v => v !== null && v !== undefined && v !== '').length;
        const sB = Object.values(b).filter(v => v !== null && v !== undefined && v !== '').length;
        return sB - sA;
      });
      for (let i = 1; i < group.length; i++) {
        await base44.asServiceRole.entities.FutureEstateOperator.delete(group[i].id);
        duplicatesDeleted++;
        await sleep(150);
      }
    }

    const finalCount = dedupeAll.length - duplicatesDeleted;

    return Response.json({
      success: true,
      state,
      cities_scraped: cityLinks.length,
      companies_found: allCompanies.length,
      inserted,
      updated,
      duplicates_deleted: duplicatesDeleted,
      final_count: finalCount,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});