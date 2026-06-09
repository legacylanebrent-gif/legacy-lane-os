import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const requestLog = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const reqs = (requestLog.get(ip) || []).filter(t => now - t < 60000);
  reqs.push(now);
  requestLog.set(ip, reqs);
  return reqs.length > 30;
}

const SAFE_FIELDS = ['id', 'company_name', 'city', 'state', 'zip_code', 'county', 'phone', 'website_url', 'website', 'source_url', 'claimed_listing', 'claim_status', 'subscription_status'];

Deno.serve(async (req) => {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip)) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const base44 = createClientFromRequest(req);
    const { query, state } = await req.json().catch(() => ({}));

    if (!query || query.length < 2) return Response.json({ results: [] });

    const q = query.toLowerCase().trim();

    // Search FutureEstateOperator (main directory)
    let allOps = [];
    if (state) {
      allOps = await base44.asServiceRole.entities.FutureEstateOperator.filter({ state }, '-created_date', 3000);
    } else {
      // Without state, load a bigger sample and filter
      allOps = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', 5000);
    }

    const matches = allOps.filter(op =>
      op.company_name?.toLowerCase().includes(q) ||
      op.city?.toLowerCase().includes(q)
    ).slice(0, 20);

    const safe = matches.map(op => {
      const r = {};
      SAFE_FIELDS.forEach(f => { if (op[f] !== undefined) r[f] = op[f]; });
      return r;
    });

    return Response.json({ results: safe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});