import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const HOUSZU_APP_ID = "69d11abfe3a01036002a99a2";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // body: { agent_id, MasterAgentID, county, state, zip_codes, towns }

    const HOUSZU_SHARED_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY");
    const result = await base44.asServiceRole.functions.invoke(
      "getAvailableAgentsForOperatorTerritory",
      { ...body, shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );

    return Response.json(result);
  } catch (error) {
    console.error("[getMatchingOperatorsForTerritory] Error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});