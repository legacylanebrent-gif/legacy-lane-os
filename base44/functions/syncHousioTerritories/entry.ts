import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TERRITORIES_API_URL = 'https://api.base44.app/api/apps/697206f0efd7bfde6e06b474/functions/territoriesApi';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('HOUSIO_TERRITORIES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'HOUSIO_TERRITORIES_API_KEY not configured' }, { status: 500 });
    }

    console.log('[syncHousioTerritories] Starting full sync...');

    // Step 1: Fetch all territories
    const territoriesRes = await fetch(TERRITORIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ action: 'list' }),
    });

    const territoriesData = await territoriesRes.json();
    const territories = territoriesData?.territories || [];

    console.log(`[syncHousioTerritories] Fetched ${territories.length} territories`);

    // Step 2: Fetch all micro-territories
    const microRes = await fetch(TERRITORIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ action: 'micro_list' }),
    });

    const microData = await microRes.json();
    const microTerritories = microData?.micro_territories || [];

    console.log(`[syncHousioTerritories] Fetched ${microTerritories.length} micro-territories`);

    // Step 3: Sync territories to HousioTerritory entity
    const now = new Date().toISOString();
    const territoryRecords = [];

    for (const t of territories) {
      territoryRecords.push({
        territory_id: t.territory_id || t.id || `${t.state}-${Date.now()}-${Math.random()}`,
        state: t.state,
        state_name: t.state_name || t.state,
        county: t.county || t.name || null,
        county_fips: t.county_fips || null,
        zip_codes_json: t.zip_codes || [],
        synced_at: now,
        is_active: t.is_active ?? t.status === 'ACTIVE' ?? true,
      });
    }

    // Delete old territory records and create new ones
    const existingTerritories = await base44.asServiceRole.entities.HousioTerritory.filter({});
    for (const existing of existingTerritories) {
      await base44.asServiceRole.entities.HousioTerritory.delete(existing.id);
    }

    if (territoryRecords.length > 0) {
      await base44.asServiceRole.entities.HousioTerritory.bulkCreate(territoryRecords);
    }
    
    console.log(`[syncHousioTerritories] Synced ${territoryRecords.length} territories`);

    // Step 4: Sync micro-territories to HousioMicroTerritory entity
    const microRecords = [];

    for (const mt of microTerritories) {
      // Cities are strings in the array
      const cities = mt.cities || [];
      const cityList = cities.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);

      microRecords.push({
        micro_territory_id: mt.micro_territory_id || `${mt.state}-${mt.county}-${Date.now()}-${Math.random()}`,
        territory_id: mt.territory_id || `${mt.state}-${mt.county}`,
        state: mt.state,
        county: mt.county,
        cities_json: cityList,
        synced_at: now,
      });
    }

    // Delete old micro-territory records and create new ones
    const existingMicros = await base44.asServiceRole.entities.HousioMicroTerritory.filter({});
    for (const existing of existingMicros) {
      await base44.asServiceRole.entities.HousioMicroTerritory.delete(existing.id);
    }

    if (microRecords.length > 0) {
      await base44.asServiceRole.entities.HousioMicroTerritory.bulkCreate(microRecords);
    }

    console.log(`[syncHousioTerritories] Synced ${microRecords.length} micro-territories`);

    return Response.json({
      success: true,
      territories_synced: territoryRecords.length,
      micro_territories_synced: microRecords.length,
      synced_at: now,
    });
  } catch (error) {
    console.error('[syncHousioTerritories] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});