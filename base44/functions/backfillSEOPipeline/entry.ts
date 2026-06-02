/**
 * backfillSEOPipeline — Run the full SEO pipeline on all existing published sales
 * that don't yet have a matching SEOPage.
 *
 * Admin-only. Processes in batches to avoid timeouts.
 * Call with: { limit: 20, offset: 0 }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const limit  = body?.limit  ?? 10;
    const offset = body?.offset ?? 0;

    // Get published sales
    const sales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['upcoming', 'active', 'completed'] } },
      '-created_date', limit, offset
    );

    // Find which ones already have a sale SEO page
    const existingPages = await base44.asServiceRole.entities.SEOPage.filter(
      { page_type: 'sale' }, '-created_date', 2000
    );
    const coveredIds = new Set(existingPages.map(p => p.entity_id).filter(Boolean));

    const toProcess = sales.filter(s => !coveredIds.has(s.id));

    const results = [];
    for (const sale of toProcess) {
      try {
        const res = await base44.asServiceRole.functions.invoke('onSalePublished', { sale_id: sale.id });
        results.push({ sale_id: sale.id, title: sale.title, status: 'ok', steps: res?.data?.steps_completed });
      } catch (e) {
        results.push({ sale_id: sale.id, title: sale.title, status: 'error', error: e.message });
      }
    }

    return Response.json({
      processed: toProcess.length,
      skipped: sales.length - toProcess.length,
      offset,
      limit,
      next_offset: offset + limit,
      has_more: sales.length === limit,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});