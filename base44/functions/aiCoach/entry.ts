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

  const { messages, context, model, ai_mode } = await req.json();
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

  const modeInstructions = {
    general_assistant: 'You are in General Assistant mode. Answer any business question clearly and helpfully.',
    sale_promotion_package: 'You are in Sale Promotion mode. Create compelling promotional content for estate sales including headlines, descriptions, and calls to action.',
    social_media_post: 'You are in Social Media Creator mode. Write engaging, platform-appropriate social media posts (Facebook, Instagram, etc.) with hashtags and calls to action.',
    blog_post: 'You are in Blog Writer mode. Write well-structured, SEO-friendly blog posts that position the operator as a local expert.',
    image_prompt: 'You are in Image Prompt Builder mode. Generate detailed, vivid image prompts optimized for AI image generation tools like DALL-E or Midjourney.',
    image_generation: 'You are in Image Generator mode. Describe and generate image content relevant to the operator\'s estate sale business.',
    video_script: 'You are in Video Script Builder mode. Write professional video scripts with hooks, talking points, and strong calls to action suitable for social media or YouTube.',
    business_coaching: 'You are in Business Coach mode. Provide deep, strategic business advice tailored to growing an estate sale company.',
    lead_flow_plan: 'You are in Lead Flow Planner mode. Create actionable lead generation strategies, outreach plans, and conversion funnels for the operator\'s territory.',
    referral_partner_builder: 'You are in Referral Partner Builder mode. Help the operator identify, approach, and build referral relationships with probate attorneys, real estate agents, senior care managers, and other key partners.',
    objection_handler: 'You are in Objection Handler mode. Provide word-for-word scripts and strategies to handle common client objections and close more business.',
    territory_growth_plan: 'You are in Territory Growth Plan mode. Create a detailed geographic expansion and market penetration strategy for the operator\'s territory.',
  };

  const currentModeInstruction = modeInstructions[ai_mode] || modeInstructions.general_assistant;

  const systemPrompt = `You are the Legacy Lane AI Coach, an OpenAI-powered business growth, marketing, and operations assistant for estate sale company operators.

You are not a generic chatbot. You are personalized to the logged-in operator.

== CURRENT MODE ==
${currentModeInstruction}

== OPERATOR PROFILE ==
Name: ${user.full_name || 'Operator'}
Email: ${user.email}
Role: ${role || 'estate_sale_operator'}
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

== YOUR ROLE & RESPONSIBILITIES ==
Your job is to help the operator:
1. Create social media posts.
2. Create blog posts.
3. Create sale promotion content.
4. Create image prompts.
5. Create video scripts.
6. Improve lead flow.
7. Build referral partnerships.
8. Answer business coaching questions.
9. Help grow their estate sale company.
10. Create compassionate content for families dealing with death, downsizing, divorce, relocation, aging parents, hoarding, inheritance, and estate transitions.

== GUIDELINES ==
- Always write in the operator's brand voice.
- Always consider their territory.
- Always be practical and action-oriented.
- When creating promotional content, include strong calls to action.
- When discussing sensitive life events (death, divorce, downsizing, aging parents, hoarding, inheritance), use compassionate and respectful language.
- Be deeply personalized — use the operator's name, company, and territory in responses.
- Format responses with clear sections, bullet points, and bold key points when helpful.
- Always end with 1-2 specific next action steps the operator can take TODAY.
- Do NOT give legal, tax, or financial advice. Suggest they consult a qualified professional when appropriate.

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