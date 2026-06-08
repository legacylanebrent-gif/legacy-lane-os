import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior content writer for EstateSalen.com's Estate Sale University — a free educational resource for families navigating estate sales, probate, downsizing, and inherited homes.

STRICT RULES:
1. Never provide legal advice, tax advice, or financial advice.
2. Never invent specific laws, tax rates, probate fees, or court procedures.
3. When legal or procedural specifics are needed, write: "Confirm with your local probate court or a licensed attorney."
4. Tone: educational, empathetic, practical. These readers are often stressed and overwhelmed.
5. Every article should end with a natural CTA toward estate sale companies, realtors, cleanout services, or the estate settlement planner.
6. Plain language. 7th-grade reading level.`;

const CATEGORY_CONTEXTS = {
  probate_101: 'introductory probate education for families who have never dealt with it before',
  estate_sale_process: 'how estate sales work, from scheduling to settlement',
  pricing_and_value: 'how items are priced at estate sales and what affects value',
  cleanout_and_donations: 'what to do with items after an estate sale',
  inherited_home: 'practical guidance for families who inherited real property',
  downsizing: 'helping seniors and families downsize a home',
  legal_and_tax: 'general educational overview of legal and tax considerations — never specific advice',
  for_operators: 'best practices for estate sale operators and companies',
  for_buyers: 'tips and guidance for estate sale shoppers',
  general: 'general estate sale and life transition education',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { title, target_keyword, category, save_to_db } = await req.json();

    if (!title || !target_keyword || !category) {
      return Response.json({ error: 'title, target_keyword, and category are required' }, { status: 400 });
    }

    const categoryContext = CATEGORY_CONTEXTS[category] || 'estate sale and life transition education';
    const slug = target_keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const prompt = `Write a complete Estate Sale University article for EstateSalen.com.

Title: ${title}
Target keyword: "${target_keyword}"
Category: ${category} (${categoryContext})

Return a JSON object with these exact keys:
{
  "title": "${title}",
  "slug": "${slug}",
  "seo_title": "SEO title (55-60 chars, includes target keyword)",
  "seo_description": "Meta description (150-160 chars, compelling, includes keyword)",
  "article_content": "800-1200 word HTML article. Structure: intro paragraph → 3-4 main sections with <h2> headings → practical tips with <ul> lists → conclusion paragraph with CTA to estate sale companies / estate settlement planner. Use <p>, <h2>, <h3>, <ul>, <li> tags only.",
  "faq_json": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "schema_json": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "...",
    "publisher": {
      "@type": "Organization",
      "name": "EstateSalen"
    }
  }
}

Article rules:
- Start with an empathetic hook sentence acknowledging the reader's situation.
- Include the target keyword naturally 3-5 times.
- End the article with a paragraph suggesting the reader use EstateSalen's estate settlement planner or connect with local estate sale professionals.
- FAQ: 5 practical questions a reader would search for. Answers should be 2-4 sentences. Use the disclaimer language for any legal/tax questions.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      system_prompt: SYSTEM_PROMPT,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          slug: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          article_content: { type: 'string' },
          faq_json: { type: 'array', items: { type: 'object' } },
          schema_json: { type: 'object' },
        },
      },
    });

    if (save_to_db && result.title) {
      await base44.asServiceRole.entities.EstateSaleUniversityArticle.create({
        title: result.title,
        slug: result.slug || slug,
        category,
        target_keyword,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        article_content: result.article_content,
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