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

    const PAGE = 500;
    let skip = 0;
    let total = 0, merged = 0, single = 0, geocoded = 0, notGeocoded = 0, failed = 0, skipped = 0;
    const stateSet = new Set();
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.MasterOperatorDirectory.list('-created_date', PAGE, skip);
      for (const r of batch) {
        total++;
        if (r.merge_status === 'merged') merged++;
        else single++;
        if (r.geocode_status === 'geocoded') geocoded++;
        else if (r.geocode_status === 'failed') failed++;
        else if (r.geocode_status === 'skipped') skipped++;
        else notGeocoded++;
        if (r.state) stateSet.add(r.state);
      }
      hasMore = batch.length === PAGE;
      skip += PAGE;
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
      authenticated: isAuthenticated
    });
  } catch (error) {
    console.error('getMasterOperatorDirectoryStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});