import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      lead_source, property_address, city, state, zip, county, territory_id,
      agent_name, brokerage, agent_email, agent_phone,
      timeline, property_condition, cleanout_type, notes, permission_to_share,
      propstream_re_listing_id, agent_listing_submission_id
    } = body;

    if (!property_address || !state) {
      return Response.json({ error: 'property_address and state are required' }, { status: 400 });
    }

    // Find matching cleanout vendors — network members in state
    const allVendors = await base44.asServiceRole.entities.CleanoutVendorProfile.filter({
      membership_status: 'network_member',
      is_active: true
    }, '-created_date', 500);

    const matched = allVendors.filter(v => {
      const stateMatch = !state || !v.service_states?.length || v.service_states.includes(state) || v.state === state;
      return stateMatch && v.lead_notifications_enabled;
    }).slice(0, 20);

    const matchedIds = matched.map(v => v.id);

    // Create lead record
    const lead = await base44.asServiceRole.entities.CleanoutLead.create({
      lead_source: lead_source || 'agent',
      propstream_re_listing_id: propstream_re_listing_id || '',
      agent_listing_submission_id: agent_listing_submission_id || '',
      property_address,
      city: city || '',
      state,
      zip: zip || '',
      county: county || '',
      territory_id: territory_id || '',
      agent_name: agent_name || '',
      brokerage: brokerage || '',
      agent_email: agent_email || '',
      agent_phone: agent_phone || '',
      timeline: timeline || '',
      property_condition: property_condition || '',
      cleanout_type: cleanout_type || '',
      notes: notes || '',
      permission_to_share: !!permission_to_share,
      assigned_vendor_ids: matchedIds,
      lead_status: matchedIds.length > 0 ? 'sent' : 'new',
      notification_sent_at: matchedIds.length > 0 ? new Date().toISOString() : null
    });

    // Notify matched vendors
    let notified = 0;
    if (permission_to_share) {
      for (const vendor of matched) {
        try {
          const firstName = vendor.contact_name?.split(' ')[0] || 'there';
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: vendor.email,
            subject: `New Cleanout Opportunity In Your Service Area — EstateSalen`,
            body: `Hi ${firstName},\n\nA new property cleanout opportunity has been submitted in your service area through EstateSalen.\n\nPROPERTY\n${property_address}\n${city}, ${state} ${zip}\n\nTIMELINE\n${timeline || 'Not specified'}\n\nPROPERTY CONDITION\n${property_condition || 'Not specified'}\n\nCLEANOUT TYPE\n${cleanout_type || 'Not specified'}\n\n${agent_name ? 'SUBMITTED BY\n' + agent_name + (brokerage ? ' · ' + brokerage : '') + '\n' + (agent_email || '') + (agent_phone ? '\n' + agent_phone : '') + '\n\n' : ''}NOTES\n${notes || 'None'}\n\nSUGGESTED NEXT STEP: Contact the agent and schedule an on-site estimate.\n\nSuggested opener: "Hi ${agent_name?.split(' ')[0] || 'there'}, I saw that you submitted ${property_address} through EstateSalen for cleanout assistance. I service that area and would love to schedule an estimate."\n\n— EstateSalen Cleanout Network`,
            html: `<p>Hi ${firstName.replace(/&/g,'&amp;').replace(/</g,'&lt;')},</p>
<p>A new property cleanout opportunity has been submitted in your service area through EstateSalen.</p>
<div style="background:#f8fafc;border-left:4px solid #0891b2;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${typeof property_address === 'string' ? property_address.replace(/&/g,'&amp;').replace(/</g,'&lt;') : 'Property'}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${typeof city === 'string' ? city.replace(/&/g,'&amp;') : ''}, ${typeof state === 'string' ? state.replace(/&/g,'&amp;') : ''} ${typeof zip === 'string' ? zip : ''}</p>
  <p style="margin:4px 0;color:#64748b;">📅 Timeline: ${typeof timeline === 'string' ? timeline.replace(/&/g,'&amp;') || 'Not specified' : 'Not specified'}</p>
  <p style="margin:4px 0;color:#64748b;">🏠 Condition: ${typeof property_condition === 'string' ? property_condition.replace(/&/g,'&amp;') || 'Not specified' : 'Not specified'}</p>
  <p style="margin:4px 0;color:#64748b;">🧹 Type: ${typeof cleanout_type === 'string' ? cleanout_type.replace(/&/g,'&amp;') || 'Not specified' : 'Not specified'}</p>
</div>
${agent_name ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px 18px;margin:12px 0;">
  <p style="margin:0;color:#1e40af;font-size:13px;"><strong>Submitted by:</strong> ${typeof agent_name === 'string' ? agent_name.replace(/&/g,'&amp;').replace(/</g,'&lt;') : ''}${brokerage ? ' · ' + (typeof brokerage === 'string' ? brokerage.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '') : ''}</p>
</div>` : ''}
${notes ? `<p style="margin:8px 0;color:#475569;"><strong>Notes:</strong> ${typeof notes === 'string' ? notes.replace(/&/g,'&amp;').replace(/</g,'&lt;') : ''}</p>` : ''}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;margin:16px 0;">
  <p style="margin:0;color:#166534;font-size:14px;"><strong>Suggested next step:</strong> Contact the agent and schedule an on-site estimate.</p>
</div>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">— EstateSalen Cleanout Network</p>`
          });
          notified++;
        } catch { /* non-blocking */ }
      }
    }

    // Notify admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@estatesalen.com',
        subject: `New Cleanout Lead: ${property_address}, ${state}`,
        body: `Source: ${lead_source || 'agent'}\nAddress: ${property_address}, ${city}, ${state} ${zip}\nType: ${cleanout_type}\nCondition: ${property_condition}\nTimeline: ${timeline}\nAgent: ${agent_name} ${agent_email}\nMatched vendors: ${matchedIds.length}`
      });
    } catch { /* non-blocking */ }

    return Response.json({
      success: true,
      lead_id: lead.id,
      matched_vendors: matchedIds.length,
      notified
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});