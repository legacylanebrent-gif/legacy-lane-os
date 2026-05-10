import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const batchOffset = body.batch_offset ?? 0;
    const cachedCompanies = body.all_companies ?? null;
    const batchSize = 25;
    let allCompanies = [];
    let failedParses = [];
    if (cachedCompanies) {
    allCompanies = cachedCompanies;
    } else {
    const mainPageResponse = await fetch('https://www.estatesales.net/companies/FL');
    const mainPageHtml = await mainPageResponse.text();
    const cityLinkRegex = /href="(\/companies\/FL\/[^"]+)"/g;
    const cityLinks = [...mainPageHtml.matchAll(cityLinkRegex)]
      .map(m => `https://www.estatesales.net${m[1]}`)
      .filter((url, idx, arr) => arr.indexOf(url) === idx);
    for (const cityUrl of cityLinks) {
      try {
        const cityResponse = await fetch(cityUrl);
        const cityHtml = await cityResponse.text();
        const companyBlocks = cityHtml.split('<app-company-city-view-row');
        for (let i = 1; i < companyBlocks.length; i++) {
          const block = companyBlocks[i];
          try {
            let nameMatch = block.match(/href="\/companies\/FL\/[^"]+\/\d{5}\/\d+"[^>]*>([^<]+)<\/a>/);
            if (!nameMatch) nameMatch = block.match(/itemprop="name"[^>]*>([^<]+)</);
            const name = nameMatch ? nameMatch[1].trim() : null;
            const urlMatch = block.match(/href="(\/companies\/FL\/[^"]+\/\d{5}\/\d+)"/);
            const companyUrl = urlMatch ? `https://www.estatesales.net${urlMatch[1]}` : null;
            const cityFromUrl = cityUrl.split('/').pop().replace(/-/g, ' ');
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
            if (name) {
              allCompanies.push({
                company_name: name, city: cityFromUrl, state: 'FL', phone, website,
                member_since: memberSince, package_type: packageType,
                facebook: facebookMatch ? facebookMatch[1] : null,
                twitter: twitterMatch ? twitterMatch[1] : null,
                instagram: instagramMatch ? instagramMatch[1] : null,
                youtube: youtubeMatch ? youtubeMatch[1] : null,
                pinterest: pinterestMatch ? pinterestMatch[1] : null,
                source_url: companyUrl, source_state: 'FL'
              });
            } else {
              failedParses.push({ city: cityFromUrl, block: block.substring(0, 200) });
            }
          } catch (e) {
            failedParses.push({ city: cityUrl.split('/').pop(), error: e.message });
          }
        }
      } catch (e) {}
    }
    }
    const batch = allCompanies.slice(batchOffset, batchOffset + batchSize);
    const isLastBatch = batchOffset + batchSize >= allCompanies.length;
    let existing = [];
    let skip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.FutureEstateOperator.filter({ state: 'FL' }, '-created_date', 500, skip);
      existing = existing.concat(page);
      if (page.length < 500) break;
      skip += 500;
    }
    const byUrl = new Map(existing.filter(e => e.source_url).map(e => [e.source_url, e]));
    const byPhone = new Map(existing.filter(e => e.phone).map(e => [e.phone, e]));
    const saveWithRetry = async (company, maxRetries = 8) => {
      let delay = 2000;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const match = (company.source_url && byUrl.get(company.source_url)) || (company.phone && byPhone.get(company.phone));
          if (match) {
            await base44.asServiceRole.entities.FutureEstateOperator.update(match.id, {
              company_name: company.company_name, city: company.city, phone: company.phone,
              website: company.website, member_since: company.member_since, package_type: company.package_type,
              facebook: company.facebook, twitter: company.twitter, instagram: company.instagram,
              youtube: company.youtube, pinterest: company.pinterest, source_url: company.source_url,
            });
            return 'updated';
          } else {
            await base44.asServiceRole.entities.FutureEstateOperator.create(company);
            return 'created';
          }
        } catch (e) {
          if (i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 30000);
          } else {
            throw e;
          }
        }
      }
    };
    let inserted = 0, updated = 0, failed = 0;
    for (const company of batch) {
      try {
        const result = await saveWithRetry(company);
        if (result === 'created') inserted++;
        else if (result === 'updated') updated++;
      } catch (e) {
        failed++;
      }
      await new Promise(r => setTimeout(r, 600));
    }
    return Response.json({
      success: true, total_companies: allCompanies.length, all_companies: allCompanies,
      batch_offset: batchOffset, batch_size: batch.length, inserted, updated, failed,
      next_offset: isLastBatch ? null : batchOffset + batchSize, is_last_batch: isLastBatch,
      failed_parses: failedParses.length, failed_parse_samples: failedParses.slice(0, 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});