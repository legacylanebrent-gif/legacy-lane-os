import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUGGESTION_CACHE = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category } = body;
    if (!category) {
      return Response.json({ error: 'category is required' }, { status: 400 });
    }

    // Return cached results for repeated calls within the instance lifetime
    const cacheKey = category.toLowerCase().trim();
    if (SUGGESTION_CACHE.has(cacheKey)) {
      return Response.json(SUGGESTION_CACHE.get(cacheKey));
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `For the estate sale / antique / collectible category "${category}", suggest relevant subcategories and historical eras that buyers might search for. Be comprehensive and specific to this category.

Return a JSON object with:
- "subcategories": array of 5-10 specific subcategories within "${category}" that buyers commonly search for
- "eras": array of 3-7 historical eras, periods, or design movements most relevant to "${category}"

Examples:
- "Furniture" → subcategories: ["Dining Tables", "Armoires", "Desks", "Sideboards", "Dressers", "Chairs", "Bookcases", "Bedroom Sets"], eras: ["Victorian", "Mid-Century Modern", "Art Deco", "Georgian", "Edwardian"]
- "Jewelry" → subcategories: ["Engagement Rings", "Necklaces", "Brooches", "Bracelets", "Earrings", "Pendants", "Cufflinks"], eras: ["Art Deco", "Victorian", "Edwardian", "Retro 1940s", "Art Nouveau"]
- "Antiques" → subcategories: ["Primitives", "Folk Art", "Maritime", "Scientific Instruments", "Clocks", "Textiles", "Ceramics", "Silver"], eras: ["Colonial", "Federal", "Victorian", "Early American", "Renaissance Revival"]

Keep subcategories and eras concise (1-4 words each).`,
      response_json_schema: {
        type: "object",
        properties: {
          subcategories: { type: "array", items: { type: "string" } },
          eras: { type: "array", items: { type: "string" } }
        },
        required: ["subcategories", "eras"]
      }
    });

    SUGGESTION_CACHE.set(cacheKey, result);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});