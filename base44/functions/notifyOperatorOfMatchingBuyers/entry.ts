import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { saleId } = await req.json();
        if (!saleId) {
            return Response.json({ error: 'saleId is required' }, { status: 400 });
        }

        // 1. Fetch the sale
        const sale = await base44.entities.EstateSale.get(saleId);
        if (!sale) {
            return Response.json({ error: 'Sale not found' }, { status: 404 });
        }

        // 2. Fetch sale inventory items
        let saleItems = [];
        try {
            saleItems = await base44.entities.Item.filter({ estate_sale_id: saleId }, undefined, 500);
        } catch (_) {
            // Item entity may not exist, that's OK
        }

        // 3. Build a rich text blob of everything in the sale
        const saleText = [
            sale.title,
            sale.description,
            sale.ai_summary,
            sale.special_notes,
            (sale.categories || []).join(' '),
            (sale.featured_items || []).map(fi => `${fi.name} ${fi.description}`).join(' '),
            saleItems.map(item => [
                item.title,
                item.description,
                item.brand,
                item.category,
            ].filter(Boolean).join(' ')).join(' '),
        ].filter(Boolean).join(' ').toLowerCase();

        // 4. Fetch all active wanted items
        const wantedItems = await base44.asServiceRole.entities.WantedItem.filter({ status: 'active' });

        // 5. Score each wanted item against the sale
        const matches = [];
        for (const wi of wantedItems) {
            const searchTerms = [
                wi.title?.toLowerCase(),
                wi.brand?.toLowerCase(),
                wi.category?.toLowerCase(),
                wi.subcategory?.toLowerCase(),
                wi.era?.toLowerCase(),
                wi.description?.toLowerCase()?.split(' ').filter(w => w.length > 3).join(' '),
            ].filter(Boolean);

            let score = 0;
            const matchReasons = [];

            for (const term of searchTerms) {
                if (!term) continue;
                if (saleText.includes(term)) {
                    score += 25;
                    matchReasons.push(term.slice(0, 40));
                }
            }

            // Bonus for category match
            if (wi.category && (sale.categories || []).some(c => c.toLowerCase() === wi.category.toLowerCase())) {
                score += 20;
                matchReasons.push(`category: ${wi.category}`);
            }

            if (score >= 25) {
                matches.push({
                    wantedItemId: wi.id,
                    buyerId: wi.buyer_id,
                    buyerName: wi.buyer_name || 'Anonymous Buyer',
                    itemTitle: wi.title,
                    category: wi.category || 'Other',
                    score,
                    matchReasons,
                    budgetMin: wi.budget_min,
                    budgetMax: wi.budget_max,
                });
            }
        }

        // Sort by score descending, take top 10
        matches.sort((a, b) => b.score - a.score);
        const topMatches = matches.slice(0, 10);

        if (topMatches.length > 0) {
            const matchDetails = topMatches.map((m, i) =>
                `${i + 1}. "${m.itemTitle}" — ${m.buyerName || 'Anonymous Buyer'}${m.category ? ` (${m.category})` : ''} — ${m.score}% match`
            ).join('\n');

            const bestMatch = topMatches[0];

            await base44.asServiceRole.entities.Notification.create({
                user_id: sale.operator_id,
                type: 'system',
                title: `👥 ${topMatches.length} Buyer${topMatches.length > 1 ? 's' : ''} Matched: "${sale.title}"`,
                message: `We found ${topMatches.length} potential buyer${topMatches.length > 1 ? 's' : ''} actively hunting for items in your sale "${sale.title}".\n\nTop matches:\n${matchDetails}\n\nClick to message about this item.`,
                link_to_page: 'MySales',
                link_params: '',
                read: false,
                related_entity_type: 'EstateSale',
                related_entity_id: saleId,
            });

            return Response.json({
                success: true,
                matchCount: topMatches.length,
                topMatches: topMatches.map(m => ({
                    buyerName: m.buyerName,
                    itemTitle: m.itemTitle,
                    category: m.category,
                    score: m.score,
                })),
            });
        }

        return Response.json({
            success: true,
            matchCount: 0,
            message: `No active buyer matches found for "${sale.title}". Try adding more items and categories to your sale.`,
        });
    } catch (error) {
        console.error('notifyOperatorOfMatchingBuyers error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});