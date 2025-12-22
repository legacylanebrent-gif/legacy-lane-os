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
    const stateResponse = await fetch(stateUrl);
    const stateHtml = await stateResponse.text();
    
    // Extract city links from the state page
    const cityLinkRegex = new RegExp(`https://www\\.estatesales\\.net/companies/${state}/([^"\\s]+)`, 'g');
    const cityLinks = [...stateHtml.matchAll(cityLinkRegex)].map(m => m[0]);
    const uniqueCityLinks = [...new Set(cityLinks)];
    
    console.log(`Found ${uniqueCityLinks.length} cities in ${state}`);
    
    const allCompanies = [];
    
    // Process each city
    for (const cityUrl of uniqueCityLinks) {
      console.log(`Processing: ${cityUrl}`);
      
      try {
        const cityResponse = await fetch(cityUrl);
        const cityHtml = await cityResponse.text();
        
        // Extract company profile links
        const companyLinkRegex = new RegExp(`https://www\\.estatesales\\.net/companies/${state}/[^/]+/\\d+/\\d+`, 'g');
        const companyLinks = [...cityHtml.matchAll(companyLinkRegex)].map(m => m[0]);
        const uniqueCompanyLinks = [...new Set(companyLinks)];
        
        console.log(`  Found ${uniqueCompanyLinks.length} companies`);
        
        // Process each company
        for (const companyUrl of uniqueCompanyLinks) {
          try {
            const companyResponse = await fetch(companyUrl);
            const companyHtml = await companyResponse.text();
            
            // Extract company name
            const nameMatch = companyHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
            const name = nameMatch ? nameMatch[1].trim() : null;
            
            // Extract location
            const locationMatch = companyHtml.match(/([^,\n]+),\s*([A-Z]{2})(\d{5})/);
            const city = locationMatch ? locationMatch[1].trim() : null;
            const stateCode = locationMatch ? locationMatch[2] : state;
            const zipCode = locationMatch ? locationMatch[3] : null;
            
            // Extract phone
            const phoneMatch = companyHtml.match(/tel:\s*\+?1?(\d{10})/);
            const phone = phoneMatch ? phoneMatch[1].replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : null;
            
            // Extract website
            const websiteMatch = companyHtml.match(/href="(http[^"]+)"[^>]*>[\s\n]*(?!Message|Facebook|Twitter|Instagram|YouTube|Pinterest)([a-zA-Z0-9\-\.]+\.[a-z]{2,})/i);
            const website = websiteMatch ? websiteMatch[1] : null;
            
            // Extract member since
            const memberMatch = companyHtml.match(/Member\s+Since\s+(\d{4})/);
            const memberSince = memberMatch ? memberMatch[1] : null;
            
            // Extract package type
            const packageMatch = companyHtml.match(/(Gold|Silver|Bronze|Platinum)\s+Package/i);
            const packageType = packageMatch ? packageMatch[1] : null;
            
            // Extract social media
            const facebookMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/);
            const twitterMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?twitter\.com\/[^"]+)"/);
            const instagramMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/);
            const youtubeMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/);
            const pinterestMatch = companyHtml.match(/href="(https?:\/\/(?:www\.)?pinterest\.com\/[^"]+)"/);
            
            if (name && city) {
              const company = {
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
              
              allCompanies.push(company);
              console.log(`    Scraped: ${name}`);
            }
          } catch (error) {
            console.error(`    Error scraping company ${companyUrl}:`, error.message);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`  Error processing city ${cityUrl}:`, error.message);
      }
    }
    
    // Save all companies to database
    if (allCompanies.length > 0) {
      await base44.asServiceRole.entities.FutureEstateOperator.bulkCreate(allCompanies);
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