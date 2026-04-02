import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { state } = await req.json();
    
    if (!state) {
      return Response.json({ error: 'State parameter required (e.g., "AL")' }, { status: 400 });
    }

    const stateUrl = `https://www.estatesales.net/companies/${state}`;
    console.log(`Fetching state page: ${stateUrl}`);
    const stateResponse = await fetch(stateUrl);
    const stateHtml = await stateResponse.text();
    
    console.log(`State page HTML length: ${stateHtml.length}`);
    
    // Extract all city/region links - look for estatesales.net/companies/{STATE}/... patterns
    const allLinks = stateHtml.match(/https:\/\/www\.estatesales\.net\/companies\/[A-Z]{2}\/[^"\s<>]+/gi) || [];
    console.log(`Found ${allLinks.length} total links`);
    
    // Filter to only this state and exclude company profiles (which have /ZIP/CompanyID)
    const cityLinks = allLinks.filter(link => {
      const isThisState = link.includes(`/companies/${state}/`);
      const isNotCompanyProfile = !link.match(/\/\d{5}\/\d+/);
      return isThisState && isNotCompanyProfile;
    });
    
    const uniqueCityLinks = [...new Set(cityLinks)];
    console.log(`Found ${uniqueCityLinks.length} unique city/region URLs for ${state}:`, uniqueCityLinks);
    
    const allCompanies = [];
    const BATCH_SIZE = 10;

    // Process cities in parallel batches
    for (let i = 0; i < uniqueCityLinks.length; i += BATCH_SIZE) {
      const cityBatch = uniqueCityLinks.slice(i, i + BATCH_SIZE);
      console.log(`Processing cities ${i + 1}-${Math.min(i + BATCH_SIZE, uniqueCityLinks.length)} of ${uniqueCityLinks.length}`);

      const cityPromises = cityBatch.map(async (cityUrl) => {
        try {
          console.log(`  Fetching city: ${cityUrl}`);
          const cityResponse = await fetch(cityUrl);
          const cityHtml = await cityResponse.text();

          // Match company profile URLs with pattern /companies/STATE/City/ZIP/CompanyID
          const companyLinkRegex = new RegExp(`https://www\\.estatesales\\.net/companies/${state}/[^/]+/\\d{5}/\\d+`, 'g');
          const companyLinks = [...cityHtml.matchAll(companyLinkRegex)].map(m => m[0]);
          console.log(`    Found ${companyLinks.length} companies in ${cityUrl}`);
          return [...new Set(companyLinks)];
        } catch (error) {
          console.error(`Error processing city ${cityUrl}:`, error.message);
          return [];
        }
      });

      const cityResults = await Promise.all(cityPromises);
      const allCompanyLinks = cityResults.flat();
      console.log(`Found ${allCompanyLinks.length} companies in this batch`);

      // Process companies in parallel batches
      for (let j = 0; j < allCompanyLinks.length; j += BATCH_SIZE) {
        const companyBatch = allCompanyLinks.slice(j, j + BATCH_SIZE);

        const companyPromises = companyBatch.map(async (companyUrl) => {
          try {
            const companyResponse = await fetch(companyUrl);
            const companyHtml = await companyResponse.text();

            const nameMatch = companyHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
            const name = nameMatch ? nameMatch[1].trim() : null;

            const locationMatch = companyHtml.match(/([^,\n]+),\s*([A-Z]{2})\s*(\d{5})/);
            const city = locationMatch ? locationMatch[1].trim() : null;
            const stateCode = locationMatch ? locationMatch[2] : state;
            const zipCode = locationMatch ? locationMatch[3] : null;

            const phoneMatch = companyHtml.match(/tel:\s*\+?1?(\d{10})/);
            const phone = phoneMatch ? phoneMatch[1].replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : null;

            const websiteMatch = companyHtml.match(/href="(http[^"]+)"[^>]*>[\s\n]*(?!Message|Facebook|Twitter|Instagram|YouTube|Pinterest)([a-zA-Z0-9\-\.]+\.[a-z]{2,})/i);
            const website = websiteMatch ? websiteMatch[1] : null;

            const memberMatch = companyHtml.match(/Member\s+Since\s+(\d{4})/);
            const memberSince = memberMatch ? memberMatch[1] : null;

            const packageMatch = companyHtml.match(/(Gold|Silver|Bronze|Platinum)\s+Package/i);
            const packageType = packageMatch ? packageMatch[1] : null;

            const facebookMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/);
            const twitterMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?twitter\.com\/[^"]+)"/);
            const instagramMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/);
            const youtubeMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/);
            const pinterestMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?pinterest\.com\/[^"]+)"/);

            if (name && city) {
              console.log(`      ✓ Scraped: ${name} in ${city}, ${stateCode}`);
              return {
                company_name: name,
                city: city,
                state: stateCode,
                zip_code: zipCode,
                phone: phone,
                website: website,
                member_since: memberSince,
                package_type: packageType,
                facebook: facebookMatch ? facebookMatch[1] : null,
                twitter: twitterMatch ? twitterMatch[1] : null,
                instagram: instagramMatch ? instagramMatch[1] : null,
                youtube: youtubeMatch ? youtubeMatch[1] : null,
                pinterest: pinterestMatch ? pinterestMatch[1] : null,
                source_url: companyUrl,
                source_state: state
              };
            }
            } catch (error) {
            console.error(`Error scraping company ${companyUrl}:`, error.message);
            }
            return null;
            });

            const companyResults = await Promise.all(companyPromises);
            const validCompanies = companyResults.filter(c => c !== null);
            allCompanies.push(...validCompanies);
            console.log(`  Scraped ${validCompanies.length} companies from batch, total: ${allCompanies.length}`);

            // Save batch to database
            if (validCompanies.length > 0) {
            await base44.asServiceRole.entities.FutureEstateOperator.bulkCreate(validCompanies);
            }
            }
            }
    
    return Response.json({ 
      success: true,
      total_companies: allCompanies.length,
      companies: allCompanies
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});