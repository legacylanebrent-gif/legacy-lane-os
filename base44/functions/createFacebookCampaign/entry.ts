import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { credentials, campaign, adSet, ad } = await req.json();

    if (!credentials?.ad_account_id || !credentials?.access_token) {
      return Response.json({ error: 'Missing Facebook Ads credentials' }, { status: 400 });
    }

    const accountId = credentials.ad_account_id;
    const token = credentials.access_token;
    const baseUrl = `https://graph.facebook.com/v19.0`;

    // 1. Create Campaign
    const campaignBody = new URLSearchParams({
      name: campaign.name,
      objective: campaign.objective,
      status: 'PAUSED', // Start paused for safety
      access_token: token,
    });

    const campaignRes = await fetch(`${baseUrl}/${accountId}/campaigns`, {
      method: 'POST',
      body: campaignBody,
    });
    const campaignData = await campaignRes.json();
    if (campaignData.error) {
      return Response.json({ error: campaignData.error.message }, { status: 400 });
    }
    const campaignId = campaignData.id;

    // 2. Create Ad Set
    const targeting = {
      age_min: parseInt(adSet.age_min) || 25,
      age_max: parseInt(adSet.age_max) || 65,
      geo_locations: { countries: ['US'] },
    };

    const adSetBody = new URLSearchParams({
      name: adSet.name,
      campaign_id: campaignId,
      daily_budget: Math.round(parseFloat(campaign.daily_budget) * 100).toString(), // In cents
      billing_event: adSet.billing_event,
      optimization_goal: adSet.optimization_goal,
      targeting: JSON.stringify(targeting),
      status: 'PAUSED',
      access_token: token,
    });

    if (campaign.start_date) {
      adSetBody.append('start_time', new Date(campaign.start_date).toISOString());
    }
    if (campaign.end_date) {
      adSetBody.append('end_time', new Date(campaign.end_date).toISOString());
    }

    const adSetRes = await fetch(`${baseUrl}/${accountId}/adsets`, {
      method: 'POST',
      body: adSetBody,
    });
    const adSetData = await adSetRes.json();
    if (adSetData.error) {
      return Response.json({ error: adSetData.error.message, campaign_id: campaignId }, { status: 400 });
    }
    const adSetId = adSetData.id;

    // 3. Create Ad Creative
    const linkData = {
      message: ad.body,
      link: ad.link_url,
      name: ad.headline,
      call_to_action: {
        type: ad.call_to_action,
        value: { link: ad.link_url },
      },
    };

    if (ad.image_url) {
      linkData.picture = ad.image_url;
    }

    const creativeBody = new URLSearchParams({
      name: `${ad.name} - Creative`,
      object_story_spec: JSON.stringify({
        page_id: credentials.page_id || '0',
        link_data: linkData,
      }),
      access_token: token,
    });

    const creativeRes = await fetch(`${baseUrl}/${accountId}/adcreatives`, {
      method: 'POST',
      body: creativeBody,
    });
    const creativeData = await creativeRes.json();

    let adId = null;

    // 4. Create Ad (if creative succeeded)
    if (!creativeData.error && creativeData.id) {
      const adBody = new URLSearchParams({
        name: ad.name,
        adset_id: adSetId,
        creative: JSON.stringify({ creative_id: creativeData.id }),
        status: 'PAUSED',
        access_token: token,
      });

      const adRes = await fetch(`${baseUrl}/${accountId}/ads`, {
        method: 'POST',
        body: adBody,
      });
      const adData = await adRes.json();
      if (!adData.error) adId = adData.id;
    }

    return Response.json({
      success: true,
      campaign_id: campaignId,
      ad_set_id: adSetId,
      ad_id: adId,
      creative_id: creativeData.id,
      status: 'PAUSED',
      message: 'Campaign created successfully in PAUSED state. Activate it in Facebook Ads Manager.',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});