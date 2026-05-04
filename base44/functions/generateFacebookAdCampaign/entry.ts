import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const {
    campaign_goal,
    target_audience,
    offer,
    landing_page_options,
    budget,
    start_date,
    end_date,
    creative_count = 3,
  } = await req.json();

  const prompt = `You are a Facebook/Instagram Ads strategist for Legacy Lane OS, a SaaS platform for estate sale operators.

Build a complete Facebook Ad campaign plan based on these inputs:
- Campaign Goal: ${campaign_goal}
- Target Audience: ${target_audience}
- Offer: ${offer}
- Landing Page Options: ${JSON.stringify(landing_page_options)}
- Daily Budget: $${budget}
- Start Date: ${start_date}
- End Date: ${end_date}
- Number of Ad Creatives: ${creative_count}

Return a JSON object with:
{
  "campaign_name": string,
  "objective": string (one of: LEAD_GENERATION, CONVERSIONS, TRAFFIC, BRAND_AWARENESS),
  "audience_strategy": string,
  "recommended_landing_page": { "url": string, "reason": string },
  "budget_recommendation": string,
  "schedule_recommendation": string,
  "creatives": [
    {
      "headline": string (max 40 chars),
      "primary_text": string (max 125 chars),
      "description": string (max 30 chars),
      "call_to_action": string (one of: LEARN_MORE, SIGN_UP, GET_QUOTE, CONTACT_US, APPLY_NOW),
      "image_prompt": string (detailed DALL-E prompt for the ad image)
    }
  ],
  "compliance_notes": string
}

Do not include any guarantees of income or referral payments. Keep language professional and compliant.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const plan = JSON.parse(response.choices[0].message.content);

  // Save campaign draft
  const now = new Date().toISOString();
  const draft = await base44.asServiceRole.entities.FacebookAdCampaignDraft.create({
    campaign_name: plan.campaign_name,
    objective: plan.objective,
    target_audience: plan.audience_strategy,
    landing_page_url: plan.recommended_landing_page?.url || '',
    budget_type: 'daily',
    daily_budget: parseFloat(budget) || 0,
    start_date,
    end_date,
    status: 'draft',
    ai_strategy: JSON.stringify(plan),
    created_by: user.email,
    created_at: now,
    updated_at: now,
  });

  // Save creative drafts
  const creatives = [];
  for (const c of (plan.creatives || [])) {
    const creative = await base44.asServiceRole.entities.FacebookAdCreativeDraft.create({
      campaign_draft_id: draft.id,
      headline: c.headline,
      primary_text: c.primary_text,
      description: c.description,
      call_to_action: c.call_to_action,
      image_prompt: c.image_prompt,
      approval_status: 'draft',
      created_at: now,
      updated_at: now,
    });
    creatives.push(creative);
  }

  console.log(`[generateFacebookAdCampaign] Created campaign draft ${draft.id} with ${creatives.length} creatives`);
  return Response.json({ success: true, campaign_draft: draft, creatives, plan });
});