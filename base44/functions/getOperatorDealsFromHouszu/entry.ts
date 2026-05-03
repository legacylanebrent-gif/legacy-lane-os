import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const operatorId = url.searchParams.get('operator_id');
  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';

  if (!incomingKey || incomingKey !== expectedKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!operatorId) {
    return Response.json({ error: 'operator_id required' }, { status: 400 });
  }

  const houszu_url = Deno.env.get('HOUSZU_API_URL');
  const houszu_key = Deno.env.get('HOUSZU_API_KEY');

  if (!houszu_url || !houszu_key) {
    return Response.json({ error: 'Houszu API not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${houszu_url}/api/getDealsForOperator?operator_id=${operatorId}`, {
      headers: {
        'x-houszu-shared-key': houszu_key
      }
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch from Houszu' }, { status: response.status });
    }

    const data = await response.json();

    return Response.json({
      success: true,
      deals: data.deals || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});