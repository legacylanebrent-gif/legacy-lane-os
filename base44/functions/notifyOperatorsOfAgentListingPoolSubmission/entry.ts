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
      return Response.json({ success: true, notified: 0, note: 'No matched operators' });
    }

    let notified = 0;
    for (const operatorId of operatorIds) {
      try {
        const ops = await base44.asServiceRole.entities.User.filter({ id: operatorId });
        const operatorUser = ops[0];
        if (!operatorUser) continue;

        const opName = operatorUser.company_name || operatorUser.full_name || 'Operator';
        const opFirstName = opName.split(' ')[0];

        const subject = `New Agent-Submitted Estate Sale Opportunity in Your Area`;
        const bodyPlain = `Hi ${opFirstName},

A real estate agent has submitted an active listing into the EstateSalen operator opportunity pool for your service area.

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
Reach out to the agent and introduce yourself as a local operator who can help their seller.

Suggested opener:
"Hi ${submission.submitter_first_name || agentName}, I saw that you submitted ${submission.property_address} through EstateSalen. I service that area and help sellers prepare homes for closing by handling estate sales, moving sales, and contents liquidation. I'd be happy to learn more and see if I can help your client."

View this lead in your EstateSalen dashboard.

—
EstateSalen Operator Lead System`;

        const htmlBody = `<p>Hi ${opFirstName.replace(/&/g,'&amp;')},</p>
<p>A real estate agent has submitted an active listing into the EstateSalen operator opportunity pool for your service area.</p>
<div style="background:#f8fafc;border-left:4px solid #f97316;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${(submission.property_address || 'Property').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${address.replace(/&/g,'&amp;')}</p>
  <p style="margin:4px 0;color:#64748b;">👤 ${agentName.replace(/&/g,'&amp;')}${submission.submitter_brokerage ? ' · ' + submission.submitter_brokerage.replace(/&/g,'&amp;') : ''}</p>
  <p style="margin:4px 0;color:#64748b;">📅 Timeline: ${(submission.requested_estate_sale_timeline || 'Not specified').replace(/&/g,'&amp;')}</p>
  <p style="margin:4px 0;color:#64748b;">📦 Contents: ${(submission.home_contents_level || 'Not specified').replace(/&/g,'&amp;')}</p>
</div>
${submission.notes_for_operator ? `<p style="margin:8px 0;color:#475569;"><strong>Agent Notes:</strong> ${submission.notes_for_operator.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>` : ''}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;margin:16px 0;">
  <p style="margin:0 0 8px;color:#166534;font-size:14px;"><strong>Suggested opener:</strong></p>
  <p style="margin:0;color:#14532d;font-size:13px;font-style:italic;">"Hi ${(submission.submitter_first_name || agentName).replace(/&/g,'&amp;')}, I saw that you submitted ${(submission.property_address || '').replace(/&/g,'&amp;')} through EstateSalen. I service that area and would be happy to learn more about how I can help your client."</p>
</div>
<div style="text-align:center;margin:20px 0;">
  <a href="https://estatesalen.com/AgentOperatorPortal" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">View This Lead</a>
</div>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">— EstateSalen Operator Lead System</p>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: operatorUser.email,
          subject,
          body: bodyPlain,
          html: htmlBody
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