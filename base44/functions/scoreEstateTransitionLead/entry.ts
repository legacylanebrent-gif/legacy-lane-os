import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { lead, lead_id } = await req.json();

    let score = 0;

    // Core signals
    if (lead.has_real_estate) score += 30;
    if (lead.needs_estate_sale) score += 25;
    if (lead.needs_cleanout) score += 15;
    if (lead.needs_realtor) score += 25;
    if (lead.wants_cash_offer) score += 20;

    // Urgency
    if (lead.urgency_level === 'within_30_days') score += 20;

    // Contact quality
    if (lead.phone) score += 10;
    if (lead.email) score += 5;

    // Estimated values
    if (lead.estimated_home_value > 500000) score += 20;
    if (lead.estimated_contents_value > 25000) score += 15;

    // County has active provider
    if (lead.state && lead.county) {
      const rules = await base44.asServiceRole.entities.ProviderRoutingRule.filter({
        state: lead.state,
        county: lead.county,
        is_active: true,
      });
      if (rules.length > 0) score += 10;
    }

    // Determine level
    let level;
    if (score >= 90) level = 'urgent';
    else if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';
    else level = 'low';

    // Update the lead record if lead_id provided
    if (lead_id) {
      await base44.asServiceRole.entities.EstateTransitionLead.update(lead_id, {
        lead_score: score,
        lead_level: level,
      });
    }

    return Response.json({ score, level });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});