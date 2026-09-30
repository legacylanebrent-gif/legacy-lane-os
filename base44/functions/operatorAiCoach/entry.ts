import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const DEFAULT_MODEL = 'gpt-4o';

// ── Credit helpers ────────────────────────────────────────────────────────────

async function getOrCreateCreditAccount(base44, operatorId) {
  const accounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: operatorId });
  if (accounts.length > 0) return accounts[0];

  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return await base44.asServiceRole.entities.OperatorAICreditAccount.create({
    operator_id: operatorId,
    subscription_tier: 'starter',
    monthly_credit_limit: 0,
    monthly_credits_used: 0,
    bonus_credits: 0,
    rollover_credits: 0,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    status: 'pending_setup',
  });
}

function getAvailableCredits(account) {
  return (account.monthly_credit_limit || 0)
    + (account.bonus_credits || 0)
    + (account.rollover_credits || 0)
    - (account.monthly_credits_used || 0);
}

// Load credit cost for a given ai_mode from the config entity
async function getCreditCost(base44, aiMode) {
  const configs = await base44.asServiceRole.entities.AIRequestPricingConfig.filter({ request_type: aiMode, is_active: true });
  if (configs.length > 0) return configs[0].credits || 1;
  // Fallback: default to 1 credit if no config found
  return 1;
}

