import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated admin calls and scheduled automation runs
    let isAuthenticated = false;
    try {
      const user = await base44.auth.me();
      isAuthenticated = !!user;
    } catch { /* unauthenticated (automation) — allowed */ }

    const PAGE = 2000;
    const WAVE = 8; // parallel pages per wave — 16,000 records per wave
    let skip = 0;
    let total = 0, merged = 0, single = 0, geocoded = 0, notGeocoded = 0, failed = 0, skipped = 0;
    const stateSet = new Set();
    const stateCounts = {};
    const tally = (r) => {
      total++;
      if (r.merge_status === 'merged') merged++;
      else single++;
      if (r.geocode_status === 'geocoded') geocoded++;
      else if (r.geocode_status === 'failed') failed++;
      else if (r.geocode_status === 'skipped') skipped++;
      else notGeocoded++;
      if (r.state) {
        stateSet.add(r.state);
        stateCounts[r.state] = (stateCounts[r.state] || 0) + 1;
      }
    };
    let hasMore = true;

    while (hasMore) {
      const offsets = [];
      for (let i = 0; i < WAVE; i++) offsets.push(skip + i * PAGE);
      const batches = await Promise.all(
        offsets.map((o) => base44.asServiceRole.entities.MasterOperatorDirectory.list('-created_date', PAGE, o))
      );
      let allFull = true;
      for (const batch of batches) {
        for (const r of batch) tally(r);
        if (batch.length < PAGE) allFull = false;
      }
      hasMore = allFull;
      skip += WAVE * PAGE;
    }

    return Response.json({
      total,
      merged,
      single,
      geocoded,
      notGeocoded,
      failed,
      skipped,
      states: stateSet.size,
      stateCounts,
      authenticated: isAuthenticated
    });
  } catch (error) {
    console.error('getMasterOperatorDirectoryStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});