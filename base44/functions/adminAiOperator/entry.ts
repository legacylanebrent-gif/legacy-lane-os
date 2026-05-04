import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const SYSTEM_PROMPT = `You are the Legacy Lane OS Admin AI Operator. You are an executive-level AI business operator for Brent Cramp and Legacy Lane leadership. You help automate administration, operator acquisition, revenue growth, campaign planning, territory strategy, referral program management, support analysis, and subscription growth. You are not a generic chatbot. You produce structured business execution plans. You must be practical, specific, revenue-focused, legally cautious, and operationally realistic. You do not send messages, move money, trigger payouts, or make irreversible changes unless a future approved execution layer is explicitly added. In this version, you only plan, draft, analyze, recommend, and create checklists.

IMPORTANT LEGAL GUARDRAIL: Legacy Lane and Houszu are not real estate brokerages and are not direct recipients of real estate commission. Referral-related compensation must be handled through properly licensed parties and written agreements reviewed by counsel. Exact legal language must be reviewed by Brent's Keller Williams attorney or other qualified counsel.

REFERRAL PROGRAM CONTEXT: A real estate agent may agree, through proper agreements, to pay referral compensation of 20% of the total commission received from a closed transaction. Brent Cramp receives 100% of that 20% referral compensation, subject to legal structure and counsel approval. The Legacy Lane operator may receive 30% of the amount Brent receives from the closed property referral. Operator funds are credited inside Legacy Lane OS within 10 days of closing. Operator funds may be used for marketing spend inside Legacy Lane OS or withdrawn as 1099 income by check or direct deposit, subject to tax/payment setup.

You must ALWAYS return a valid JSON object in exactly this shape:
{
  "title": "string — short descriptive title for this report",
  "executive_summary": "string — 2-4 paragraph strategic overview",
  "recommended_actions": "string — numbered list of specific actions",
  "assets_created": "string — any scripts, templates, copy, or outlines created",
  "kpi_targets": "string — measurable targets and timelines",
  "risks_watchouts": "string — legal, operational, and business risks",
  "next_steps": "string — numbered immediate next steps"
}`;

async function safeLoad(base44, entityName, limit = 100) {
  try {
    return await base44.asServiceRole.entities[entityName].list('-created_date', limit);
  } catch (_) {
    return [];
  }
}

function summarizeContext(records, fields) {
  if (!records || records.length === 0) return null;
  return {
    count: records.length,
    sample: records.slice(0, 5).map(r => {
      const out = {};
      fields.forEach(f => { if (r[f] !== undefined) out[f] = r[f]; });
      return out;
    })
  };
}

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

  // Gather context data based on toggles
  const contextData = {};

  if (context_toggles.operators) {
    const data = await safeLoad(base44, 'OperatorTerritoryProfile');
    contextData.operators = summarizeContext(data, ['company_name', 'service_counties', 'status', 'max_agent_partnerships', 'current_agent_partnerships']);
  }
  if (context_toggles.leads) {
    const data = await safeLoad(base44, 'Lead');
    contextData.leads = summarizeContext(data, ['source', 'intent', 'status', 'property_county', 'property_state', 'score', 'converted']);
  }
  if (context_toggles.referrals) {
    const data = await safeLoad(base44, 'ReferralDealPipeline');
    contextData.referrals = summarizeContext(data, ['stage', 'property_address', 'estimated_value', 'referral_percentage', 'expected_referral_fee']);
  }
  if (context_toggles.subscriptions) {
    const data = await safeLoad(base44, 'Subscription');
    contextData.subscriptions = summarizeContext(data, ['status', 'plan', 'amount', 'created_date']);
  }
  if (context_toggles.campaigns) {
    const data = await safeLoad(base44, 'Campaign');
    contextData.campaigns = summarizeContext(data, ['name', 'status', 'type', 'created_date']);
  }
  if (context_toggles.revenue) {
    const data = await safeLoad(base44, 'RevenueEvent');
    contextData.revenue = summarizeContext(data, ['type', 'amount', 'status', 'created_date']);
  }
  if (context_toggles.tickets) {
    const data = await safeLoad(base44, 'Ticket');
    contextData.support_tickets = summarizeContext(data, ['status', 'category', 'priority', 'created_date']);
  }

  // Build prompt
  const contextSection = Object.keys(contextData).length > 0
    ? `\n\nCURRENT PLATFORM CONTEXT:\n${JSON.stringify(contextData, null, 2)}`
    : '\n\nNo additional context data was included in this request.';

  const userPrompt = `COMMAND TYPE: ${command_type || 'General Admin'}
EXECUTION MODE: ${execution_mode || 'Plan Only'}
ADMIN COMMAND: ${command}${contextSection}

Respond with ONLY a valid JSON object matching the required schema. No markdown, no explanation outside JSON.`;

  let aiResult;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
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

  // Ensure all fields exist
  const result = {
    title: aiResult.title || `${command_type} Report`,
    executive_summary: aiResult.executive_summary || '',
    recommended_actions: aiResult.recommended_actions || '',
    assets_created: aiResult.assets_created || '',
    kpi_targets: aiResult.kpi_targets || '',
    risks_watchouts: aiResult.risks_watchouts || '',
    next_steps: aiResult.next_steps || '',
  };

  return Response.json({ success: true, result });
});