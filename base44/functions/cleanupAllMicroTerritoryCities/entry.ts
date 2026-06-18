import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALL_STATES = [
  'AR','AZ','CA','CO','CT','DE','DC','FL','GA','HI','IA','ID','IL','IN','KS',
  'KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ',
  'NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT',
  'WA','WI','WV','WY'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const results = [];
    let grandTotalRemoved = 0;
    let grandTotalUpdated = 0;

    for (const state of ALL_STATES) {
      console.log(`\n=== Processing ${state} ===`);

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
        await new Promise(r => setTimeout(r, 2000));
      }

      if (records.length === 0) {
        console.log(`${state}: 0 records, skipping`);
        results.push({ state, records: 0, citiesRemoved: 0 });
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      console.log(`${state}: ${records.length} records`);

      // Group by county
      const countyMap = {};
      for (const record of records) {
        const county = record.county || 'unknown';
        if (!countyMap[county]) countyMap[county] = [];
        countyMap[county].push(record);
      }

      let stateCitiesRemoved = 0;
      let stateRecordsUpdated = new Set();

      for (const [county, recs] of Object.entries(countyMap)) {
        if (recs.length <= 1) continue;

        const cityToRecords = {};
        for (const rec of recs) {
          const cities = rec.cities_json || [];
          for (const city of cities) {
            if (!cityToRecords[city]) cityToRecords[city] = [];
            cityToRecords[city].push(rec);
          }
        }

        for (const [city, owners] of Object.entries(cityToRecords)) {
          if (owners.length <= 1) continue;

          owners.sort((a, b) => (b.cities_json?.length || 0) - (a.cities_json?.length || 0));
          const keeper = owners[0];
          const removers = owners.slice(1);

          for (const rec of removers) {
            const newCities = (rec.cities_json || []).filter(c => c !== city);
            if (newCities.length !== (rec.cities_json || []).length) {
              await base44.asServiceRole.entities.HousioMicroTerritory.update(rec.id, {
                cities_json: newCities
              });
              stateCitiesRemoved++;
              stateRecordsUpdated.add(rec.id);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      }

      console.log(`${state}: removed ${stateCitiesRemoved} cities from ${stateRecordsUpdated.size} records`);
      grandTotalRemoved += stateCitiesRemoved;
      grandTotalUpdated += stateRecordsUpdated.size;
      results.push({ state, records: records.length, citiesRemoved: stateCitiesRemoved, recordsUpdated: stateRecordsUpdated.size });

      // Delay between states
      await new Promise(r => setTimeout(r, 10000));
    }

    return Response.json({
      success: true,
      grandTotalRemoved,
      grandTotalUpdated,
      statesProcessed: results.length,
      results
    });
  } catch (error) {
    console.error('[cleanupAllMicroTerritoryCities] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});