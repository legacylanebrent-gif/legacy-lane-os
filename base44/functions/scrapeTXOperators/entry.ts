import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the main TX page to get all cities dynamically
    console.log('Fetching main TX page to extract cities...');
    const mainPageResponse = await fetch('https://www.estatesales.net/companies/TX');
    const mainPageHtml = await mainPageResponse.text();
    
    // Extract all city links
    const cityLinkRegex = /href="(\/companies\/TX\/[^"]+)"/g;
    const cityLinks = [...mainPageHtml.matchAll(cityLinkRegex)]
      .map(m => `https://www.estatesales.net${m[1]}`)
      .filter((url, idx, arr) => arr.indexOf(url) === idx); // unique only
    
    console.log(`Found ${cityLinks.length} TX cities to process`);
    
    const allCompanies = [];

    // Process each city
    for (const cityUrl of cityLinks) {
      try {
        console.log(`\nFetching city: ${cityUrl}`);
        const cityResponse = await fetch(cityUrl);
        const cityHtml = await cityResponse.text();

        // Extract all company blocks
        const companyBlocks = cityHtml.split('<app-company-city-view-row');
        console.log(`  Found ${companyBlocks.length - 1} company blocks`);
        
        for (let i = 1; i < companyBlocks.length; i++) {
          const block = companyBlocks[i];
          
          try {
            // Extract company name
            let nameMatch = block.match(/href="\/companies\/TX\/[^"]+\/\d{5}\/\d+"[^>]*>([^<]+)<\/a>/);
            if (!nameMatch) {
              nameMatch = block.match(/itemprop="name"[^>]*>([^<]+)</);
            }
            const name = nameMatch ? nameMatch[1].trim() : null;
            
            // Extract URL
            const urlMatch = block.match(/href="(\/companies\/TX\/[^"]+\/\d{5}\/\d+)"/);
            const companyUrl = urlMatch ? `https://www.estatesales.net${urlMatch[1]}` : null;
            
            // Extract city from URL
            const cityFromUrl = cityUrl.split('/').pop().replace(/-/g, ' ');
            
            // Extract phone
            const phoneMatch = block.match(/itemprop="telephone"[^>]*>(\([0-9]{3}\)\s[0-9]{3}-[0-9]{4})/);
            const phone = phoneMatch ? phoneMatch[1] : null;
            
            // Extract website
            const websiteMatch = block.match(/href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*>([a-zA-Z0-9\-\.]+\.[a-z]{2,})/i);
            const website = websiteMatch ? websiteMatch[1] : null;
            
            // Extract member since
            const memberMatch = block.match(/Member.*Since\s+(\d{4})/i);
            const memberSince = memberMatch ? memberMatch[1] : null;
            
            // Extract package type
            const packageMatch = block.match(/alt="(Gold|Silver|Bronze|Platinum)\s+Package"/i);
            const packageType = packageMatch ? packageMatch[1] : null;
            
            // Social media
            const facebookMatch = block.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/);
            const twitterMatch = block.match(/href="(https?:\/\/(?:www\.)?twitter\.com\/[^"]+)"/);
            const instagramMatch = block.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/);
            const youtubeMatch = block.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/);
            const pinterestMatch = block.match(/href="(https?:\/\/(?:www\.)?pinterest\.com\/[^"]+)"/);
            
            if (name) {
              console.log(`    ✓ Parsed: ${name}${phone ? ' - ' + phone : ''}`);
              
              allCompanies.push({
                company_name: name,
                city: cityFromUrl,
                state: 'TX',
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
                source_state: 'TX'
              });
            }
          } catch (error) {
            console.error(`Error parsing company block:`, error.message);
          }
        }
        
      } catch (error) {
        console.error(`Error processing city ${cityUrl}:`, error.message);
      }
    }
    
    console.log(`\n=== Scraped ${allCompanies.length} total companies ===`);
    
    // Save to database
    if (allCompanies.length > 0) {
      console.log('Saving to database...');
      await base44.asServiceRole.entities.FutureEstateOperator.bulkCreate(allCompanies);
      console.log('✓ Saved to database');
    }

    // Now check for and delete duplicates
    console.log('\n=== Checking for duplicates ===');
    const allOperators = await base44.asServiceRole.entities.FutureEstateOperator.filter(
      { state: 'TX' },
      '-created_date',
      1000
    );
    
    console.log(`Total TX operators in database: ${allOperators.length}`);

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

    console.log(`Found ${toDelete.length} duplicates in TX`);
    
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