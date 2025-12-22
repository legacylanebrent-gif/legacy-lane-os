import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const testUrl = 'https://www.estatesales.net/companies/NJ/Atlantic-City';
    console.log(`Fetching: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const html = await response.text();
    
    console.log(`HTML length: ${html.length}`);
    
    // Find company profile links (relative URLs)
    const companyLinkRegex = /href="(\/companies\/NJ\/[^/]+\/\d{5}\/\d+)"/g;
    const relativeLinks = [...html.matchAll(companyLinkRegex)].map(m => m[1]);
    const uniqueLinks = [...new Set(relativeLinks)];
    
    console.log(`Found ${uniqueLinks.length} unique company links`);
    
    // Take first 3 companies as sample
    const sampleCompanies = [];
    const sampleLinks = uniqueLinks.slice(0, 3);
    
    for (const relativeUrl of sampleLinks) {
      const companyUrl = `https://www.estatesales.net${relativeUrl}`;
      console.log(`Fetching company: ${companyUrl}`);
      
      try {
        const companyResponse = await fetch(companyUrl);
        const companyHtml = await companyResponse.text();

        // Extract company data
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
          source_state: 'NJ'
        });
        
        console.log(`✓ Scraped: ${name}`);
      } catch (error) {
        console.error(`Error scraping ${companyUrl}:`, error.message);
      }
    }
    
    return Response.json({ 
      url: testUrl,
      total_companies_found: uniqueLinks.length,
      sample_companies: sampleCompanies,
      note: "This is a sample of 3 companies. Ready to scrape all?"
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});