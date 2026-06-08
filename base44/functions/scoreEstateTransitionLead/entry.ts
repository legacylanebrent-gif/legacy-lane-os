import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { lead } = await req.json();

    let score = 0;

    // Real estate involved = high value signal
    if (lead.has_real_estate) score += 30;

    // Personal property to sell
    if (lead.has_personal_property_to_sell) score += 15;

    // Service needs
    if (lead.needs_estate_sale) score += 20;
    if (lead.needs_realtor) score += 20;
    if (lead.wants_cash_offer) score += 15;
    if (lead.needs_probate_help) score += 15;
    if (lead.needs_cleanout) score += 10;
    if (lead.needs_attorney_resource) score += 10;

    // Contact quality
    if (lead.phone) score += 10;
    if (lead.county) score += 5;
    if (lead.zip_code) score += 5;
    if (lead.property_address) score += 10;

    // Urgency
    if (lead.urgency_level === 'within_30_days') score += 25;
    else if (lead.urgency_level === '1_to_3_months') score += 15;
    else if (lead.urgency_level === '3_to_6_months') score += 8;

    // Estimated value
    if (lead.estimated_home_value >= 300000) score += 20;
    else if (lead.estimated_home_value >= 150000) score += 12;
    else if (lead.estimated_home_value > 0) score += 5;

    if (lead.estimated_contents_value >= 20000) score += 10;
    else if (lead.estimated_contents_value >= 5000) score += 5;

    // Life event type weighting
    if (['probate', 'inherited_home', 'estate_settlement'].includes(lead.life_event_type)) score += 10;

    // Determine level
    let level;
    if (score >= 100) level = 'urgent';
    else if (score >= 65) level = 'high';
    else if (score >= 35) level = 'medium';
    else level = 'low';

    return Response.json({ score, level });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});