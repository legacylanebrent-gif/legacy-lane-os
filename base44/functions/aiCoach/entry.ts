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

  // ── Sale Promotion Package (special full-package mode) ──
  if (ai_mode === 'sale_promotion_package') {
    // Look up credit cost from AICreditConfig
    let promoCredits = 5000; // default fallback
    try {
      const configs = await base44.asServiceRole.entities.AICreditConfig.filter({ ai_mode: 'sale_promotion_package', is_active: true });
      if (configs.length > 0) promoCredits = configs[0].credit_cost || promoCredits;
    } catch (_) {}

    if (available < promoCredits) {
      return Response.json({
        error: 'credit_limit_reached',
        message: `This Sale Promotion Package costs ${promoCredits.toLocaleString()} credits but you only have ${available.toLocaleString()} available. Upgrade your plan or add more credits.`,
      }, { status: 402 });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || 'Generate a complete sale promotion package';

    const promoSystemPrompt = `You are the Legacy Lane AI Coach generating a COMPLETE Sale Promotion Package for an estate sale operator.

== OPERATOR PROFILE ==
Name: ${user.full_name || 'Operator'}
Company: ${context?.companyName || 'Not set'}
Territory: ${context?.territory || 'Not specified'}
Brand Voice: ${context?.brandVoice || 'Professional, warm, and trustworthy'}

You must generate ALL 10 pieces of content listed below. Use the sale details the operator provided.
Format each section with a bold header (## Section Name) and a horizontal rule (---) after it.
Be specific, compelling, and personalized to their brand and territory.

Generate:

## 1. Facebook Post
A long-form Facebook post (150–250 words) with strong storytelling, featured items, dates/times, address teaser (city/neighborhood only), and a call to action. Include 5–8 relevant hashtags at the bottom.

## 2. Instagram Caption
A punchy, visual-first Instagram caption (80–120 words). Lead with an attention-grabbing first line. Include a CTA and 10–15 hashtags on a new line.

## 3. Email Blast
A complete email blast with Subject Line, Preview Text, and full body (200–300 words). Include featured items, dates, address, and a clear CTA button text suggestion.

## 4. SMS Reminder
A concise SMS reminder (max 160 characters). Include sale name, date, and a short link placeholder like [LINK].

## 5. Blog Post
A full SEO blog post (400–500 words) with title, introduction, 3 body sections, and conclusion. Target keywords: estate sale + [city/territory]. Position the operator as a local expert.

## 6. Image Prompt
A detailed AI image generation prompt (for DALL-E or Midjourney) that captures the mood of the sale. Describe style, lighting, subject matter, composition, and tone.

## 7. Short Video Script
A 30–60 second video script with: Hook (0–5s), Main content (5–45s), CTA (45–60s). Include scene direction notes in [brackets].

## 8. Day-Before Reminder Post
A short social post (60–100 words) creating urgency and excitement for tomorrow's sale. Works for Facebook and Instagram.

## 9. Morning-Of-Sale Post
An energetic, real-time post (60–100 words) announcing the sale is NOW OPEN. Include doors-open time and top featured items.

## 10. Final-Day Urgency Post
A scarcity-driven final-day post (60–100 words). Emphasize this is the LAST chance. Mention reduced prices or deals available at end of day.`;

    const promoCompletion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: promoSystemPrompt },
        { role: 'user', content: lastUserMsg },
      ],
      max_tokens: 3500,
      temperature: 0.75,
    });

    const promoReply = promoCompletion.choices[0].message.content;
    const promoUsage = promoCompletion.usage;

    await recordUsage(base44, user.id, creditAccount, {
      aiMode: 'coach',
      modelUsed: selectedModel,
      inputTokens: promoUsage?.prompt_tokens || 0,
      outputTokens: promoUsage?.completion_tokens || 0,
      totalTokens: promoCredits, // charge the configured flat credit cost
      estimatedCost: 0,
      reason: 'Sale Promotion Package',
    });

    return Response.json({
      reply: promoReply,
      usage: { prompt_tokens: promoUsage?.prompt_tokens || 0, completion_tokens: promoUsage?.completion_tokens || 0, total_tokens: promoUsage?.total_tokens || 0 },
      available_credits_remaining: available - promoCredits,
      model: selectedModel,
      is_promotion_package: true,
    });
  }

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

