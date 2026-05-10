import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch main page
    const mainPageResponse = await fetch('https://www.estatesales.net/companies/FL');
    const mainPageHtml = await mainPageResponse.text();
    
    // Get city links
    const cityLinkRegex = /href="(\/companies\/FL\/[^"]+)"/g;
    const cityLinks = [...mainPageHtml.matchAll(cityLinkRegex)]
      .map(m => `https://www.estatesales.net${m[1]}`)
      .filter((url, idx, arr) => arr.indexOf(url) === idx);

    let allCompanies = [];
    let parseFailures = [];

    // Scrape cities
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
                company_name: name,
                city: cityFromUrl,
                state: 'FL',
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
                source_state: 'FL'
              });
            } else {
              parseFailures.push({ city: cityFromUrl, reason: 'name_not_found' });
            }
          } catch (e) {
            parseFailures.push({ city: cityUrl.split('/').pop(), reason: 'parse_error', error: e.message });
          }
        }
      } catch (e) {
        console.error(`City fetch error: ${cityUrl}`, e.message);
      }
    }

    // Validate required fields
    let validCompanies = [];
    let validationFailures = [];
    
    for (const company of allCompanies) {
      if (!company.company_name || !company.city || !company.state) {
        validationFailures.push({ company: company.company_name, reason: 'missing_required_field' });
      } else {
        validCompanies.push(company);
      }
    }

    // Fetch existing records
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

    // Try to upsert a small test batch (first 10) — update if exists, insert if not
    const testBatch = validCompanies.slice(0, 10);
    let saveSuccesses = 0;
    let saveUpdates = 0;
    let saveInserts = 0;
    let saveFailures = [];

    const upsertWithRetry = async (company, maxRetries = 3) => {
      let delay = 500;
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
          if (e.message && e.message.includes('429') && i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
          } else {
            throw e;
          }
        }
      }
    };

    for (const company of testBatch) {
      try {
        const result = await upsertWithRetry(company);
        saveSuccesses++;
        if (result === 'updated') saveUpdates++;
        else saveInserts++;
      } catch (e) {
        saveFailures.push({ company: company.company_name, error: e.message });
      }
      await new Promise(r => setTimeout(r, 100));
    }

    // Count how many would be new vs updated across all valid companies
    let wouldUpdate = 0, wouldInsert = 0;
    for (const company of validCompanies) {
      const match = (company.source_url && byUrl.get(company.source_url)) || (company.phone && byPhone.get(company.phone));
      if (match) wouldUpdate++; else wouldInsert++;
    }

    return Response.json({
      diagnostic_report: {
        total_scraped: allCompanies.length,
        parse_failures: parseFailures.length,
        validation_failures: validationFailures.length,
        valid_companies: validCompanies.length,
        existing_in_db: existing.length,
        would_update: wouldUpdate,
        would_insert: wouldInsert,
        test_batch_size: testBatch.length,
        test_batch_successes: saveSuccesses,
        test_batch_updates: saveUpdates,
        test_batch_inserts: saveInserts,
        test_batch_failures: saveFailures.length,
      },
      parse_failure_samples: parseFailures.slice(0, 10),
      save_failure_details: saveFailures,
      message: `Of ${validCompanies.length} valid companies: ${wouldUpdate} would be updated, ${wouldInsert} would be inserted. Test batch (10): ${saveUpdates} updated, ${saveInserts} inserted, ${saveFailures.length} failed.`
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});