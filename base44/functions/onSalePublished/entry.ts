/**
 * onSalePublished — Master SEO Orchestrator
 *
 * Triggered when an EstateSale is published (status -> upcoming/active).
 * Runs the full SEO expansion pipeline in the correct dependency order:
 *
 * Phase 1 (parallel): Sale SEO page + Schema + Item SEO profiles
 * Phase 2 (parallel): Brand hubs + Category hubs + Company profile + City/County/State hubs
 * Phase 3 (parallel): Inventory blog opportunities + Internal links
 * Phase 4:            Sitemap submission
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept direct call { sale_id } OR entity automation payload
    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;
    if (!saleId) return Response.json({ error: 'sale_id required' }, { status: 400 });

    // Load the sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // Only process published sales
    if (!['upcoming', 'active'].includes(sale.status)) {
      return Response.json({ skipped: true, reason: `status=${sale.status}` });
    }

    // Buyout events are operator-only — no SEO generation
    if (sale.sale_type === 'buyout_or_cleanout') {
      return Response.json({ skipped: true, reason: 'buyout event — no SEO' });
    }

    const log = [];
    const invoke = async (fn, payload, label) => {
      try {
        const res = await base44.asServiceRole.functions.invoke(fn, payload);
        log.push({ fn, status: 'ok', label, result: res?.data });
      } catch (e) {
        log.push({ fn, status: 'error', label, error: e.message });
      }
    };

    // ── Phase 1: Core sale SEO + item profiles ────────────────────────────────
    await Promise.all([
      invoke('generateSaleSeoPage',   { sale_id: saleId }, 'Sale SEO page'),
      invoke('generateSchemaJson',    { page_type: 'sale', entity_id: saleId, save: true }, 'Sale schema markup'),
      invoke('generateSaleImageSEO',  { sale_id: saleId }, 'Item SEO profiles from images'),
    ]);

    // ── Phase 2: Hub updates (depend on item profiles existing) ───────────────
    const city    = sale.property_address?.city;
    const state   = sale.property_address?.state;
    const county  = sale.property_address?.region;
    const cats    = sale.categories || [];
    const opName  = sale.operator_name;
    const opId    = sale.operator_id;

    // Collect unique brands from item profiles now created
    const itemProfiles = await base44.asServiceRole.entities.SEOItemProfile.filter(
      { sale_id: saleId }, '-created_date', 100
    );
    const brands = [...new Set(itemProfiles.map(i => i.brand_name).filter(Boolean))];

    const hubOps = [];

    // Brand hubs
    for (const brand of brands.slice(0, 10)) {
      hubOps.push(invoke('generateBrandHubPage', { brand_name: brand }, `Brand hub: ${brand}`));
    }

    // Category hubs
    for (const cat of cats.slice(0, 8)) {
      hubOps.push(invoke('generateCategoryHubPage', { category_name: cat }, `Category hub: ${cat}`));
    }

    // Company profile
    if (opId || opName) {
      hubOps.push(invoke('generateOperatorSEOProfile', { operator_id: opId, operator_name: opName }, 'Company profile'));
    }

    // City hub
    if (city && state) {
      hubOps.push(invoke('generateCityHubPage', { city, state }, `City hub: ${city}, ${state}`));
    }

    // County hub
    if (county && state) {
      hubOps.push(invoke('generateCountyHubPage', { county, state }, `County hub: ${county}, ${state}`));
    }

    // State hub (lightweight refresh)
    if (state) {
      hubOps.push(invoke('generateStateHubPage', { state }, `State hub: ${state}`));
    }

    await Promise.all(hubOps);

    // ── Phase 3: Blog opportunities + Internal links ───────────────────────────
    const contentOps = [
      invoke('generateInventoryBasedBlogPosts', { sale_id: saleId }, 'Inventory blog opportunities'),
    ];

    // Inject internal links into the newly created sale SEO page
    const salePages = await base44.asServiceRole.entities.SEOPage.filter(
      { page_type: 'sale', entity_id: saleId, status: 'published' }, '-created_date', 1
    );
    if (salePages[0]) {
      contentOps.push(invoke('internalLinkingEngine', { page_id: salePages[0].id }, 'Internal links for sale page'));
    }

    // Inject internal links into item pages
    const itemPages = await base44.asServiceRole.entities.SEOPage.filter(
      { page_type: 'item', status: 'published' }, '-created_date', 20
    );
    const recentItemPageIds = itemPages
      .filter(p => itemProfiles.some(i => i.id === p.entity_id))
      .slice(0, 15)
      .map(p => p.id);

    for (const pageId of recentItemPageIds) {
      contentOps.push(invoke('internalLinkingEngine', { page_id: pageId }, `Internal links: item page ${pageId}`));
    }

    await Promise.all(contentOps);

    // ── Phase 4: Sitemap ───────────────────────────────────────────────────────
    await invoke('submitSitemapToGSC', {}, 'Sitemap submission');

    // ── Summary ───────────────────────────────────────────────────────────────
    const ok    = log.filter(l => l.status === 'ok').length;
    const errors = log.filter(l => l.status === 'error');

    return Response.json({
      success: true,
      sale_id: saleId,
      sale_title: sale.title,
      steps_completed: ok,
      steps_failed: errors.length,
      errors: errors.map(e => ({ fn: e.fn, error: e.error })),
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});