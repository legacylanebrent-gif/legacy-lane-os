import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function countEntity(base44, entityName, filterState) {
  let total = 0;
  let skip = 0;
  const pageSize = 1000;
  while (true) {
    const batch = filterState
      ? await base44.asServiceRole.entities[entityName].filter({ state: filterState }, '-created_date', pageSize, skip)
      : await base44.asServiceRole.entities[entityName].list('-created_date', pageSize, skip);
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
    const { state, entity } = body;

    if (entity === 'org') {
      // EstatesalesOrgOperator uses base_state, not state
      let total = 0;
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const batch = state
          ? await base44.asServiceRole.entities.EstatesalesOrgOperator.filter({ base_state: state }, '-created_date', pageSize, skip)
          : await base44.asServiceRole.entities.EstatesalesOrgOperator.list('-created_date', pageSize, skip);
        total += batch.length;
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return Response.json({ total, entity: 'org' });
    }

    const total = await countEntity(base44, 'FutureEstateOperator', state || null);
    return Response.json({ total, state: state || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});