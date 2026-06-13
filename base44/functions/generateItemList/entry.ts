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

        const prompt = `You are an expert estate sale and antiques discovery guide.

A buyer is hunting for items in the category "${category}" and searched: "${query}".

Your job is to help them DISCOVER what to look for. Based on the search, suggest:
- If the query is a medium/technique (e.g., "enamel on copper", "watercolor", "bronze"): suggest notable artists known for that medium, key styles, and what collectors look for
- If the query is an artist name: list their most collectible/popular works and what typically appears at estate sales
- If the query is a brand/designer: list their iconic pieces and hidden gems
- If the query is a style/period: list key designers, notable pieces, and what to watch for

For each suggestion include:
- title: a descriptive label (e.g., "Artists who worked in enamel on copper", or "Eames Lounge Chair - Herman Miller")
- description: 1-2 sentences explaining what makes this worth hunting for and what to look for
- brand: if a specific brand/artist/designer is being referenced
- subcategory: a more specific subcategory within ${category}
- era: the decade or period
- estimated_value_min: typical low-end price seen at estate sales
- estimated_value_max: typical high-end price

Return as JSON with an "items" array of 8-15 suggestions. Focus on EDUCATIONAL DISCOVERY — help them build knowledge, not a shopping list. Include a mix of specific items, notable makers, and collecting tips.`;

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