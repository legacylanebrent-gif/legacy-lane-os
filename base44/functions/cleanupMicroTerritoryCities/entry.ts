import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { state, dryRun } = await req.json();
    if (!state) {
      return Response.json({ error: 'state is required' }, { status: 400 });
    }

    console.log(`[cleanupMicroTerritoryCities] State: ${state}, dryRun: ${dryRun !== false}`);

    // Fetch all records for this state
    let records = [];
    let skip = 0;
    const BATCH = 100;
    while (true) {
      const batch = await base44.asServiceRole.entities.HousioMicroTerritory.filter({ state }, skip, BATCH);
      if (batch.length === 0) break;
      records = records.concat(batch);
      skip += BATCH;
      if (batch.length < BATCH) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[cleanupMicroTerritoryCities] ${records.length} records for ${state}`);

    // Group records by county
    const countyMap = {};
    for (const record of records) {
      const county = record.county || 'unknown';
      if (!countyMap[county]) countyMap[county] = [];
      countyMap[county].push(record);
    }

    const isDry = dryRun !== false;
    let totalCitiesRemoved = 0;
    let totalRecordsUpdated = 0;
    const details = [];

    for (const [county, recs] of Object.entries(countyMap)) {
      if (recs.length <= 1) continue;

      // Build city -> [record] map
      const cityToRecords = {};
      for (const rec of recs) {
        const cities = rec.cities_json || [];
        for (const city of cities) {
          if (!cityToRecords[city]) cityToRecords[city] = [];
          cityToRecords[city].push(rec);
        }
      }

      // Find cities appearing in multiple micros
      for (const [city, owners] of Object.entries(cityToRecords)) {
        if (owners.length <= 1) continue;

        // Keep city in the record with the most cities (largest micro), remove from others
        owners.sort((a, b) => (b.cities_json?.length || 0) - (a.cities_json?.length || 0));
        const keeper = owners[0];
        const removers = owners.slice(1);

        for (const rec of removers) {
          const newCities = (rec.cities_json || []).filter(c => c !== city);
          if (newCities.length !== (rec.cities_json || []).length) {
            if (!isDry) {
              await base44.asServiceRole.entities.HousioMicroTerritory.update(rec.id, {
                cities_json: newCities
              });
              await new Promise(r => setTimeout(r, 1500));
            }
            totalCitiesRemoved++;
            totalRecordsUpdated++;
            details.push({
              state,
              county,
              city,
              kept_in: keeper.micro_territory_id,
              removed_from: rec.micro_territory_id
            });
          }
        }
      }
    }

    console.log(`[cleanupMicroTerritoryCities] ${state}: ${totalCitiesRemoved} cities removed from ${totalRecordsUpdated} records`);

    return Response.json({
      success: true,
      dryRun: isDry,
      state,
      totalRecords: records.length,
      citiesRemoved: totalCitiesRemoved,
      recordsUpdated: totalRecordsUpdated,
      sampleDetails: details.slice(0, 20)
    });
  } catch (error) {
    console.error('[cleanupMicroTerritoryCities] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});