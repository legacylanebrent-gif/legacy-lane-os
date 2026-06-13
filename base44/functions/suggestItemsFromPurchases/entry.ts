import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORIES = [
    'Furniture', 'Jewelry', 'Art', 'Antiques', 'Collectibles', 'Electronics',
    'Clothing & Accessories', 'Books & Media', 'China & Porcelain', 'Glassware',
    'Tools & Hardware', 'Sporting Goods', 'Toys & Games', 'Musical Instruments',
    'Coins & Currency', 'Rugs & Textiles', 'Kitchen & Dining', 'Lighting & Lamps',
    'Mid-Century Modern', 'Garden & Outdoor', 'Vehicles', 'Firearms',
    'Holiday & Seasonal', 'Victorian Era', 'Vintage Fashion', 'Watches',
    'Cameras & Photography', 'Vinyl Records', 'Comics', 'Other'
];

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

        const prompt = `Analyze this buyer's past estate sale / marketplace purchase history and suggest 5-8 specific items or categories they should add to their hunt list. Base suggestions on patterns in what they've already bought.

Past purchases:
${JSON.stringify(purchaseList, null, 2)}

IMPORTANT: For the "category" field, you MUST use one of these exact values:
${CATEGORIES.join(', ')}

Return a JSON array of suggestions. Each suggestion has:
- "title": short item name or category name (e.g. "Mid-Century Credenza", "Art Deco Jewelry", "Vintage Pyrex", "Children's Classic Book Series")
- "category": MUST be one of the categories listed above (e.g. for a book, use "Books & Media"; for a necklace, use "Jewelry")
- "reason": one short sentence explaining why based on their history
- "subcategory": optional more specific subcategory
- "era": optional era like "Mid-Century", "Victorian", "Art Deco"

Make suggestions specific and actionable.`;

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