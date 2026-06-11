/**
 * SCHEDULED DAILY JOB — Central Repository Daily Snapshot
 * Runs once per day. Calculates stats and writes CentralRepositoryDailySnapshot.
 * Admin-only direct invocation also supported.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calcLaunchReadiness(approvedCount, totalCount, minApprovedGoal, minItemGoal, avgConfidence, duplicateMatchRate) {
  // 40% approved public progress
  const approvedScore = minApprovedGoal > 0 ? Math.min(100, (approvedCount / minApprovedGoal) * 100) : 0;
  // 20% duplicate control / match rate (higher match rate = better dedup)
  const dedupScore = Math.min(100, duplicateMatchRate);
  // 20% pricing confidence (based on price history coverage)
  const pricingScore = totalCount > 0 ? Math.min(100, (avgConfidence || 0)) : 0;
  // 20% SEO confidence (based on avg identity confidence)
  const seoScore = Math.min(100, (avgConfidence || 0));

  return Math.round(approvedScore * 0.4 + dedupScore * 0.2 + pricingScore * 0.2 + seoScore * 0.2);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no auth) and direct admin call
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // Scheduled automations won't have user auth — allow
      isScheduled = true;
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch admin settings
    const settingsArr = await base44.asServiceRole.entities.AdminRepositorySettings.filter({ setting_key: 'global' });
    const settings = settingsArr[0] || {};
    const serpApiCost = settings.serpapi_cost_per_call || 0.05;
    const minApprovedGoal = settings.minimum_public_approved_goal || 5000;
    const minItemGoal = settings.minimum_item_count_goal || 10000;
    const launchDate = settings.public_repository_launch_date || null;

    // Aggregate ItemKnowledge stats
    const allItems = await base44.asServiceRole.entities.ItemKnowledge.list('-created_date', 500);
    const totalItemCount = allItems.length;

    const approvedPublicCount = allItems.filter(i => i.public_status === 'approved_public').length;
    const reviewNeededCount = allItems.filter(i => i.public_status === 'review_needed').length;
    const privateCount = allItems.filter(i => i.public_status === 'private').length;
    const rejectedCount = allItems.filter(i => i.public_status === 'rejected').length;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const newItemsAdded = allItems.filter(i => {
      const cd = i.created_date || i.first_seen_at || '';
      return cd.startsWith(yesterdayStr);
    }).length;

    // Match method stats from yesterday
    const barcodeMatchCount = allItems.filter(i => {
      const cd = i.created_date || '';
      return cd.startsWith(yesterdayStr) && i.match_method_first === 'barcode';
    }).length;
    const databaseMatchCount = allItems.filter(i => {
      const cd = i.created_date || '';
      return cd.startsWith(yesterdayStr) && ['exact_name', 'image_hash', 'brand_model'].includes(i.match_method_first);
    }).length;
    const serpapiLookupCount = allItems.filter(i => {
      const types = i.source_types_seen || [];
      return types.includes('serpapi');
    }).length;
    const serpapiAvoidedCount = allItems.filter(i => {
      const types = i.source_types_seen || [];
      return types.length > 0 && !types.includes('serpapi') && i.times_seen > 1;
    }).length;
    const estimatedSerpApiSavings = Math.round(serpapiAvoidedCount * serpApiCost * 100) / 100;

    // Duplicate match rate — items where match_method_first != 'new' / total
    const matchedExistingCount = allItems.filter(i => i.match_method_first && i.match_method_first !== 'new').length;
    const duplicateMatchRate = totalItemCount > 0 ? Math.round((matchedExistingCount / totalItemCount) * 100) : 0;

    // Average confidence
    const avgIdentityConfidence = totalItemCount > 0
      ? Math.round(allItems.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / totalItemCount)
      : 0;

    // Pricing confidence: % of items that have avg_price set
    const itemsWithPrice = allItems.filter(i => i.avg_price > 0).length;
    const avgPricingConfidence = totalItemCount > 0 ? Math.round((itemsWithPrice / totalItemCount) * 100) : 0;

    // SEO confidence: % of items with seo_title set
    const itemsWithSeo = allItems.filter(i => i.seo_title && i.seo_title.length > 5).length;
    const avgSeoConfidence = totalItemCount > 0 ? Math.round((itemsWithSeo / totalItemCount) * 100) : 0;

    // Launch readiness
    const launchReadinessScore = calcLaunchReadiness(
      approvedPublicCount, totalItemCount,
      minApprovedGoal, minItemGoal,
      avgIdentityConfidence, duplicateMatchRate
    );
    const daysUntilLaunch = launchDate ? daysUntil(launchDate) : null;

    // Related entity counts (best effort)
    let totalImageRefs = 0, totalBarcodes = 0, totalPriceHistory = 0, totalDemandMetrics = 0;
    try {
      const imgRefs = await base44.asServiceRole.entities.ItemImageReference.list('-created_date', 1);
      totalImageRefs = imgRefs.length;
    } catch {}
    try {
      const barcodes = await base44.asServiceRole.entities.ItemBarcode.list('-created_date', 1);
      totalBarcodes = barcodes.length;
    } catch {}
    try {
      const ph = await base44.asServiceRole.entities.ItemPriceHistory.list('-created_date', 1);
      totalPriceHistory = ph.length;
    } catch {}
    try {
      const dm = await base44.asServiceRole.entities.DemandMetrics.list('-created_date', 1);
      totalDemandMetrics = dm.length;
    } catch {}

    // Check if snapshot for today already exists
    const existingSnap = await base44.asServiceRole.entities.CentralRepositoryDailySnapshot.filter({ snapshot_date: today });

    const snapData = {
      snapshot_date: today,
      total_item_count: totalItemCount,
      new_items_added: newItemsAdded,
      approved_public_count: approvedPublicCount,
      review_needed_count: reviewNeededCount,
      private_count: privateCount,
      rejected_count: rejectedCount,
      barcode_match_count: barcodeMatchCount,
      database_match_count: databaseMatchCount,
      serpapi_lookup_count: serpapiLookupCount,
      serpapi_lookup_avoided_count: serpapiAvoidedCount,
      estimated_serpapi_savings: estimatedSerpApiSavings,
      duplicate_match_rate: duplicateMatchRate,
      avg_identity_confidence: avgIdentityConfidence,
      avg_pricing_confidence: avgPricingConfidence,
      avg_seo_confidence: avgSeoConfidence,
      launch_readiness_score: launchReadinessScore,
      days_until_launch: daysUntilLaunch ?? 180,
      total_image_references: totalImageRefs,
      total_barcode_records: totalBarcodes,
      total_price_history_records: totalPriceHistory,
      total_demand_metric_records: totalDemandMetrics,
    };

    if (existingSnap.length > 0) {
      await base44.asServiceRole.entities.CentralRepositoryDailySnapshot.update(existingSnap[0].id, snapData);
    } else {
      await base44.asServiceRole.entities.CentralRepositoryDailySnapshot.create(snapData);
    }

    return Response.json({ success: true, snapshot: snapData });
  } catch (error) {
    console.error('calculateRepositorySnapshot error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});