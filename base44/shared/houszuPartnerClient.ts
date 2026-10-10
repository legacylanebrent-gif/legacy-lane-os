// ─────────────────────────────────────────────────────────────
// houszuPartnerClient.ts — ESTATESALEN'S SINGLE AUTHORITATIVE
// client for the certified Houszu Partner API v1.6.0 production
// dispatcher (Phase 7D.2 gateway activation).
//
// ONE dispatcher, ONE configuration:
//   Host:   https://houszuos.base44.app
//   Route:  /functions/savorStylePartnerApi
//   Method: POST (operation supplied in the JSON body — never in the URL)
//   Auth:   Authorization: Bearer <HOUSZU_PARTNER_SERVICE_TOKEN>
//           (server-to-server only; token lives ONLY in the app secret
//           store — never in client code, DB records, payloads or logs)
//
// The partner identity of every request is derived on Houszu from the
// authenticated credential (PartnerApiCredential.partner_app) —
// source_app is never payload-supplied.
// ─────────────────────────────────────────────────────────────

import { secrets } from "base44:runtime";
import { getDispatcherMapping } from "./canonicalContract.ts";

const GATEWAY_HOST = "https://houszuos.base44.app";
const GATEWAY_ROUTE = "/functions/savorStylePartnerApi";
export const ESTATESALEN_SOURCE_DOMAIN = "estatesalen.com";

async function callDispatcher(operation, data = {}, timeoutMs = 20000) {
  const token = secrets.get("HOUSZU_PARTNER_SERVICE_TOKEN") || "";
  if (!token) {
    return { ok: false, status: 0, error: "credential_not_configured", body: null };
  }
  let res;
  try {
    res = await fetch(GATEWAY_HOST + GATEWAY_ROUTE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ operation, ...data }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return { ok: false, status: 0, error: "network_error: " + e.message, body: null };
  }
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { ok: res.ok, status: res.status, error: null, body };
}

// Public self-describing contract discovery (no auth, no data).
export async function getContract() {
  return callDispatcher("get_contract");
}

// Authenticated liveness probe — also proves which partner the
// configured credential maps to (partner_app in the response).
export async function gatewayHealth() {
  return callDispatcher("health");
}

// Safe reconciliation read by request_id — Houszu's canonical ledger
// stays authoritative for delivery state.
export async function getIngestionStatus(requestId) {
  return callDispatcher("get_ingestion_status", { request_id: requestId });
}

// Build the exact dispatcher ingest request from an outbox record.
// Deterministic: the same record always produces the same payload
// (required for identical-payload idempotent replay). Absent contexts
// are omitted — never fabricated.
export function buildIngestRequest(rec) {
  const map = getDispatcherMapping(rec.event_type);
  if (!map) return null;

  const identity = {};
  const ic = rec.identity_context || {};
  if (rec.masterUserID) identity.canonical_person_id = rec.masterUserID;
  if (ic.email) identity.email = String(ic.email).trim().toLowerCase();
  if (ic.first_name) identity.first_name = String(ic.first_name).slice(0, 60);
  if (ic.last_name) identity.last_name = String(ic.last_name).slice(0, 60);
  if (!identity.email && !identity.canonical_person_id) return null; // fail closed — identity required

  const req = {
    request_id: rec.request_id,
    source_domain: ESTATESALEN_SOURCE_DOMAIN,
    business_action: map.business_action,
    identity,
  };

  const pc = rec.product_context || {};
  if (pc.product_id) {
    req.product_context = { product_id: pc.product_id };
    if (pc.relationship_type) req.product_context.relationship_type = pc.relationship_type;
  }
  if (rec.agent_context && rec.agent_context.agent_id) {
    req.agent_context = { agent_id: rec.agent_context.agent_id };
  }
  if (rec.territory_context && rec.territory_context.territory_id) {
    req.territory_context = { territory_id: rec.territory_context.territory_id };
  }

  // Consent: forwarded ONLY when full consent evidence exists. Absent
  // consent is never fabricated — the key is simply omitted.
  const cc = rec.consent_context || {};
  if (cc.status && cc.status !== "absent" && cc.topic) {
    req.consent_context = {
      topic_key: cc.topic,
      status: cc.status === "opted_in" ? "subscribed" : "unsubscribed",
      consent_method: cc.channel || "estatesalen_email",
      consent_context: (cc.evidence && cc.evidence.ui_element) || "explicit_checkbox",
    };
  }

  if (map.events && map.events.length) {
    req.events = map.events.map((e) => ({ event_name: e.event_name, properties: {} }));
  }
  return req;
}

// Deliver one outbox record through the certified dispatcher.
export async function ingestConsumerActivity(rec) {
  const reqPayload = buildIngestRequest(rec);
  if (!reqPayload) {
    return { ok: false, status: 0, error: "no_dispatcher_mapping_or_identity", body: null, request_payload: null };
  }
  const out = await callDispatcher("ingest_consumer_activity", reqPayload, 30000);
  return { ...out, request_payload: reqPayload };
}