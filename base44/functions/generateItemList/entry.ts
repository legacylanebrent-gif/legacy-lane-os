import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { category, query } = body;

        if (!category || !query) {
            return Response.json({ error: 'Category and query are required' }, { status: 400 });
        }

        const prompt = `You are an expert cataloger for estate sale and antique items.

A buyer is hunting for items in the category "${category}" and provided this search: "${query}".

Generate a list of 8-15 SPECIFIC, real items that match this search. For each item include:
- title: the specific item name (e.g., "Elvis Presley - Blue Hawaii Original Soundtrack LP")
- description: a brief 1-sentence description
- brand: if applicable (e.g., "RCA Victor")
- subcategory: a more specific subcategory within ${category}
- era: the decade or period the item is from
- estimated_value_min: lowest expected price in dollars (number only)
- estimated_value_max: highest expected price in dollars (number only)

Return as JSON with an "items" array. Make the items REAL and SPECIFIC — actual collectible items a person would hunt for at estate sales.`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                description: { type: 'string' },
                                brand: { type: 'string' },
                                subcategory: { type: 'string' },
                                era: { type: 'string' },
                                estimated_value_min: { type: 'number' },
                                estimated_value_max: { type: 'number' },
                            },
                            required: ['title', 'description', 'subcategory', 'era']
                        }
                    },
                    suggested_related_categories: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '3-5 related categories the buyer might also want to explore'
                    }
                },
                required: ['items']
            }
        });

        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});