import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

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

    const HOUSZU_API_URL = Deno.env.get("HOUSZU_API_URL");
    const HOUSZU_API_KEY = Deno.env.get("HOUSZU_API_KEY");

    if (!HOUSZU_API_URL || !HOUSZU_API_KEY) {
      return Response.json({ error: "HOUSZU_API_URL or HOUSZU_API_KEY not set" }, { status: 500 });
    }

    const body = await req.json();
    // body: { agent_id, MasterAgentID, county, state, zip_codes, towns }

    const resp = await fetch(`${HOUSZU_API_URL}/functions/getAvailableAgentsForOperatorTerritory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-houszu-shared-key": HOUSZU_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch (error) {
    console.error("[getMatchingOperatorsForTerritory] Error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});