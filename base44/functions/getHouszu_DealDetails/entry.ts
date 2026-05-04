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
    const HOUSZU_API_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY") || Deno.env.get("HOUSZU_API_KEY");

    const { deal_id } = await req.json();
    if (!deal_id) {
      return Response.json({ error: "deal_id is required" }, { status: 400 });
    }

    const resp = await fetch(`${HOUSZU_API_URL}/functions/getDealDetails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-houszu-shared-key": HOUSZU_API_KEY,
        "User-Agent": "LegacyLaneOS/1.0",
      },
      body: JSON.stringify({ deal_id }),
    });

    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch (error) {
    console.error("[getHouszu_DealDetails] Error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});