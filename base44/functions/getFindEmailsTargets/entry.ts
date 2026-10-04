import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE_SIZE = 500;
const MAX_SCAN_CALLS = 40; // ~20k records cap

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
      source = ''
    } = body;

    const q = (search || '').toLowerCase().trim();
    const query = {};
    if (merge_status) query.merge_status = merge_status;
    if (state) query.state = state;
    if (geocode_status) query.geocode_status = geocode_status;

    // Group matching records by dedup key (phone, then name|state) — same rules as the UI
    const normalizePhone = (r) => {
      const digits = ((r.phone_normalized || r.phone || '') + '').replace(/\D/g, '');
      return digits.length >= 10 ? 'p:' + digits.slice(-10) : null;
    };
    const normalizeNameState = (r) => {
      const name = (r.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return name && r.state ? 'n:' + name + '|' + r.state : null;
    };
    const groupMap = new Map();

    let scanSkip = 0;
    let calls = 0;
    let scanned = 0;

    while (calls < MAX_SCAN_CALLS) {
      calls += 1;
      const batch = Object.keys(query).length > 0
        ? await base44.asServiceRole.entities.MasterOperatorDirectory.filter(query, '-created_date', PAGE_SIZE, scanSkip)
        : await base44.asServiceRole.entities.MasterOperatorDirectory.list('-created_date', PAGE_SIZE, scanSkip);
      if (!batch || batch.length === 0) break;
      scanned += batch.length;

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
        if (!match) continue;
        const k = normalizePhone(r) || normalizeNameState(r);
        if (!k) continue;
        if (!groupMap.has(k)) groupMap.set(k, []);
        groupMap.get(k).push(r);
      }

      scanSkip += batch.length;
      if (batch.length < PAGE_SIZE) break;
    }

    const targets = [];
    let skippedDupes = 0;
    for (const group of groupMap.values()) {
      if (group.length < 2) {
        if (!group[0].email) targets.push({ id: group[0].id, company_name: group[0].company_name });
        continue;
      }
      // Non-keepers are duplicates of the richest record — excluded from email finding
      const sorted = [...group].sort((a, b) => (b.sources?.length || 0) - (a.sources?.length || 0));
      const keeper = sorted[0];
      skippedDupes += group.length - 1;
      if (!keeper.email) targets.push({ id: keeper.id, company_name: keeper.company_name });
    }

    return Response.json({ count: targets.length, targets, skippedDupes, scanned });
  } catch (error) {
    console.error('getFindEmailsTargets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});