import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { state_name, state_abbreviation, slug } = await req.json();
    if (!state_name || !state_abbreviation) {
      return Response.json({ error: 'state_name and state_abbreviation required' }, { status: 400 });
    }

    const stateSlug = slug || state_name.toLowerCase().replace(/\s+/g, '-');

    // Log job start
    const job = await base44.asServiceRole.entities.ProbateContentJob.create({
      job_type: 'generate_state',
      target_name: state_name,
      status: 'running',
      started_at: new Date().toISOString()
    });

    // Check if page already exists
    const existing = await base44.asServiceRole.entities.ProbateState.filter({ slug: stateSlug });
    const existingId = existing[0]?.id;

    // Generate content with AI
    const prompt = `
You are writing a structured SEO educational guide about probate in ${state_name}.

CRITICAL RULES:
- Do NOT invent specific filing fees, dollar thresholds, form numbers, or court deadlines
- If a specific fact is unknown, say: "Confirm with your local probate court or licensed attorney"
- Write factually, educationally, and helpfully
- All content is EDUCATIONAL only — not legal advice

Generate a JSON object with these exact keys:

{
  "intro_content": "2-3 sentence educational intro about probate in ${state_name}",
  "probate_court_name": "Name of the probate court system in ${state_name} (e.g. Surrogate's Court, Probate Court, Superior Court - Probate Division)",
  "small_estate_threshold": "If known, the general small estate affidavit threshold in ${state_name}. If unknown: 'Confirm with your local probate court or licensed attorney'",
  "small_estate_process": "Brief description of the small estate or simplified process in ${state_name}. If unknown: 'Confirm with your local probate court or licensed attorney'",
  "official_court_url": "Official state court website URL if you know it with confidence, otherwise empty string",
  "quick_facts": {
    "State": "${state_name}",
    "Probate Court": "name of court",
    "Supervised Probate": "Yes / No / Varies",
    "Small Estate Process": "Available / Not Available / Varies — confirm with court",
    "Typical Timeline": "general range if known, otherwise 'Varies — confirm with attorney'"
  },
  "estate_sale_section": "2-3 sentence paragraph about estate sales in ${state_name} probate context. Mention that executors in ${state_name} may need court approval before selling personal property — if true; otherwise say to confirm with attorney.",
  "inherited_home_section": "3-4 sentence paragraph about selling inherited real estate in ${state_name}. Mention any unique ${state_name}-specific considerations if known. Always note to confirm with a licensed attorney and CPA.",
  "faq_json": [
    {"question": "Does every estate in ${state_name} have to go through probate?", "answer": "..."},
    {"question": "How long does probate take in ${state_name}?", "answer": "..."},
    {"question": "Can I sell an inherited home before probate is complete in ${state_name}?", "answer": "..."},
    {"question": "Do I need an attorney for probate in ${state_name}?", "answer": "..."},
    {"question": "What is the small estate process in ${state_name}?", "answer": "..."}
  ],
  "seo_title": "How to Start Probate in ${state_name} | Estate Sale & Inherited Home Guide",
  "meta_description": "Learn the general probate steps in ${state_name}, when an estate sale may be needed, and how to prepare an inherited home for sale. Educational guide from EstateSalen."
}

Return only valid JSON, no markdown.
`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          intro_content: { type: 'string' },
          probate_court_name: { type: 'string' },
          small_estate_threshold: { type: 'string' },
          small_estate_process: { type: 'string' },
          official_court_url: { type: 'string' },
          quick_facts: { type: 'object' },
          estate_sale_section: { type: 'string' },
          inherited_home_section: { type: 'string' },
          faq_json: { type: 'array', items: { type: 'object' } },
          seo_title: { type: 'string' },
          meta_description: { type: 'string' }
        }
      }
    });

    const content = llmResult;

    const schemaJson = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": content.seo_title || `How to Start Probate in ${state_name}`,
      "description": content.meta_description,
      "publisher": {
        "@type": "Organization",
        "name": "EstateSalen.com",
        "url": "https://estatesalen.com"
      },
      "about": {
        "@type": "LegalTopic",
        "name": `Probate in ${state_name}`
      }
    };

    const data = {
      state_name,
      state_abbreviation,
      slug: stateSlug,
      ...content,
      schema_json: schemaJson,
      status: 'draft',
      last_generated_at: new Date().toISOString()
    };

    let pageId;
    if (existingId) {
      await base44.asServiceRole.entities.ProbateState.update(existingId, data);
      pageId = existingId;
    } else {
      const created = await base44.asServiceRole.entities.ProbateState.create(data);
      pageId = created.id;
    }

    // Update job
    await base44.asServiceRole.entities.ProbateContentJob.update(job.id, {
      status: 'completed',
      result_summary: `Generated ${state_name} state page (ID: ${pageId})`,
      completed_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      page_id: pageId,
      state: state_name,
      slug: stateSlug,
      action: existingId ? 'updated' : 'created'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});