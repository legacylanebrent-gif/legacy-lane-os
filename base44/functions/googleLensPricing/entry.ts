import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { image_url, sale_id } = await req.json();
    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });

    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    if (!serpApiKey) return Response.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 });

    // Call SerpAPI Google Lens
    const params = new URLSearchParams({
      engine: 'google_lens',
      url: image_url,
      api_key: serpApiKey,
    });

    const serpResponse = await fetch(`https://serpapi.com/search?${params}`);
    const serpData = await serpResponse.json();

    if (serpData.error) {
      return Response.json({ error: serpData.error }, { status: 400 });
    }

    // Extract visual matches with pricing
    const visualMatches = serpData.visual_matches || [];
    const knowledgeGraph = serpData.knowledge_graph || {};

    const results = visualMatches.slice(0, 10).map(match => {
      // SerpAPI price can be a string, number, or object like {value: 25, extracted_value: 25, currency: '$'}
      let priceStr = null;
      if (match.price != null) {
        if (typeof match.price === 'object') {
          priceStr = match.price.extracted_value != null
            ? `$${match.price.extracted_value}`
            : match.price.value != null
            ? String(match.price.value)
            : null;
        } else {
          priceStr = String(match.price);
        }
      }
      return {
      title: match.title || 'Unknown Item',
      price: priceStr,
      source: match.source || null,
      link: match.link || null,
      thumbnail: match.thumbnail || null,
      rating: match.rating || null,
      reviews: match.reviews || null,
      position: match.position || null,
    };
    });

    // Calculate price range from matches that have prices
    // Also extract raw numeric prices directly from SerpAPI before string conversion
    const pricesRaw = visualMatches.slice(0, 10)
      .map(m => {
        if (!m.price) return null;
        if (typeof m.price === 'number') return m.price;
        if (typeof m.price === 'object') return m.price.extracted_value || null;
        const match = String(m.price).match(/[\d,]+\.?\d*/);
        return match ? parseFloat(match[0].replace(',', '')) : null;
      })
      .filter(p => p !== null && p > 0);

    const priceMin = pricesRaw.length > 0 ? Math.min(...pricesRaw) : null;
    const priceMax = pricesRaw.length > 0 ? Math.max(...pricesRaw) : null;
    const priceAvg = pricesRaw.length > 0 ? Math.round(pricesRaw.reduce((a, b) => a + b, 0) / pricesRaw.length) : null;

    // Save to SaleItemPricing entity if sale_id provided
    if (sale_id && results.length > 0) {
      await base44.asServiceRole.entities.SaleItemPricing.create({
        sale_id,
        image_url,
        item_title: results[0]?.title || knowledgeGraph?.title || 'Unidentified Item',
        price_min: priceMin,
        price_max: priceMax,
        price_avg: priceAvg,
        top_matches: results,
        processed_by: user.email,
        knowledge_graph_title: knowledgeGraph?.title || null,
        knowledge_graph_type: knowledgeGraph?.type || null,
      });
    }

    return Response.json({
      success: true,
      item_title: results[0]?.title || knowledgeGraph?.title || 'Unidentified Item',
      knowledge_graph: {
        title: knowledgeGraph?.title,
        type: knowledgeGraph?.type,
      },
      price_range: { min: priceMin, max: priceMax, avg: priceAvg },
      matches: results,
      total_matches: visualMatches.length,
    });

  } catch (error) {
    console.error('Google Lens pricing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});