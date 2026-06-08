import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function toSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').trim();
}

const EVENT_CONFIGS = {
  probate: { title: 'Probate & Estate Settlement Checklist', displayName: 'Probate & Estate Settlement' },
  executor_guide: { title: 'Executor First Steps Checklist', displayName: 'Executor First Steps' },
  inherited_home: { title: 'Inherited Home Sale Checklist', displayName: 'Inherited Home Sale' },
  estate_sale: { title: 'Estate Sale Preparation Checklist', displayName: 'Estate Sale Preparation' },
  senior_downsizing: { title: 'Senior Downsizing Checklist', displayName: 'Senior Downsizing' },
  assisted_living: { title: 'Assisted Living Move Checklist', displayName: 'Assisted Living Transition' },
  estate_cleanout: { title: 'Estate Cleanout Checklist', displayName: 'Estate Cleanout' },
  divorce_property: { title: 'Divorce Property Transition Checklist', displayName: 'Divorce Property Transition' },
  foreclosure_cleanout: { title: 'Foreclosure Cleanout Planning Checklist', displayName: 'Foreclosure Cleanout' },
  moving_sale: { title: 'Moving Sale Checklist', displayName: 'Moving Sale' },
};

function buildPrompt(life_event_type, state, county) {
  const config = EVENT_CONFIGS[life_event_type] || EVENT_CONFIGS.probate;
  const location = county ? `${county}, ${state}` : state ? state : 'nationwide';

  return `Create a detailed, practical checklist for someone going through: "${config.displayName}"
Location context: ${location}

STRICT RULES:
- Do NOT invent specific legal fees, deadlines, or court requirements.
- Do NOT provide legal or tax advice. Add "Consult an attorney" or "Confirm with your local court" where applicable.
- Write for a grieving or overwhelmed non-lawyer family member.
- Every checklist must naturally include: when to contact an estate sale company, a realtor, a cleanout vendor, and an investor.
- Add a disclaimer at the end of the checklist.

Build checklist categories:
1. Documents to Gather
2. People to Contact  
3. Property to Identify
4. Belongings: Sort / Keep / Sell / Donate / Discard
5. When to Call an Estate Sale Company
6. When to Call a Realtor
7. When to Consider Cleanout Services
8. When to Consider an Investor Cash Offer
9. Final Steps & Notes

For each item provide:
- category (from the list above)
- task (action-oriented, clear, 1 sentence)
- description (2-3 sentences explaining why it matters; add attorney/court disclaimer where relevant)
- priority: "high", "medium", or "low"

Also generate:
- email_subject: Subject line for delivering this checklist via email
- email_body: 3-paragraph email body delivering the checklist (warm, helpful tone, include CTAs for estate sale help + realtor + cash offer)
- cta_headline: One headline for the provider match CTA below the checklist (e.g. "Need help with any of these steps?")
- cta_body: 2 sentences explaining what we connect people with

Return 15-25 checklist items covering all phases.`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { life_event_type = 'probate', state, county } = await req.json();

    const config = EVENT_CONFIGS[life_event_type] || EVENT_CONFIGS.probate;
    const locationSuffix = county ? ` — ${county}, ${state}` : state ? ` — ${state}` : '';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: buildPrompt(life_event_type, state, county),
      response_json_schema: {
        type: 'object',
        properties: {
          checklist_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                task: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' }
              }
            }
          },
          email_subject: { type: 'string' },
          email_body: { type: 'string' },
          cta_headline: { type: 'string' },
          cta_body: { type: 'string' }
        }
      }
    });

    const slug = toSlug(config.title) + (state ? `-${toSlug(state)}` : '') + (county ? `-${toSlug(county)}` : '');
    const title = config.title + locationSuffix;

    // Upsert the LeadMagnet record
    const existing = await base44.asServiceRole.entities.LeadMagnet.filter({ slug });
    const payload = {
      title,
      slug,
      life_event_type,
      state: state || '',
      county: county || '',
      description: `Free ${config.displayName} checklist${locationSuffix}. Step-by-step guide for families navigating a difficult transition.`,
      checklist_items_json: result.checklist_items || [],
      email_subject: result.email_subject,
      email_body: result.email_body,
      cta_headline: result.cta_headline,
      cta_body: result.cta_body,
      status: 'active',
    };

    let saved;
    if (existing[0]) {
      saved = await base44.asServiceRole.entities.LeadMagnet.update(existing[0].id, payload);
    } else {
      saved = await base44.asServiceRole.entities.LeadMagnet.create(payload);
    }

    return Response.json({
      success: true,
      id: saved.id,
      title,
      slug,
      item_count: result.checklist_items?.length || 0,
      email_subject: result.email_subject,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});