import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Testing Boise scrape...');
    const boiseUrl = 'https://www.estatesales.net/companies/ID/Boise';
    const response = await fetch(boiseUrl);
    const html = await response.text();
    
    // Try different regex patterns
    const pattern1 = /href="\/companies\/ID\/([^/]+)\/(\d{5})\/(\d+)"/g;
    const matches1 = [...html.matchAll(pattern1)];
    console.log(`Pattern 1 found ${matches1.length} matches`);
    matches1.forEach(m => console.log(`  - /companies/ID/${m[1]}/${m[2]}/${m[3]}`));
    
    // Try to find company names
    const namePattern = /<a[^>]*href="\/companies\/ID\/[^"]+\/\d{5}\/\d+"[^>]*>([^<]+)<\/a>/g;
    const nameMatches = [...html.matchAll(namePattern)];
    console.log(`\nFound ${nameMatches.length} company name matches`);
    nameMatches.forEach(m => console.log(`  - ${m[1].trim()}`));
    
    // Look for itemprop="name"
    const schemaPatter = /itemprop="name"[^>]*>([^<]+)</g;
    const schemaMatches = [...html.matchAll(schemaPatter)];
    console.log(`\nFound ${schemaMatches.length} schema.org name matches`);
    schemaMatches.forEach(m => console.log(`  - ${m[1].trim()}`));
    
    return Response.json({ 
      success: true,
      pattern1_matches: matches1.length,
      name_matches: nameMatches.length,
      schema_matches: schemaMatches.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});