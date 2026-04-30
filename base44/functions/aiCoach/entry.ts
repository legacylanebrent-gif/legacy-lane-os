import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

const DEFAULT_MODEL = Deno.env.get('OPENAI_DEFAULT_MODEL') || 'gpt-4o';
const IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
const EMBEDDING_MODEL = Deno.env.get('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';

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

async function recordUsage(base44, operatorId, account, { requestId, aiMode, modelUsed, inputTokens, outputTokens, totalTokens, estimatedCost, reason }) {
  const creditsCharged = totalTokens;

  await base44.asServiceRole.entities.OperatorAICreditLedger.create({
    operator_id: operatorId,
    request_id: requestId || crypto.randomUUID(),
    ai_mode: aiMode,
    model_used: modelUsed,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost: estimatedCost,
    credits_charged: creditsCharged,
    credit_reason: reason || aiMode,
  });

  const newUsed = (account.monthly_credits_used || 0) + creditsCharged;
  const limit = (account.monthly_credit_limit || 0) + (account.bonus_credits || 0) + (account.rollover_credits || 0);

  await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
    monthly_credits_used: newUsed,
    status: newUsed >= limit ? 'over_limit' : 'active',
  });

  // Fire alerts at 75%, 90%, 100%
  if (limit > 0) {
    const pct = (newUsed / limit) * 100;
    const thresholds = [
      { t: 75, type: 'usage_warning', msg: 'You have used 75% of your AI credits for this billing period.' },
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
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, context, model } = await req.json();
  const selectedModel = model || DEFAULT_MODEL;

  // ── Credit gate ──
  const creditAccount = await getOrCreateCreditAccount(base44, user.id);
  const available = getAvailableCredits(creditAccount);

  if (available <= 0) {
    return Response.json({
      error: 'credit_limit_reached',
      message: 'You have reached your AI credit limit for this billing period. Upgrade your plan or add more credits to continue using the Legacy Lane AI Coach.',
    }, { status: 402 });
  }

  // ── Build system prompt ──
  const {
    companyName, territory, brandVoice, recentSales,
    aiMemory, role, totalSales, totalRevenue,
  } = context || {};

  const systemPrompt = `You are the Legacy Lane AI Coach — a world-class business coach and strategic advisor embedded inside Legacy Lane OS, the premier estate sale and real estate platform.

You are speaking with ${user.full_name || 'an operator'} (${user.email}), a ${role || 'estate_sale_operator'} on the platform.

== OPERATOR PROFILE ==
Company: ${companyName || 'Not set'}
Territory: ${territory || 'Not specified'}
Brand Voice: ${brandVoice || 'Professional and trustworthy'}
Total Sales Completed: ${totalSales || 0}
Total Platform Revenue: $${(totalRevenue || 0).toLocaleString()}

== RECENT SALE ACTIVITY ==
${recentSales && recentSales.length > 0
    ? recentSales.slice(0, 5).map(s => `• ${s.title} — ${s.status} — Est. Value: $${(s.estimated_value || 0).toLocaleString()} — ${s.property_address?.city || ''}, ${s.property_address?.state || ''}`).join('\n')
    : 'No recent sales data available.'}

== AI MEMORY (Past Coaching Notes) ==
${aiMemory || 'No previous coaching history yet. This is a fresh start.'}

== YOUR COACHING ROLE ==
- Be deeply personalized — use the operator's name, company, and territory in responses.
- Provide actionable, specific advice for estate sale operators and real estate professionals.
- Coach on: marketing, lead generation, pricing strategy, team management, social media, Facebook Ads, business growth, client relationships, and operational efficiency.
- Be encouraging, direct, and results-focused.
- When relevant, reference their actual sales data and history.
- Format responses with clear sections, bullet points, and bold key points when helpful.
- Always end with 1-2 specific next action steps the operator can take TODAY.

Remember: You are NOT a generic chatbot. You are their dedicated business coach who knows their business inside and out.`;

  const completion = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 1200,
    temperature: 0.7,
  });

  const reply = completion.choices[0].message.content;
  const usage = completion.usage;

  // ── Record usage ──
  await recordUsage(base44, user.id, creditAccount, {
    aiMode: 'coach',
    modelUsed: selectedModel,
    inputTokens: usage?.prompt_tokens || 0,
    outputTokens: usage?.completion_tokens || 0,
    totalTokens: usage?.total_tokens || 0,
    estimatedCost: 0,
    reason: 'AI Coach conversation',
  });

  // ── Save AI memory ──
  try {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const memoryEntry = `[${new Date().toLocaleDateString()}] User: ${lastUserMsg.substring(0, 120)}... Coach: ${reply.substring(0, 200)}...`;
    const currentMemory = user.ai_coach_memory || '';
    const updatedMemory = (currentMemory + '\n\n' + memoryEntry).trim().slice(-4000);
    await base44.auth.updateMe({ ai_coach_memory: updatedMemory });
  } catch (e) {
    console.error('Memory save failed:', e.message);
  }

  return Response.json({
    reply,
    usage: {
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
    },
    available_credits_remaining: available - (usage?.total_tokens || 0),
    model: selectedModel,
  });
});