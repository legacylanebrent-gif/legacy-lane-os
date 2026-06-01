import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { date_preset = 'this_month' } = await req.json().catch(() => ({}));

    const token = Deno.env.get('META_ACCESS_TOKEN');
    const accountId = Deno.env.get('META_AD_ACCOUNT_ID');

    if (!token || !accountId) {
      return Response.json({ error: 'META_ACCESS_TOKEN or META_AD_ACCOUNT_ID not configured' }, { status: 500 });
    }

    const base = 'https://graph.facebook.com/v19.0';

    // Fetch campaigns
    const campRes = await fetch(`${base}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time&access_token=${token}&limit=50`);
    const campData = await campRes.json();

    if (campData.error) {
      return Response.json({ error: campData.error.message }, { status: 400 });
    }

    const campaigns = campData.data || [];

    // Fetch insights for each campaign in parallel
    await Promise.all(campaigns.map(async (c) => {
      try {
        const insRes = await fetch(`${base}/${c.id}/insights?fields=impressions,clicks,spend,reach,cpc,ctr,actions&date_preset=${date_preset}&access_token=${token}`);
        const insData = await insRes.json();
        if (insData.data && insData.data.length > 0) {
          const d = insData.data[0];
          const leadsAction = (d.actions || []).find(a => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead');
          c.insights = {
            impressions: parseInt(d.impressions || 0),
            clicks: parseInt(d.clicks || 0),
            spend: parseFloat(d.spend || 0),
            reach: parseInt(d.reach || 0),
            cpc: parseFloat(d.cpc || 0),
            ctr: parseFloat(d.ctr || 0),
            leads: leadsAction ? parseInt(leadsAction.value) : 0,
          };
        } else {
          c.insights = { impressions: 0, clicks: 0, spend: 0, reach: 0, cpc: 0, ctr: 0, leads: 0 };
        }
      } catch {
        c.insights = { impressions: 0, clicks: 0, spend: 0, reach: 0, cpc: 0, ctr: 0, leads: 0 };
      }
    }));

    return Response.json({ campaigns });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});