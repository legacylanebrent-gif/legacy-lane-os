import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const accessToken = Deno.env.get('META_ACCESS_TOKEN');
    const adAccountId = Deno.env.get('META_AD_ACCOUNT_ID');

    if (!accessToken || !adAccountId) {
      return Response.json({ error: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID secrets required' }, { status: 400 });
    }

    // Format account ID — Meta requires act_ prefix
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Get spend for current month
    const now = new Date();
    const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const until = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 400 });
    }

    const spend = data.data?.[0]?.spend ? parseFloat(data.data[0].spend) : 0;
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthly = daysElapsed > 0 ? (spend / daysElapsed) * daysInMonth : 0;

    return Response.json({
      spend_this_month: spend,
      projected_monthly: parseFloat(projectedMonthly.toFixed(2)),
      days_elapsed: daysElapsed,
      period: { since, until }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});