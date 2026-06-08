import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior content strategist for EstateSalen.com.

STRICT RULES:
1. Never provide legal advice, tax advice, or financial advice.
2. Never invent specific laws, filing fees, court deadlines, tax rules, probate forms, or small estate thresholds. If you reference these, always say "Confirm with your local court or licensed attorney."
3. Tone: helpful, calm, practical, sensitive.
4. Every guide should lead naturally to estate sale, cleanout, realtor, investor, or checklist CTAs.
5. Plain language. 7th-grade reading level. No jargon.`;

const GUIDE_DESCRIPTIONS = {
  probate: 'probate process and estate settlement',
  'inherited-property': 'what to do with an inherited property',
  'senior-downsizing': 'senior downsizing and helping older adults transition',
  'assisted-living-transition': 'transitioning a loved one to assisted living and handling their home',
  'divorce-property-sale': 'selling a jointly owned home during divorce',
  'foreclosure-cleanout': 'cleanout and personal property options during or after foreclosure',
  'estate-cleanout': 'estate cleanout and clearing a home after a death or transition',
  'moving-sale': 'moving sales and estate sales for people who are relocating',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { state, guide_type, save_to_db } = await req.json();

    if (!state || !guide_type) {
      return Response.json({ error: 'state and guide_type are required' }, { status: 400 });
    }

    const guideDesc = GUIDE_DESCRIPTIONS[guide_type] || guide_type;
    const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
    const keyword = `${guide_type} ${state}`;

    const prompt = `Create a complete state guide page for EstateSalen.com.

State: ${state}
Guide type: ${guide_type}
Topic: ${guideDesc}
Target keyword: "${keyword}"

Return a JSON object with these exact keys:
{
  "title": "Page H1 title — include state name and topic",
  "seo_title": "SEO title (55-60 chars)",
  "seo_description": "Meta description (150-160 chars)",
  "intro_content": "3-4 sentence intro. Empathetic, practical, mentions ${state} specifically.",
  "main_content": "600-900 word HTML guide. Use <h2>, <h3>, <p>, <ul>. Tailor to ${state} where possible — reference general state characteristics, geography, or common practices without inventing specific laws or fees. End with estate sale / realtor / checklist CTA.",
  "quick_facts_json": {
    "Key fact 1 label": "value or 'Confirm with your local court'",
    "Key fact 2 label": "value or 'Confirm with your local court'"
  },
  "official_resource_links_json": [
    {"label": "...", "url": "https://..."}
  ],
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

Quick facts: 3-5 practical facts about this topic in ${state}. Where specific legal data is unknown, use "Confirm with your local court or licensed attorney" as the value.
Official resources: 1-3 real, verifiable links to ${state} government or court websites if you are confident they exist. If not confident, return empty array.
FAQ: 3 practical questions specific to ${state}. Never invent legal specifics.`;

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
          quick_facts_json: { type: 'object' },
          official_resource_links_json: { type: 'array', items: { type: 'object' } },
          faq_json: { type: 'array', items: { type: 'object' } },
          schema_json: { type: 'object' },
        },
      },
    });

    if (save_to_db && result.title) {
      const abbr = state.length === 2 ? state.toUpperCase() : state.slice(0, 2).toUpperCase();
      await base44.asServiceRole.entities.StateGuide.create({
        state_name: state,
        state_slug: stateSlug,
        state_abbreviation: abbr,
        guide_type: guide_type.replace(/-/g, '_').replace('inherited_property', 'inherited_home').replace('senior_downsizing', 'downsizing').replace('assisted_living_transition', 'senior_transition').replace('divorce_property_sale', 'divorce').replace('foreclosure_cleanout', 'general').replace('estate_cleanout', 'estate_sale').replace('moving_sale', 'general'),
        title: result.title,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        intro_content: result.intro_content,
        main_content: result.main_content,
        quick_facts_json: result.quick_facts_json || {},
        official_resource_links_json: result.official_resource_links_json || [],
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