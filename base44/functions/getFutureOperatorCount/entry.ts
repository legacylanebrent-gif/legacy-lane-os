import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Page through all records to get a true total count
    let total = 0;
    let skip = 0;
    const pageSize = 1000;

    while (true) {
      const batch = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', pageSize, skip);
      total += batch.length;
      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    return Response.json({ total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});