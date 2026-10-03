import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Houszu OS — public territoriesApi (partner credential, read-only)
const TERRITORIES_API_URL = 'https://houszuos.base44.app/functions/territoriesApi';

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('HOUSZU_TERRITORIES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'HOUSZU_TERRITORIES_API_KEY not configured' }, { status: 500 });
    }

    let params = {};
    try {
      const body = await req.json();
      params = body || {};
    } catch (e) {
      console.log('[syncHousioTerritories] No JSON body provided, using defaults');
    }

    // write_offset/write_limit slice which records to write this call (all pages are fetched, one slice written per call)
    const { batch_type = 'territories', write_offset = 0, write_limit = 250, state } = params;

    const safeWriteOffset = Math.max(0, parseInt(write_offset) || 0);
    const safeWriteLimit = Math.min(300, Math.max(1, parseInt(write_limit) || 250));

    console.log(`[syncHousioTerritories] Syncing ${batch_type}, write_offset=${safeWriteOffset}, write_limit=${safeWriteLimit}`);

    // Houszu API pages at max 500/page — loop until has_more is false.
    // The endpoint intermittently rejects bursts (401/500) — retry with backoff.
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const fetchPage = async (operation, pageBody, attempt = 1) => {
      const apiRes = await fetch(TERRITORIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(pageBody),
      });
      if (apiRes.ok) return apiRes.json();
      if (attempt < 4) {
        console.log(`[syncHousioTerritories] Page ${pageBody.offset} got ${apiRes.status}, retry ${attempt}/3 after backoff`);
        await sleep(4000 * attempt);
        return fetchPage(operation, pageBody, attempt + 1);
      }
      throw new Error(`Houszu API error: ${apiRes.status}`);
    };

    const operation = batch_type === 'micro' ? 'micro_list' : 'list';
    const allItems = [];
    let offset = 0;
    while (true) {
      const pageBody = { operation, limit: 500, offset };
      if (state) pageBody.state = state;
      const data = await fetchPage(operation, pageBody);
      const d = data?.data || {};
      const page = batch_type === 'micro' ? (d.micro_territories || []) : (d.territories || []);
      allItems.push(...page);
      if (!d.has_more || d.next_offset == null || page.length === 0) break;
      offset = d.next_offset;
      await sleep(1000); // stay well under the 60 req/min guidance
    }

    const total = allItems.length;

    // Take just the slice we need this call
    const items = allItems.slice(safeWriteOffset, safeWriteOffset + safeWriteLimit);
    console.log(`[syncHousioTerritories] Total from Houszu: ${total}, writing slice ${safeWriteOffset}-${safeWriteOffset + items.length}`);

    // Map to entities
    const now = new Date().toISOString();
    const records = items.map(item => {
      if (batch_type === 'micro') {
        const cities = item.cities || [];
        const cityList = cities.map(c => typeof c === 'string' ? c : (c.city || c.name)).filter(Boolean);
        return {
          micro_territory_id: item.micro_territory_id || item.id,
          territory_id: item.parent_territory_id || item.territory_id || null,
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
        const county = Array.isArray(item.county) ? (item.county[0] || null) : (item.county || null);

        return {
          territory_id: item.territory_id || item.id || `${item.state}-${safeWriteOffset}-${Math.random()}`,
          state: item.state,
          state_name: STATE_NAMES[item.state] || item.state_name || item.state,
          county: county || item.name || null,
          county_fips: countyFips,
          zip_codes_json: item.zip_codes || [],
          synced_at: now,
          is_active: item.is_active ?? true,
        };
      }
    });

    // Deduplicate: check which records already exist, only create new ones
    // (existing production records are never modified — safe refresh)
    let newRecords = [];
    if (records.length > 0) {
      const entityName = batch_type === 'micro' ? 'HousioMicroTerritory' : 'HousioTerritory';
      const idField = batch_type === 'micro' ? 'micro_territory_id' : 'territory_id';

      // Collect unique IDs from records to check
      const idsToCheck = [...new Set(records.map(r => r[idField]))];

      // Query existing IDs in batches
      const existingIds = new Set();
      for (let i = 0; i < idsToCheck.length; i += 500) {
        const idBatch = idsToCheck.slice(i, i + 500);
        const existing = await base44.asServiceRole.entities[entityName].filter(
          { [idField]: { $in: idBatch } },
          null,
          500
        );
        existing.forEach(r => existingIds.add(r[idField]));
      }

      newRecords = records.filter(r => !existingIds.has(r[idField]));
      const skipped = records.length - newRecords.length;
      console.log(`[syncHousioTerritories] ${skipped} already exist, ${newRecords.length} new to create`);

      if (newRecords.length > 0) {
        const CHUNK_SIZE = 25;
        for (let i = 0; i < newRecords.length; i += CHUNK_SIZE) {
          const chunk = newRecords.slice(i, i + CHUNK_SIZE);
          await base44.asServiceRole.entities[entityName].bulkCreate(chunk);
          if (i + CHUNK_SIZE < newRecords.length) await new Promise(r => setTimeout(r, 1500));
        }
        console.log(`[syncHousioTerritories] Wrote ${newRecords.length} ${entityName} records`);
      }
    }

    const insertedCount = newRecords.length;

    const nextWriteOffset = safeWriteOffset + records.length;
    const hasMore = nextWriteOffset < total;

    return Response.json({
      success: true,
      batch_type,
      synced_count: insertedCount,
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