import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // New Jersey has region-based URLs instead of city-based
    const njRegions = [
      'https://www.estatesales.net/companies/NJ/Atlantic-City',
      'https://www.estatesales.net/companies/NJ/Northern-New-Jersey',
      'https://www.estatesales.net/companies/NJ/Ocean-City-Cape-May',
      'https://www.estatesales.net/companies/NJ/Trenton-Ewing-Central-NJ',
      'https://www.estatesales.net/companies/NJ/Vineland-Millville-Bridgeton'
    ];

    console.log(`Processing ${njRegions.length} NJ regions`);
    
    const allCompanies = [];
    const BATCH_SIZE = 10;

    // Process each region
    for (const regionUrl of njRegions) {
      try {
        console.log(`Fetching region: ${regionUrl}`);
        const regionResponse = await fetch(regionUrl);
        const regionHtml = await regionResponse.text();

        // Match company profile URLs with pattern /companies/NJ/City/ZIP/CompanyID
        const companyLinkRegex = /https:\/\/www\.estatesales\.net\/companies\/[A-Z]{2}\/[^/]+\/\d{5}\/\d+/g;
        const companyLinks = [...regionHtml.matchAll(companyLinkRegex)].map(m => m[0]);
        const uniqueCompanyLinks = [...new Set(companyLinks)];
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

              const locationMatch = companyHtml.match(/([^,\n]+),\s*([A-Z]{2})\s*(\d{5})/);
              const city = locationMatch ? locationMatch[1].trim() : null;
              const stateCode = locationMatch ? locationMatch[2] : 'NJ';
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
                  source_state: 'NJ'
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