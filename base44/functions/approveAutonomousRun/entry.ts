import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { run_id } = await req.json();
  if (!run_id) return Response.json({ error: 'run_id is required' }, { status: 400 });

  const now = new Date().toISOString();

  // Update run
  await base44.asServiceRole.entities.AutonomousAgentRun.update(run_id, {
    status: 'approved',
    approved_by: user.full_name || user.email,
    approved_at: now,
    updated_at: now,
  });

  // Approve all pending safe actions
  const actions = await base44.asServiceRole.entities.AutonomousAgentAction.filter({ run_id, status: 'pending' });
  const SAFE_TYPES = [
    'create_admin_task', 'create_campaign_draft', 'create_operator_onboarding_task',
    'create_agent_referral_task', 'create_support_summary', 'create_crm_cleanup_recommendation',
    'create_territory_recommendation', 'create_revenue_report', 'create_followup_sequence_draft',
    'create_landing_page_draft', 'create_email_draft', 'create_sms_draft',
    'update_admin_ai_report', 'create_operator_scorecard', 'create_kpi_snapshot',
  ];

  let approved = 0;
  for (const action of actions) {
    if (SAFE_TYPES.includes(action.action_type)) {
      await base44.asServiceRole.entities.AutonomousAgentAction.update(action.id, {
        status: 'approved',
        approved_by: user.full_name || user.email,
        approved_at: now,
        updated_at: now,
      });
      approved++;
    }
  }

  return Response.json({ success: true, run_id, approved_actions: approved, approved_by: user.full_name || user.email, approved_at: now });
});