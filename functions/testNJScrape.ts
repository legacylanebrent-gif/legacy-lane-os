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
    
    // Look for various patterns to find company links
    const patterns = [
      /href="(https:\/\/www\.estatesales\.net\/companies\/[^"]+)"/g,
      /<a[^>]*href="([^"]*companies[^"]*)"[^>]*>/g,
      /estatesales\.net\/companies\/[^\s"'<>]+/g
    ];
    
    const allMatches = {};
    patterns.forEach((pattern, idx) => {
      const matches = [...html.matchAll(pattern)].map(m => m[1] || m[0]);
      allMatches[`pattern_${idx + 1}`] = [...new Set(matches)].slice(0, 10);
      console.log(`Pattern ${idx + 1} found ${matches.length} matches`);
    });
    
    // Look for company cards or listings
    const companyCardPatterns = [
      /<div[^>]*class="[^"]*company[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<li[^>]*class="[^"]*company[^"]*"[^>]*>[\s\S]*?<\/li>/gi
    ];
    
    const cardSamples = {};
    companyCardPatterns.forEach((pattern, idx) => {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        cardSamples[`card_pattern_${idx + 1}`] = matches.slice(0, 2).map(m => m[0].substring(0, 500));
        console.log(`Card pattern ${idx + 1} found ${matches.length} matches`);
      }
    });
    
    // Sample the HTML structure
    const htmlSample = html.substring(0, 5000);
    
    return Response.json({ 
      url: testUrl,
      html_length: html.length,
      link_patterns: allMatches,
      card_samples: cardSamples,
      html_sample: htmlSample,
      note: "Check the patterns to see what company data we can extract"
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});