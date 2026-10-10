// ─────────────────────────────────────────────────────────────
// canonicalContract.ts — FROZEN VALIDATION SNAPSHOT
// Houszu Partner API v1.6.0 consumer-activity ingestion contract.
//
// THIS IS NOT AN INDEPENDENT ESTATESALEN EVENT REGISTRY.
// The authoritative vocabulary lives in the Houszu central registry /
// certified Partner API contract. This module is validation METADATA ONLY,
// frozen against the certified Phase 7D.1A contract definitions so the
// outbox can validate activity names while the Houszu gateway is not yet
// reachable. When the gateway is live, contract-driven validation from
// Houszu supersedes this snapshot; re-freeze it on each certified contract
// update only.
// ─────────────────────────────────────────────────────────────

export const CANONICAL_CONTRACT_VERSION = "1.6.0";

// Canonical ingestion OPERATIONS — legitimate canonical ingestion requests
// that synchronize state (identity/profile) and are NOT behavioral events.
// These must never be rejected merely because they are not event names.
export const CANONICAL_INGESTION_OPERATIONS = [
  "profile_sync",
];

// Canonical EVENTS — behavioral activity events in the certified v1.6.0
// vocabulary (as certified during Phase 7D.1A: consumer signup, VIP RSVP,
// seller inquiry, company follow, lead scoring, sale creation).
export const CANONICAL_EVENTS = [
  "consumer_signup",
  "vip_signup",
  "seller_inquiry",
  "company_follow",
  "lead_scored",
  "sale_created",
];

export const CANONICAL_ACTIVITY_TYPES = [
  ...CANONICAL_INGESTION_OPERATIONS,
  ...CANONICAL_EVENTS,
];

export function isCanonicalActivityType(name) {
  return CANONICAL_ACTIVITY_TYPES.includes(String(name || "").trim());
}

export function isCanonicalEvent(name) {
  return CANONICAL_EVENTS.includes(String(name || "").trim());
}

export function isCanonicalOperation(name) {
  return CANONICAL_INGESTION_OPERATIONS.includes(String(name || "").trim());
}

// ─────────────────────────────────────────────────────────────
// Legacy Customer.io event names → canonical resolution.
//
// Deterministic rule (spec 11):
//   A. Mapped  — the legacy name normalizes (CIO dot-naming → canonical
//      snake_case) to a name ALREADY present verbatim in the certified
//      vocabulary (e.g. "sale.created" → "sale_created"). No canonical
//      name is invented; the mapping only resolves naming convention.
//   B. Canonical — the name is already an approved canonical
//      event/operation; allowed as-is.
//   C. registry_gap — no approved mapping exists. The event is NEVER
//      forwarded to Houszu under a made-up name; it is quarantined as a
//      non-deliverable review state with diagnostics for admin review.
// ─────────────────────────────────────────────────────────────
export function resolveLegacyEventName(name) {
  const raw = String(name || "").trim();
  if (!raw) {
    return { kind: "registry_gap", canonical_name: null, legacy_name: raw, reason: "empty_event_name" };
  }
  if (CANONICAL_EVENTS.includes(raw)) {
    return { kind: "canonical_event", canonical_name: raw };
  }
  if (CANONICAL_INGESTION_OPERATIONS.includes(raw)) {
    return { kind: "canonical_operation", canonical_name: raw };
  }
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (CANONICAL_ACTIVITY_TYPES.includes(normalized)) {
    return { kind: "mapped", canonical_name: normalized, legacy_name: raw };
  }
  return {
    kind: "registry_gap",
    canonical_name: null,
    legacy_name: raw,
    reason: `legacy event "${raw}" has no approved canonical mapping in the certified v1.6.0 contract`,
  };
}

// ─────────────────────────────────────────────────────────────
// Dispatcher mapping (certified live Phase 7D.2 gateway contract).
// Maps each canonical outbox event_type to the ONE dispatcher
// ingest request shape: a business_action plus (where the certified
// live contract defines them) canonical registry events.
// source_app is credential-derived on Houszu and is NEVER
// payload-supplied; absent contexts are omitted, never fabricated.
// ─────────────────────────────────────────────────────────────
export const DISPATCHER_MAPPINGS = {
  consumer_signup: {
    business_action: "registration",
    events: [
      { event_name: "user_registered", properties: {} },
      { event_name: "product_joined", properties: {} },
    ],
  },
  profile_sync: { business_action: "profile_sync", events: [] },
  vip_signup: { business_action: "vip_signup", events: [] },
  seller_inquiry: { business_action: "seller_inquiry", events: [] },
  company_follow: { business_action: "company_follow", events: [] },
  lead_scored: { business_action: "lead_scored", events: [] },
  sale_created: { business_action: "sale_created", events: [] },
};

export function getDispatcherMapping(eventType) {
  const name = String(eventType || "").trim();
  if (CANONICAL_ACTIVITY_TYPES.includes(name)) {
    return DISPATCHER_MAPPINGS[name] || null;
  }
  return null;
}