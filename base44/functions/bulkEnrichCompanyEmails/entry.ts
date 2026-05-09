import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { limit = 25, state, county, only_missing_email = true } = await req.json();

    // Build filter
    const filter = {};
    if (state) filter.state = state;
    if (county) filter.county = county;

    let companies = await base44.asServiceRole.entities.FutureEstateOperator.filter(filter, 'created_date', Math.min(limit * 4, 200));

    // Client-side filter
    companies = companies.filter(c => {
      if (c.do_not_contact || c.unsubscribe_status) return false;
      if (only_missing_email && c.email) return false;
      if (c.enrichment_status === 'verified') return false;
      return true;
    }).slice(0, limit);

    const results = { processed: 0, found: 0, failed: 0, skipped: 0, errors: [] };

    for (const company of companies) {
      // Small delay to avoid hammering external sites
      await new Promise(r => setTimeout(r, 1500));

      try {
        const res = await base44.asServiceRole.functions.invoke('enrichCompanyEmail', { company_id: company.id });
        if (res?.skipped) { results.skipped++; continue; }
        if (res?.success) results.found++; else results.failed++;
        results.processed++;
      } catch (e) {
        results.failed++;
        results.errors.push({ company_id: company.id, company_name: company.company_name, error: e.message });
      }
    }

    return Response.json({ success: true, ...results, total_candidates: companies.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});