import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { listing, operator_ids } = await req.json();
    if (!listing || !operator_ids || operator_ids.length === 0) {
      return Response.json({ error: 'Listing and operator_ids required' }, { status: 400 });
    }

    const address = `${listing.property_address}, ${listing.city}, ${listing.state} ${listing.zip}`;
    const scoreReasons = (listing.score_reasons || []).slice(0, 5).map(r => `• ${r}`).join('\n');

    const sentAt = new Date().toISOString();
    const sends = [];

    for (const operatorId of operator_ids) {
      // Get operator details
      let operators = [];
      try {
        operators = await base44.asServiceRole.entities.User.filter({ id: operatorId });
      } catch {}
      const operator = operators[0];
      const opName = operator?.company_name || operator?.full_name || 'Estate Sale Operator';

      const subject = `New Real Estate Listing Lead in Your Service Area`;
      const body = `Hi ${opName.split(' ')[0]},

A new real estate listing has been imported into EstateSalen that matches your service territory.

PROPERTY
${address}
${listing.county ? `${listing.county} County` : ''}

LISTING AGENT
${listing.listing_agent_name || 'Not available'}
${listing.listing_brokerage ? listing.listing_brokerage : ''}
${listing.listing_agent_email ? listing.listing_agent_email : ''}
${listing.listing_agent_phone ? listing.listing_agent_phone : ''}

ESTATE SALE OPPORTUNITY SCORE: ${listing.estate_sale_score} / 100 — ${listing.estate_sale_score_label}

Why this may be a good opportunity:
${scoreReasons || 'See listing details in EstateSalen.'}

SUGGESTED NEXT STEP
Reach out to the listing agent and ask whether their seller needs help with an estate sale, moving sale, downsizing sale, or cleanout before closing.

Suggested opener:
"Hi ${listing.listing_agent_name ? listing.listing_agent_name.split(' ')[0] : 'there'}, I saw your listing at ${listing.property_address}. I help homeowners prepare properties for sale by managing estate sales, downsizing sales, and contents liquidation. If your seller needs help clearing or selling the contents before closing, I'd be happy to be a resource."

Please update the lead status in EstateSalen after you make contact.

—
EstateSalen Lead Distribution`;

      const send = await base44.asServiceRole.entities.OperatorListingLeadSend.create({
        propstream_re_listing_id: listing.id,
        operator_id: operatorId,
        operator_name: opName,
        territory_id: listing.territory_id || '',
        sent_by: user.id,
        sent_at: sentAt,
        operator_response_status: 'pending',
        agent_contact_status: 'not_contacted'
      });
      sends.push(send.id);

      // Store message on listing (update for last operator message)
      await base44.asServiceRole.entities.PropstreamREListing.update(listing.id, {
        operator_message_subject: subject,
        operator_message_body: body,
        operator_status: 'sent_to_operator'
      });
    }

    return Response.json({ success: true, sends_created: sends.length, send_ids: sends });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});