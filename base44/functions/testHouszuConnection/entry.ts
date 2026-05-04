import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const HOUSZU_APP_ID = "69d11abfe3a01036002a99a2";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const HOUSZU_SHARED_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY");
  const results = {};

  // Test 0: housszuPing via plain fetch (no auth headers — public function)
  try {
    const pingRes = await fetch(
      `https://base44.app/api/apps/${HOUSZU_APP_ID}/functions/housszuPing`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared_key: HOUSZU_SHARED_KEY }),
      }
    );
    const pingBody = await pingRes.json();
    results.housszuPing = { http_status: pingRes.status, response: pingBody };
  } catch (e) {
    results.housszuPing = { error: e.message };
  }

  const baseUrl = `https://base44.app/api/apps/${HOUSZU_APP_ID}/functions`;
  const headers = { "Content-Type": "application/json" };

  // Test 1: getDealDetails
  try {
    const res = await fetch(`${baseUrl}/getDealDetails`, {
      method: "POST", headers,
      body: JSON.stringify({ deal_id: "TEST-001", shared_key: HOUSZU_SHARED_KEY }),
    });
    results.getDealDetails = { http_status: res.status, response: await res.json() };
  } catch (e) {
    results.getDealDetails = { error: e.message };
  }

  // Test 2: getAvailableAgentsForOperatorTerritory
  try {
    const res = await fetch(`${baseUrl}/getAvailableAgentsForOperatorTerritory`, {
      method: "POST", headers,
      body: JSON.stringify({ zip_codes: ["07001"], counties: ["Middlesex"], state: "NJ", shared_key: HOUSZU_SHARED_KEY }),
    });
    results.getAvailableAgentsForOperatorTerritory = { http_status: res.status, response: await res.json() };
  } catch (e) {
    results.getAvailableAgentsForOperatorTerritory = { error: e.message };
  }

  // Test 3: updateDealStage
  try {
    const res = await fetch(`${baseUrl}/updateDealStage`, {
      method: "POST", headers,
      body: JSON.stringify({ deal_id: "TEST-001", new_stage: "accepted", shared_key: HOUSZU_SHARED_KEY }),
    });
    results.updateDealStage = { http_status: res.status, response: await res.json() };
  } catch (e) {
    results.updateDealStage = { error: e.message };
  }

  // Test 4: closeDeal
  try {
    const res = await fetch(`${baseUrl}/closeDeal`, {
      method: "POST", headers,
      body: JSON.stringify({ deal_id: "TEST-001", actual_commission: 1500000, shared_key: HOUSZU_SHARED_KEY }),
    });
    results.closeDeal = { http_status: res.status, response: await res.json() };
  } catch (e) {
    results.closeDeal = { error: e.message };
  }

  return Response.json({
    houszu_app_id: HOUSZU_APP_ID,
    invoke_method: "SDK internal (no raw fetch)",
    results,
  });
});