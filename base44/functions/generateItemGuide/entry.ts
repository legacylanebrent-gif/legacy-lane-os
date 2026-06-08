import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior antiques and collectibles content writer for EstateSalen.com.

STRICT RULES:
1. Never guarantee specific prices or values. Always frame values as ranges based on recent market data.
2. Use hedging language: "typically sells for," "recent sales suggest," "values vary based on condition."
3. Tone: educational, practical, helpful for families finding items in an estate.
4. Lead naturally to estate sale CTA — families should contact a professional estate sale company to appraise and sell items.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { item_name, category, brand, era, operator_item_data, save_to_db } = await req.json();

    if (!item_name) {
      return Response.json({ error: 'item_name is required' }, { status: 400 });
    }

    const itemSlug = item_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const contextBlock = operator_item_data
      ? `\n\nReal sale data from EstateSalen platform:\n${JSON.stringify(operator_item_data, null, 2)}`
      : '';

    const prompt = `Create a complete item value and identification guide for EstateSalen.com.

Item: ${item_name}
Category: ${category || 'Unknown'}
Brand: ${brand || 'Unknown'}
Era: ${era || 'Unknown'}${contextBlock}

Return a JSON object with these exact keys:
{
  "item_name": "${item_name}",
  "item_slug": "${itemSlug}",
  "seo_title": "SEO title (55-60 chars) — include item name",
  "seo_description": "Meta description (150-160 chars) — include item name and 'value guide'",
  "identification_guide": "300-500 word HTML guide on how to identify this item. Cover: maker's marks, signatures, model numbers, materials, age indicators, common reproductions to watch for. Use <p>, <ul> tags.",
  "value_guide": "300-500 word HTML guide on what affects this item's value. Cover: condition factors, rarity, demand, recent market trends. Use <p>, <ul>. Frame all values as ranges, not guarantees.",
  "pricing_notes": "1-2 sentence caveat: values vary by condition, market, and buyer. Recommend professional appraisal for high-value items.",
  "sold_examples_json": [],
  "keywords_json": ["keyword1", "keyword2", "keyword3"],
  "faq_json": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "schema_json": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  }
}

Sold examples: Return empty array unless you have confident, verifiable data. Do not invent sale prices.
FAQ: 3 practical questions a family member would ask when finding this item in an estate.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      system_prompt: SYSTEM_PROMPT,
      response_json_schema: {
        type: 'object',
        properties: {
          item_name: { type: 'string' },
          item_slug: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          identification_guide: { type: 'string' },
          value_guide: { type: 'string' },
          pricing_notes: { type: 'string' },
          sold_examples_json: { type: 'array', items: { type: 'object' } },
          keywords_json: { type: 'array', items: { type: 'string' } },
          faq_json: { type: 'array', items: { type: 'object' } },
          schema_json: { type: 'object' },
        },
      },
    });

    if (save_to_db && result.item_name) {
      await base44.asServiceRole.entities.ItemKnowledgeBase.create({
        item_name: result.item_name,
        item_slug: result.item_slug || itemSlug,
        category: category || '',
        brand: brand || '',
        era: era || '',
        keywords_json: result.keywords_json || [],
        identification_guide: result.identification_guide,
        value_guide: result.value_guide,
        pricing_notes: result.pricing_notes,
        sold_examples_json: result.sold_examples_json || [],
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        faq_json: result.faq_json || [],
        schema_json: result.schema_json || {},
        status: 'draft',
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});