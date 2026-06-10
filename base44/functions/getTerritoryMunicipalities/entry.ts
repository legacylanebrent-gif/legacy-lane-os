import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TERRITORIES_API_URL = "https://api.base44.app/api/apps/697206f0efd7bfde6e06b474/functions/territoriesApi";
const HOUSIO_BASE_URL = "https://api.base44.app/api/apps/697206f0efd7bfde6e06b474";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { county, state } = body;

    if (!county || !state) {
      return Response.json({ error: 'county and state are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get("HOUSIO_TERRITORIES_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'HOUSIO_TERRITORIES_API_KEY not configured' }, { status: 500 });
    }

    // Fetch micro-territories from Housio for this county
    const microRes = await fetch(TERRITORIES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ action: 'micro_list' }),
    });

    const microData = await microRes.json();
    const microTerritories = microData?.micro_territories || [];

    // Filter micro-territories for the requested county
    const filteredMicros = microTerritories.filter(mt => 
      mt.county?.toLowerCase() === county.toLowerCase() && 
      mt.state === state
    );

    // Extract cities from micro-territories
    const municipalities = [];
    const seenNames = new Set();

    filteredMicros.forEach(mt => {
      const cities = mt.cities || [];
      cities.forEach(city => {
        // Cities are just strings, convert to objects
        const cityName = typeof city === 'string' ? city : city.name;
        if (cityName && !seenNames.has(cityName)) {
          seenNames.add(cityName);
          municipalities.push({
            name: cityName,
            type: 'City',
            incorporated: null,
            lat: null,
            lng: null,
            zip_codes: [],
          });
        }
      });
    });

    // Sort by name
    municipalities.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({
      municipalities,
      total_count: municipalities.length,
      county,
      state,
      source: 'housio',
    });

  } catch (error) {
    console.error('[getTerritoryMunicipalities] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});