import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior content strategist and legal researcher for EstateSalen.com.

STRICT RULES:
1. Never provide legal advice. Frame content as educational.
2. Use web search to find REAL state-specific data.
3. When you find specific figures, include them with a note to "Confirm with your local court."
4. If you cannot verify a fact, say "Confirm with your local court or licensed attorney."
5. Tone: helpful, calm, practical, sensitive.
6. Plain language. 7th-grade reading level.
7. Focus ONLY on what is DIFFERENT in this state vs. the general process.`;

const GUIDE_FOCUS = {
  probate: `Focus on state-specific probate details: small estate affidavit threshold, formal vs informal probate, creditor claim period, executor compensation rules, whether court approval is needed to sell real estate, state estate tax, and probate court system name.`,
  'inherited-property': `Focus on: property tax reassessment rules on inheritance, property tax protections for family transfers, state estate or inheritance tax thresholds, transfer-on-death deed availability, and homestead protections.`,
  'senior-downsizing': `Focus on: property tax relief programs for seniors, capital gains exclusion rules, senior housing market info, and property tax freeze or deferral programs.`,
  'assisted-living-transition': `Focus on: Medicaid eligibility for long-term care, state programs for seniors, property tax relief, and state-regulated assisted living.`,
  'divorce-property-sale': `Focus on: community property vs equitable distribution, marital vs separate property, capital gains exclusion for divorcing couples, and state-specific divorce property laws.`,
  'estate-cleanout': `Focus on: hazardous waste disposal regulations, donation resources, environmental rules for electronics/chemicals, and estate sale licensing.`,
  'foreclosure-cleanout': `Focus on: judicial vs non-judicial foreclosure, tenant rights, redemption periods, and abandonment laws for personal property.`,
  'executor-guide': `Focus on: executor compensation, court approval requirements, beneficiary notices, probate court structure, and bond requirements.`,
  'trustee-guide': `Focus on: state trust code, trustee compensation, beneficiary notification, and state estate/inheritance tax on trust assets.`,
  'heir-guide': `Focus on: intestacy laws, heirship determinations, small estate procedures, and inheritance tax.`,
  'pre-probate': `Focus on: what can be done before probate opens, small estate thresholds, and state-specific early action items.`,
  'moving-sale': `Focus on: state-specific tax considerations, housing market, and moving resources.`,
};

const STATE_ABBRS = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
  'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
  'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA',
  'kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD',
  'massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO',
  'montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ',
  'new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH',
  'oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC',
  'south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT',
  'virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
  'district of columbia':'DC',
};

async function generateOneState(base44, state, guideType) {
  const guideFocus = GUIDE_FOCUS[guideType] || GUIDE_FOCUS.probate;
  const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
  const dbGuideType = guideType
    .replace(/-/g, '_')
    .replace('inherited_property', 'inherited_home')
    .replace('senior_downsizing', 'downsizing')
    .replace('assisted_living_transition', 'senior_transition')
    .replace('divorce_property_sale', 'divorce')
    .replace('foreclosure_cleanout', 'general')
    .replace('estate_cleanout', 'estate_sale')
    .replace('moving_sale', 'general');

  const prompt = `Research and create a state-specific supplement for a ${guideType} guide page for EstateSalen.com.

State: ${state}
Guide type: ${guideType}

${guideFocus}

IMPORTANT: This is a STATE-SPECIFIC supplement. Do NOT repeat general info. Focus ONLY on what is unique to ${state}.

Use web search to find and verify current data for ${state}.

Return a JSON object with these exact keys:
{
  "title": "H1 title including state name and guide topic",
  "seo_title": "SEO title 55-60 chars",
  "seo_description": "Meta description 150-160 chars mentioning ${state}",
  "intro_content": "2-3 sentences specifically about ${state}",
  "main_content": "400-600 word HTML section on ${state}-specific differences. Use <h2>, <h3>, <p>, <ul>.",
  "quick_facts_json": { "Small Estate Threshold": "...", "Creditor Claim Period": "...", "State Estate Tax": "...", "Probate Court": "...", "Real Estate Sale Court Approval": "...", "Executor Compensation": "..." },
  "official_resource_links_json": [{"label":"...","url":"https://..."}],
  "faq_json": [{"question":"...","answer":"..."}],
  "schema_json": {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}
}

Only include verified facts. Use "Confirm with your local court" for anything unverified.`;

  const llmText = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: prompt + '\n\nReturn ONLY a valid JSON object. No markdown, no code fences, no text before or after. Start with { and end with }.',
    add_context_from_internet: true,
    model: 'gemini_3_flash',
  });

  let result;
  try {
    const cleaned = llmText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    result = JSON.parse(cleaned);
  } catch (parseError) {
    throw new Error('Failed to parse LLM response as JSON for ' + state);
  }

  if (!result.title) throw new Error('No title in LLM response for ' + state);

  const abbr = STATE_ABBRS[state.toLowerCase()] || state.slice(0, 2).toUpperCase();
  const recordData = {
    state_name: state,
    state_slug: stateSlug,
    state_abbreviation: abbr,
    guide_type: dbGuideType,
    title: result.title,
    seo_title: result.seo_title,
    seo_description: result.seo_description,
    intro_content: result.intro_content,
    main_content: result.main_content,
    quick_facts_json: result.quick_facts_json || {},
    official_resource_links_json: result.official_resource_links_json || [],
    faq_json: result.faq_json || [],
    schema_json: result.schema_json || {},
    status: 'published',
    last_verified_date: new Date().toISOString().split('T')[0],
  };

  const existing = await base44.asServiceRole.entities.StateGuide.filter({
    state_slug: stateSlug, guide_type: dbGuideType,
  });

  if (existing.length > 0) {
    await base44.asServiceRole.entities.StateGuide.update(existing[0].id, recordData);
    return { state, status: 'updated', id: existing[0].id };
  }

  const created = await base44.asServiceRole.entities.StateGuide.create(recordData);
  return { state, status: 'created', id: created.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { states, guide_type } = await req.json();

    if (!states || !Array.isArray(states) || !guide_type) {
      return Response.json({ error: 'states (array) and guide_type are required' }, { status: 400 });
    }

    const results = [];
    for (const state of states) {
      try {
        const res = await generateOneState(base44, state, guide_type);
        results.push(res);
      } catch (error) {
        results.push({ state, status: 'error', error: error.message });
      }
    }

    return Response.json({ guide_type, processed: results.length, results });
  } catch (error) {
    console.error('batchGenerateStateGuides error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});