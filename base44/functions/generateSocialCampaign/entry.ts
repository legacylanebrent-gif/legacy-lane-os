import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sale_id } = await req.json();
  if (!sale_id) return Response.json({ error: 'sale_id required' }, { status: 400 });

  const sale = await base44.asServiceRole.entities.EstateSale.get(sale_id);
  if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

  // Build sale context
  const addr = sale.property_address || {};
  const city = addr.city || 'the area';
  const county = addr.county || city;
  const state = addr.state || '';
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

  // Determine sale start datetime
  const firstDate = sale.sale_dates && sale.sale_dates.length > 0 ? sale.sale_dates[0] : null;
  const lastDate = sale.sale_dates && sale.sale_dates.length > 0 ? sale.sale_dates[sale.sale_dates.length - 1] : null;
  const saleStartDatetime = firstDate ? new Date(`${firstDate.date}T${firstDate.start_time || '09:00'}:00`) : null;
  const saleEndDatetime = lastDate ? new Date(`${lastDate.date}T${lastDate.end_time || '17:00'}:00`) : null;
  const addressRevealDatetime = saleStartDatetime ? new Date(saleStartDatetime.getTime() - 24 * 60 * 60 * 1000) : null;

  const now = new Date();
  const hoursUntilSale = saleStartDatetime ? (saleStartDatetime - now) / 3600000 : 120;

  const photoUrls = (sale.images || []).map(img => typeof img === 'string' ? img : img?.url).filter(Boolean).slice(0, 5);
  const categories = (sale.categories || []).join(', ') || 'furniture, antiques, collectibles';
  const featuredItems = (sale.featured_items || []).map(i => i.name || '').filter(Boolean).slice(0, 5).join(', ') || 'quality household items';

  const systemPrompt = `You are the Legacy Lane OS Estate Sale Social Campaign Agent.
Your job is to create high-performing social media campaigns for Estate Sale Company Owners.
You write posts designed to drive buyer turnout, create urgency, increase seller trust, and help the Estate Sale Company Owner look professional.

CRITICAL RULE: Never reveal the full street address in any post scheduled BEFORE the address reveal time (24 hours before sale start).
Before the 24-hour mark, use only the city, county, or general area. Replace address with: "Address released 24 hours before doors open."
After the address reveal time, you MAY include the full address.

Tone: Professional, exciting, urgent, trustworthy, local, clear.`;

  const userPrompt = `Generate a complete estate sale social media campaign.

SALE DETAILS:
Sale Title: ${sale.title}
City: ${city}
County: ${county}
State: ${state}
Full Address: ${fullAddress}
Sale Start: ${saleStartDatetime ? saleStartDatetime.toISOString() : 'TBD'}
Sale End: ${saleEndDatetime ? saleEndDatetime.toISOString() : 'TBD'}
Address Reveal Time: ${addressRevealDatetime ? addressRevealDatetime.toISOString() : 'TBD'}
Description: ${sale.description || 'Estate sale with quality items throughout the home.'}
Featured Items: ${featuredItems}
Categories: ${categories}
Number of Sale Days: ${sale.sale_dates ? sale.sale_dates.length : 1}
Sale Photos Available: ${photoUrls.length}
Current Time: ${now.toISOString()}

REQUIRED POSTS (generate ALL of these):
1. tease - 5-4 days before sale start
2. sneak_peek - 3 days before sale start
3. early_line - 2 days before sale start
4. final_tease - 25-30 hours before sale start
5. address_reveal - exactly 24 hours before sale start (address_allowed: true)
6. sale_day - at sale start time (address_allowed: true)
7. day_2 - morning of second sale day if applicable (address_allowed: true)
8. final_hours - 2-3 hours before sale end (address_allowed: true)
9. results - evening after sale ends (address_allowed: false)
10. seller_lead - 3 days after sale ends (address_allowed: false)

For each post include 10 headline options. Address visibility follows the schedule above.
If sale is only 1 day, still include day_2 post but mark it optional.

Return ONLY valid JSON matching this structure:
{
  "campaign_name": "string",
  "campaign_summary": "string",
  "address_reveal_datetime": "ISO string",
  "posts": [
    {
      "post_type": "string",
      "phase": "string",
      "scheduled_datetime": "ISO string",
      "address_allowed": false,
      "headline_options": ["10 options"],
      "selected_headline": "string",
      "caption": "string",
      "image_prompt": "string",
      "suggested_image_style": "string",
      "cta": "string",
      "audience_target": "string",
      "psychological_trigger": "string",
      "recommended_channels": ["facebook", "instagram"]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8
  });

  const campaignData = JSON.parse(completion.choices[0].message.content);

  // Save SocialCampaign record
  const campaign = await base44.asServiceRole.entities.SocialCampaign.create({
    operator_id: user.id,
    sale_id: sale_id,
    campaign_name: campaignData.campaign_name,
    campaign_type: 'estate_sale_promotion',
    address_visibility_rule: 'hidden_until_24hr',
    status: 'generated',
    generated_by: 'ai_agent',
    sale_start_datetime: saleStartDatetime ? saleStartDatetime.toISOString() : null,
    address_reveal_datetime: campaignData.address_reveal_datetime || (addressRevealDatetime ? addressRevealDatetime.toISOString() : null),
    channels_selected: ['facebook', 'instagram'],
    campaign_summary: campaignData.campaign_summary
  });

  // Save SocialPost records
  const postRecords = [];
  for (const post of (campaignData.posts || [])) {
    const record = await base44.asServiceRole.entities.SocialPost.create({
      campaign_id: campaign.id,
      operator_id: user.id,
      sale_id: sale_id,
      post_type: post.post_type,
      phase: post.phase,
      headline: post.selected_headline,
      headline_options: post.headline_options || [],
      caption: post.caption,
      image_prompt: post.image_prompt,
      suggested_image_style: post.suggested_image_style,
      address_allowed: post.address_allowed || false,
      scheduled_datetime: post.scheduled_datetime,
      channels: post.recommended_channels || ['facebook', 'instagram'],
      approval_status: 'needs_review',
      publish_status: 'not_published',
      cta: post.cta,
      audience_target: post.audience_target,
      psychological_trigger: post.psychological_trigger
    });
    postRecords.push(record);
  }

  return Response.json({ success: true, campaign_id: campaign.id, post_count: postRecords.length });
});