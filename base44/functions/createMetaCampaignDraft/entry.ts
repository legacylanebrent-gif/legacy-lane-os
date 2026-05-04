import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
const META_AD_ACCOUNT_ID = Deno.env.get('META_AD_ACCOUNT_ID');
const META_PAGE_ID = Deno.env.get('META_PAGE_ID');

async function metaPost(endpoint, body) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: META_ACCESS_TOKEN }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
  const s = settings[0] || {};
  if (!s.allow_meta_campaign_creation) {
    return Response.json({ error: 'Meta campaign creation is disabled in Admin Settings.' }, { status: 403 });
  }

  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID || !META_PAGE_ID) {
    return Response.json({ error: 'META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, and META_PAGE_ID secrets are required.' }, { status: 500 });
  }

  const { campaign_draft_id } = await req.json();
  if (!campaign_draft_id) return Response.json({ error: 'campaign_draft_id required' }, { status: 400 });

  const drafts = await base44.asServiceRole.entities.FacebookAdCampaignDraft.list('-created_at', 1);
  const draft = drafts.find(d => d.id === campaign_draft_id);
  if (!draft) return Response.json({ error: 'Campaign draft not found' }, { status: 404 });

  const creatives = await base44.asServiceRole.entities.FacebookAdCreativeDraft.filter({ campaign_draft_id });
  const approvedCreatives = creatives.filter(c => c.approval_status === 'approved');
  if (approvedCreatives.length === 0) return Response.json({ error: 'No approved creatives found for this campaign.' }, { status: 400 });

  // 1. Create Campaign (PAUSED)
  const campaign = await metaPost(`${META_AD_ACCOUNT_ID}/campaigns`, {
    name: draft.campaign_name,
    objective: draft.objective || 'LEAD_GENERATION',
    status: 'PAUSED',
    special_ad_categories: [],
  });
  if (campaign.error) return Response.json({ error: 'Campaign creation failed: ' + campaign.error.message }, { status: 500 });

  // 2. Create Ad Set (PAUSED)
  const adSet = await metaPost(`${META_AD_ACCOUNT_ID}/adsets`, {
    name: `${draft.campaign_name} - Ad Set`,
    campaign_id: campaign.id,
    daily_budget: Math.round((draft.daily_budget || 10) * 100), // in cents
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LEAD_GENERATION',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: { geo_locations: { countries: ['US'] }, age_min: 30, age_max: 65 },
    status: 'PAUSED',
    start_time: draft.start_date ? new Date(draft.start_date).toISOString() : new Date().toISOString(),
  });
  if (adSet.error) return Response.json({ error: 'Ad set creation failed: ' + adSet.error.message }, { status: 500 });

  // 3. Create Creatives and Ads
  const metaAdIds = [];
  for (const creative of approvedCreatives) {
    // Create creative
    const metaCreative = await metaPost(`${META_AD_ACCOUNT_ID}/adcreatives`, {
      name: creative.headline,
      object_story_spec: {
        page_id: META_PAGE_ID,
        link_data: {
          message: creative.primary_text,
          link: draft.landing_page_url || 'https://legacylaneos.com',
          name: creative.headline,
          description: creative.description,
          call_to_action: { type: creative.call_to_action || 'LEARN_MORE', value: { link: draft.landing_page_url || 'https://legacylaneos.com' } },
          ...(creative.image_url ? { picture: creative.image_url } : {}),
        },
      },
    });

    if (!metaCreative.error) {
      await base44.asServiceRole.entities.FacebookAdCreativeDraft.update(creative.id, { meta_creative_id: metaCreative.id, updated_at: new Date().toISOString() });

      // Create Ad (PAUSED)
      const ad = await metaPost(`${META_AD_ACCOUNT_ID}/ads`, {
        name: `${draft.campaign_name} - ${creative.headline}`,
        adset_id: adSet.id,
        creative: { creative_id: metaCreative.id },
        status: 'PAUSED',
      });
      if (ad.id) metaAdIds.push(ad.id);
    }
  }

  const now = new Date().toISOString();
  await base44.asServiceRole.entities.FacebookAdCampaignDraft.update(campaign_draft_id, {
    meta_campaign_id: campaign.id,
    meta_ad_set_id: adSet.id,
    meta_ad_ids: { ids: metaAdIds },
    status: 'paused_in_meta',
    updated_at: now,
  });

  console.log(`[createMetaCampaignDraft] Campaign ${campaign.id} created paused with ${metaAdIds.length} ads`);
  return Response.json({ success: true, meta_campaign_id: campaign.id, meta_ad_set_id: adSet.id, ads_created: metaAdIds.length });
});