import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { credentials, date_range } = await req.json();

    if (!credentials?.ad_account_id || !credentials?.access_token) {
      return Response.json({ error: 'Missing Facebook Ads credentials' }, { status: 400 });
    }

    const accountId = credentials.ad_account_id;
    const token = credentials.access_token;
    const baseUrl = `https://graph.facebook.com/v19.0`;

    // Map date_range to Facebook date_preset
    const datePresetMap = {
      today: 'today',
      yesterday: 'yesterday',
      last_7d: 'last_7d',
      last_14d: 'last_14d',
      last_30d: 'last_30d',
      this_month: 'this_month',
    };
    const datePreset = datePresetMap[date_range] || 'last_7d';

    // Fetch campaigns
    const campaignUrl = `${baseUrl}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,start_time,stop_time&access_token=${token}&limit=50`;
    const campaignRes = await fetch(campaignUrl);
    const campaignData = await campaignRes.json();

    if (campaignData.error) {
      return Response.json({ error: campaignData.error.message }, { status: 400 });
    }

    const campaigns = campaignData.data || [];

    // Fetch insights for each campaign
    const insights = {};
    await Promise.all(campaigns.map(async (c) => {
      try {
        const insightUrl = `${baseUrl}/${c.id}/insights?fields=impressions,clicks,spend,reach,actions&date_preset=${datePreset}&access_token=${token}`;
        const insightRes = await fetch(insightUrl);
        const insightData = await insightRes.json();
        if (insightData.data && insightData.data.length > 0) {
          const d = insightData.data[0];
          // Extract leads from actions
          const leadsAction = (d.actions || []).find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
          insights[c.id] = {
            impressions: d.impressions || 0,
            clicks: d.clicks || 0,
            spend: d.spend || '0',
            reach: d.reach || 0,
            leads: leadsAction ? leadsAction.value : 0,
          };
        } else {
          insights[c.id] = { impressions: 0, clicks: 0, spend: '0', reach: 0, leads: 0 };
        }
      } catch {
        insights[c.id] = { impressions: 0, clicks: 0, spend: '0', reach: 0, leads: 0 };
      }
    }));

    return Response.json({ campaigns, insights });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});