// Accept a Referral Exchange lead and create a deal agreement.
//
// Referral Rebuild Phase 1:
//   - COMPENSATED ACCEPTANCE IS DISABLED while the referral eligibility system
//     is absent (centrally enforced via shared/referralCompensationControl,
//     checked BEFORE any read or write). No new lead acceptances, deal
//     agreements, or compensation entitlements are created. Existing
//     documents and status history are preserved.
//   - The mock contract URL is REMOVED. Generating a record never marks an
//     agreement signed, executed, or valid, and contract_generated stays
//     false until a real executed document exists (none is produced here).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  LEGACY_REFERRAL_COMPENSATION_ENABLED,
  LEGACY_COMPENSATION_PAUSED_CODE,
} from '../../shared/referralCompensationControl.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Phase 1 gate — compensated acceptance paused BEFORE any read or write.
    if (!LEGACY_REFERRAL_COMPENSATION_ENABLED) {
      return Response.json(
        {
          success: false,
          error: LEGACY_COMPENSATION_PAUSED_CODE,
          message:
            'Referral Exchange lead acceptance is paused while the referral eligibility system is rebuilt. No new deal agreements or compensation entitlements are created. Existing agreements and history are preserved.'
        },
        { status: 409 }
      );
    }

    const { lead_id } = await req.json();

    if (!lead_id) {
      return Response.json({ error: 'lead_id required' }, { status: 400 });
    }

    // 1. Check MasterReferralAgreement is active
    const agreements = await base44.asServiceRole.entities.MasterReferralAgreement.filter({
      user_id: user.id,
      status: 'active',
    });

    if (agreements.length === 0) {
      return Response.json(
        { error: 'No active referral agreement found. Please sign the Master Referral Participation Agreement first.' },
        { status: 403 }
      );
    }

    // 2. Get the lead
    const leads = await base44.asServiceRole.entities.ReferralLead.filter({
      id: lead_id,
    });

    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leads[0];

    // 3. Update ReferralLead status to accepted
    await base44.asServiceRole.entities.ReferralLead.update(lead_id, {
      status: 'accepted',
    });

    // 4. Create ReferralDealAgreement — a RECORD of acceptance only.
    //    No contract document is generated here; contract_generated stays
    //    false and no contract_url is written. A generated record never
    //    marks an agreement signed, executed, or valid.
    const dealId = `DEAL-${Date.now()}-${lead_id.slice(-6).toUpperCase()}`;
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.ReferralDealAgreement.create({
      deal_id: dealId,
      lead_id,
      property_address: lead.property_address,
      agent_id: user.primary_account_type === 'real_estate_agent' ? user.id : '',
      operator_id: user.primary_account_type === 'estate_sale_operator' ? user.id : '',
      referral_agent_name: 'Brent Cramp',
      referral_agent_brokerage: 'Keller Williams Realty Central Monmouth',
      acceptance_timestamp: now,
      acceptance_ip: req.headers.get('x-forwarded-for') || '',
      contract_generated: false,
      status: 'active',
    });

    return Response.json({
      success: true,
      deal_id: dealId,
      lead_id,
      message:
        'Lead accepted and deal agreement record created. No contract document has been generated; this record does not represent a signed or executed agreement.',
    });
  } catch (error) {
    console.error('Error accepting lead:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});