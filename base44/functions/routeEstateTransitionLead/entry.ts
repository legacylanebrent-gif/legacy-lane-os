import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { lead_id, state, county, life_event_type, needs_estate_sale, needs_realtor, needs_cleanout, wants_cash_offer } = await req.json();

    // Find matching active routing rules
    const allRules = await base44.asServiceRole.entities.ProviderRoutingRule.filter({ is_active: true, state });
    
    const matched = allRules.filter(rule => {
      const countyMatch = !rule.county || rule.county === county || rule.county === '';
      const eventMatch = rule.life_event_type === 'any' || rule.life_event_type === life_event_type || !rule.life_event_type;
      return countyMatch && eventMatch;
    }).sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0));

    const assignments = {};
    const routedTo = [];

    for (const rule of matched) {
      const type = rule.provider_type;
      // Only assign one provider per type (highest priority)
      if (assignments[type]) continue;

      // Check if lead needs this type
      const needs = {
        estate_sale_operator: needs_estate_sale,
        realtor: needs_realtor,
        cleanout_vendor: needs_cleanout,
        investor: wants_cash_offer,
        attorney_resource: false,
      };

      if (needs[type] === false) continue;

      assignments[type] = rule.provider_id;
      routedTo.push({ provider_id: rule.provider_id, provider_type: type, rule_id: rule.id });
    }

    // Build update payload
    const updateData = {
      routed_to: routedTo,
      routed_at: new Date().toISOString(),
      crm_status: routedTo.length > 0 ? 'routed' : 'new',
    };

    if (assignments.estate_sale_operator) updateData.assigned_operator_id = assignments.estate_sale_operator;
    if (assignments.realtor) updateData.assigned_agent_id = assignments.realtor;
    if (assignments.cleanout_vendor) updateData.assigned_cleanout_vendor_id = assignments.cleanout_vendor;
    if (assignments.investor) updateData.assigned_investor_id = assignments.investor;

    if (lead_id) {
      await base44.asServiceRole.entities.EstateTransitionLead.update(lead_id, updateData);
    }

    return Response.json({ routed_to: routedTo, assignments, update_data: updateData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});