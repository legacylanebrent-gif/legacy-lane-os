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
          body: `Hi ${firstName},\n\nA new ${typeLabel.toLowerCase()} has been submitted in your service area through the EstateSalen Reseller Network.\n\nPROPERTY\n${property_address}\n${city}, ${state} ${zip}\n\nOPPORTUNITY TYPE\n${resolvedLeadType.replace('_', ' ').toUpperCase()}\n\n${agent_name ? 'SUBMITTED BY\n' + agent_name + (agent_email ? '\n' + agent_email : '') + (agent_phone ? '\n' + agent_phone : '') + '\n\n' : ''}TIMELINE\n${seller_timeline || 'Not specified'}\n\nCONTENTS\n${home_contents_level || 'Not specified'}\n\nSITUATION\n${seller_situation || 'Not specified'}\n\nNOTES\n${notes || 'None'}\n\nTo respond to this opportunity, log in to your EstateSalen dashboard or reply to the submitting agent directly.\n\n— EstateSalen Reseller Network`,
          html: `<p>Hi ${firstName.replace(/&/g,'&amp;').replace(/</g,'&lt;')},</p>
<p>A new ${typeLabel.toLowerCase()} has been submitted in your service area through the EstateSalen Reseller Network.</p>
<div style="background:#f8fafc;border-left:4px solid #f97316;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${typeof property_address === 'string' ? property_address.replace(/&/g,'&amp;').replace(/</g,'&lt;') : 'Property'}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${typeof city === 'string' ? city.replace(/&/g,'&amp;') : ''}, ${typeof state === 'string' ? state.replace(/&/g,'&amp;') : ''} ${typeof zip === 'string' ? zip : ''}</p>
  <p style="margin:4px 0;color:#64748b;">🎯 ${resolvedLeadType.replace('_', ' ').toUpperCase()}</p>
  <p style="margin:4px 0;color:#64748b;">📅 Timeline: ${typeof seller_timeline === 'string' ? seller_timeline.replace(/&/g,'&amp;') || 'Not specified' : 'Not specified'}</p>
  <p style="margin:4px 0;color:#64748b;">📦 Contents: ${typeof home_contents_level === 'string' ? home_contents_level.replace(/&/g,'&amp;') || 'Not specified' : 'Not specified'}</p>
</div>
${agent_name ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px 18px;margin:12px 0;">
  <p style="margin:0;color:#1e40af;font-size:13px;"><strong>Submitted by:</strong> ${typeof agent_name === 'string' ? agent_name.replace(/&/g,'&amp;').replace(/</g,'&lt;') : ''}</p>
</div>` : ''}
${notes ? `<p style="margin:8px 0;color:#475569;"><strong>Notes:</strong> ${typeof notes === 'string' ? notes.replace(/&/g,'&amp;').replace(/</g,'&lt;') : ''}</p>` : ''}
<div style="text-align:center;margin:20px 0;">
  <a href="https://estatesalen.com/MyResellerLeads" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">View in Dashboard</a>
</div>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">— EstateSalen Reseller Network</p>`
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