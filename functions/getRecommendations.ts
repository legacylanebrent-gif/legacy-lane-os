import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather user activity data
        const savedSaleIds = JSON.parse(localStorage.getItem?.('savedSales') || '[]');
        const viewedSaleIds = JSON.parse(localStorage.getItem?.('viewedSales') || '[]');

        // Fetch user's saved and viewed sales
        const allSales = await base44.entities.EstateSale.list('-created_date', 100);
        const savedSales = allSales.filter(s => savedSaleIds.includes(s.id));
        const viewedSales = allSales.filter(s => viewedSaleIds.includes(s.id));

        // Fetch user's orders to understand purchase history
        const orders = await base44.entities.Order.filter({ buyer_id: user.id }, '-created_date', 20);

        // Fetch marketplace items
        const items = await base44.entities.Item.list('-created_date', 50);

        // Prepare context for AI
        const userContext = {
            saved_sales: savedSales.map(s => ({ 
                title: s.title, 
                categories: s.categories,
                location: s.property_address?.city + ', ' + s.property_address?.state
            })),
            viewed_sales: viewedSales.slice(0, 10).map(s => ({ 
                title: s.title, 
                categories: s.categories 
            })),
            purchase_history: orders.map(o => ({
                items: o.items.map(i => i.item_title)
            })),
            preferences: user.interests || []
        };

        // Use AI to generate recommendations
        const recommendationPrompt = `Based on the following user activity, recommend 5 estate sales and 5 marketplace items that would be most relevant to this user.

User Activity:
- Saved Sales: ${JSON.stringify(userContext.saved_sales)}
- Viewed Sales: ${JSON.stringify(userContext.viewed_sales)}
- Purchase History: ${JSON.stringify(userContext.purchase_history)}
- Interests: ${JSON.stringify(userContext.preferences)}

Available Estate Sales:
${allSales.slice(0, 30).map(s => `ID: ${s.id}, Title: ${s.title}, Categories: ${s.categories?.join(', ')}, Location: ${s.property_address?.city}, ${s.property_address?.state}`).join('\n')}

Available Marketplace Items:
${items.slice(0, 30).map(i => `ID: ${i.id}, Title: ${i.title}, Category: ${i.category}, Price: $${i.price}`).join('\n')}

Analyze the user's patterns and preferences, then provide recommendations in the following JSON format:
{
  "recommended_sales": [
    {
      "id": "sale_id",
      "reason": "Brief explanation why this matches user interests"
    }
  ],
  "recommended_items": [
    {
      "id": "item_id",
      "reason": "Brief explanation why this matches user interests"
    }
  ]
}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: recommendationPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommended_sales: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    recommended_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                reason: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        // Enrich recommendations with full data
        const recommendedSales = aiResponse.recommended_sales
            .map(rec => {
                const sale = allSales.find(s => s.id === rec.id);
                return sale ? { ...sale, recommendation_reason: rec.reason } : null;
            })
            .filter(Boolean)
            .slice(0, 5);

        const recommendedItems = aiResponse.recommended_items
            .map(rec => {
                const item = items.find(i => i.id === rec.id);
                return item ? { ...item, recommendation_reason: rec.reason } : null;
            })
            .filter(Boolean)
            .slice(0, 5);

        return Response.json({
            sales: recommendedSales,
            items: recommendedItems
        });

    } catch (error) {
        console.error('Recommendation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});