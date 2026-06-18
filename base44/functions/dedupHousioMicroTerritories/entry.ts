import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { state } = await req.json();
    if (!state) {
      return Response.json({ error: 'state is required' }, { status: 400 });
    }

    console.log(`[dedupHousioMicroTerritories] Deduplicating state: ${state}`);

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
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[dedupHousioMicroTerritories] State ${state}: ${records.length} total records`);

    // Group by micro_territory_id
    const groups = {};
    for (const record of records) {
      const id = record.micro_territory_id;
      if (!groups[id]) groups[id] = [];
      groups[id].push(record);
    }

    const toDelete = [];
    for (const [, recs] of Object.entries(groups)) {
      if (recs.length > 1) {
        recs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        const dupes = recs.slice(1);
        toDelete.push(...dupes.map(r => r.id));
      }
    }

    console.log(`[dedupHousioMicroTerritories] State ${state}: ${toDelete.length} duplicates to delete`);

    let deleted = 0;
    for (let i = 0; i < toDelete.length; i++) {
      await base44.asServiceRole.entities.HousioMicroTerritory.delete(toDelete[i]);
      deleted++;
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 800));
    }

    return Response.json({
      success: true,
      state,
      total_before: records.length,
      duplicates_deleted: deleted,
      remaining: records.length - deleted,
    });
  } catch (error) {
    console.error('[dedupHousioMicroTerritories] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});