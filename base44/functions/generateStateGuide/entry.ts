import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a senior content strategist and legal researcher for EstateSalen.com.

STRICT RULES:
1. Never provide legal advice, tax advice, or financial advice. Always frame content as educational.
2. Use web search to find REAL, current state-specific data — small estate thresholds, probate court systems, creditor claim periods, homestead protections, property tax rules, and state estate/inheritance taxes.
3. When you find specific figures (dollar thresholds, time periods), include them with a note to "Confirm with your local court or licensed attorney for the most current amounts."
4. If you cannot verify a fact through web search, say "Confirm with your local court or licensed attorney" rather than inventing it.
5. Tone: helpful, calm, practical, sensitive to families in transition.
6. Plain language. 7th-grade reading level. No legal jargon without explanation.
7. Focus specifically on what is DIFFERENT in this state vs. the general/national process.
8. Every guide should lead naturally to estate sale, cleanout, realtor, or checklist CTAs.`;

const GUIDE_FOCUS = {
  probate: `Focus on state-specific probate details: small estate affidavit threshold, formal vs informal probate availability, creditor claim period length, executor compensation rules (statutory vs reasonable), whether court approval is needed to sell real estate, state estate tax (if any), and the name/structure of the probate court system.`,
  'inherited-property': `Focus on state-specific inherited property details: property tax reassessment rules on inheritance, any property tax protections for family transfers, state estate or inheritance tax thresholds, whether transfer-on-death deeds are available, and homestead protections that may apply.`,
  'senior-downsizing': `Focus on state-specific senior downsizing details: property tax relief programs for seniors, capital gains exclusion rules, senior housing market characteristics, any state programs that help seniors with housing transitions, and property tax freeze or deferral programs.`,
  'assisted-living-transition': `Focus on state-specific senior transition details: Medicaid eligibility rules for long-term care, state programs that help seniors age in place or transition, property tax relief for seniors, and state-regulated assisted living facilities.`,
  'divorce-property-sale': `Focus on state-specific divorce property details: whether the state is community property or equitable distribution, how marital vs separate property is determined, capital gains exclusion rules for divorcing couples, and any state-specific divorce property laws.`,
  'estate-cleanout': `Focus on state-specific cleanout details: hazardous waste disposal regulations, local donation resources, any state-specific environmental rules for disposing of electronics or chemicals, and estate sale licensing requirements if any.`,
  'foreclosure-cleanout': `Focus on state-specific foreclosure details: whether the state is judicial or non-judicial foreclosure, tenant rights during foreclosure, redemption periods, and abandonment laws regarding personal property left behind.`,
  'executor-guide': `Focus on state-specific executor details: executor compensation rules, whether court approval is needed for key actions, required notices to beneficiaries, probate court system structure, and executor bond requirements.`,
  'trustee-guide': `Focus on state-specific trust administration details: state trust code adoption, trustee compensation rules, beneficiary notification requirements, and state estate or inheritance tax on trust assets.`,
  'heir-guide': `Focus on state-specific heir rights: intestacy laws, heirship determinations, small estate procedures, and state-specific inheritance tax if any.`,
  'pre-probate': `Focus on state-specific pre-probate details: what can be done before probate is opened, small estate thresholds, and state-specific early action items.`,
  'moving-sale': `Focus on state-specific moving and relocation details: any state-specific tax considerations, housing market info, and moving-related resources.`,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { state, guide_type, save_to_db, regenerate } = await req.json();

    if (!state || !guide_type) {
      return Response.json({ error: 'state and guide_type are required' }, { status: 400 });
    }

    const guideFocus = GUIDE_FOCUS[guide_type] || GUIDE_FOCUS.probate;
    const stateSlug = state.toLowerCase().replace(/\s+/g, '-');

    // Normalize guide_type for DB storage
    const dbGuideType = guide_type
      .replace(/-/g, '_')
      .replace('inherited_property', 'inherited_home')
      .replace('senior_downsizing', 'downsizing')
      .replace('assisted_living_transition', 'senior_transition')
      .replace('divorce_property_sale', 'divorce')
      .replace('foreclosure_cleanout', 'general')
      .replace('estate_cleanout', 'estate_sale')
      .replace('moving_sale', 'general');

    const prompt = `Research and create a state-specific supplement for a ${guide_type} guide page for EstateSalen.com.

