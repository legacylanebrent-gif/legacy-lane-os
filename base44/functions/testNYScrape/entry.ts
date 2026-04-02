import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the NY state page to find all city/region links
    const stateUrl = 'https://www.estatesales.net/companies/NY';
    console.log(`Fetching: ${stateUrl}`);
    
    const stateResponse = await fetch(stateUrl);
    const stateHtml = await stateResponse.text();
    
    console.log(`State page HTML length: ${stateHtml.length}`);
    
    // Extract city/region links (relative format) - clean the URLs properly
    const cityLinkRegex = /href="(\/companies\/NY\/[^"<>]+?)(?:"|<)/g;
    const relativeLinks = [...stateHtml.matchAll(cityLinkRegex)].map(m => m[1]);
    const uniqueCityLinks = [...new Set(relativeLinks)].filter(link => {
      // Exclude company profiles (which have /ZIP/CompanyID)
      return !link.match(/\/\d{5}\/\d+/);
    });
    
    console.log(`Found ${uniqueCityLinks.length} unique cities/regions`);
    
    // Pick first city and scrape sample companies
    if (uniqueCityLinks.length === 0) {
      return Response.json({ error: 'No cities found', html_sample: stateHtml.substring(0, 2000) });
    }
    
    const testCityUrl = `https://www.estatesales.net${uniqueCityLinks[0]}`;
    console.log(`Testing with: ${testCityUrl}`);
    
    const cityResponse = await fetch(testCityUrl);
    const cityHtml = await cityResponse.text();
    
    // Find company links in this city
    const companyLinkRegex = /href="(\/companies\/NY\/[^/]+\/\d{5}\/\d+)"/g;
    const companyRelativeLinks = [...cityHtml.matchAll(companyLinkRegex)].map(m => m[1]);
    const uniqueCompanyLinks = [...new Set(companyRelativeLinks)];
    
    console.log(`Found ${uniqueCompanyLinks.length} companies in ${testCityUrl}`);
    
    // Scrape first 3 companies as sample
    const sampleCompanies = [];
    const sampleLinks = uniqueCompanyLinks.slice(0, 3);
    
    for (const relativeUrl of sampleLinks) {
      const companyUrl = `https://www.estatesales.net${relativeUrl}`;
      console.log(`Fetching company: ${companyUrl}`);
      
      try {
        const companyResponse = await fetch(companyUrl);
        const companyHtml = await companyResponse.text();

        const nameMatch = companyHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const name = nameMatch ? nameMatch[1].trim() : null;

        const urlParts = companyUrl.match(/\/companies\/NY\/([^/]+)\/(\d{5})\/\d+/);
        const cityFromUrl = urlParts ? urlParts[1].replace(/-/g, ' ') : null;
        const zipFromUrl = urlParts ? urlParts[2] : null;

        const locationMatch = companyHtml.match(/([^,\n]+),\s*([A-Z]{2})\s*(\d{5})/);
        const city = locationMatch ? locationMatch[1].trim() : cityFromUrl;
        const stateCode = locationMatch ? locationMatch[2] : 'NY';
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

        sampleCompanies.push({
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
          source_state: 'NY'
        });
        
        console.log(`✓ Scraped: ${name}`);
      } catch (error) {
        console.error(`Error scraping ${companyUrl}:`, error.message);
      }
    }
    
    return Response.json({ 
      state: 'NY',
      total_cities_found: uniqueCityLinks.length,
      cities_sample: uniqueCityLinks.slice(0, 10),
      test_city: testCityUrl,
      companies_in_test_city: uniqueCompanyLinks.length,
      sample_companies: sampleCompanies,
      note: "Sample from first city. Ready to scrape all NY cities?"
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});