== AI MEMORY (Operator Personalization) ==
${(() => {
  if (!aiMemory) return 'No personalization data saved yet. This is a fresh start.';
  try {
    const mem = JSON.parse(aiMemory);
    const lines = [];
    if (mem.brand_voice) lines.push(`Brand Voice: ${mem.brand_voice}`);
    if (mem.preferred_tone) lines.push(`Preferred Tone: ${mem.preferred_tone}`);
    if (mem.preferred_cta) lines.push(`Preferred CTA: ${mem.preferred_cta}`);
    if (mem.service_area) lines.push(`Service Area: ${mem.service_area}`);
    if (mem.target_customer) lines.push(`Target Customer: ${mem.target_customer}`);
    if (mem.recurring_objections) lines.push(`Recurring Objections: ${mem.recurring_objections}`);
    if (mem.content_style) lines.push(`Content Style: ${mem.content_style}`);
    if (mem.business_goals) lines.push(`Business Goals: ${mem.business_goals}`);
    if (mem.referral_focus) lines.push(`Referral Focus: ${mem.referral_focus}`);
    if (mem.promo_preferences) lines.push(`Promo Preferences: ${mem.promo_preferences}`);
    return lines.length > 0 ? lines.join('\n') : 'No personalization data saved yet.';
  } catch (_) {
    return aiMemory;
  }
})()}

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
    max_tokens: 1500,
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

  // ── Save AI memory (durable personalization only) ──
  try {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const conversationSnippet = `User: ${lastUserMsg}\nCoach: ${reply}`;

    const memoryExtractionPrompt = `You are a memory extraction system for an AI business coach.

Analyze the following conversation snippet and extract ONLY durable, reusable personalization facts about the operator's business.

Only extract facts that belong to one of these categories:
- brand_voice: How they want to sound (e.g. "warm and professional", "bold and direct")
- preferred_tone: Emotional tone preference (e.g. "compassionate", "energetic", "authoritative")
- preferred_cta: Call-to-action phrases they like (e.g. "Call us today", "Schedule a free walkthrough")
- service_area: Geographic area they serve (e.g. "Dallas-Fort Worth", "Northern New Jersey")
- target_customer: Who their ideal client is (e.g. "adult children handling parent estates", "probate attorneys")
- recurring_objections: Common client objections they face (e.g. "price is too high", "not ready yet")
- content_style: Preferred content format (e.g. "short punchy posts", "long-form storytelling")
- business_goals: Stated business goals (e.g. "expand to 3 new counties", "hire a second crew")
- referral_focus: Who they want referral partnerships with (e.g. "probate attorneys", "senior move managers")
- promo_preferences: Sale promotion preferences (e.g. "always lead with featured items", "use countdown urgency")

DO NOT extract:
- Details about a specific upcoming or past sale
- Temporary pricing or dates
- One-off questions or tasks
- Anything the operator did NOT explicitly state about their business preferences

If you find durable facts, return them as a compact JSON object like:
{"brand_voice": "warm and compassionate", "service_area": "Bergen County NJ"}

If there is nothing durable to save, return exactly: {}

Conversation:
${conversationSnippet}`;

    const memoryCheck = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: memoryExtractionPrompt }],
      max_tokens: 300,
      temperature: 0,
    });

    const extracted = memoryCheck.choices[0].message.content.trim();
    let newFacts = {};
    try { newFacts = JSON.parse(extracted); } catch (_) { newFacts = {}; }

    if (Object.keys(newFacts).length > 0) {
      // Merge with existing structured memory
      let existingMemory = {};
      try { existingMemory = JSON.parse(user.ai_coach_memory || '{}'); } catch (_) { existingMemory = {}; }
      const mergedMemory = { ...existingMemory, ...newFacts, last_updated: new Date().toISOString() };
      await base44.auth.updateMe({ ai_coach_memory: JSON.stringify(mergedMemory) });
    }
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