import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE_SIZE = 500;
const MAX_SCAN_CALLS = 200; // ~100k records cap
const TIME_BUDGET_MS = 25000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];
    if (user.role !== 'admin' && !ADMIN_ROLES.includes(user.primary_account_type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      skip = 0,
      limit = 100,
      search = '',
      sourceFilter = 'all',
      statusFilter = 'all'
    } = body;

    const q = (search || '').toLowerCase().trim();

    const stats = {
      total: 0,
      unassigned: 0,
      assigned: 0,
      converted: 0,
      bySource: {}
    };

    const filteredMatches = [];
    let scanSkip = 0;
    let calls = 0;
    let exhausted = false;
    const startTime = Date.now();

    while (calls < MAX_SCAN_CALLS) {
      if (Date.now() - startTime > TIME_BUDGET_MS) break;
      calls += 1;
      const batch = await base44.asServiceRole.entities.Lead.list('-created_date', PAGE_SIZE, scanSkip);
      if (!batch || batch.length === 0) { exhausted = true; break; }

      for (const lead of batch) {
        // Overall stats (unfiltered)
        stats.total++;
        if (!lead.routed_to && !lead.converted) stats.unassigned++;
        else if (lead.routed_to && !lead.converted) stats.assigned++;
        else if (lead.converted) stats.converted++;
        if (lead.source) stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;

        // Filtered matches for table
        let match = true;
        if (q) {
          match = ((lead.contact_name || '').toLowerCase().includes(q) ||
                   (lead.contact_email || '').toLowerCase().includes(q) ||
                   (lead.property_address || '').toLowerCase().includes(q) ||
                   (lead.source || '').toLowerCase().includes(q));
        }
        if (match && sourceFilter !== 'all') match = lead.source === sourceFilter;
        if (match) {
          if (statusFilter === 'unassigned') match = !lead.routed_to && !lead.converted;
          else if (statusFilter === 'assigned') match = lead.routed_to && !lead.converted;
          else if (statusFilter === 'converted') match = !!lead.converted;
        }
        if (match) filteredMatches.push(lead);
      }

      scanSkip += batch.length;
      if (batch.length < PAGE_SIZE) { exhausted = true; break; }
    }

    const page = filteredMatches.slice(skip, skip + limit);
    return Response.json({
      stats,
      leads: page,
      totalFiltered: filteredMatches.length,
      totalScanned: scanSkip,
      exhausted,
      hasMore: skip + limit < filteredMatches.length
    });
  } catch (error) {
    console.error('getAdminLeadsData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});