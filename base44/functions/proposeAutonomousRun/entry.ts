import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const SAFE_ACTIONS = [
  'create_admin_task', 'create_campaign_draft', 'create_operator_onboarding_task',
  'create_agent_referral_task', 'create_support_summary', 'create_crm_cleanup_recommendation',
  'create_territory_recommendation', 'create_revenue_report', 'create_followup_sequence_draft',
  'create_landing_page_draft', 'create_email_draft', 'create_sms_draft',
  'update_admin_ai_report', 'create_operator_scorecard', 'create_kpi_snapshot',
];

const SYSTEM_PROMPT = `You are the Legacy Lane OS Admin Autonomous Operator. You help Brent Cramp and Legacy Lane leadership turn admin commands into structured execution plans and approved administrative actions. You are not a casual chatbot. You operate like a private COO, marketing operations manager, CRM analyst, campaign strategist, and execution planner.

You may only propose actions from this approved safe action list: ${SAFE_ACTIONS.join(', ')}.

For each proposed action, you must produce a payload object with the relevant fields the tool will need to execute.

IMPORTANT RULES:
- Never propose: issue_payment, withdraw_operator_funds, delete_records, sign_contract, provide_legal_opinion, provide_tax_opinion, change_referral_percentage_without_admin, send_email (live), send_sms (live), assign_referral_payout.
- Legacy Lane and Houszu are not real estate brokerages and are not direct recipients of real estate commission.
- Referral compensation language must be handled through properly licensed parties and written agreements reviewed by counsel.
- Flag any compliance concerns in warnings.
- Risk levels: low = safe data/record creation only, medium = content that will be reviewed before use, high = anything touching real people/money/legal.

You must return ONLY valid JSON in this exact shape:
{
  "run_title": "short title",
  "summary": "2-3 sentence plan overview",
  "risk_level": "low|medium|high",
  "proposed_actions": [
    {
      "action_type": "one of the approved types",
      "title": "action title",
      "description": "what this action will do",
      "target_entity": "entity name to create/update",
      "risk_level": "low|medium|high",
      "requires_approval": true,
      "payload": { "field": "value" }
    }
  ],
  "warnings": ["any compliance or risk warnings"],
  "approval_required": true
}`;

async function safeLoad(base44, entityName, limit = 50) {
  try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
  catch (_) { return []; }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { command, execution_scope, context_toggles = {} } = body;
  if (!command) return Response.json({ error: 'command is required' }, { status: 400 });

  // Load settings
  let settings = null;
  try {
    const s = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
    settings = s[0] || null;
  } catch (_) {}

  // Build context
  const ctx = {};
  if (context_toggles.operators) { const d = await safeLoad(base44, 'OperatorTerritoryProfile'); ctx.operators = { count: d.length, sample: d.slice(0, 5).map(r => ({ company: r.company_name, counties: r.service_counties, status: r.status })) }; }
  if (context_toggles.leads) { const d = await safeLoad(base44, 'Lead'); ctx.leads = { count: d.length, by_source: d.reduce((a, r) => { a[r.source] = (a[r.source] || 0) + 1; return a; }, {}) }; }

  const userPrompt = `ADMIN COMMAND: ${command}
EXECUTION SCOPE: ${execution_scope || 'Full plan'}
SETTINGS: ${JSON.stringify({ default_market: settings?.default_market, monthly_revenue_target: settings?.monthly_revenue_target, target_operator_count: settings?.target_operator_count, preferred_growth_goal: settings?.preferred_growth_goal })}
CONTEXT: ${JSON.stringify(ctx).slice(0, 3000)}

Create an execution plan. Be specific. Produce real content in payloads (actual email copy, actual task titles, actual campaign details). Return only valid JSON.`;

  let aiPlan;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 4000,
    });
    aiPlan = JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    return Response.json({ error: 'AI error: ' + err.message }, { status: 500 });
  }

  const now = new Date().toISOString();

  // Save run record
  const runRecord = await base44.asServiceRole.entities.AutonomousAgentRun.create({
    title: aiPlan.run_title || 'Autonomous Run',
    admin_command: command,
    status: 'awaiting_approval',
    execution_mode: execution_scope || 'Full plan',
    risk_level: aiPlan.risk_level || 'low',
    requires_approval: true,
    summary: aiPlan.summary || '',
    proposed_actions_json: { actions: aiPlan.proposed_actions || [] },
    warnings: aiPlan.warnings || [],
    result_json: {},
    created_by: user.full_name || '',
    created_by_email: user.email || '',
    created_at: now,
    updated_at: now,
  });

  // Save proposed actions
  const actionRecords = [];
  for (const a of (aiPlan.proposed_actions || [])) {
    const rec = await base44.asServiceRole.entities.AutonomousAgentAction.create({
      run_id: runRecord.id,
      action_type: a.action_type,
      title: a.title,
      description: a.description || '',
      target_entity: a.target_entity || '',
      payload: a.payload || {},
      status: 'pending',
      risk_level: a.risk_level || 'low',
      requires_approval: a.requires_approval !== false,
      created_at: now,
      updated_at: now,
    });
    actionRecords.push(rec);
  }

  return Response.json({
    success: true,
    run_id: runRecord.id,
    run_title: aiPlan.run_title,
    summary: aiPlan.summary,
    risk_level: aiPlan.risk_level,
    proposed_actions: actionRecords,
    warnings: aiPlan.warnings || [],
    approval_required: true,
  });
});