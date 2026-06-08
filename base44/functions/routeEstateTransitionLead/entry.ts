import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      lead_id, state, county, zip_code, life_event_type,
      needs_estate_sale, needs_realtor, needs_cleanout, wants_cash_offer,
      has_real_estate, lead_level, email,
    } = body;

    // ── 1. Fetch all active routing rules for this state ──
    const allRules = await base44.asServiceRole.entities.ProviderRoutingRule.filter({
      state,
      is_active: true,
    });

    // ── 2. Score and filter rules by geographic specificity ──
    // Priority: zip match > county match > state-only match
    const scoredRules = allRules.map(rule => {
      let geo = 0;
      if (zip_code && rule.zip_code && rule.zip_code === zip_code) geo = 3;
      else if (county && rule.county && rule.county.toLowerCase() === county.toLowerCase()) geo = 2;
      else if (!rule.county && !rule.zip_code) geo = 1;
      else geo = 0; // has a county/zip but doesn't match — skip
      return { ...rule, _geo: geo };
    })
      .filter(r => r._geo > 0)
      .sort((a, b) => {
        if (b._geo !== a._geo) return b._geo - a._geo; // better geo first
        return (a.priority_order || 0) - (b.priority_order || 0); // then priority
      });

    // ── 3. Match by service need — one provider per type ──
    const SERVICE_MAP = {
      estate_sale_operator: needs_estate_sale,
      realtor: needs_realtor,
      cleanout_vendor: needs_cleanout,
      investor: wants_cash_offer,
    };

    const assignments = {};
    const routedTo = [];

    for (const rule of scoredRules) {
      const type = rule.provider_type;
      if (assignments[type]) continue; // already assigned
      if (SERVICE_MAP[type] === false) continue; // lead doesn't need this
      if (!SERVICE_MAP.hasOwnProperty(type)) continue; // unknown type

      assignments[type] = rule.provider_id;
      routedTo.push({
        provider_id: rule.provider_id,
        provider_type: type,
        rule_id: rule.id,
        geo_match: rule._geo === 3 ? 'zip' : rule._geo === 2 ? 'county' : 'state',
      });
    }

    const noMatch = routedTo.length === 0;

    // ── 4. Build lead update payload ──
    const updateData = {
      routed_to: routedTo,
      routed_at: new Date().toISOString(),
      crm_status: noMatch ? 'new' : 'routed',
    };

    if (assignments.estate_sale_operator) updateData.assigned_operator_id = assignments.estate_sale_operator;
    if (assignments.realtor) updateData.assigned_agent_id = assignments.realtor;
    if (assignments.cleanout_vendor) updateData.assigned_cleanout_vendor_id = assignments.cleanout_vendor;
    if (assignments.investor) updateData.assigned_investor_id = assignments.investor;

    if (lead_id) {
      await base44.asServiceRole.entities.EstateTransitionLead.update(lead_id, updateData);
    }

    // ── 5. Log activity for each assignment ──
    const activityLogs = [];

    if (lead_id) {
      if (routedTo.length > 0) {
        for (const r of routedTo) {
          activityLogs.push(
            base44.asServiceRole.entities.LeadActivityLog.create({
              lead_id,
              activity_type: 'routed',
              activity_notes: `Routed to ${r.provider_type} (provider: ${r.provider_id}) via ${r.geo_match} match`,
            })
          );
        }
      } else {
        activityLogs.push(
          base44.asServiceRole.entities.LeadActivityLog.create({
            lead_id,
            activity_type: 'other',
            activity_notes: 'No provider match found — assigned to admin review',
          })
        );
      }
      await Promise.all(activityLogs);
    }

    // ── 6. Admin notifications ──
    const notifyReasons = [];
    if (lead_level === 'urgent') notifyReasons.push('Lead is urgent (score 90+)');
    if (noMatch) notifyReasons.push('No provider match exists for this geography/service');
    if (has_real_estate && (needs_realtor || wants_cash_offer)) {
      notifyReasons.push('Lead has real estate and wants realtor or cash offer');
    }

    if (notifyReasons.length > 0) {
      const assignmentSummary = routedTo.length > 0
        ? routedTo.map(r => `${r.provider_type}: ${r.provider_id}`).join(', ')
        : 'None — needs admin assignment';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@estatesalen.com',
        subject: `[EstateSalen] Lead Alert — ${lead_level?.toUpperCase() || 'NEW'} Lead${noMatch ? ' · No Provider Match' : ''}`,
        body: `
A lead requires your attention.

Lead ID: ${lead_id || 'N/A'}
State: ${state || 'N/A'}
County: ${county || 'N/A'}
ZIP: ${zip_code || 'N/A'}
Level: ${lead_level || 'N/A'}
Email: ${email || 'N/A'}

Reasons for alert:
${notifyReasons.map(r => `• ${r}`).join('\n')}

Provider Assignments:
${assignmentSummary}

Review this lead in the admin dashboard → Lead CRM.
        `.trim(),
      });
    }

    return Response.json({
      routed_to: routedTo,
      assignments,
      no_match: noMatch,
      admin_notified: notifyReasons.length > 0,
      notify_reasons: notifyReasons,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});