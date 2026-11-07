import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { applyPhotoFields, photoUrl } from '../../shared/photoFields.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Trial gate: SERP (Google Lens) searches are locked during free trials ──
    try {
      const pendingSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_id: user.id,
        status: 'pending',
      });
      const activeTrial = pendingSubs.find(
        (s) => s.renewal_date && new Date(s.renewal_date) > new Date()
      );
      if (activeTrial || user.subscription_status === 'trial') {
        return Response.json({
          error: "Your free trial doesn't include SERP pricing searches. Upgrade to a paid plan to activate them.",
          requires_upgrade: true,
          upgrade_url: '/OperatorPackages',
        }, { status: 403 });
      }
    } catch (gateErr) {
      console.warn('Trial gate check failed, proceeding:', gateErr.message);
    }

    const { image_url, sale_id } = await req.json();
    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });

    // Check and decrement credits first
    try {
      const creditCheck = await base44.functions.invoke('checkGoogleLensCredits', {});
      if (!creditCheck.data.allowed) {
        return Response.json({ error: creditCheck.data.reason || 'No Google Lens searches remaining' }, { status: 403 });
      }
    } catch (creditErr) {
      // If credit check fails, proceed anyway (backward compatibility)
      console.warn('Credit check failed, proceeding:', creditErr.message);
    }

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
      const isCredits = /run out|credits|quota|limit|payment/i.test(serpData.error);
      return Response.json({ 
        error: isCredits 
          ? `SerpAPI credits exhausted: ${serpData.error}` 
          : serpData.error 
      }, { status: 400 });
    }

    // Extract visual matches with pricing
    const rawVisualMatches = serpData.visual_matches || [];
    const knowledgeGraph = serpData.knowledge_graph || {};

    // ── HARD SOURCE EXCLUSION: estatesales.net is never searched, cited or priced from ──
    // Matches from that domain are dropped before titles, prices, ranges or saved
    // evidence are produced, so nothing from it can reach a description or estimate.
    const BLOCKED_DOMAINS = ['estatesales.net'];
    const isBlockedMatch = (match) => {
      const haystack = `${match?.link || ''} ${match?.source || ''} ${match?.title || ''}`.toLowerCase().replace(/\s+/g, '');
      return BLOCKED_DOMAINS.some((domain) => haystack.includes(domain));
    };
    const visualMatches = rawVisualMatches.filter((match) => !isBlockedMatch(match));
    const excludedCount = rawVisualMatches.length - visualMatches.length;
    if (excludedCount > 0) {
      console.log(`Excluded ${excludedCount} blocked-source match(es) from the pricing search.`);
    }

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

    // ── Identity that may be written onto the photo ──────────────────────────
    // A commercial search match's title is the best available identification,
    // but a placeholder is never an identification: "Unidentified Item" stays
    // unidentified instead of being saved as the item's name.
    const PLACEHOLDER_TITLES = /^(unidentified item|unknown item|unknown|item)$/i;
    const realTitle = (value) => {
      const text = String(value || '').trim();
      return text && !PLACEHOLDER_TITLES.test(text) ? text : '';
    };
    const identityName =
      realTitle(knowledgeGraph?.title) || realTitle(results[0]?.title) || '';

    // Save to SaleItemPricing entity if sale_id provided
    // Chapter 24 near-P0 — OWNERSHIP BEFORE WRITE: the caller must be
    // authorized for the parent sale before comparable/pricing evidence is
    // written against it. No cross-company evidence injection.
    const savedFields = [];
    if (sale_id) {
      const saleRows = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
      const sale = saleRows[0] || null;
      if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });
      const isOperator = sale.operator_id === user.id;
      const isSaleTeam = (sale.sale_team || []).includes(user.id);
      const isAdmin = user.role === 'admin';
      if (!isOperator && !isSaleTeam && !isAdmin) {
        return Response.json({ error: 'Only the sale operator (or an admin) may save pricing evidence for this sale.' }, { status: 403 });
      }
      if (results.length > 0) {
        await base44.asServiceRole.entities.SaleItemPricing.create({
          sale_id,
          operator_id: saleRows[0]?.operator_id,
          image_url,
          item_title: identityName || 'Unidentified Item',
          price_min: priceMin,
          price_max: priceMax,
          price_avg: priceAvg,
          top_matches: results,
          processed_by: user.email,
          knowledge_graph_title: knowledgeGraph?.title || null,
          knowledge_graph_type: knowledgeGraph?.type || null,
        });
      }

      // ── CANONICAL PER-PHOTO SAVE ───────────────────────────────────────────
      // The result is persisted HERE, on the photo it belongs to, addressed by
      // that photo's own url. Writing one index of the CURRENT stored sale is
      // what makes it impossible for a batch run to give several photos the
      // same title, or to re-apply an older copy of the whole photo list.
      // 'fill_empty' never replaces a value a human already entered.
      const aiFields = {};
      if (identityName) aiFields.name = identityName;
      if (priceAvg != null) aiFields.ai_first_search_price = priceAvg;
      {
        const priced = results.filter((m) => m.price && m.title).slice(0, 3);
        let synopsis = '';
        if (identityName) synopsis += `${identityName}.`;
        if (priced.length > 0) {
          synopsis += ` Currently listed for ${priced.map((m) => `${m.price} on ${m.source}`).join(', ')}.`;
        }
        if (priceMin && priceMax) synopsis += ` Market price range: $${priceMin}–$${priceMax}.`;
        if (synopsis.trim()) aiFields.synopsis = synopsis.trim();
      }

      let savedFields = [];
      if (Object.keys(aiFields).length > 0) {
        const images = [...(sale.images || [])];
        const idx = images.findIndex((img) => photoUrl(img) === image_url);
        if (idx === -1) {
          console.warn('googleLensPricing: photo no longer on this sale, nothing saved', { sale_id, image_url });
        } else {
          const current = typeof images[idx] === 'string' ? { url: images[idx] } : images[idx];
          const { photo, changed } = applyPhotoFields(current, aiFields, 'fill_empty');
          if (changed.length > 0) {
            images[idx] = photo;
            await base44.asServiceRole.entities.EstateSale.update(sale_id, { images });
            savedFields = changed;
            console.log('googleLensPricing: photo fields saved', { sale_id, image_url, changed });
          }
        }
      }
    }

    return Response.json({
      success: true,
      item_title: identityName,
      knowledge_graph: {
        title: knowledgeGraph?.title,
        type: knowledgeGraph?.type,
      },
      price_range: { min: priceMin, max: priceMax, avg: priceAvg },
      matches: results,
      total_matches: visualMatches.length,
      excluded_blocked_sources: excludedCount,
    });

  } catch (error) {
    console.error('Google Lens pricing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});