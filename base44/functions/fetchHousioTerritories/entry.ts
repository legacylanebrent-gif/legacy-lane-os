import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TERRITORIES_API_URL = "https://api.base44.app/api/apps/697206f0efd7bfde6e06b474/functions/territoriesApi";
const HOUSIO_BASE_URL = "https://api.base44.app/api/apps/697206f0efd7bfde6e06b474";

async function housioRequest(path, method, body, apiKey) {
  const res = await fetch(`${HOUSIO_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get("HOUSIO_TERRITORIES_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'HOUSIO_TERRITORIES_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    // Write actions — call Housio REST API directly
    if (action === 'micro_create') {
      const { territory_id, name, county, state, cities } = body;
      if (!territory_id || !name || !county || !state) {
        return Response.json({ error: 'Missing required fields: territory_id, name, county, state' }, { status: 400 });
      }
      const data = await housioRequest('/entities/MicroTerritory', 'POST', {
        territory_id, name, county, state, cities: cities || [], status: 'ACTIVE'
      }, apiKey);
      return Response.json(data);
    }

    if (action === 'micro_update') {
      const { id, ...updates } = body;
      delete updates.action;
      if (!id) return Response.json({ error: 'Missing required field: id' }, { status: 400 });
      const data = await housioRequest(`/entities/MicroTerritory/${id}`, 'PUT', updates, apiKey);
      return Response.json(data);
    }

    // Read actions — proxy through territoriesApi
    const response = await fetch(TERRITORIES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    // If this is a 'list' action, enrich territories with micro-territory counts
    if (action === 'list' && data?.territories) {
      // Fetch all micro-territories
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
      
      // Count micro-territories per master territory (match by master territory's id field)
      const counts = {};
      microTerritories.forEach(mt => {
        // mt.territory_id contains the master territory's _id
        const tid = mt.territory_id;
        if (tid) {
          counts[tid] = (counts[tid] || 0) + 1;
        }
      });
      
      // Add counts to each master territory - match by id field
      data.territories = data.territories.map(t => {
        const count = counts[t.id] || 0;
        return {
          ...t,
          micro_territory_count: count
        };
      });
      
      // Log for debugging
      console.log('[fetchHousioTerritories] Enriched with micro counts. Sample:', {
        total_territories: data.territories.length,
        total_micro: microTerritories.length,
        monmouth_count: counts['6976a8de08500d4c62e26237'] || 0
      });
    }
    
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});