import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { submission_id, listing_id } = body;

    // Fetch submission
    const submissions = await base44.asServiceRole.entities.AgentListingPoolSubmission.filter({ id: submission_id });
    const submission = submissions[0];
    if (!submission) return Response.json({ error: 'Submission not found' }, { status: 404 });

    // Fetch listing
    const listings = await base44.asServiceRole.entities.PropstreamREListing.filter({ id: listing_id || submission.propstream_re_listing_id });
    const listing = listings[0];

    const address = `${submission.property_address}, ${submission.city}, ${submission.state} ${submission.zip}`;
    const agentName = `${submission.submitter_first_name} ${submission.submitter_last_name}`.trim() || 'the listing agent';
    const operatorIds = submission.matched_operator_ids || [];

    if (operatorIds.length === 0) {
      return Response.json({ success: true, notified: 0, note: 'No matched Estate Sale Company Owners' });
    }

    let notified = 0;
    for (const operatorId of operatorIds) {
      try {
        const ops = await base44.asServiceRole.entities.User.filter({ id: operatorId });
        const Estate Sale Company Owner = ops[0];
        if (!Estate Sale Company Owner) continue;

        const opName = Estate Sale Company Owner.company_name || Estate Sale Company Owner.full_name || 'Estate Sale Company Owner';
        const opFirstName = opName.split(' ')[0];

        const subject = `New Agent-Submitted Estate Sale Opportunity in Your Area`;
        const body = `Hi ${opFirstName},

A real estate agent has submitted an active listing into the EstateSalen Estate Sale Company Owner opportunity pool for your service area.

PROPERTY
${address}

LISTING AGENT
${agentName}
${submission.submitter_brokerage || ''}
Preferred Contact: ${submission.preferred_contact_method || 'Any'}
Best Time: ${submission.best_contact_time || 'Not specified'}

TIMELINE
${submission.requested_estate_sale_timeline || 'Not specified'}

HELP NEEDED
${submission.requested_help_type || 'Not specified'}

CONTENTS LEVEL
${submission.home_contents_level || 'Not specified'}

SELLER SITUATION
${submission.seller_situation || 'Not specified'}

NOTES FROM AGENT
${submission.notes_for_operator || 'None'}

---
SUGGESTED NEXT STEP
Reach out to the agent and introduce yourself as a local Estate Sale Company Owner who can help their seller.

Suggested opener:
"Hi ${submission.submitter_first_name || agentName}, I saw that you submitted ${submission.property_address} through EstateSalen. I service that area and help sellers prepare homes for closing by handling estate sales, moving sales, and contents liquidation. I'd be happy to learn more and see if I can help your client."

View this lead in your EstateSalen dashboard.

—
EstateSalen Estate Sale Company Owner Lead System`;

        // Store notification on Estate Sale Company Owner record or send via email integration
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: Estate Sale Company Owner.email,
          subject,
          body
        });

        notified++;
      } catch { /* skip individual failures */ }
    }

    // Update submission status
    await base44.asServiceRole.entities.AgentListingPoolSubmission.update(submission.id, {
      submission_status: 'sent_to_operators'
    });
    await base44.asServiceRole.entities.PropstreamREListing.update(
      listing_id || submission.propstream_re_listing_id,
      { agent_submission_status: 'sent_to_operators' }
    );

    return Response.json({ success: true, notified, total_operators: operatorIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});