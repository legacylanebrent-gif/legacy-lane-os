import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Called when a user submits the checklist download form.
 * 1. Saves lead to EstateTransitionLead
 * 2. Logs activity
 * 3. Increments download_count on the LeadMagnet
 * 4. Sends email with checklist content
 * 5. Triggers lead nurture sequence
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      first_name, last_name, email, phone,
      state, county, zip_code,
      life_event_type, magnet_id, magnet_slug,
      source_url
    } = await req.json();

    if (!first_name || !email) {
      return Response.json({ error: 'first_name and email are required' }, { status: 400 });
    }

    // 1. Fetch the lead magnet
    let magnet = null;
    if (magnet_id) {
      const magnets = await base44.asServiceRole.entities.LeadMagnet.filter({ id: magnet_id });
      magnet = magnets[0];
    } else if (magnet_slug) {
      const magnets = await base44.asServiceRole.entities.LeadMagnet.filter({ slug: magnet_slug });
      magnet = magnets[0];
    }

    // 2. Save or update lead
    const existingLeads = await base44.asServiceRole.entities.EstateTransitionLead.filter({ email });
    let lead;
    const leadPayload = {
      first_name,
      last_name: last_name || '',
      email,
      phone: phone || '',
      state: state || '',
      county: county || '',
      zip_code: zip_code || '',
      life_event_type: life_event_type || magnet?.life_event_type || 'other',
      source_url: source_url || '/estate-checklist',
      source_page_type: 'checklist_download',
      crm_status: 'new',
    };

    if (existingLeads[0]) {
      lead = await base44.asServiceRole.entities.EstateTransitionLead.update(existingLeads[0].id, {
        ...leadPayload,
        crm_status: existingLeads[0].crm_status || 'new',
      });
    } else {
      lead = await base44.asServiceRole.entities.EstateTransitionLead.create(leadPayload);
    }

    // 3. Log activity
    await base44.asServiceRole.entities.LeadActivityLog.create({
      lead_id: lead.id,
      activity_type: 'lead_created',
      activity_notes: `Downloaded checklist: ${magnet?.title || life_event_type}`,
    });

    // 4. Increment download count
    if (magnet) {
      await base44.asServiceRole.entities.LeadMagnet.update(magnet.id, {
        download_count: (magnet.download_count || 0) + 1,
      });
    }

    // 5. Send checklist email
    if (magnet?.email_subject && magnet?.email_body) {
      const items = magnet.checklist_items_json || [];
      const checklistText = items.map((item, i) =>
        `${i + 1}. [${item.category}] ${item.task}\n   ${item.description || ''}`
      ).join('\n\n');

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: magnet.email_subject,
        body: `Hi ${first_name},\n\n${magnet.email_body}\n\n---\n\nYOUR CHECKLIST:\n\n${checklistText}\n\n---\n\nIMPORTANT DISCLAIMER: This checklist is for educational purposes only. EstateSalen does not provide legal, tax, or financial advice. Always confirm requirements with your local court or a licensed attorney.\n\nWarm regards,\nThe EstateSalen Team\nhttps://www.estatesalen.com`,
      });
    }

    // 6. Trigger lead nurture sequence via existing function
    await base44.asServiceRole.functions.invoke('onEstateTransitionLeadCreated', {
      event: { type: 'create', entity_name: 'EstateTransitionLead', entity_id: lead.id },
      data: lead,
    });

    return Response.json({
      success: true,
      lead_id: lead.id,
      checklist_items: magnet?.checklist_items_json || [],
      cta_headline: magnet?.cta_headline || 'Need help with any of these steps?',
      cta_body: magnet?.cta_body || 'We connect families with estate sale companies, probate realtors, cleanout vendors, and cash buyers in your area.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});