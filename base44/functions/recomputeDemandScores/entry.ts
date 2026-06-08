/**
 * KNOWLEDGE EXTRACTION ENGINE — Stage 7: Demand Score Recomputation
 * 
 * Scheduled: runs daily
 * 
 * What it does:
 *  - Recomputes demand_score for all DemandMetrics records
 *  - Detects demand_trend (rising/stable/falling) vs previous score
 *  - Syncs demand_score back to ItemKnowledge records
 *  - Identifies top rising items (for future market reports)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function computeDemandScore(metrics) {
  // Weighted demand score 0-100
  // watched > wanted > saved > viewed > sold ratio
  const score =
    (metrics.watch_count || 0) * 3 +
    (metrics.wanted_count || 0) * 5 +
    (metrics.save_count || 0) * 2 +
    Math.min((metrics.view_count || 0), 500) * 0.05 +
    (metrics.sold_inventory_count || 0) * 4;

  return Math.min(100, Math.round(score));
}

function computeTrend(previousScore, newScore) {
  const delta = newScore - previousScore;
  if (delta >= 5) return 'rising';
  if (delta <= -5) return 'falling';
  return 'stable';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin/automation only
    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
    } catch {
      isAutomation = true; // automation calls
    }

    let skip = 0;
    const batchSize = 100;
    let totalProcessed = 0;
    let risingItems = [];

    while (true) {
      const batch = await base44.asServiceRole.entities.DemandMetrics.list('-last_computed', batchSize, skip);
      if (!batch || batch.length === 0) break;

      for (const dm of batch) {
        const newScore = computeDemandScore(dm);
        const previousScore = dm.demand_score || 0;
        const trend = computeTrend(previousScore, newScore);

        // Determine price trend (simplified: if we have sold data > active, rising value)
        let priceTrend = dm.price_trend || 'unknown';
        if (dm.sold_inventory_count > 0 && dm.active_inventory_count === 0) {
          priceTrend = 'rising'; // high sell-through = demand exceeds supply
        } else if (dm.active_inventory_count > (dm.sold_inventory_count || 0) * 3) {
          priceTrend = 'falling'; // oversupply
        } else if (dm.sold_inventory_count > 0) {
          priceTrend = 'stable';
        }

        await base44.asServiceRole.entities.DemandMetrics.update(dm.id, {
          demand_score: newScore,
          demand_trend: trend,
          price_trend: priceTrend,
          last_computed: new Date().toISOString(),
        });

        // Sync back to ItemKnowledge
        if (dm.item_knowledge_id) {
          await base44.asServiceRole.entities.ItemKnowledge.update(dm.item_knowledge_id, {
            demand_score: newScore,
          }).catch(() => {});
        }

        if (trend === 'rising' && newScore > 20) {
          risingItems.push({ id: dm.item_knowledge_id, score: newScore });
        }

        totalProcessed++;
      }

      if (batch.length < batchSize) break;
      skip += batchSize;

      // Small delay to avoid overloading DB
      await new Promise(r => setTimeout(r, 200));
    }

    // Sort rising items
    risingItems.sort((a, b) => b.score - a.score);

    return Response.json({
      success: true,
      processed: totalProcessed,
      rising_items_count: risingItems.length,
      top_rising: risingItems.slice(0, 10),
    });

  } catch (error) {
    console.error('recomputeDemandScores error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});