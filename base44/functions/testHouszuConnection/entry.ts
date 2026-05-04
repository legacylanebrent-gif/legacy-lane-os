import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const HOUSZU_API_URL = Deno.env.get('HOUSZU_API_URL');
  const HOUSZU_API_KEY = Deno.env.get('HOUSZU_SHARED_API_KEY') || Deno.env.get('HOUSZU_API_KEY');

  const results = {};

  const commonHeaders = {
    'Content-Type': 'application/json',
    'x-houszu-shared-key': HOUSZU_API_KEY,
    'User-Agent': 'LegacyLaneOS/1.0',
  };

  // Test 1: getDealDetails (POST with JSON body)
  try {
    const r = await fetch(`${HOUSZU_API_URL}/functions/getDealDetails`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ deal_id: 'TEST-001' }),
    });
    results.getDealDetails = { status: r.status, body: await r.text() };
  } catch (e) {
    results.getDealDetails = { error: e.message };
  }

  // Test 2: getAvailableAgentsForOperatorTerritory
  try {
    const r = await fetch(`${HOUSZU_API_URL}/functions/getAvailableAgentsForOperatorTerritory`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ zip_codes: ['07001'], counties: ['Middlesex'], state: 'NJ' }),
    });
    results.getAvailableAgentsForOperatorTerritory = { status: r.status, body: await r.text() };
  } catch (e) {
    results.getAvailableAgentsForOperatorTerritory = { error: e.message };
  }

  // Test 3: updateDealStage
  try {
    const r = await fetch(`${HOUSZU_API_URL}/functions/updateDealStage`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ deal_id: 'TEST-001', new_stage: 'accepted' }),
    });
    results.updateDealStage = { status: r.status, body: await r.text() };
  } catch (e) {
    results.updateDealStage = { error: e.message };
  }

  // Test 4: closeDeal
  try {
    const r = await fetch(`${HOUSZU_API_URL}/functions/closeDeal`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ deal_id: 'TEST-001', actual_commission: 1500000 }),
    });
    results.closeDeal = { status: r.status, body: await r.text() };
  } catch (e) {
    results.closeDeal = { error: e.message };
  }

  return Response.json({
    houszu_url: HOUSZU_API_URL,
    key_present: !!HOUSZU_API_KEY,
    results,
  });
});