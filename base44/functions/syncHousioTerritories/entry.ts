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

    let params = {};
    try {
      const body = await req.json();
      params = body || {};
    } catch (e) {
      console.log('[syncHousioTerritories] No JSON body provided, using defaults');
    }

    // write_offset/write_limit slice which records to write this call (Housio API returns all at once)
    const { batch_type = 'territories', write_offset = 0, write_limit = 250 } = params;

    const safeWriteOffset = Math.max(0, parseInt(write_offset) || 0);
    const safeWriteLimit = Math.min(300, Math.max(1, parseInt(write_limit) || 250));

    console.log(`[syncHousioTerritories] Syncing ${batch_type}, write_offset=${safeWriteOffset}, write_limit=${safeWriteLimit}`);

    // Fetch ALL from Housio (no server-side pagination)
    const action = batch_type === 'micro' ? 'micro_list' : 'list';
    const apiRes = await fetch(TERRITORIES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ action, offset: 0, limit: 9999 }),
    });

    if (!apiRes.ok) throw new Error(`Housio API error: ${apiRes.status}`);

    const data = await apiRes.json();
    const allItems = batch_type === 'micro' ? (data.micro_territories || []) : (data.territories || []);
    const total = allItems.length;

    // Take just the slice we need this call
    const items = allItems.slice(safeWriteOffset, safeWriteOffset + safeWriteLimit);
    console.log(`[syncHousioTerritories] Total from Housio: ${total}, writing slice ${safeWriteOffset}-${safeWriteOffset + items.length}`);

    // Map to entities
    const now = new Date().toISOString();
    const records = items.map(item => {
      if (batch_type === 'micro') {
        const cities = item.cities || [];
        const cityList = cities.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
        return {
          micro_territory_id: item.micro_territory_id || `${item.state}-${item.county}-${safeWriteOffset}-${Math.random()}`,
          territory_id: item.territory_id || `${item.state}-${item.county}`,
          state: item.state,
          county: item.county,
          cities_json: cityList,
          synced_at: now,
        };
      } else {
        // Extract FIPS from territory_id if not provided directly (format: 'NJ-34003' -> '34003')
        let countyFips = item.county_fips;
        if (!countyFips && item.territory_id) {
          const parts = item.territory_id.split('-');
          if (parts.length === 2 && parts[1] && /^\d{5}$/.test(parts[1])) {
            countyFips = parts[1];
          }
        }
        
        return {
          territory_id: item.territory_id || item.id || `${item.state}-${safeWriteOffset}-${Math.random()}`,
          state: item.state,
          state_name: item.state_name || item.state,
          county: item.county || item.name || null,
          county_fips: countyFips,
          zip_codes_json: item.zip_codes || [],
          synced_at: now,
          is_active: item.is_active ?? true,
        };
      }
    });

    // Write in chunks of 25 to avoid rate limits
    if (records.length > 0) {
      const entityName = batch_type === 'micro' ? 'HousioMicroTerritory' : 'HousioTerritory';
      const CHUNK_SIZE = 25;
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        await base44.asServiceRole.entities[entityName].bulkCreate(chunk);
        if (i + CHUNK_SIZE < records.length) await new Promise(r => setTimeout(r, 1500));
      }
      console.log(`[syncHousioTerritories] Wrote ${records.length} ${entityName} records`);
    }

    const nextWriteOffset = safeWriteOffset + records.length;
    const hasMore = nextWriteOffset < total;

    return Response.json({
      success: true,
      batch_type,
      synced_count: records.length,
      total_available: total,
      write_offset: safeWriteOffset,
      next_write_offset: hasMore ? nextWriteOffset : null,
      has_more: hasMore,
      synced_at: now,
    });
  } catch (error) {
    console.error('[syncHousioTerritories] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});