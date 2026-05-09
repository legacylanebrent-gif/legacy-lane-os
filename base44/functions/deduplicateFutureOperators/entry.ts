import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch all records in pages
    let all = [];
    let skip = 0;
    const pageSize = 1000;
    while (true) {
      const batch = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', pageSize, skip);
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    // Group by normalized phone number
    const phoneMap = {};
    const noPhone = [];

    for (const op of all) {
      const phone = op.phone ? op.phone.replace(/\D/g, '') : null;
      if (!phone || phone.length < 7) {
        noPhone.push(op);
        continue;
      }
      if (!phoneMap[phone]) {
        phoneMap[phone] = [];
      }
      phoneMap[phone].push(op);
    }

    // For each phone group with duplicates, keep the record with the most data
    // (measured by number of non-null fields), delete the rest
    const toDelete = [];

    for (const phone of Object.keys(phoneMap)) {
      const group = phoneMap[phone];
      if (group.length <= 1) continue;

      // Score each record by how many fields are populated
      const scored = group.map(op => {
        const score = Object.values(op).filter(v => v !== null && v !== undefined && v !== '').length;
        return { op, score };
      });

      // Sort descending by score — keep the richest record
      scored.sort((a, b) => b.score - a.score);

      // Keep index 0, delete the rest
      for (let i = 1; i < scored.length; i++) {
        toDelete.push(scored[i].op.id);
      }
    }

    // Delete in batches
    let deleted = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
      deleted++;
    }

    return Response.json({
      success: true,
      total_scanned: all.length,
      duplicates_deleted: deleted,
      remaining: all.length - deleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});