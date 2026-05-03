import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { lead_id, violation_type, agent_id, operator_id, description } = await req.json();

    if (!lead_id || !violation_type || !agent_id || !operator_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the lead
    const leads = await base44.asServiceRole.entities.ReferralLead.filter({ id: lead_id });
    if (leads.length === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leads[0];

    // Create violation log
    const violationLog = await base44.asServiceRole.entities.LeadViolationLog.create({
      lead_id,
      property_address: lead.property_address,
      client_name: lead.client_name,
      introduced_by_user_id: lead.source_user_id,
      introduced_by_name: lead.source_user_id,
      introduced_timestamp: lead.created_date,
      agent_id,
      operator_id,
      violation_type,
      violation_description: description || `Detected ${violation_type} violation`,
      detected_timestamp: new Date().toISOString(),
      detected_by: user.id,
      status: 'flagged',
      enforcement_actions: [],
    });

    // Freeze credits for both parties
    const agentUser = await base44.asServiceRole.entities.User.filter({ id: agent_id });
    const operatorUser = await base44.asServiceRole.entities.User.filter({ id: operator_id });

    let enforcementActions = ['flagged'];

    // Get operator AI credit account if exists
    if (operatorUser.length > 0) {
      const creditAccounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({
        operator_id,
      });
      if (creditAccounts.length > 0) {
        await base44.asServiceRole.entities.OperatorAICreditAccount.update(creditAccounts[0].id, {
          credits_frozen: true,
        });
        enforcementActions.push('frozen_credits');
      }
    }

    // Create liquidated damages record
    const damagesAmount = 5000 * 100; // $5000 in cents
    const damages = await base44.asServiceRole.entities.LiquidatedDamages.create({
      violation_id: violationLog.id,
      lead_id,
      party_user_id: operator_id,
      party_type: 'operator',
      property_address: lead.property_address,
      amount: damagesAmount,
      reason: `${violation_type}: Non-circumvention violation on property ${lead.property_address}`,
      status: 'pending',
    });

    enforcementActions.push('liquidated_damages');

    // Update violation log with enforcement actions
    await base44.asServiceRole.entities.LeadViolationLog.update(violationLog.id, {
      status: 'confirmed',
      enforcement_actions: enforcementActions,
    });

    // Log to admin
    console.log(`[VIOLATION] Lead: ${lead_id}, Type: ${violation_type}, Actions: ${enforcementActions.join(', ')}`);

    return Response.json({
      success: true,
      violation_id: violationLog.id,
      damages_id: damages.id,
      enforcement_actions: enforcementActions,
      damages_amount: damagesAmount / 100,
      message: `Violation detected and enforcement actions applied: ${enforcementActions.join(', ')}`,
    });
  } catch (error) {
    console.error('Error detecting violation:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});