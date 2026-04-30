import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CATEGORY_KEYWORDS = {
  furniture: ['antique furniture', 'vintage chair', 'estate sofa', 'dining table', 'bedroom set', 'mid-century modern'],
  art: ['original artwork', 'fine art painting', 'art collection', 'contemporary art', 'gallery piece'],
  jewelry: ['vintage jewelry', 'estate jewelry', 'diamond ring', 'heirloom jewelry', 'antique necklace'],
  vehicles: ['vintage car', 'classic automobile', 'estate vehicle', 'collector car'],
  antiques: ['antique', 'vintage', 'collectible', 'heritage item', 'historical piece'],
  collectibles: ['collectible item', 'rare collectible', 'vintage collection', 'limited edition'],
  home_decor: ['home decoration', 'wall art', 'decorative items', 'vintage decor', 'estate decor'],
  other: ['estate item', 'vintage piece', 'collectible']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch items created in last 24 hours that don't have SEO boosts yet
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const allItems = await base44.asServiceRole.entities.Item.list('-created_date', 500);
    const recentItems = allItems.filter(i => i.created_date > yesterday);

    // Fetch existing boosts to avoid duplicates
    const existingBoosts = await base44.asServiceRole.entities.SEOBoost.list('', 1000);
    const boostedItemIds = new Set(existingBoosts.map(b => b.item_id));

    const itemsNeedingBoosts = recentItems.filter(i => !boostedItemIds.has(i.id) && i.title && i.description);

    let createdCount = 0;
    const boosts = [];

    for (const item of itemsNeedingBoosts) {
      const keywords = extractKeywords(item);
      const seoData = generateSEOData(item, keywords);

      try {
        const boost = await base44.asServiceRole.entities.SEOBoost.create({
          item_id: item.id,
          marketplace_item_id: item.marketplace_item_id || null,
          estate_sale_id: item.estate_sale_id || null,
          boost_type: 'keyword_rich_title',
          keywords: seoData.allKeywords,
          primary_keyword: seoData.primaryKeyword,
          secondary_keywords: seoData.secondaryKeywords,
          suggested_title: seoData.suggestedTitle,
          suggested_description: seoData.suggestedDescription,
          meta_description: seoData.metaDescription,
          seo_score: seoData.seoScore,
          estimated_organic_reach: seoData.estimatedReach,
          category_insights: seoData.categoryInsights,
          status: 'active',
          last_updated: new Date().toISOString(),
          boost_reason: `Auto-generated SEO boost for ${item.category || 'item'} listing`
        });

        boosts.push(boost);
        createdCount++;
      } catch (error) {
        console.error(`Error creating boost for item ${item.id}:`, error.message);
      }
    }

    return Response.json({
      status: 'success',
      itemsProcessed: itemsNeedingBoosts.length,
      boostsCreated: createdCount,
      boosts: boosts.slice(0, 10)
    });
  } catch (error) {
    console.error('Error in generateDailySEOBoosts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractKeywords(item) {
  const title = item.title || '';
  const description = item.description || '';
  const brand = item.brand || '';
  const category = item.category || '';
  const condition = item.condition || '';

  const text = `${title} ${description} ${brand}`.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 3);

  const categoryKeywords = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.other;
  const relevantKeywords = categoryKeywords.filter(kw => 
    text.includes(kw.split(' ')[0].toLowerCase())
  );

  return {
    title,
    description,
    category,
    condition,
    keywords: [...new Set([...relevantKeywords, ...words.slice(0, 5)])],
    brand
  };
}

function generateSEOData(item, keywords) {
  const primaryKeyword = keywords.keywords[0] || item.category || 'estate item';
  const secondaryKeywords = keywords.keywords.slice(1, 4);

  const suggestedTitle = buildSEOTitle(item, primaryKeyword);
  const suggestedDescription = buildSEODescription(item, keywords.keywords);
  const metaDescription = suggestedDescription.substring(0, 160);

  const seoScore = calculateSEOScore(item, keywords);
  const estimatedReach = Math.floor(seoScore * 50);

  const categoryInsights = {
    category: item.category || 'other',
    trending_keywords: keywords.keywords.slice(0, 5),
    search_volume: Math.floor(Math.random() * 5000) + 100,
    competition: seoScore > 75 ? 'high' : seoScore > 50 ? 'medium' : 'low'
  };

  return {
    primaryKeyword,
    secondaryKeywords,
    allKeywords: keywords.keywords,
    suggestedTitle,
    suggestedDescription,
    metaDescription,
    seoScore,
    estimatedReach,
    categoryInsights
  };
}

function buildSEOTitle(item, primaryKeyword) {
  const maxLen = 60;
  const base = `${item.title}${item.brand ? ` | ${item.brand}` : ''} - ${item.condition || 'Estate'}`;
  if (base.length <= maxLen) return base;
  return `${item.title.substring(0, 40)} | ${primaryKeyword}`.substring(0, maxLen);
}

function buildSEODescription(item, keywords) {
  const keywordPhrase = keywords.slice(0, 2).join(', ');
  const price = item.price ? ` Priced at $${item.price.toFixed(2)}.` : '';
  return `${item.title}. Quality ${item.condition || 'condition'}. Features: ${keywordPhrase}.${price} Buy now.`;
}

function calculateSEOScore(item, keywords) {
  let score = 50;

  if (item.title?.length > 30) score += 10;
  if (item.description?.length > 100) score += 15;
  if (item.images?.length > 0) score += 10;
  if (item.brand) score += 5;
  if (item.price) score += 5;
  if (keywords.keywords.length > 3) score += 5;

  return Math.min(100, score);
}