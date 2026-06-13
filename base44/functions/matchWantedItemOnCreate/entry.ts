import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse the entity automation payload
    const payload = await req.json();
    const wantedItem = payload.data;
    if (!wantedItem || wantedItem.status !== 'active') {
      return Response.json({ skipped: true, reason: 'Not an active wanted item' });
    }

    const stats = { matchesFound: 0, notificationsCreated: 0 };

    // Fetch active/upcoming estate sales
    const estateSales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['active', 'upcoming'] } },
      '-created_date',
      500
    );

    // Fetch marketplace items
    let marketplaceItems = [];
    try {
      marketplaceItems = await base44.asServiceRole.entities.MarketplaceItem.filter(
        {},
        '-created_date',
        200
      );
    } catch (_) { /* OK */ }

    // Fetch sale inventory items
    let saleItems = [];
    try {
      saleItems = await base44.asServiceRole.entities.Item.filter(
        {},
        '-created_date',
        500
      );
    } catch (_) { /* OK */ }

    // Helper: compute relevance score
    const computeRelevance = (wantedItem, textFields) => {
      const combined = textFields.filter(Boolean).join(' ').toLowerCase();
      const searchTerms = [
        wantedItem.title?.toLowerCase(),
        wantedItem.brand?.toLowerCase(),
        wantedItem.subcategory?.toLowerCase(),
        wantedItem.category?.toLowerCase(),
        wantedItem.description?.toLowerCase()?.split(' ').filter(w => w.length > 3).join(' '),
      ].filter(Boolean);

      let score = 0;
      const matchReasons = [];

      for (const term of searchTerms) {
        if (!term) continue;
        if (combined.includes(term)) {
          score += 30;
          matchReasons.push(`"${term.slice(0, 40)}" found`);
        }
      }

      // Bonus for brand match
      if (wantedItem.brand && combined.includes(wantedItem.brand.toLowerCase())) {
        score += 20;
      }
      // Bonus for exact title match
      if (wantedItem.title && combined.includes(wantedItem.title.toLowerCase())) {
        score += 25;
      }

      return { score, matchReasons };
    };

    const matches = [];

    // Check estate sales
    for (const sale of estateSales) {
      const saleText = [
        sale.title,
        sale.description,
        sale.ai_summary,
        sale.special_notes,
        (sale.featured_items || []).map(fi => `${fi.name} ${fi.description}`).join(' '),
        (sale.categories || []).join(' '),
        (sale.images || []).map(img => `${typeof img === 'object' ? img.name : ''} ${typeof img === 'object' ? img.description : ''}`).join(' '),
      ].filter(Boolean).join(' ');

      const { score, matchReasons } = computeRelevance(wantedItem, [saleText]);
      if (score > 0) {
        matches.push({
          type: 'estate_sale',
          id: sale.id,
          title: sale.title,
          score,
          matchReasons,
          url: `EstateSaleDetail?id=${sale.id}&autoMessage=1&wantedItemTitle=${encodeURIComponent(wantedItem.title || '')}`,
          city: sale.property_address?.city,
          state: sale.property_address?.state,
          saleDate: sale.sale_dates?.[0]?.date,
        });
      }
    }

    // Check marketplace items
    for (const item of marketplaceItems) {
      const itemText = [
        item.title,
        item.description,
        item.brand,
        item.category,
        item.condition,
      ].filter(Boolean).join(' ');

      const { score, matchReasons } = computeRelevance(wantedItem, [itemText]);

      let budgetMatch = true;
      if (item.price) {
        if (wantedItem.budget_max && item.price > wantedItem.budget_max) budgetMatch = false;
        if (wantedItem.budget_min && item.price < wantedItem.budget_min) budgetMatch = false;
      }

      if (score > 0 && budgetMatch) {
        matches.push({
          type: 'marketplace',
          id: item.id,
          title: item.title,
          score,
          matchReasons,
          url: `MarketplaceItemDetail?id=${item.id}`,
          price: item.price,
        });
      }
    }

    // Check sale inventory items
    for (const item of saleItems) {
      const itemText = [
        item.title,
        item.description,
        item.brand,
        item.category,
        item.condition,
      ].filter(Boolean).join(' ');

      const { score, matchReasons } = computeRelevance(wantedItem, [itemText]);

      if (score > 0) {
        matches.push({
          type: 'sale_item',
          id: item.id,
          title: item.title,
          score,
          matchReasons,
          saleId: item.estate_sale_id,
          price: item.price,
        });
      }
    }

    // Sort and take top 5
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 5);

    if (topMatches.length > 0) {
      const bestMatch = topMatches[0];
      const matchCount = topMatches.length;

      let previewText = '';
      if (bestMatch.type === 'estate_sale') {
        previewText = `We found "${bestMatch.title}"${bestMatch.city ? ` in ${bestMatch.city}, ${bestMatch.state}` : ''} — ${bestMatch.score}% match`;
      } else if (bestMatch.type === 'marketplace') {
        previewText = `"${bestMatch.title}" is available on the marketplace${bestMatch.price ? ` for $${bestMatch.price}` : ''} — ${bestMatch.score}% match`;
      } else {
        previewText = `"${bestMatch.title}" was found in estate sale inventory — ${bestMatch.score}% match`;
      }

      const matchDetails = topMatches.map(m =>
        `• ${m.type === 'estate_sale' ? '🏠' : m.type === 'marketplace' ? '🛍️' : '📦'} ${m.title} (${m.score}% match)`
      ).join('\n');

      // 1. Create notification for the buyer
      await base44.asServiceRole.entities.Notification.create({
        user_id: wantedItem.buyer_id,
        type: 'system',
        title: `🎯 Match Found: ${wantedItem.title}`,
        message: `${previewText}\n\n${matchCount} potential match${matchCount > 1 ? 'es' : ''} found for your hunt list:\n${matchDetails}\n\nClick to message about this item.`,
        link_to_page: bestMatch.type === 'marketplace' ? 'MarketplaceItemDetail' : bestMatch.type === 'estate_sale' ? 'EstateSaleDetail' : 'BrowseItems',
        link_params: bestMatch.type === 'estate_sale'
          ? `id=${bestMatch.id}&autoMessage=1&wantedItemTitle=${encodeURIComponent(wantedItem.title || '')}`
          : bestMatch.id ? `id=${bestMatch.id}` : '',
        read: false,
        related_entity_type: 'WantedItem',
        related_entity_id: wantedItem.id,
      });

      // 2. Notify Elite operators of matched estate sales — only if buyer allows dealer contact
      if (wantedItem.allow_dealer_contact !== true) {
        return Response.json({
          success: true,
          stats: { ...stats, operatorNotifications: 0, reason: 'buyer_opted_out_of_dealer_contact' },
          message: `Found ${stats.matchesFound} matches. Buyer has not opted into dealer contact — operators were not notified.`,
        });
      }

      const notifiedOperators = new Set();
      const estateSaleMatches = topMatches.filter(m => m.type === 'estate_sale');

      for (const esMatch of estateSaleMatches) {
        try {
          // Fetch the sale to get operator_id
          const sale = await base44.asServiceRole.entities.EstateSale.get(esMatch.id);
          if (!sale || !sale.operator_id) continue;
          if (notifiedOperators.has(sale.operator_id)) continue;
          notifiedOperators.add(sale.operator_id);

          // Check if operator is on Elite tier
          const subs = await base44.asServiceRole.entities.Subscription.filter({
            user_id: sale.operator_id,
            status: 'active',
          });
          const isPremiumOrAbove = subs.some(s => ['premium', 'enterprise', 'elite'].includes(s.tier));
          if (!isPremiumOrAbove) continue;

          // Create operator notification
          await base44.asServiceRole.entities.Notification.create({
            user_id: sale.operator_id,
            type: 'system',
            title: `👤 Buyer Hunting: "${wantedItem.title}"`,
            message: `A buyer is actively searching for "${wantedItem.title}"${wantedItem.brand ? ` (brand: ${wantedItem.brand})` : ''}${wantedItem.budget_max ? ` with a budget up to $${wantedItem.budget_max}` : ''}.\n\nThis matches your sale "${sale.title || 'Untitled'}". Click to message about this item.`,
            link_to_page: 'EstateSaleDetail',
            link_params: `id=${sale.id}&autoMessage=1&wantedItemTitle=${encodeURIComponent(wantedItem.title || '')}&contactBuyerId=${wantedItem.buyer_id}&contactBuyerName=${encodeURIComponent(wantedItem.buyer_name || '')}`,
            read: false,
            related_entity_type: 'EstateSale',
            related_entity_id: sale.id,
          });
          stats.operatorNotifications = (stats.operatorNotifications || 0) + 1;
        } catch (_) {
          // Skip failed operator notifications gracefully
        }
      }

      stats.matchesFound = topMatches.length;
      stats.notificationsCreated = 1;
    }

    return Response.json({
      success: true,
      stats,
      message: stats.matchesFound > 0
        ? `Found ${stats.matchesFound} matches and created notification`
        : 'No matches found for this wanted item',
    });
  } catch (error) {
    console.error('matchWantedItemOnCreate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});