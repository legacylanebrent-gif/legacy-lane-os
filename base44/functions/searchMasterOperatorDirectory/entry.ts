import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE_SIZE = 500;
const MAX_SCAN_CALLS = 40; // ~20k records cap
const MAX_RESULTS = 100;
const TIME_BUDGET_MS = 25000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      search = '',
      merge_status = '',
      state = '',
      geocode_status = '',
      source = '',
      skip = 0,
      limit = 50
    } = body;

    const q = (search || '').toLowerCase().trim();
    const query = {};
    if (merge_status) query.merge_status = merge_status;
    if (state) query.state = state;
    if (geocode_status) query.geocode_status = geocode_status;

    const startTime = Date.now();
    let scanSkip = 0;
    let allMatches = [];
    let calls = 0;
    let exhausted = false;

    while (calls < MAX_SCAN_CALLS && allMatches.length < skip + limit + 50) {
      if (Date.now() - startTime > TIME_BUDGET_MS) break;
      calls += 1;
      const batch = Object.keys(query).length > 0
        ? await base44.asServiceRole.entities.MasterOperatorDirectory.filter(query, '-created_date', PAGE_SIZE, scanSkip)
        : await base44.asServiceRole.entities.MasterOperatorDirectory.list('-created_date', PAGE_SIZE, scanSkip);

      if (!batch || batch.length === 0) { exhausted = true; break; }

      for (const r of batch) {
        let match = true;
        if (q) {
          match = ((r.company_name || '').toLowerCase().includes(q) ||
                   (r.phone || '').toLowerCase().includes(q) ||
                   (r.city || '').toLowerCase().includes(q) ||
                   (r.phone_normalized || '').toLowerCase().includes(q));
        }
        if (match && source) {
          match = (r.sources || []).includes(source);
        }
        if (match) allMatches.push(r);
      }

      scanSkip += batch.length;
      if (batch.length < PAGE_SIZE) { exhausted = true; break; }
      if (allMatches.length >= MAX_RESULTS) break;
    }

    const page = allMatches.slice(skip, skip + limit);
    return Response.json({
      records: page,
      totalMatches: allMatches.length,
      scanned: scanSkip,
      exhausted,
      hasMore: skip + limit < allMatches.length
    });
  } catch (error) {
    console.error('searchMasterOperatorDirectory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});