import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const HOUSZU_APP_ID = "697206f0efd7bfde6e06b474";

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

    const { deal_id, new_stage } = await req.json();
    if (!deal_id || !new_stage) {
      return Response.json({ error: "deal_id and new_stage are required" }, { status: 400 });
    }

    const HOUSZU_SHARED_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY");
    const result = await base44.asServiceRole.functions.invoke(
      "updateDealStage",
      { deal_id, new_stage, shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );

    console.log(`[notifyHouszu_DealStageUpdate] deal=${deal_id} stage=${new_stage}`);
    return Response.json(result);
  } catch (error) {
    console.error("[notifyHouszu_DealStageUpdate] Error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});