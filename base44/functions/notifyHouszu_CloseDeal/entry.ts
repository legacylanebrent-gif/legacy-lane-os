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

    const { deal_id, actual_commission } = await req.json();

    if (!deal_id || actual_commission === undefined) {
      return Response.json({ error: "deal_id and actual_commission are required" }, { status: 400 });
    }

    const resp = await fetch(`${HOUSZU_API_URL}/functions/closeDeal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-houszu-shared-key": HOUSZU_API_KEY,
        "User-Agent": "LegacyLaneOS/1.0",
      },
      body: JSON.stringify({ deal_id, actual_commission }),
    });

    const data = await resp.json();
    // data.referral_amount_due_to_brent = actual_commission * 0.20
    console.log(`[notifyHouszu_CloseDeal] deal=${deal_id} commission=${actual_commission} referral=${data.referral_amount_due_to_brent}`);
    return Response.json(data, { status: resp.status });
  } catch (error) {
    console.error("[notifyHouszu_CloseDeal] Error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});