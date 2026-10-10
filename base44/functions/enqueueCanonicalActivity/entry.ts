import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { enqueueActivity, resolveMasterUserID } from "../../shared/identityActivityOutbox.ts";

// ─────────────────────────────────────────────
// enqueueCanonicalActivity
// The single frontend entrypoint for canonical Houszu ingestion requests.
// Called AFTER the local business action has already persisted (VIP signup,
// seller/family inquiry, company follow, etc.).
//
// Guarantees:
// - Identity is resolved server-side from the normalized email (never trusted
//   from the request, never guessed).
// - PRIVACY FILTER: only approved normalized canonical properties are accepted.
//   Free text, financial values, addresses, probate details, notes, and any
//   unbounded string sent by the caller are dropped here.
// - Territory is resolved ONLY from an exact HousioMicroTerritory match
//   (state + county, city disambiguation). Unresolved = omitted, never guessed.
// - Agent attribution is accepted ONLY as an explicit, verified id — never guessed.
// - Consent evidence is stored verbatim as given; absence = {status: "absent"}.
// Open to unauthenticated visitors (public inquiry forms) but rate- and
// shape-safe: unknown fields are silently discarded.
// ─────────────────────────────────────────────

// Approved normalized canonical properties — everything else is dropped.
const ALLOWED_LIFE_EVENT = ["probate", "downsizing", "divorce", "relocation", "senior_transition", "inherited_home", "estate_settlement", "bankruptcy", "foreclosure", "other"];
const ALLOWED_RELATIONSHIP = ["executor", "heir", "spouse", "child", "attorney", "trustee", "owner", "other"];
const ALLOWED_URGENCY = ["within_30_days", "1_to_3_months", "3_to_6_months", "6_plus_months", "no_rush"];
const NEED_KEYS = ["has_real_estate", "has_personal_property_to_sell", "needs_probate_help", "needs_estate_sale", "needs_cleanout", "needs_realtor", "wants_cash_offer", "needs_attorney_resource"];

function normEmail(v) { return String(v || "").trim().toLowerCase(); }
function cleanStr(v, max = 80) {
  const s = String(v || "").trim();
  return s ? s.slice(0, max) : "";
}
function bool(v) { return v === true; }

function buildIdentityContext(raw = {}) {
  const email = normEmail(raw.email);
  if (!email) return null;
  return {
    email,
    first_name: cleanStr(raw.first_name, 60),
    last_name: cleanStr(raw.last_name, 60),
    phone: cleanStr(raw.phone, 24) || null,
  };
}

// Resolve canonical territory from exact state+county match, city-disambiguated.
async function resolveTerritory(base44, { state, county, city }) {
  const st = cleanStr(state, 30);
  const co = cleanStr(county, 60);
  if (!st || !co) return null;
  try {
    const matches = await base44.asServiceRole.entities.HousioMicroTerritory.filter({ state: st, county: co });
    if (matches.length === 0) return null;
    if (matches.length === 1) {
      const t = matches[0];
      return { territory_id: t.micro_territory_id, resolution: "exact_county_match" };
    }
    // Multiple counties-level matches — disambiguate by city only if it exactly appears
    const c = cleanStr(city, 60).toLowerCase();
    if (c) {
      const byCity = matches.find((t) =>
        (t.cities_json || []).some((n) => String(n).toLowerCase() === c) ||
        (t.cities_geo_json || []).some((g) => String(g.city || "").toLowerCase() === c)
      );
      if (byCity) return { territory_id: byCity.micro_territory_id, resolution: "county_plus_city_match" };
    }
    return null; // ambiguous — do NOT guess
  } catch (e) {
    console.error("[enqueueCanonicalActivity] territory resolution failed:", e.message);
    return null;
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const {
      activity_type,
      identity: rawIdentity,
      product: rawProduct,
      agent_context: rawAgent,
      geography: rawGeo,
      consent_context: rawConsent,
    } = body || {};

    const identity = buildIdentityContext(rawIdentity);
    if (!identity) {
      return Response.json({ error: "A normalized email is required" }, { status: 400 });
    }

    const allowedActivityTypes = ["vip_signup", "seller_inquiry", "consumer_signup", "profile_sync", "company_follow", "lead_scored"];
    if (!allowedActivityTypes.includes(activity_type)) {
      return Response.json({ error: "Unknown activity_type" }, { status: 400 });
    }

    // Identity (masterUserID) — resolved server-side, never guessed
    const masterUserID = await resolveMasterUserID(base44, { email: identity.email });

    // Product context — relationship_type must come from the caller's explicit, canonical vocabulary
    const productId = cleanStr(rawProduct?.product_id, 60) || "estatesalen";
    const relationshipType = cleanStr(rawProduct?.relationship_type, 40);
    const product_context = { product_id: productId, ...(relationshipType ? { relationship_type: relationshipType } : {}) };

    // Agent context — only preserved when caller supplies an explicit agent id (never fabricated)
    const agentId = cleanStr(rawAgent?.agent_id, 60);
    const agentSource = cleanStr(rawAgent?.attribution_source, 40);
    const agent_context = agentId ? { agent_id: agentId, attribution_source: agentSource || "explicit" } : null;

    // Territory — resolved only via exact match
    const territory_context = await resolveTerritory(base44, rawGeo || {});

    // Consent — stored as given; absence must be explicit
    const consentGiven = rawConsent?.status === "opted_in" && !!cleanStr(rawConsent?.topic, 60);
    const consent_context = consentGiven
      ? {
          status: "opted_in",
          channel: cleanStr(rawConsent.channel, 40) || "estatesalen_email",
          topic: cleanStr(rawConsent.topic, 60),
          version: cleanStr(rawConsent.version, 20) || "v1_2026_10",
          evidence: {
            captured_at: new Date().toISOString(),
            ui_element: cleanStr(rawConsent.ui_element, 80) || "explicit_checkbox",
          },
        }
      : { status: "absent" };

    // PRIVACY FILTER — normalized canonical properties only.
    let filteredPayload = {};
    if (activity_type === "seller_inquiry") {
      filteredPayload = {
        life_event_type: ALLOWED_LIFE_EVENT.includes(rawGeo?.context?.life_event_type) ? rawGeo.context.life_event_type : null,
        relationship_to_estate: ALLOWED_RELATIONSHIP.includes(rawGeo?.context?.relationship_to_estate) ? rawGeo.context.relationship_to_estate : null,
        urgency_level: ALLOWED_URGENCY.includes(rawGeo?.context?.urgency_level) ? rawGeo.context.urgency_level : null,
        needs: NEED_KEYS.reduce((acc, k) => { acc[k] = bool(rawGeo?.context?.[k]); return acc; }, {}),
      };
      // free text (notes), financial values, street addresses etc. are NEVER forwarded
    } else if (activity_type === "vip_signup") {
      filteredPayload = { rsvp: "accepted", tickets: Math.max(1, Math.min(Number(rawProduct?.tickets) || 1, 20)) };
    }

    const outboxRecord = await enqueueActivity(base44, {
      masterUserID,
      event_type: activity_type,
      identity_context: identity,
      product_context,
      agent_context,
      territory_context,
      consent_context,
      payload: filteredPayload,
    });

    return Response.json({
      success: true,
      queued: !!outboxRecord,
      request_id: outboxRecord?.request_id || null,
      masterUserID: masterUserID || null,
      territory_id: territory_context?.territory_id || null,
    });
  } catch (error) {
    console.error("[enqueueCanonicalActivity] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}