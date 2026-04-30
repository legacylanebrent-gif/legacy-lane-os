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

async function recordUsage(base44, operatorId, account, { aiMode, modelUsed, inputTokens, outputTokens, totalTokens, reason }) {
  const newUsed = (account.monthly_credits_used || 0) + totalTokens;
  const limit = (account.monthly_credit_limit || 0) + (account.bonus_credits || 0) + (account.rollover_credits || 0);

  await base44.asServiceRole.entities.OperatorAICreditLedger.create({
    operator_id: operatorId,
    request_id: crypto.randomUUID(),
    ai_mode: aiMode,
    model_used: modelUsed,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost: 0,
    credits_charged: totalTokens,
    credit_reason: reason || aiMode,
  });

  await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
    monthly_credits_used: newUsed,
    status: newUsed >= limit ? 'over_limit' : 'active',
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { mode, messages, prompt, data } = await req.json();

  // ── Credit gate ──
  const creditAccount = await getOrCreateCreditAccount(base44, user.id);
  const available = getAvailableCredits(creditAccount);

  if (available <= 0) {
    return Response.json({
      error: 'credit_limit_reached',
      message: 'You have reached your AI credit limit for this billing period. Upgrade your plan or add more credits to continue.',
    }, { status: 402 });
  }

  if (mode === 'chat') {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful business assistant for Legacy Lane OS, an estate sale and real estate platform. Help users with questions about their business, estate sales, leads, expenses, and platform features.'
        },
        ...messages
      ]
    });
    const usage = completion.usage;
    await recordUsage(base44, user.id, creditAccount, { aiMode: 'chat', modelUsed: DEFAULT_MODEL, inputTokens: usage?.prompt_tokens || 0, outputTokens: usage?.completion_tokens || 0, totalTokens: usage?.total_tokens || 0, reason: 'AI Assistant chat' });
    return Response.json({ reply: completion.choices[0].message.content });
  }

  if (mode === 'generate') {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert content writer specializing in real estate, estate sales, and business communications. Generate professional, compelling content.'
        },
        { role: 'user', content: prompt }
      ]
    });
    const usage = completion.usage;
    await recordUsage(base44, user.id, creditAccount, { aiMode: 'generate', modelUsed: DEFAULT_MODEL, inputTokens: usage?.prompt_tokens || 0, outputTokens: usage?.completion_tokens || 0, totalTokens: usage?.total_tokens || 0, reason: 'Content generation' });
    return Response.json({ content: completion.choices[0].message.content });
  }

  if (mode === 'analyze') {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a business data analyst. Analyze the provided data and give clear, actionable insights, trends, and recommendations in a structured format.'
        },
        {
          role: 'user',
          content: `Analyze this business data and provide key insights, trends, and recommendations:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    });
    const usage = completion.usage;
    await recordUsage(base44, user.id, creditAccount, { aiMode: 'analyze', modelUsed: DEFAULT_MODEL, inputTokens: usage?.prompt_tokens || 0, outputTokens: usage?.completion_tokens || 0, totalTokens: usage?.total_tokens || 0, reason: 'Business data analysis' });
    return Response.json({ analysis: completion.choices[0].message.content });
  }

  return Response.json({ error: 'Invalid mode' }, { status: 400 });
});