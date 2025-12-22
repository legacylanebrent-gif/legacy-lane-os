import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Idaho regions
    const idRegions = [
      'https://www.estatesales.net/companies/ID/Boise',
      'https://www.estatesales.net/companies/ID/Coeur-d-Alene',
      'https://www.estatesales.net/companies/ID/Idaho-Falls',
      'https://www.estatesales.net/companies/ID/Lewiston',
      'https://www.estatesales.net/companies/ID/Meridian',
      'https://www.estatesales.net/companies/ID/Nampa',
      'https://www.estatesales.net/companies/ID/Pocatello',
      'https://www.estatesales.net/companies/ID/Twin-Falls'
    ];

    console.log(`Processing ${idRegions.length} ID regions`);
    
    const allCompanies = [];
    const BATCH_SIZE = 10;

    // Process each region
    for (const regionUrl of idRegions) {
      try {
        console.log(`Fetching region: ${regionUrl}`);
        const regionResponse = await fetch(regionUrl);
        const regionHtml = await regionResponse.text();

        // Match company profile URLs (relative format)
        const companyLinkRegex = /href="(\/companies\/ID\/[^/]+\/\d{5}\/\d+)"/g;
        const relativeLinks = [...regionHtml.matchAll(companyLinkRegex)].map(m => m[1]);
        const uniqueCompanyLinks = [...new Set(relativeLinks)].map(link => `https://www.estatesales.net${link}`);
        console.log(`  Found ${uniqueCompanyLinks.length} companies in ${regionUrl}`);

        // Process companies in parallel batches
        for (let j = 0; j < uniqueCompanyLinks.length; j += BATCH_SIZE) {
          const companyBatch = uniqueCompanyLinks.slice(j, j + BATCH_SIZE);

          const companyPromises = companyBatch.map(async (companyUrl) => {
            try {
              const companyResponse = await fetch(companyUrl);
              const companyHtml = await companyResponse.text();

              const nameMatch = companyHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
              const name = nameMatch ? nameMatch[1].trim() : null;

              // Extract city and zip from URL path: /companies/ID/City/ZIP/ID
              const urlParts = companyUrl.match(/\/companies\/ID\/([^/]+)\/(\d{5})\/\d+/);
              const cityFromUrl = urlParts ? urlParts[1].replace(/-/g, ' ') : null;
              const zipFromUrl = urlParts ? urlParts[2] : null;

              // Try to find location in page text as backup
              const locationMatch = companyHtml.match(/([^,\n]+),\s*([A-Z]{2})\s*(\d{5})/);
              const city = locationMatch ? locationMatch[1].trim() : cityFromUrl;
              const stateCode = locationMatch ? locationMatch[2] : 'ID';
              const zipCode = locationMatch ? locationMatch[3] : zipFromUrl;

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
                console.log(`    ✓ Scraped: ${name} in ${city}, ${stateCode}`);
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
                  source_state: 'ID'
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
      } catch (error) {
        console.error(`Error processing region ${regionUrl}:`, error.message);
      }
    }

    // Now check for and delete duplicates
    console.log('\n=== Checking for duplicates ===');
    const allOperators = await base44.asServiceRole.entities.FutureEstateOperator.filter(
      { state: 'ID' },
      '-created_date',
      1000
    );
    
    console.log(`Total ID operators in database: ${allOperators.length}`);

    const phoneMap = new Map();
    const toDelete = [];
    
    for (const operator of allOperators) {
      const phone = operator.phone;
      
      if (!phone) continue;
      
      if (phoneMap.has(phone)) {
        toDelete.push(operator.id);
        console.log(`Duplicate: ${operator.company_name} (${phone}) - will delete`);
      } else {
        phoneMap.set(phone, operator);
      }
    }

    console.log(`Found ${toDelete.length} duplicates in ID`);
    
    let deleted = 0;
    const batchSize = 10;
    
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      
      for (const id of batch) {
        try {
          await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
          deleted++;
          console.log(`Deleted ${deleted}/${toDelete.length}`);
        } catch (error) {
          console.error(`Failed to delete ${id}:`, error.message);
        }
      }
      
      if (i + batchSize < toDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return Response.json({ 
      success: true,
      scraped: allCompanies.length,
      total_in_db: allOperators.length,
      duplicates_deleted: deleted,
      final_count: allOperators.length - deleted
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});