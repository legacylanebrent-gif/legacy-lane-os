import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const HOUSZU_APP_ID = "697206f0efd7bfde6e06b474";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const HOUSZU_SHARED_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY");
  const results = {};

  // Test 0: housszuPing (connectivity + key match diagnostic)
  try {
    const r = await base44.asServiceRole.functions.invoke(
      "housszuPing",
      { shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );
    results.housszuPing = { success: true, response: r };
  } catch (e) {
    results.housszuPing = { error: e.message };
  }

  // Test 1: getDealDetails
  try {
    const r = await base44.asServiceRole.functions.invoke(
      "getDealDetails",
      { deal_id: "TEST-001", shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );
    results.getDealDetails = { success: true, response: r };
  } catch (e) {
    results.getDealDetails = { error: e.message };
  }

  // Test 2: getAvailableAgentsForOperatorTerritory
  try {
    const r = await base44.asServiceRole.functions.invoke(
      "getAvailableAgentsForOperatorTerritory",
      { zip_codes: ["07001"], counties: ["Middlesex"], state: "NJ", shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );
    results.getAvailableAgentsForOperatorTerritory = { success: true, response: r };
  } catch (e) {
    results.getAvailableAgentsForOperatorTerritory = { error: e.message };
  }

  // Test 3: updateDealStage
  try {
    const r = await base44.asServiceRole.functions.invoke(
      "updateDealStage",
      { deal_id: "TEST-001", new_stage: "accepted", shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );
    results.updateDealStage = { success: true, response: r };
  } catch (e) {
    results.updateDealStage = { error: e.message };
  }

  // Test 4: closeDeal
  try {
    const r = await base44.asServiceRole.functions.invoke(
      "closeDeal",
      { deal_id: "TEST-001", actual_commission: 1500000, shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );
    results.closeDeal = { success: true, response: r };
  } catch (e) {
    results.closeDeal = { error: e.message };
  }

  return Response.json({
    houszu_app_id: HOUSZU_APP_ID,
    invoke_method: "SDK internal (no raw fetch)",
    results,
  });
});