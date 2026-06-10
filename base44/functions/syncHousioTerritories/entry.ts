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

    const { batch_type = 'territories', offset = 0, limit = 100, clear_first = false } = await req.json();

    // Validate parameters
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 100));

    console.log(`[syncHousioTerritories] Batch sync: ${batch_type}, offset=${safeOffset}, limit=${safeLimit}`);

    // Clear existing data if requested (only on first batch)
    if (clear_first && safeOffset === 0) {
      console.log('[syncHousioTerritories] Clearing existing data...');
      const existingTerritories = await base44.asServiceRole.entities.HousioTerritory.filter({});
      const existingMicro = await base44.asServiceRole.entities.HousioMicroTerritory.filter({});
      
      for (const t of existingTerritories) {
        await base44.asServiceRole.entities.HousioTerritory.delete(t.id);
      }
      for (const m of existingMicro) {
        await base44.asServiceRole.entities.HousioMicroTerritory.delete(m.id);
      }
      console.log(`[syncHousioTerritories] Cleared ${existingTerritories.length} territories and ${existingMicro.length} micro-territories`);
    }

    // Fetch batch based on type
    const action = batch_type === 'micro' ? 'micro_list' : 'list';
    const apiRes = await fetch(TERRITORIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ action, offset: safeOffset, limit: safeLimit }),
    });

    if (!apiRes.ok) {
      throw new Error(`Housio API error: ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const items = batch_type === 'micro' ? (data.micro_territories || []) : (data.territories || []);
    const total = data.total || items.length;

    console.log(`[syncHousioTerritories] Fetched ${items.length} items (total: ${total})`);

    // Map to entities
    const now = new Date().toISOString();
    const records = items.map(item => {
      if (batch_type === 'micro') {
        const cities = item.cities || [];
        const cityList = cities.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
        return {
          micro_territory_id: item.micro_territory_id || `${item.state}-${item.county}-${Date.now()}-${Math.random()}`,
          territory_id: item.territory_id || `${item.state}-${item.county}`,
          state: item.state,
          county: item.county,
          cities_json: cityList,
          synced_at: now,
        };
      } else {
        return {
          territory_id: item.territory_id || item.id || `${item.state}-${Date.now()}-${Math.random()}`,
          state: item.state,
          state_name: item.state_name || item.state,
          county: item.county || item.name || null,
          county_fips: item.county_fips || null,
          zip_codes_json: item.zip_codes || [],
          synced_at: now,
          is_active: item.is_active ?? item.status === 'ACTIVE' ?? true,
        };
      }
    });

    // Bulk create records
    if (records.length > 0) {
      const entityName = batch_type === 'micro' ? 'HousioMicroTerritory' : 'HousioTerritory';
      const createResult = await base44.asServiceRole.entities[entityName].bulkCreate(records);
      console.log(`[syncHousioTerritories] Created ${records.length} ${entityName} records`, createResult);
    }

    const nextOffset = safeOffset + records.length;
    const hasMore = nextOffset < total;

    return Response.json({
      success: true,
      batch_type,
      synced_count: records.length,
      total_count: total,
      offset: safeOffset,
      next_offset: hasMore ? nextOffset : null,
      has_more: hasMore,
      synced_at: now,
    });
  } catch (error) {
    console.error('[syncHousioTerritories] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});