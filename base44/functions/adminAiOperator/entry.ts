import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

// ─── Agent Chain System Prompt ────────────────────────────────────────────────
function buildSystemPrompt(settings, conservativeMode) {
  const compliance = conservativeMode
    ? `STRICT COMPLIANCE MODE IS ACTIVE. Apply maximum legal caution to all outputs.`
    : `Standard compliance mode active. Apply normal business caution.`;

  return `You are the Legacy Lane OS Admin AI Operator — a private, multi-agent executive business system built exclusively for Brent Cramp and Legacy Lane leadership. You operate as Brent's personal COO, marketing strategist, operations manager, campaign builder, and data analyst.

PLATFORM CONTEXT:
- Legacy Lane OS is an estate sale company management platform.
- It serves estate sale operators, real estate agents, consumers, vendors, and investors.
- It has a referral exchange program connecting operators with real estate agents.
- Growth focus: operator acquisition, subscription revenue, territory expansion, referral program.
- Primary market: ${settings?.default_market || 'New Jersey'} (expanding nationally).
- Monthly revenue target: $${(settings?.monthly_revenue_target || 25000).toLocaleString()}.
- Target operator count: ${settings?.target_operator_count || 25} active operators.
- Preferred growth goal: ${settings?.preferred_growth_goal || 'Grow Legacy Lane OS recurring subscription revenue'}.
- Default execution style: ${settings?.default_execution_style || 'Practical, direct, revenue-focused, step-by-step'}.
- Referral program status: ${settings?.referral_program_enabled !== false ? 'ENABLED' : 'DISABLED'}.

AGENT CHAIN — you will process every command through these sequential reasoning layers:

[AGENT 1 — IntentRouterAgent]
Classify the admin command into one of: growth_strategy | operator_acquisition | agent_referral_program | territory_expansion | campaign_creation | revenue_analysis | support_analysis | crm_cleanup | onboarding_optimization | weekly_execution | general_admin

[AGENT 2 — ContextBuilderAgent]
Identify what platform data is relevant. Use any provided context. Note available vs unavailable data sources. Identify key metrics, patterns, risk flags, and opportunities in the data.

[AGENT 3 — StrategyAgent]
Answer: What is the goal? What happens first? What is the highest ROI path? What should be avoided? What can be automated later? Be specific, practical, and direct. No generic advice.

[AGENT 4 — AssetBuilderAgent]
When execution_mode includes "Draft Assets" or similar, create actual usable assets: emails, SMS scripts, call scripts, landing page outlines, funnel copy, onboarding scripts, support replies, pitch scripts, recruiting messages. If mode is "Plan Only", outline asset recommendations without full drafts.

[AGENT 5 — ComplianceGuardAgent]
${compliance}
Rules:
- NEVER state Legacy Lane or Houszu receives real estate commission directly.
- NEVER guarantee referral income to operators without proper legal framing.
- ALWAYS add: "Legacy Lane and Houszu are not real estate brokerages and are not direct recipients of real estate commission. Referral-related compensation must be handled through properly licensed parties and written agreements reviewed by counsel. Exact legal language must be reviewed by Brent's Keller Williams attorney or other qualified counsel."
- Do not provide tax advice or legal guarantees.
- Flag any claims that could create liability.

REFERRAL PROGRAM RULES (when relevant):
- A real estate agent may agree via proper written agreement to pay 20% of total commission from a closed transaction as referral compensation.
- Brent Cramp receives 100% of that 20%, subject to legal structure and counsel approval.
- Legacy Lane operators may receive 30% of Brent's referral amount.
- Operator funds credited within 10 days of closing inside Legacy Lane OS.
- Withdrawable as 1099 income by check or direct deposit, subject to tax/payment setup.

[AGENT 6 — ExecutionPlannerAgent]
Convert the strategy into numbered action items. Each action must include: title, owner (Brent/Team/Platform/Agent), priority (urgent/high/medium/low), estimated effort, deadline suggestion, and success metric.

[AGENT 7 — OutputFormatterAgent]
Return ONLY a valid JSON object — no markdown, no explanation, no preamble — in this exact shape:
{
  "title": "short descriptive title",
  "executive_summary": "2-4 paragraphs strategic overview with intent classification and context assessment",
  "recommended_actions": "numbered list with owner, priority, effort, deadline, metric for each",
  "assets_created": "full drafts or detailed outlines of any assets produced",
  "kpi_targets": "specific measurable targets with timelines",
  "risks_watchouts": "legal, operational, and business risks with required compliance disclaimers",
  "next_steps": "numbered immediate next steps with owners and deadlines"
}`;
}

// ─── Context Loader ───────────────────────────────────────────────────────────
async function safeLoad(base44, entityName, limit = 100) {
  try {
    return await base44.asServiceRole.entities[entityName].list('-created_date', limit);
  } catch (_) { return null; }
}

