import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      first_name, last_name, email, phone, state, county, city, zip_code,
      relationship_to_deceased, stage_of_process, has_will, has_real_estate,
      needs_estate_sale, needs_cleanout, needs_realtor, wants_cash_offer,
      needs_attorney, property_address, urgency_level, notes,
      source_page, source_state, source_county
    } = body;

    if (!first_name || !email || !state) {
      return Response.json({ error: 'first_name, email, state are required' }, { status: 400 });
    }

    // Score the lead
    let lead_score = 0;
    if (has_real_estate) lead_score += 30;
    if (needs_estate_sale) lead_score += 25;
    if (needs_realtor) lead_score += 25;
    if (wants_cash_offer) lead_score += 20;
    if (urgency_level === 'within_30_days') lead_score += 20;
    if (phone) lead_score += 10;

    // Check if there's an active provider for this county/state
    const providers = await base44.asServiceRole.entities.ProbateProviderRoutingRule.filter({ is_active: true });
    const matchingProvider = providers.find(p =>
      p.states?.includes(state) || (county && p.counties?.includes(county)) || (zip_code && p.zip_codes?.includes(zip_code))
    );
    if (matchingProvider) lead_score += 10;

    const lead = await base44.asServiceRole.entities.ProbateLead.create({
      first_name, last_name, email, phone, state, county, city, zip_code,
      relationship_to_deceased, stage_of_process, has_will, has_real_estate,
      needs_estate_sale, needs_cleanout, needs_realtor, wants_cash_offer,
      needs_attorney, property_address, urgency_level, notes,
      lead_score,
      source_page,
      source_state,
      source_county,
      status: 'new'
    });

    // Auto-route if high score
    if (lead_score >= 50 && matchingProvider) {
      await base44.asServiceRole.entities.ProbateLead.update(lead.id, {
        status: 'routed',
        routed_to: [{ provider_id: matchingProvider.id, provider_name: matchingProvider.provider_name, provider_type: matchingProvider.provider_type }],
        routed_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, lead_id: lead.id, lead_score });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});