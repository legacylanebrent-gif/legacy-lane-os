import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const claimLog = new Map();
function isRateLimited(email) {
  const now = Date.now();
  const reqs = (claimLog.get(email) || []).filter(t => now - t < 3600000);
  reqs.push(now);
  claimLog.set(email, reqs);
  return reqs.length > 3;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { operator_id, contact_name, contact_email, contact_phone, contact_website, territories, plan_choice } = await req.json();

    if (!operator_id || !contact_email || !contact_name) {
      return Response.json({ error: 'operator_id, contact_name, and contact_email are required' }, { status: 400 });
    }

    if (isRateLimited(contact_email)) {
      return Response.json({ error: 'Too many claim attempts. Please try again later.' }, { status: 429 });
    }

    // Master directory is the primary claim source; legacy FutureEstateOperator
    // record ids are still accepted for older flows.
    const master = base44.asServiceRole.entities.MasterOperatorDirectory;
    const feoEntity = base44.asServiceRole.entities.FutureEstateOperator;

    let listing = null;
    let isMaster = false;
    const dirRecs = await master.filter({ id: operator_id });
    if (dirRecs[0]) {
      listing = dirRecs[0];
      isMaster = true;
    } else {
      const ops = await feoEntity.filter({ id: operator_id });
      if (ops[0]) listing = ops[0];
    }
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

    if (listing.claimed_listing && listing.claim_status === 'verified') {
      return Response.json({ error: 'This listing has already been claimed and verified.', already_claimed: true }, { status: 409 });
    }

    const now = new Date().toISOString();
    const isTrial = plan_choice === 'free_trial';
    const trialEnd = isTrial ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null;

    const claimUpdate = {
      claimed_listing: true,
      claimed_date: now,
      claim_status: 'pending',
      claim_verification_status: 'submitted',
      lead_access_enabled: true,
      free_trial_started: isTrial,
      free_trial_start_date: isTrial ? now : null,
      free_trial_end_date: trialEnd,
      subscription_status: isTrial ? 'free_trial' : 'free_lead_access',
      claim_contact_name: contact_name,
      claim_contact_email: contact_email,
      claim_contact_phone: contact_phone || '',
      claim_notes: `Plan: ${plan_choice}. Territories: ${(territories || []).join(', ')}`
    };

    if (isMaster) {
      await master.update(operator_id, claimUpdate);
      // Mirror the claim onto the underlying ES.net record so both tables stay consistent
      const feoId = (listing.source_record_ids || {}).FutureEstateOperator;
      if (feoId) {
        try {
          await feoEntity.update(feoId, claimUpdate);
        } catch (e) {
          console.error('claim mirror to FutureEstateOperator failed:', e.message);
        }
      }
    } else {
      await feoEntity.update(operator_id, claimUpdate);
    }

    // Notify admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@estatesalen.com',
        subject: `New Business Claim: ${listing.company_name} (${listing.city}, ${listing.state})`,
        body: `A new claim has been submitted.\n\nCompany: ${listing.company_name}\nCity: ${listing.city}, ${listing.state}\nContact: ${contact_name}\nEmail: ${contact_email}\nPhone: ${contact_phone || 'N/A'}\nPlan: ${plan_choice}\nTerritories: ${(territories || []).join(', ')}`
      });
    } catch { /* non-blocking */ }

    return Response.json({
      success: true,
      company_name: listing.company_name,
      plan: plan_choice,
      trial_end: trialEnd,
      message: isTrial
        ? 'Your free trial has been activated. Check your email for login instructions.'
        : 'Your listing claim has been submitted. You will begin receiving lead opportunities.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});