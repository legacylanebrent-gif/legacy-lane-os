import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior content strategist for EstateSalen.com, a national estate sale and life transition platform.

STRICT RULES — follow every one without exception:
1. Never provide legal advice, tax advice, or financial advice.
2. Never invent specific laws, filing fees, court deadlines, tax rules, probate forms, or small estate thresholds.
3. When uncertain about a specific legal or procedural fact, write: "Confirm with your local probate court or licensed attorney."
4. Tone: helpful, calm, practical, and sensitive. These users are going through difficult life transitions.
5. Every piece of content must naturally lead to an estate sale company, cleanout service, realtor, investor cash offer, or estate checklist CTA.
6. Write for a 7th-grade reading level. Avoid jargon. Use plain language.
7. All content is educational only. Include this disclaimer context naturally.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_type, target_keyword, save_to_db } = await req.json();

    if (!event_type || !target_keyword) {
      return Response.json({ error: 'event_type and target_keyword are required' }, { status: 400 });
    }

    const prompt = `Create a complete life event hub page for EstateSalen.com.

Event type: ${event_type}
Target keyword: "${target_keyword}"

Return a JSON object with these exact keys:
{
  "title": "Page H1 title (include target keyword)",
  "seo_title": "SEO title tag (55-60 chars, include target keyword)",
  "seo_description": "Meta description (150-160 chars, compelling, includes keyword)",
  "intro_content": "3-4 sentence intro paragraph. Empathetic, practical, keyword-rich.",
  "main_content": "800-1200 word HTML guide. Use <h2>, <h3>, <p>, <ul> tags. Cover: what this life event means, what happens to the home and belongings, practical next steps, when to get help, what professionals are involved. End with a soft CTA toward estate sale, cleanout, or realtor.",
  "faq_json": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "schema_json": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  },
  "internal_link_suggestions": [
    {"anchor_text": "...", "suggested_path": "/..."},
    {"anchor_text": "...", "suggested_path": "/..."},
    {"anchor_text": "...", "suggested_path": "/..."}
  ]
}

FAQ rules: 5 questions. Practical, real questions families ask. Answers must never invent legal specifics. Use "Confirm with your local probate court or licensed attorney." where appropriate.
Schema: Build the FAQPage schema from the FAQ you generated.
Internal links: Suggest 3 relevant links to other EstateSalen pages like /probate, /estate-sale-companies, /executor-guide, /estate-checklist, /estate-settlement-planner, /senior-downsizing, /inherited-property, etc.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      system_prompt: SYSTEM_PROMPT,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          intro_content: { type: 'string' },
          main_content: { type: 'string' },
          faq_json: { type: 'array', items: { type: 'object' } },
          schema_json: { type: 'object' },
          internal_link_suggestions: { type: 'array', items: { type: 'object' } },
        },
      },
    });

    // Optionally save to LifeEventHub entity
    if (save_to_db && result.title) {
      const slug = target_keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await base44.asServiceRole.entities.LifeEventHub.create({
        title: result.title,
        slug,
        event_type,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        intro_content: result.intro_content,
        main_content: result.main_content,
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