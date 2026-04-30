import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

async function getOrCreateCreditAccount(base44, operatorId) {
  const accounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: operatorId });
  if (accounts.length > 0) return accounts[0];
  const now = new Date();
  return await base44.asServiceRole.entities.OperatorAICreditAccount.create({
    operator_id: operatorId,
    subscription_tier: 'starter',
    monthly_credit_limit: 0,
    monthly_credits_used: 0,
    bonus_credits: 0,
    rollover_credits: 0,
    current_period_start: now.toISOString(),
    current_period_end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    status: 'pending_setup',
  });
}

function getAvailableCredits(account) {
  return (account.monthly_credit_limit || 0)
    + (account.bonus_credits || 0)
    + (account.rollover_credits || 0)
    - (account.monthly_credits_used || 0);
}

async function recordUsage(base44, operatorId, account, totalTokens) {
  await base44.asServiceRole.entities.OperatorAICreditLedger.create({
    operator_id: operatorId,
    request_id: crypto.randomUUID(),
    ai_mode: 'coach',
    model_used: 'gpt-4o',
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: totalTokens,
    estimated_cost: 0,
    credits_charged: totalTokens,
    credit_reason: 'Sale Promotion Engine — 15-piece package',
  });
  const newUsed = (account.monthly_credits_used || 0) + totalTokens;
  const limit = (account.monthly_credit_limit || 0) + (account.bonus_credits || 0) + (account.rollover_credits || 0);
  await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
    monthly_credits_used: newUsed,
    status: newUsed >= limit ? 'over_limit' : 'active',
  });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    sale_title,
    sale_city,
    sale_address,
    sale_dates,        // e.g. "Saturday May 10 & Sunday May 11, 9am–3pm"
    featured_items,    // e.g. "Victorian bedroom set, Waterford crystal, mid-century chairs"
    special_notes,     // e.g. "Cash and Venmo only. Gated community, ID required."
    photo_urls,        // array of uploaded image URLs
    model = 'gpt-4o',
  } = body;

  // Auth check
  const creditAccount = await getOrCreateCreditAccount(base44, user.id);
  const available = getAvailableCredits(creditAccount);
  const PROMO_COST = 8000; // flat credit cost for 15-piece package

  if (available < PROMO_COST) {
    return Response.json({
      error: 'credit_limit_reached',
      message: `The Sale Promotion Engine costs ${PROMO_COST.toLocaleString()} credits. You have ${available.toLocaleString()} available.`,
    }, { status: 402 });
  }

  // Operator profile (server-side only)
  const companyName = user.company_name || user.full_name || 'Our Company';
  const territory = user.territory || user.location_city || sale_city || '';
  const brandVoice = user.brand_voice || 'Professional, warm, and trustworthy';
  let aiMemoryLines = '';
  try {
    const mem = JSON.parse(user.ai_coach_memory || '{}');
    const lines = [];
    if (mem.brand_voice) lines.push(`Brand Voice: ${mem.brand_voice}`);
    if (mem.preferred_tone) lines.push(`Preferred Tone: ${mem.preferred_tone}`);
    if (mem.preferred_cta) lines.push(`Preferred CTA: ${mem.preferred_cta}`);
    if (mem.content_style) lines.push(`Content Style: ${mem.content_style}`);
    if (mem.promo_preferences) lines.push(`Promo Preferences: ${mem.promo_preferences}`);
    aiMemoryLines = lines.join('\n');
  } catch (_) {}

  // Fetch recent successful sales for style context
  let pastSaleContext = '';
  try {
    const pastSales = await base44.entities.EstateSale.filter({ operator_id: user.id, status: 'completed' }, '-created_date', 3);
    if (pastSales.length > 0) {
      pastSaleContext = pastSales.map(s => `• "${s.title}" in ${s.property_address?.city || 'N/A'} — Revenue: $${(s.actual_revenue || 0).toLocaleString()}`).join('\n');
    }
  } catch (_) {}

  const saleInfo = `
Sale Title: ${sale_title || 'Estate Sale'}
City/Neighborhood: ${sale_city || territory}
Address/Location: ${sale_address || 'Address provided at sign-up'}
Dates & Times: ${sale_dates || 'Dates TBD'}
Featured Items: ${featured_items || 'Antiques, furniture, collectibles, jewelry, and more'}
Special Notes: ${special_notes || 'None'}
`.trim();

  const systemPrompt = `You are the Legacy Lane AI Coach — a world-class estate sale marketing expert generating a complete 15-piece Sale Promotion Package.

== OPERATOR PROFILE ==
Operator: ${user.full_name || 'Operator'}
Company: ${companyName}
Territory: ${territory}
Brand Voice: ${brandVoice}
${aiMemoryLines ? `\n== OPERATOR PREFERENCES ==\n${aiMemoryLines}` : ''}
${pastSaleContext ? `\n== PAST SUCCESSFUL SALES (for style reference) ==\n${pastSaleContext}` : ''}

== SALE DETAILS ==
${saleInfo}

== INSTRUCTIONS ==
Generate ALL 15 pieces of content below. Each piece must:
- Be fully written (not a placeholder or outline)
- Use the operator's brand voice and the specific sale details
- Be ready to copy and use immediately
- Include the sale title, city, dates, and featured items where relevant

Format EXACTLY as follows — use the exact section headers shown (the system parses them):

---SECTION: facebook_long---
[Long-form Facebook post, 200–280 words. Open with emotional storytelling hook. Mention featured items, exact dates, city/neighborhood (not full address). End with CTA. Add 6–8 hashtags on final line.]

---SECTION: facebook_short---
[Short punchy Facebook post, 60–90 words. High energy. Mention top 2–3 items and dates. End with CTA. Add 4–5 hashtags.]

---SECTION: instagram_caption---
[Instagram caption, 80–120 words. Visual-first. First sentence must stop the scroll. CTA in middle and end. Add 12–15 hashtags on new line.]

---SECTION: instagram_reel_script---
[Instagram Reel script with: HOOK (0–3s on screen text + spoken), CONTENT (4–25s items walkthrough with [camera direction] notes), CTA (last 5s). Write exactly what the speaker says plus [direction] notes in brackets.]

---SECTION: email_blast---
[Full email. Start with: SUBJECT: [subject line here] | PREVIEW: [preview text here] | Then full email body 220–280 words with greeting, 3 paragraphs, and CTA BUTTON: [button text].]

---SECTION: sms_reminder---
[Write 3 SMS messages labeled SMS 1 (announcement), SMS 2 (day-before), SMS 3 (morning-of). Each max 160 characters. Include [LINK] placeholder.]

---SECTION: blog_post---
[Full SEO blog post. Start with: TITLE: [title] | META: [meta description]. Then 500+ word post with intro, 3 sections with subheadings, and conclusion with CTA.]

---SECTION: featured_item_spotlight---
[Social media spotlight post for the most exciting featured item. 80–120 words. Include pricing context ("estate sale prices — way below retail"), strong visual language, and CTA. Suitable for Facebook and Instagram.]

---SECTION: day_before_reminder---
[Day-before social post. 70–100 words. Create FOMO and excitement. Works on Facebook and Instagram. Mention tomorrow's hours and top items. Include 4–5 hashtags.]

---SECTION: morning_of_post---
[Morning-of post. Energetic, real-time feel. 60–90 words. Announce doors OPEN NOW. Mention 2–3 highlight items. Create urgency. Include hours. Works on all platforms.]

---SECTION: final_day_post---
[Final-day scarcity post. 70–100 words. LAST CHANCE energy. Mention reduced/half-price items toward end of day. Strong close. 4–5 hashtags.]

---SECTION: everything_must_go---
[Urgency post for the last few hours of a sale. 50–70 words. Maximum urgency. Discount language. Simple, raw energy. Perfect for Facebook Stories and Instagram Stories.]

---SECTION: post_sale_thank_you---
[Post-sale thank-you post for social media. 80–120 words. Warm, grateful tone. Thank buyers and the family. Mention success/volume without specific dollar amounts. Invite followers to sign up for the list. 3–4 hashtags.]

---SECTION: review_request---
[Review request message the operator sends to the client family after the sale. 3 versions: (1) Text/SMS version (max 160 chars), (2) Email version (150–180 words with subject line), (3) Verbal script (what to say on the phone).]

---SECTION: referral_request---
[Referral ask message the operator sends to the client family. 3 versions: (1) Text/SMS (max 160 chars), (2) Email (120–160 words with subject line), (3) Verbal script. Warm, not transactional. Focus on helping others in similar situations.]`;

  // Build messages array — include photo URLs as vision content if provided
  const userContent = photo_urls && photo_urls.length > 0
    ? [
        { type: 'text', text: `Please generate the complete 15-piece Sale Promotion Package for this estate sale.\n\nSale Details:\n${saleInfo}\n\nI've also attached ${photo_urls.length} photo(s) from the sale. Use what you can see in the photos to make the content more specific and vivid.` },
        ...photo_urls.slice(0, 4).map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
      ]
    : `Generate the complete 15-piece Sale Promotion Package for this estate sale.\n\nSale Details:\n${saleInfo}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 6000,
    temperature: 0.72,
  });

  const raw = completion.choices[0].message.content;

  // Parse sections from the response
  const sections = {};
  const sectionRegex = /---SECTION:\s*(\w+)---([\s\S]*?)(?=---SECTION:|$)/g;
  let match;
  while ((match = sectionRegex.exec(raw)) !== null) {
    sections[match[1].trim()] = match[2].trim();
  }

  await recordUsage(base44, user.id, creditAccount, PROMO_COST);

  return Response.json({
    sections,
    raw,
    sale_title: sale_title || 'Estate Sale',
    available_credits_remaining: available - PROMO_COST,
  });
});