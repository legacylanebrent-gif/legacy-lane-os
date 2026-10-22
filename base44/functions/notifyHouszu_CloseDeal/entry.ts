// Notify Houszu that a referral deal closed (EstateSalen → Houszu closeDeal).
//
// Referral Rebuild Phase 1 authorization rules:
//   1. Service-to-service: a request carrying the HOUSZU_SHARED_API_KEY in the
//      `x-houszu-shared-key` header is accepted (Houszu backend access).
//   2. A platform admin may close any deal.
//   3. Any OTHER authenticated user must have authority over THE SPECIFIC
//      deal (its agent_id or operator_id in ReferralDealPipeline /
//      ReferralDealAgreement). Arbitrary authenticated-user requests with
//      unknown deal ids are rejected.
// The commission amount is validated as a non-negative finite number.
//
// While legacy referral compensation is paused, closing a deal triggers NO
// wallet credit — the response carries compensation_credits_created: false
// so callers and integrations can see that explicitly.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import {
  LEGACY_REFERRAL_COMPENSATION_ENABLED,
  LEGACY_COMPENSATION_PAUSED_CODE,
  LEGACY_COMPENSATION_PAUSED_MESSAGE,
} from "../../shared/referralCompensationControl.ts";

const HOUSZU_APP_ID = "69d11abfe3a01036002a99a2";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { deal_id, actual_commission } = body;

    if (!deal_id || actual_commission === undefined) {
      return Response.json({ error: "deal_id and actual_commission are required" }, { status: 400 });
    }
    if (typeof deal_id !== "string" || !deal_id.trim()) {
      return Response.json({ error: "deal_id must be a non-empty string" }, { status: 400 });
    }
    if (typeof actual_commission !== "number" || !Number.isFinite(actual_commission) || actual_commission < 0) {
      return Response.json({ error: "actual_commission must be a non-negative number" }, { status: 400 });
    }

    // ── Authorization ──
    const serviceKey = req.headers.get("x-houszu-shared-key") || "";
    const expectedServiceKey = Deno.env.get("HOUSZU_SHARED_API_KEY") || "";

    let authorized = false;
    let principal = "service";

    if (expectedServiceKey && serviceKey && serviceKey === expectedServiceKey) {
      authorized = true;
    } else {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (user.role === "admin") {
        authorized = true;
        principal = `admin:${user.id}`;
      } else {
        // Caller must have authority over THIS specific deal.
        const deals = await base44.asServiceRole.entities.ReferralDealPipeline.filter({ deal_id });
        const agreements =
          deals.length === 0
            ? await base44.asServiceRole.entities.ReferralDealAgreement.filter({ deal_id })
            : [];
        const record = deals[0] || agreements[0];
        const hasAuthority =
          record && (record.agent_id === user.id || record.operator_id === user.id);
        if (!hasAuthority) {
          return Response.json(
            { error: "You are not authorized to close this deal" },
            { status: 403 }
          );
        }
        authorized = true;
        principal = `user:${user.id}`;
      }
    }

    if (!authorized) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const HOUSZU_SHARED_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY");
    const result = await base44.asServiceRole.functions.invoke(
      "closeDeal",
      { deal_id, actual_commission, shared_key: HOUSZU_SHARED_KEY },
      { appId: HOUSZU_APP_ID }
    );

    console.log(
      `[notifyHouszu_CloseDeal] principal=${principal} deal=${deal_id} commission=${actual_commission} referral=${result?.referral_amount_due_to_brent} credits_enabled=${LEGACY_REFERRAL_COMPENSATION_ENABLED}`
    );

    return Response.json({
      ...(result || {}),
      ...(LEGACY_REFERRAL_COMPENSATION_ENABLED
        ? {}
        : {
            compensation_credits_created: false,
            code: LEGACY_COMPENSATION_PAUSED_CODE,
            note: LEGACY_COMPENSATION_PAUSED_MESSAGE,
          }),
    });
  } catch (error) {
    console.error("[notifyHouszu_CloseDeal] Error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});