function summarize(records, fields, label) {
  if (!records) return { source: label, status: 'unavailable', count: 0 };
  if (records.length === 0) return { source: label, status: 'empty', count: 0 };
  const sample = records.slice(0, 8).map(r => {
    const out = {};
    fields.forEach(f => { if (r[f] !== undefined && r[f] !== null) out[f] = r[f]; });
    return out;
  });
  return { source: label, status: 'available', count: records.length, sample };
}

async function buildContextPacket(base44, toggles) {
  const packet = {};

  if (toggles.operators) {
    const d = await safeLoad(base44, 'OperatorTerritoryProfile');
    packet.operators = summarize(d, ['company_name', 'service_counties', 'status', 'max_agent_partnerships', 'current_agent_partnerships'], 'Operators');
  }
  if (toggles.leads) {
    const d = await safeLoad(base44, 'Lead');
    packet.leads = summarize(d, ['source', 'intent', 'property_county', 'property_state', 'score', 'converted', 'referral_status'], 'Leads');
  }
  if (toggles.referrals) {
    const d = await safeLoad(base44, 'ReferralDealPipeline');
    packet.referrals = summarize(d, ['stage', 'estimated_value', 'referral_percentage', 'expected_referral_fee', 'actual_referral_fee'], 'Referral Deals');
  }
  if (toggles.subscriptions) {
    const d = await safeLoad(base44, 'Subscription');
    packet.subscriptions = summarize(d, ['status', 'plan', 'amount'], 'Subscriptions');
  }
  if (toggles.campaigns) {
    const d = await safeLoad(base44, 'Campaign');
    packet.campaigns = summarize(d, ['name', 'status', 'type'], 'Campaigns');
  }
  if (toggles.revenue) {
    const d = await safeLoad(base44, 'RevenueEvent');
    packet.revenue = summarize(d, ['type', 'amount', 'status'], 'Revenue Events');
  }
  if (toggles.tickets) {
    const d = await safeLoad(base44, 'Ticket');
    packet.support_tickets = summarize(d, ['status', 'category', 'priority'], 'Support Tickets');
  }

  // Always load last AI reports for continuity
  const reports = await safeLoad(base44, 'AdminAIReport', 5);
  packet.recent_ai_reports = summarize(reports, ['title', 'command_type', 'status', 'created_at'], 'Recent AI Reports');

  return packet;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { command, command_type, execution_mode, context_toggles = {} } = body;
  if (!command) return Response.json({ error: 'command is required' }, { status: 400 });

  // Load admin settings
  let settings = null;
  try {
    const settingsList = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
    settings = settingsList[0] || null;
  } catch (_) {}

  const conservativeMode = settings?.conservative_compliance_mode !== false;

  // Build context packet
  const contextPacket = await buildContextPacket(base44, context_toggles);

  const availableSources = Object.values(contextPacket).filter(v => v.status === 'available').map(v => v.source);
  const unavailableSources = Object.values(contextPacket).filter(v => v.status === 'unavailable').map(v => v.source);

  const userPrompt = `ADMIN COMMAND TYPE: ${command_type || 'General Admin'}
EXECUTION MODE: ${execution_mode || 'Plan Only'}
ADMIN COMMAND: ${command}

AVAILABLE DATA SOURCES: ${availableSources.length > 0 ? availableSources.join(', ') : 'None selected'}
UNAVAILABLE DATA SOURCES: ${unavailableSources.length > 0 ? unavailableSources.join(', ') : 'None'}

PLATFORM DATA CONTEXT:
${JSON.stringify(contextPacket, null, 2).slice(0, 6000)}

Process this command through all 7 agent layers (Intent → Context → Strategy → Assets → Compliance → Execution → Format) and return ONLY the required JSON object.`;

  let aiResult;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(settings, conservativeMode) },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.65,
      max_tokens: 4000,
    });

    const raw = completion.choices[0].message.content;
    try {
      aiResult = JSON.parse(raw);
    } catch {
      aiResult = {
        title: `${command_type} — Admin AI Report`,
        executive_summary: raw,
        recommended_actions: '',
        assets_created: '',
        kpi_targets: '',
        risks_watchouts: '',
        next_steps: ''
      };
    }
  } catch (err) {
    return Response.json({ error: `OpenAI error: ${err.message}` }, { status: 500 });
  }

  const result = {
    title: aiResult.title || `${command_type} Report`,
    executive_summary: aiResult.executive_summary || '',
    recommended_actions: aiResult.recommended_actions || '',
    assets_created: aiResult.assets_created || '',
    kpi_targets: aiResult.kpi_targets || '',
    risks_watchouts: aiResult.risks_watchouts || '',
    next_steps: aiResult.next_steps || '',
  };

  return Response.json({ success: true, result, agent_chain_used: true, conservative_mode: conservativeMode });
});