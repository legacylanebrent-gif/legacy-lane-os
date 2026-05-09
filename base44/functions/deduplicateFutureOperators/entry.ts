import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Deduplicate FutureEstateOperator records by phone number.
// Accepts optional { state } in the request body to limit to a single state.
// Keeps the record with the most populated fields; deletes the rest.
// Adds small delays between deletes to avoid rate limiting.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const stateFilter = body.state || null;

    // Fetch records — scoped to state if provided
    let all = [];
    let skip = 0;
    const pageSize = 500;
    while (true) {
      const filter = stateFilter ? { state: stateFilter } : {};
      const batch = await base44.asServiceRole.entities.FutureEstateOperator.filter(filter, '-created_date', pageSize, skip);
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    // Group by normalized phone number
    const phoneMap = {};
    for (const op of all) {
      const phone = op.phone ? op.phone.replace(/\D/g, '') : null;
      if (!phone || phone.length < 7) continue;
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(op);
    }

    // Keep the richest record per phone group, collect IDs to delete
    const toDelete = [];
    for (const group of Object.values(phoneMap)) {
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        const scoreA = Object.values(a).filter(v => v !== null && v !== undefined && v !== '').length;
        const scoreB = Object.values(b).filter(v => v !== null && v !== undefined && v !== '').length;
        return scoreB - scoreA;
      });
      for (let i = 1; i < group.length; i++) {
        toDelete.push(group[i].id);
      }
    }

    // Delete with small delay between each to avoid rate limits
    let deleted = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
      deleted++;
      // 150ms between deletes to stay well under rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    return Response.json({
      success: true,
      state: stateFilter || 'ALL',
      total_scanned: all.length,
      duplicates_deleted: deleted,
      remaining: all.length - deleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});