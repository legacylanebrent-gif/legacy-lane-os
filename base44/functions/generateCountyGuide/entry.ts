import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior content strategist for EstateSalen.com.

STRICT RULES:
1. Never provide legal advice. Never invent court addresses, phone numbers, fees, hours, or specific forms.
2. For court info, write approximate information only and always add: "Confirm directly with the court before visiting."
3. Tone: helpful, calm, practical, sensitive.
4. Lead naturally to estate sale, cleanout, realtor, investor, or checklist CTAs.
5. Plain language. No jargon.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { state, county, guide_type, save_to_db, state_id } = await req.json();

    if (!state || !county || !guide_type) {
      return Response.json({ error: 'state, county, and guide_type are required' }, { status: 400 });
    }

    const countySlug = `${county.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase().replace(/\s+/g, '-').slice(0, 2)}`;
    const keyword = `${guide_type} ${county} ${state}`;

    const prompt = `Create a complete county-level guide page for EstateSalen.com.

State: ${state}
County: ${county}
Guide type: ${guide_type}
Target keyword: "${keyword}"

Return a JSON object with these exact keys:
{
  "title": "Page H1 — include county, state, and guide topic",
  "seo_title": "SEO title (55-60 chars)",
  "seo_description": "Meta description (150-160 chars)",
  "intro_content": "2-3 sentence intro mentioning ${county}, ${state} specifically.",
  "main_content": "400-600 word HTML guide. Use <h2>, <p>, <ul>. Cover local nuances where possible. End with estate sale / cleanout / realtor CTA.",
  "court_info_json": {
    "court_name": "Approximate court name for ${county} County, ${state} — note this is approximate",
    "address": "Do not invent — return empty string if not certain",
    "phone": "Do not invent — return empty string if not certain",
    "url": "Official court URL only if you are confident it is correct, otherwise empty string",
    "hours": "Do not invent — return empty string"
  },
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

Court info rules: Only include data you are confident is accurate. Return empty strings for anything uncertain. Always add "Confirm directly with the court before visiting." in the main_content.
FAQ: 3 practical county-specific questions. No invented legal specifics.`;

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
          court_info_json: { type: 'object' },
          faq_json: { type: 'array', items: { type: 'object' } },
          schema_json: { type: 'object' },
        },
      },
    });

    if (save_to_db && result.title) {
      const guideTypeMap = {
        'probate': 'probate', 'inherited-property': 'inherited_home', 'senior-downsizing': 'downsizing',
        'assisted-living-transition': 'senior_transition', 'divorce-property-sale': 'divorce',
        'foreclosure-cleanout': 'general', 'estate-cleanout': 'estate_sale', 'moving-sale': 'general',
      };
      await base44.asServiceRole.entities.CountyGuide.create({
        state_id: state_id || '',
        county_name: county,
        county_slug: countySlug,
        guide_type: guideTypeMap[guide_type] || 'general',
        title: result.title,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        intro_content: result.intro_content,
        main_content: result.main_content,
        court_info_json: result.court_info_json || {},
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