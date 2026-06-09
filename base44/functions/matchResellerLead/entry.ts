import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { submission_id, listing_id, lead_type, property_address, city, state, zip, county,
            agent_name, agent_email, agent_phone, seller_timeline, inventory_description,
            home_contents_level, seller_situation, notes } = await req.json();

    // Determine lead type via AI if not provided
    let resolvedLeadType = lead_type;
    if (!resolvedLeadType) {
      const situationText = `${seller_situation || ''} ${home_contents_level || ''} ${seller_timeline || ''}`.toLowerCase();
      if (situationText.includes('buyout') || situationText.includes('speed') || situationText.includes('immediately') || situationText.includes('all contents')) {
        resolvedLeadType = 'buyout';
      } else if (situationText.includes('liquidat') || situationText.includes('removal') || situationText.includes('cleanout')) {
        resolvedLeadType = 'liquidation';
      } else {
        resolvedLeadType = 'online_reseller';
      }
    }

    // Find matching resellers — active network members in the same state
    const allResellers = await base44.asServiceRole.entities.ResellerProfile.filter({
      membership_status: 'network_member',
      is_active: true
    }, '-created_date', 500);

    const matched = allResellers.filter(r => {
      const stateMatch = !state || !r.service_states?.length || r.service_states.includes(state) || r.state === state;
      const leadTypeMatch = !r.lead_types?.length || r.lead_types.includes(resolvedLeadType) || r.lead_types.includes('estate_sale_backup');
      return stateMatch && leadTypeMatch && r.lead_notifications_enabled;
    }).slice(0, 20);

    const matchedIds = matched.map(r => r.id);

    // Create the ResellerLead record
    const lead = await base44.asServiceRole.entities.ResellerLead.create({
      lead_source: submission_id ? 'agent' : 'propstream',
      lead_type: resolvedLeadType,
      propstream_re_listing_id: listing_id || '',
      agent_listing_submission_id: submission_id || '',
      property_address: property_address || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
      county: county || '',
      agent_name: agent_name || '',
      agent_email: agent_email || '',
      agent_phone: agent_phone || '',
      seller_timeline: seller_timeline || '',
      inventory_description: inventory_description || '',
      home_contents_level: home_contents_level || '',
      seller_situation: seller_situation || '',
      notes: notes || '',
      assigned_reseller_ids: matchedIds,
      lead_status: matchedIds.length > 0 ? 'sent' : 'new',
      notification_sent_at: matchedIds.length > 0 ? new Date().toISOString() : null
    });

    // Notify matched resellers
    let notified = 0;
    for (const reseller of matched) {
      try {
        const firstName = reseller.contact_name?.split(' ')[0] || 'there';
        const typeLabel = resolvedLeadType === 'buyout' ? 'Buyout Opportunity' : resolvedLeadType === 'liquidation' ? 'Liquidation Opportunity' : 'Online Reseller Opportunity';

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: reseller.email,
          subject: `New ${typeLabel} in Your Area — EstateSalen Reseller Network`,
          body: `Hi ${firstName},

A new ${typeLabel.toLowerCase()} has been submitted in your service area through the EstateSalen Reseller Network.

PROPERTY
${property_address}
${city}, ${state} ${zip}

OPPORTUNITY TYPE
${resolvedLeadType.replace('_', ' ').toUpperCase()}

${agent_name ? `SUBMITTED BY\n${agent_name}${agent_email ? `\n${agent_email}` : ''}${agent_phone ? `\n${agent_phone}` : ''}` : ''}

TIMELINE
${seller_timeline || 'Not specified'}

CONTENTS
${home_contents_level || 'Not specified'}

SITUATION
${seller_situation || 'Not specified'}

NOTES
${notes || 'None'}

---
To respond to this opportunity, log in to your EstateSalen dashboard or reply to the submitting agent directly.

—
EstateSalen Reseller Network`
        });
        notified++;
      } catch { /* non-blocking */ }
    }

    return Response.json({
      success: true,
      lead_id: lead.id,
      lead_type: resolvedLeadType,
      matched_resellers: matchedIds.length,
      notified
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});