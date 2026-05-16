import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { state } = await req.json().catch(() => ({}));

    const pageSize = 1000;
    let skip = 0;
    let totalReset = 0;

    while (true) {
      const filter = state
        ? { enrichment_status: 'failed', state }
        : { enrichment_status: 'failed' };

      const batch = await base44.asServiceRole.entities.FutureOperatorLead.filter(
        filter, '-created_date', pageSize, skip
      );

      for (const record of batch) {
        await base44.asServiceRole.entities.FutureOperatorLead.update(record.id, {
          enrichment_status: 'not_started',
          process_status: 'pending',
        });
        totalReset++;
      }

      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    return Response.json({ success: true, total_reset: totalReset, state: state || 'all' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});