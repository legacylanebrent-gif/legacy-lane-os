import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

    // 4. Create ReferralDealAgreement
    const dealId = `DEAL-${Date.now()}-${lead_id.slice(-6).toUpperCase()}`;
    const now = new Date().toISOString();

    const deal = await base44.asServiceRole.entities.ReferralDealAgreement.create({
      deal_id: dealId,
      lead_id,
      property_address: lead.property_address,
      agent_id: user.primary_account_type === 'real_estate_agent' ? user.id : '',
      operator_id: user.primary_account_type === 'estate_sale_operator' ? user.id : '',
      referral_agent_name: 'Brent Cramp',
      referral_agent_brokerage: 'Keller Williams Realty Central Monmouth',
      acceptance_timestamp: now,
      acceptance_ip: req.headers.get('x-forwarded-for') || '',
      contract_generated: true,
      status: 'active',
    });

    // 5. Generate contract document (placeholder — returns mock URL)
    const contractUrl = `https://legacy-lane.s3.amazonaws.com/contracts/${dealId}.pdf`;

    // Update deal with contract URL
    await base44.asServiceRole.entities.ReferralDealAgreement.update(deal.id, {
      contract_url: contractUrl,
    });

    return Response.json({
      success: true,
      deal_id: dealId,
      lead_id,
      contract_url: contractUrl,
      message: 'Lead accepted and deal agreement generated.',
    });
  } catch (error) {
    console.error('Error accepting lead:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});