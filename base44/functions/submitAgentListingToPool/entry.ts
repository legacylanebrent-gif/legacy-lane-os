import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simple submission rate limit by email
const submitLog = new Map();
function isSubmitRateLimited(email) {
  const now = Date.now();
  const hourMs = 3600000;
  const reqs = (submitLog.get(email) || []).filter(t => now - t < hourMs);
  reqs.push(now);
  submitLog.set(email, reqs);
  return reqs.length > 5; // max 5 submissions per email per hour
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { listing_id, agent_info, timeline_info } = await req.json();

    if (!listing_id || !agent_info?.email) {
      return Response.json({ error: 'Listing ID and agent email are required' }, { status: 400 });
    }

    if (isSubmitRateLimited(agent_info.email)) {
      return Response.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    // Fetch the listing
    const allListings = await base44.asServiceRole.entities.PropstreamREListing.filter({ id: listing_id });
    const listing = allListings[0];
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

    // Match territory / Estate Sale Company Owners
    const matchedOps = listing.matched_operator_ids || [];

    // Create submission record
    const submission = await base44.asServiceRole.entities.AgentListingPoolSubmission.create({
      propstream_re_listing_id: listing_id,
      property_address: listing.property_address,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      listing_agent_name_from_propstream: listing.listing_agent_name || '',
      listing_agent_email_from_propstream: listing.listing_agent_email || '',
      submitter_first_name: agent_info.first_name || '',
      submitter_last_name: agent_info.last_name || '',
      submitter_email: agent_info.email,
      submitter_phone: agent_info.phone || '',
      submitter_brokerage: agent_info.brokerage || '',
      preferred_contact_method: agent_info.preferred_contact_method || 'any',
      best_contact_time: agent_info.best_contact_time || '',
      permission_to_share: !!agent_info.permission_to_share,
      requested_estate_sale_timeline: timeline_info.timeline || '',
      requested_help_type: timeline_info.help_type || '',
      home_contents_level: timeline_info.contents_level || '',
      seller_situation: timeline_info.seller_situation || '',
      target_closing_date: timeline_info.target_closing_date || '',
      notes_for_operator: timeline_info.notes || '',
      matched_operator_ids: matchedOps,
      submission_status: matchedOps.length > 0 ? 'matched_to_operators' : 'submitted'
    });

    const now = new Date().toISOString();

    // Update listing record with agent submission data
    await base44.asServiceRole.entities.PropstreamREListing.update(listing_id, {
      agent_submitted_to_pool: true,
      agent_submission_date: now,
      agent_submitter_first_name: agent_info.first_name || '',
      agent_submitter_last_name: agent_info.last_name || '',
      agent_submitter_email: agent_info.email,
      agent_submitter_phone: agent_info.phone || '',
      agent_submitter_brokerage: agent_info.brokerage || '',
      agent_preferred_contact_method: agent_info.preferred_contact_method || 'any',
      agent_best_contact_time: agent_info.best_contact_time || '',
      agent_permission_to_share: !!agent_info.permission_to_share,
      requested_estate_sale_timeline: timeline_info.timeline || '',
      requested_help_type: timeline_info.help_type || '',
      home_contents_level: timeline_info.contents_level || '',
      seller_situation: timeline_info.seller_situation || '',
      target_closing_date: timeline_info.target_closing_date || '',
      operator_notes_from_agent: timeline_info.notes || '',
      agent_submission_status: matchedOps.length > 0 ? 'matched_to_operators' : 'submitted',
      public_submission_source: 'Agent Landing Page'
    });

    // Try to send Estate Sale Company Owner notifications
    try {
      if (matchedOps.length > 0 && agent_info.permission_to_share) {
        await base44.asServiceRole.functions.invoke('notifyOperatorsOfAgentListingPoolSubmission', {
          submission_id: submission.id,
          listing_id
        });
      }
    } catch { /* non-blocking */ }

    return Response.json({
      success: true,
      submission_id: submission.id,
      matched_operators: matchedOps.length,
      territory: listing.territory_name || null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});