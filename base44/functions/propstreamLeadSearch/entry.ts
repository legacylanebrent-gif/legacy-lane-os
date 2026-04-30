import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { searchType = 'absentee', state, city, county, zipCode, radius, limit = 50 } = body;

    // Propstream API endpoint
    const propstreamApiKey = Deno.env.get('PROPSTREAM_API_KEY');
    if (!propstreamApiKey) {
      return Response.json({ error: 'Propstream API key not configured' }, { status: 500 });
    }

    // Build search parameters based on type
    const searchParams = new URLSearchParams();
    searchParams.set('api_key', propstreamApiKey);
    searchParams.set('limit', limit.toString());

    // Construct search criteria
    if (searchType === 'absentee') {
      searchParams.set('owner_type', 'absentee');
    } else if (searchType === 'inherited') {
      searchParams.set('owner_type', 'inherited');
    } else if (searchType === 'distressed') {
      searchParams.set('property_condition', 'fair,poor');
    }

    if (state) searchParams.set('state', state);
    if (city) searchParams.set('city', city);
    if (county) searchParams.set('county', county);
    if (zipCode) searchParams.set('zip_code', zipCode);
    if (radius) searchParams.set('radius_miles', radius.toString());

    // Call Propstream API
    const propstreamUrl = `https://api.propstream.com/v1/properties/search?${searchParams.toString()}`;
    
    const propstreamResponse = await fetch(propstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${propstreamApiKey}`
      }
    });

    if (!propstreamResponse.ok) {
      const error = await propstreamResponse.text();
      console.error('Propstream API error:', error);
      return Response.json({ error: 'Failed to fetch from Propstream' }, { status: 500 });
    }

    const data = await propstreamResponse.json();
    const properties = data.properties || data.results || [];

    // Normalize Propstream data to Lead format
    const leads = properties.map(prop => ({
      contact_name: prop.owner_name || 'Unknown Owner',
      contact_email: prop.owner_email || null,
      contact_phone: prop.owner_phone || null,
      property_address: `${prop.property_address || ''}, ${prop.city || ''}, ${prop.state || ''}`,
      estimated_value: prop.estimated_value || prop.property_value || 0,
      source: 'propstream',
      source_details: `${searchType} - ${city || state}`,
      intent: 'estate_sale',
      situation: searchType === 'inherited' ? 'probate' : searchType === 'distressed' ? 'foreclosure' : 'standard',
      propstream_id: prop.id || prop.property_id,
      propstream_equity: prop.estimated_equity || null,
      propstream_owner_type: searchType,
      timeline: 'exploring',
      score: calculateLeadScore(prop),
      referral_eligible: true,
      notes: `Imported from Propstream: ${searchType} lead in ${city || county || state}`
    }));

    return Response.json({
      status: 'success',
      count: leads.length,
      leads: leads,
      search_criteria: { searchType, state, city, county, zipCode, radius }
    });

  } catch (error) {
    console.error('Error in propstreamLeadSearch:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateLeadScore(property) {
  let score = 50;

  // Higher equity = higher score
  if (property.estimated_equity > 500000) score += 25;
  else if (property.estimated_equity > 250000) score += 15;
  else if (property.estimated_equity > 100000) score += 10;

  // Owner type scoring
  if (property.owner_type === 'absentee') score += 10;
  if (property.owner_type === 'inherited') score += 15;

  // Property condition scoring
  if (property.condition === 'poor' || property.condition === 'fair') score += 10;

  // Contact info bonus
  if (property.owner_email) score += 5;
  if (property.owner_phone) score += 5;

  return Math.min(100, score);
}