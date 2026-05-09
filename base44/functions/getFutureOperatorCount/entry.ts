import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function countAll(base44) {
  let total = 0;
  let skip = 0;
  const pageSize = 1000;
  while (true) {
    const batch = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', pageSize, skip);
    total += batch.length;
    if (batch.length < pageSize) break;
    skip += pageSize;
  }
  return total;
}

async function countByState(base44, state) {
  let total = 0;
  let skip = 0;
  const pageSize = 1000;
  while (true) {
    const batch = await base44.asServiceRole.entities.FutureEstateOperator.filter({ state }, '-created_date', pageSize, skip);
    total += batch.length;
    if (batch.length < pageSize) break;
    skip += pageSize;
  }
  return total;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { state } = body;

    if (state) {
      const stateTotal = await countByState(base44, state);
      return Response.json({ total: stateTotal, state });
    }

    const total = await countAll(base44);
    return Response.json({ total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});