async function recordUsage(base44, operatorId, account, { aiMode, modelUsed, inputTokens, outputTokens, totalTokens, screenContext, reason, creditsCharged }) {
  const newUsed = (account.monthly_credits_used || 0) + creditsCharged;
  const totalLimit = (account.monthly_credit_limit || 0) + (account.bonus_credits || 0) + (account.rollover_credits || 0);

  // Write ledger record
  const ledgerRecord = await base44.asServiceRole.entities.OperatorAICreditLedger.create({
    operator_id: operatorId,
    request_id: crypto.randomUUID(),
    ai_mode: aiMode,
    model_used: modelUsed,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost: 0,
    credits_charged: creditsCharged,
    credit_reason: reason || `AI Coach — ${screenContext || aiMode}`,
  });

  // Update credit account
  await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
    monthly_credits_used: newUsed,
    status: newUsed >= totalLimit ? 'over_limit' : 'active',
  });

  // Fire threshold alerts (75%, 90%, 100%) — only once per period
  if (totalLimit > 0) {
    const pct = (newUsed / totalLimit) * 100;
    const thresholds = [
      { t: 75, type: 'usage_warning',  msg: 'You have used 75% of your AI credits for this billing period.' },
      { t: 90, type: 'usage_critical', msg: 'You have used 90% of your AI credits for this billing period.' },
      { t: 100, type: 'limit_reached', msg: 'You have reached your AI credit limit for this billing period. Upgrade your plan or add more credits to continue using the Legacy Lane AI Coach.' },
    ];
    for (const { t, type, msg } of thresholds) {
      if (pct >= t) {
        const existing = await base44.asServiceRole.entities.OperatorAIUsageAlert.filter({ operator_id: operatorId, alert_type: type, was_shown: false });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.OperatorAIUsageAlert.create({
            operator_id: operatorId,
            alert_type: type,
            threshold_percent: t,
            message: msg,
            was_shown: false,
          });
        }
      }
    }
  }

  return { ledgerRecord, creditsCharged, newUsed };
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt({ user, operator, activeSale, aiMemory, screenContext, aiMode, requestedOutputType }) {
  const outputInstruction = requestedOutputType === 'json'
    ? 'IMPORTANT: Your response MUST be valid JSON only. No markdown, no preamble.'
    : requestedOutputType === 'list'
    ? 'Format your response as a clean numbered or bulleted list.'
    : requestedOutputType === 'markdown'
    ? 'Format your response using Markdown (headers, bold, bullets).'
    : 'Respond in clear, conversational plain text.';

  const saleContext = activeSale
    ? `== ACTIVE SALE CONTEXT ==
Sale: ${activeSale.title || 'Untitled'}
Status: ${activeSale.status || 'unknown'}
Address: ${activeSale.property_address?.formatted_address || activeSale.property_address?.city + ', ' + activeSale.property_address?.state || 'Not set'}
Estimated Value: $${(activeSale.estimated_value || 0).toLocaleString()}
Actual Revenue: $${(activeSale.actual_revenue || 0).toLocaleString()}
Total Items: ${activeSale.total_items || 0}
Categories: ${(activeSale.categories || []).join(', ') || 'Not specified'}
Commission Rate: ${activeSale.commission_rate || 'Not set'}%
Sale Dates: ${(activeSale.sale_dates || []).map(d => d.date).join(', ') || 'Not scheduled'}
`
    : '';

  return `You are the Legacy Lane AI Coach — a world-class business coach and strategic advisor embedded inside Legacy Lane OS, the premier estate sale and real estate platform.

== OPERATOR IDENTITY ==
Name: ${user.full_name || 'Operator'}
Email: ${user.email}
Account Type: ${user.primary_account_type || 'estate_sale_operator'}
Company: ${operator.company_name || user.company_name || 'Not set'}
Territory: ${operator.territory || user.territory || 'Not specified'}
Brand Voice: ${operator.brand_voice || user.brand_voice || 'Professional and trustworthy'}

== CURRENT SCREEN ==
The operator is currently on: ${screenContext || 'the platform'}
AI Mode: ${aiMode || 'coach'}

${saleContext}
== AI MEMORY (Ongoing Coaching History) ==
${aiMemory || 'No previous coaching history yet. This is a fresh start.'}

== YOUR COACHING ROLE ==
- Be deeply personalized — use the operator's name, company, and territory in your responses.
- Coach on: marketing, lead generation, pricing strategy, team management, social media, Facebook Ads, business growth, client relationships, and operational efficiency.
- Be encouraging, direct, and results-focused.
- Reference their actual sale data and context when relevant.
- Always end with 1–2 specific, actionable next steps the operator can take TODAY.

== OUTPUT FORMAT ==
${outputInstruction}

Remember: You are NOT a generic chatbot. You are their dedicated Legacy Lane business coach who knows their operation inside and out.`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // 1. Authenticate
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    operator_id,
    screen_context,
    active_sale_id,
    ai_mode,
    user_message,
    requested_output_type = 'text',
  } = body;

  if (!user_message?.trim()) {
    return Response.json({ error: 'user_message is required' }, { status: 400 });
  }

  // 2. Confirm operator_id matches logged-in user
  // Team members (operator_id field set) are also allowed to use their operator's coach
  const effectiveOperatorId = operator_id || user.id;
  const isOwn = effectiveOperatorId === user.id;
  const isTeamMember = user.operator_id && user.operator_id === effectiveOperatorId;
  const isAdmin = user.role === 'admin' || ['super_admin', 'platform_ops'].includes(user.primary_account_type);

  if (!isOwn && !isTeamMember && !isAdmin) {
    return Response.json({ error: 'Forbidden: operator_id does not match your account.' }, { status: 403 });
  }

  // 3–6. Load operator profile data (from User entity — territory, brand_voice, ai_memory are stored there)
  let operatorUser = user;
  if (effectiveOperatorId !== user.id) {
    const operatorList = await base44.asServiceRole.entities.User.filter({ id: effectiveOperatorId });
    operatorUser = operatorList[0] || user;
  }

  const operator = {
    company_name: operatorUser.company_name || '',
    territory: operatorUser.territory || '',
    brand_voice: operatorUser.brand_voice || '',
  };
  const aiMemory = operatorUser.ai_coach_memory || '';

  // 7. Load active sale data if provided
  let activeSale = null;
  if (active_sale_id) {
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: active_sale_id });
    activeSale = sales[0] || null;
  }

  // 8. Check credit account
  const creditAccount = await getOrCreateCreditAccount(base44, effectiveOperatorId);

  // 9. Block if credits exhausted or paused
  if (creditAccount.status === 'paused' || creditAccount.status === 'suspended') {
    return Response.json({
      error: 'access_paused',
      message: 'Your AI access has been paused. Please contact support to restore access.',
    }, { status: 402 });
  }

  const available = getAvailableCredits(creditAccount);
  if (available <= 0) {
    return Response.json({
      error: 'credit_limit_reached',
      message: 'You have reached your AI credit limit for this billing period. Upgrade your plan or add more credits to continue using the Legacy Lane AI Coach.',
    }, { status: 402 });
  }

  // 10. Build system prompt
  const systemPrompt = buildSystemPrompt({
    user: operatorUser,
    operator,
    activeSale,
    aiMemory,
    screenContext: screen_context,
    aiMode: ai_mode,
    requestedOutputType: requested_output_type,
  });

  // 11. Send to OpenAI
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: user_message },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  // 12. Capture usage
  const aiResponse = completion.choices[0].message.content;
  const usage = completion.usage || {};
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || 0;

  // 13. Look up credit cost from config entity
  const creditsCharged = await getCreditCost(base44, ai_mode || 'standard');

  // 14. Record credits and ledger
  const { ledgerRecord } = await recordUsage(base44, effectiveOperatorId, creditAccount, {
    aiMode: ai_mode || 'coach',
    modelUsed: DEFAULT_MODEL,
    inputTokens,
    outputTokens,
    totalTokens,
    screenContext: screen_context,
    reason: `AI Coach — ${screen_context || ai_mode || 'coach'}`,
    creditsCharged,
  });

  // 15. Save conversation record
  const conversation = await base44.asServiceRole.entities.CoachConversation.create({
    operator_id: effectiveOperatorId,
    ai_mode: ai_mode || 'coach',
    screen_context: screen_context || '',
    active_sale_id: active_sale_id || '',
    user_message,
    ai_response: aiResponse,
    requested_output_type,
    model_used: DEFAULT_MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    credits_charged: creditsCharged,
    ledger_id: ledgerRecord?.id || '',
  });

  // Update AI memory (rolling summary, last 4000 chars)
  const memoryEntry = `[${new Date().toLocaleDateString()}] Screen: ${screen_context || 'unknown'} | Q: ${user_message.substring(0, 120)} | A: ${aiResponse.substring(0, 200)}`;
  const updatedMemory = (aiMemory + '\n\n' + memoryEntry).trim().slice(-4000);
  await base44.asServiceRole.entities.User.update(effectiveOperatorId, { ai_coach_memory: updatedMemory });

  // 16. Return response
  return Response.json({
    response: aiResponse,
    conversation_id: conversation.id,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
    credits: {
      charged: creditsCharged,
      remaining: available - creditsCharged,
    },
    model: DEFAULT_MODEL,
  });
});