State: ${state}
Guide type: ${guide_type}

${guideFocus}

IMPORTANT: This is a STATE-SPECIFIC supplement that will appear alongside general national content. Do NOT repeat general information that applies to all states. Focus ONLY on what is different, unique, or specific to ${state}.

Use web search to find and verify:
- Current small estate threshold (dollar amount) for ${state}
- Creditor claim period length in ${state}
- Whether ${state} has a state estate tax or inheritance tax, and the threshold
- Property tax reassessment rules on inherited property in ${state}
- Whether transfer-on-death deeds are available in ${state}
- The probate court system name and structure in ${state}
- Any state-specific homestead protections
- Executor compensation rules in ${state} (statutory formula vs reasonable)
- Whether court approval is required to sell real estate in probate

Return a JSON object with these exact keys:
{
  "title": "H1 title including state name and guide topic (e.g., 'Probate in ${state}: Process, Timeline & Costs')",
  "seo_title": "SEO title 55-60 chars including state name",
  "seo_description": "Meta description 150-160 chars mentioning ${state} specifically",
  "intro_content": "2-3 sentence intro specifically about ${state}. Mention state-specific details, not generic content.",
  "main_content": "400-600 word HTML section focused on ${state}-specific differences. Use <h2>, <h3>, <p>, <ul>. Include verified state-specific figures with a note to confirm with local court. Do NOT repeat general probate/process info — only state-specific differences.",
  "quick_facts_json": {
    "Small Estate Threshold": "$X (confirm current amount with court)",
    "Creditor Claim Period": "X months",
    "State Estate Tax": "Yes/No — threshold if applicable",
    "Probate Court": "Name of court system",
    "Real Estate Sale Court Approval": "Required/Not required",
    "Executor Compensation": "Statutory/Reasonable"
  },
  "official_resource_links_json": [
    {"label": "${state} Probate Court", "url": "https://..."},
    {"label": "${state} State Bar - Estate Planning", "url": "https://..."}
  ],
  "faq_json": [
    {"question": "state-specific question", "answer": "state-specific answer"},
    {"question": "state-specific question", "answer": "state-specific answer"},
    {"question": "state-specific question", "answer": "state-specific answer"}
  ],
  "schema_json": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  }
}

CRITICAL: Only include facts you can verify through web search. For anything you cannot verify, use "Confirm with your local court or licensed attorney" as the value. Never invent specific dollar amounts, deadlines, or legal requirements.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
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

    // Get state abbreviation
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
    const abbr = state.length === 2 ? state.toUpperCase() : (STATE_ABBRS[state.toLowerCase()] || state.slice(0, 2).toUpperCase());

    if (save_to_db && result.title) {
      // Check for existing record
      const existing = await base44.asServiceRole.entities.StateGuide.filter({
        state_slug: stateSlug,
        guide_type: dbGuideType,
      });

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

      if (existing.length > 0 && !regenerate) {
        // Don't overwrite existing published content unless regenerate=true
        return Response.json({ ...result, message: 'Record already exists. Use regenerate=true to overwrite.', existing_id: existing[0].id });
      }

      if (existing.length > 0 && regenerate) {
        await base44.asServiceRole.entities.StateGuide.update(existing[0].id, recordData);
        return Response.json({ ...result, message: 'Updated existing record', updated_id: existing[0].id });
      }

      const created = await base44.asServiceRole.entities.StateGuide.create(recordData);
      return Response.json({ ...result, message: 'Created new record', created_id: created.id });
    }

    return Response.json(result);
  } catch (error) {
    console.error('generateStateGuide error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});