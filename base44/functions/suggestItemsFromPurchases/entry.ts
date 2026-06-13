import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { purchases } = await req.json();

        if (!purchases || purchases.length === 0) {
            return Response.json({ suggestions: [] });
        }

        const purchaseList = purchases.map(p => ({
            name: p.item_name || 'Unknown Item',
        })).slice(0, 30);

        const prompt = `Analyze this buyer's past estate sale / marketplace purchase history and suggest 5-8 specific items or categories they should add to their hunt list. Base suggestions on patterns in what they've already bought — e.g. if they bought mid-century furniture, suggest other mid-century pieces or categories.

Past purchases:
${JSON.stringify(purchaseList, null, 2)}

Return a JSON array of suggestions. Each suggestion has:
- "title": short item name or category name (e.g. "Mid-Century Credenza", "Art Deco Jewelry", "Vintage Pyrex")
- "category": high-level category (e.g. "Furniture", "Jewelry", "Glassware", "Art")
- "reason": one short sentence explaining why based on their history (e.g. "You bought a mid-century dining table — a matching credenza would complement it")
- "subcategory": optional more specific subcategory
- "era": optional era like "Mid-Century", "Victorian", "Art Deco"

Make suggestions specific and actionable, not generic.`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    suggestions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                category: { type: "string" },
                                reason: { type: "string" },
                                subcategory: { type: "string" },
                                era: { type: "string" },
                            },
                            required: ["title", "category", "reason"],
                        },
                    },
                },
                required: ["suggestions"],
            },
        });

        return Response.json({ suggestions: result.suggestions || [] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});