import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Nightly function that computes SEO authority scores for each estate sale operator
// based on their activity: number of sales, calendar density, image richness, and item quality.
// Writes computed profile data back to the User entity for use in operator profile pages.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all sales
    const allSales = await base44.asServiceRole.entities.EstateSale.list('-created_date', 1000);

    // Group by operator
    const byOperator = {};
    for (const sale of allSales) {
      if (!sale.operator_id) continue;
      if (!byOperator[sale.operator_id]) byOperator[sale.operator_id] = [];
      byOperator[sale.operator_id].push(sale);
    }

    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    let operatorsUpdated = 0;

    for (const [operatorId, sales] of Object.entries(byOperator)) {
      const completedSales = sales.filter(s => s.status === 'completed');
      const activeSales = sales.filter(s => ['active', 'upcoming'].includes(s.status));
      const recentSales = sales.filter(s => {
        const created = new Date(s.created_date);
        return created >= oneYearAgo;
      });

      // Calendar density: how many sales in last 90 days
      const last90Days = sales.filter(s => new Date(s.created_date) >= threeMonthsAgo);

      // Image richness: % of images that have name+description
      let totalImages = 0;
      let enrichedImages = 0;
      let totalViews = 0;
      let totalSaves = 0;

      for (const sale of sales) {
        totalViews += sale.views || 0;
        totalSaves += sale.saves || 0;
        if (!sale.images) continue;
        for (const img of sale.images) {
          totalImages++;
          if (typeof img === 'object' && img.name && img.description) enrichedImages++;
        }
      }

      const imageRichnessScore = totalImages > 0
        ? Math.round((enrichedImages / totalImages) * 100)
        : 0;

      // Overall SEO authority score (0–100)
      let score = 0;
      score += Math.min(30, completedSales.length * 2);       // up to 30pts for completed sales
      score += Math.min(20, recentSales.length * 4);           // up to 20pts for recency
      score += Math.min(20, last90Days.length * 5);            // up to 20pts for density
      score += Math.round(imageRichnessScore * 0.2);           // up to 20pts for image richness
      score += Math.min(10, Math.round(totalViews / 100));     // up to 10pts for engagement
      score = Math.min(100, score);

      // Build primary city/state from their most recent sale
      const sortedSales = [...sales].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const primarySale = sortedSales[0];
      const primaryCity = primarySale?.property_address?.city || '';
      const primaryState = primarySale?.property_address?.state || '';

      // Cities across all their sales
      const citiesSet = new Set(
        sales.map(s => s.property_address?.city).filter(Boolean)
      );

      // Collect categories across all sales
      const allCategories = new Set();
      for (const sale of sales) {
        (sale.categories || []).forEach(c => allCategories.add(c));
      }

      // Generate an AI-powered SEO bio for this operator
      let seoBio = '';
      try {
        const bioResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Write a 60-word SEO-optimized professional bio for an estate sale company with these stats:
- Total sales: ${sales.length} (${completedSales.length} completed, ${activeSales.length} active/upcoming)
- Primary market: ${primaryCity}, ${primaryState}
- Cities served: ${[...citiesSet].slice(0, 5).join(', ')}
- Specialties: ${[...allCategories].slice(0, 6).join(', ') || 'antiques, furniture, collectibles'}
- Total buyer engagement: ${totalViews} views, ${totalSaves} saves
- Sales in last 90 days: ${last90Days.length}

Write naturally, include location keywords, mention estate sale expertise. Do NOT use the company name (it will be inserted separately).`,
          response_json_schema: {
            type: 'object',
            properties: { bio: { type: 'string' } },
            required: ['bio']
          }
        });
        seoBio = bioResult?.bio || '';
      } catch (e) {
        seoBio = '';
      }

      // Write seo_profile back to the user record
      try {
        await base44.asServiceRole.entities.User.update(operatorId, {
          seo_authority_score: score,
          seo_profile: {
            total_sales: sales.length,
            completed_sales: completedSales.length,
            active_sales: activeSales.length,
            sales_last_90_days: last90Days.length,
            sales_last_year: recentSales.length,
            primary_city: primaryCity,
            primary_state: primaryState,
            cities_served: [...citiesSet].slice(0, 10),
            categories_offered: [...allCategories].slice(0, 12),
            total_views: totalViews,
            total_saves: totalSaves,
            image_richness_score: imageRichnessScore,
            total_images: totalImages,
            enriched_images: enrichedImages,
            seo_bio: seoBio,
            last_computed: new Date().toISOString()
          }
        });
        operatorsUpdated++;
      } catch (e) {
        console.error(`Failed to update operator ${operatorId}:`, e.message);
      }
    }

    return Response.json({
      status: 'success',
      operatorsProcessed: Object.keys(byOperator).length,
      operatorsUpdated
    });

  } catch (error) {
    console.error('generateOperatorSEOProfile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});