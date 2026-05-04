import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function logTool(base44, run_id, action_id, tool_name, input_json, output_json, status, error_message) {
  try {
    await base44.asServiceRole.entities.AutonomousAgentToolLog.create({
      run_id, action_id, tool_name, input_json, output_json, status,
      error_message: error_message || '',
      created_at: new Date().toISOString(),
    });
  } catch (_) {}
}

async function executeTool(base44, action, user) {
  const p = action.payload || {};
  const now = new Date().toISOString();

  switch (action.action_type) {
    case 'create_admin_task':
    case 'create_operator_onboarding_task':
    case 'create_agent_referral_task':
    case 'create_support_summary':
    case 'create_crm_cleanup_recommendation': {
      const record = await base44.asServiceRole.entities.AdminTask.create({
        title: p.title || action.title,
        description: p.description || action.description || '',
        category: p.category || action.action_type.replace('create_', '').replace(/_/g, ' '),
        priority: p.priority || 'medium',
        status: 'open',
        source: 'Admin AI Operator',
        created_by: user.email,
        created_at: now,
        updated_at: now,
      });
      return { created: 'AdminTask', id: record.id, title: record.title };
    }

    case 'create_campaign_draft':
    case 'create_followup_sequence_draft':
    case 'create_landing_page_draft': {
      const record = await base44.asServiceRole.entities.CampaignDraft.create({
        title: p.title || action.title,
        audience: p.audience || '',
        campaign_type: p.campaign_type || 'general',
        objective: p.objective || '',
        email_copy: p.email_copy || '',
        sms_copy: p.sms_copy || '',
        landing_page_copy: p.landing_page_copy || '',
        followup_sequence: p.followup_sequence || '',
        status: 'draft',
        source: 'Admin AI Operator',
        created_by: user.email,
        created_at: now,
      });
      return { created: 'CampaignDraft', id: record.id, title: record.title };
    }

    case 'create_email_draft': {
      const record = await base44.asServiceRole.entities.AdminMessageDraft.create({
        title: p.title || action.title,
        message_type: 'email',
        audience: p.audience || '',
        subject: p.subject || '',
        body: p.body || p.email_copy || '',
        status: 'draft',
        source: 'Admin AI Operator',
        created_by: user.email,
        created_at: now,
      });
      return { created: 'AdminMessageDraft', id: record.id, title: record.title };
    }

    case 'create_sms_draft': {
      const record = await base44.asServiceRole.entities.AdminMessageDraft.create({
        title: p.title || action.title,
        message_type: 'sms',
        audience: p.audience || '',
        subject: '',
        body: p.body || p.sms_copy || '',
        status: 'draft',
        source: 'Admin AI Operator',
        created_by: user.email,
        created_at: now,
      });
      return { created: 'AdminMessageDraft', id: record.id, title: record.title };
    }

    case 'create_revenue_report':
    case 'update_admin_ai_report': {
      const record = await base44.asServiceRole.entities.AdminAIReport.create({
        title: p.title || action.title,
        command: p.command || action.description || '',
        command_type: p.command_type || 'Revenue Analysis',
        executive_summary: p.executive_summary || p.summary || action.description || '',
        recommended_actions: p.recommended_actions || '',
        kpi_targets: p.kpi_targets || '',
        next_steps: p.next_steps || '',
        status: 'draft',
        created_by: user.full_name || '',
        created_by_email: user.email || '',
        created_at: now,
        updated_at: now,
      });
      return { created: 'AdminAIReport', id: record.id, title: record.title };
    }

    case 'create_kpi_snapshot': {
      const record = await base44.asServiceRole.entities.KPISnapshot.create({
        title: p.title || action.title,
        period: p.period || new Date().toISOString().slice(0, 7),
        operator_count: p.operator_count || 0,
        active_subscriptions: p.active_subscriptions || 0,
        monthly_recurring_revenue: p.monthly_recurring_revenue || 0,
        referral_pipeline_value: p.referral_pipeline_value || 0,
        campaign_count: p.campaign_count || 0,
        notes: p.notes || action.description || '',
        source: 'Admin AI Operator',
        created_at: now,
      });
      return { created: 'KPISnapshot', id: record.id, title: record.title };
    }

    case 'create_operator_scorecard': {
      const record = await base44.asServiceRole.entities.OperatorScorecard.create({
        operator_id: p.operator_id || '',
        operator_name: p.operator_name || 'Unknown',
        score: p.score || 0,
        strengths: p.strengths || '',
        weaknesses: p.weaknesses || '',
        recommended_actions: p.recommended_actions || action.description || '',
        source: 'Admin AI Operator',
        created_at: now,
      });
      return { created: 'OperatorScorecard', id: record.id, operator_name: record.operator_name };
    }

    case 'create_territory_recommendation': {
      const record = await base44.asServiceRole.entities.TerritoryRecommendation.create({
        territory_name: p.territory_name || action.title,
        state: p.state || '',
        county: p.county || '',
        opportunity_score: p.opportunity_score || 0,
        reason: p.reason || action.description || '',
        recommended_actions: p.recommended_actions || '',
        source: 'Admin AI Operator',
        created_at: now,
      });
      return { created: 'TerritoryRecommendation', id: record.id, territory_name: record.territory_name };
    }

    default:
      return { skipped: true, reason: `Unknown or unsupported action type: ${action.action_type}` };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { run_id } = await req.json();
  if (!run_id) return Response.json({ error: 'run_id is required' }, { status: 400 });

  const now = new Date().toISOString();

  // Load and validate run
  const runs = await base44.asServiceRole.entities.AutonomousAgentRun.filter({ id: run_id });
  const run = runs[0];
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
  if (run.status !== 'approved') return Response.json({ error: `Run must be approved first (current: ${run.status})` }, { status: 400 });

  // Mark running
  await base44.asServiceRole.entities.AutonomousAgentRun.update(run_id, { status: 'running', started_at: now, updated_at: now });

  // Load approved actions
  const actions = await base44.asServiceRole.entities.AutonomousAgentAction.filter({ run_id, status: 'approved' });

  const executionLog = [];
  let successCount = 0;
  let failCount = 0;

  for (const action of actions) {
    const actionNow = new Date().toISOString();
    await base44.asServiceRole.entities.AutonomousAgentAction.update(action.id, { status: 'running', executed_at: actionNow, updated_at: actionNow });

    try {
      const result = await executeTool(base44, action, user);
      await base44.asServiceRole.entities.AutonomousAgentAction.update(action.id, {
        status: result.skipped ? 'skipped' : 'completed',
        result,
        updated_at: new Date().toISOString(),
      });
      await logTool(base44, run_id, action.id, action.action_type, action.payload, result, result.skipped ? 'skipped' : 'success', null);
      executionLog.push({ action: action.title, status: result.skipped ? 'skipped' : 'completed', result });
      if (!result.skipped) successCount++;
    } catch (err) {
      await base44.asServiceRole.entities.AutonomousAgentAction.update(action.id, {
        status: 'failed',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      });
      await logTool(base44, run_id, action.id, action.action_type, action.payload, null, 'failed', err.message);
      executionLog.push({ action: action.title, status: 'failed', error: err.message });
      failCount++;
    }
  }

  const completedAt = new Date().toISOString();
  const summary = `Execution complete. ${successCount} actions succeeded, ${failCount} failed, ${actions.length - successCount - failCount} skipped.`;

  await base44.asServiceRole.entities.AutonomousAgentRun.update(run_id, {
    status: failCount === actions.length ? 'failed' : 'completed',
    completed_at: completedAt,
    summary,
    result_json: { execution_log: executionLog, success_count: successCount, fail_count: failCount },
    updated_at: completedAt,
  });

  return Response.json({ success: true, run_id, summary, execution_log: executionLog, success_count: successCount, fail_count: failCount });
});