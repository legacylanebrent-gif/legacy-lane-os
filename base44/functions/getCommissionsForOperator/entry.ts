import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const HOUSZU_API_URL = Deno.env.get('HOUSZU_API_URL') || '';
    const HOUSZU_API_KEY = Deno.env.get('HOUSZU_API_KEY') || '';

    if (!HOUSZU_API_URL || !HOUSZU_API_KEY) {
      return Response.json(
        { error: 'Houszu API credentials not configured' },
        { status: 500 }
      );
    }

    const endpoint = `${HOUSZU_API_URL}/api/getCommissionsForOperator`;

    const houszuRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-houszu-shared-key': HOUSZU_API_KEY,
      },
    });

    if (!houszuRes.ok) {
      console.error(`[HOUSZU] API error ${houszuRes.status}`);
      const errorText = await houszuRes.text();
      return Response.json(
        { error: 'Failed to fetch commissions from Houszu', details: errorText },
        { status: houszuRes.status }
      );
    }

    const data = await houszuRes.json();

    return Response.json({
      commissions: data.commissions || [],
      total_expected: data.total_expected || 0,
      total_actual: data.total_actual || 0,
      pending_count: data.pending_count || 0,
    });
  } catch (error) {
    console.error('Error fetching commissions:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});