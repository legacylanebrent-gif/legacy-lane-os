// Shared durable outbox for the canonical Houszu Partner API v1.6.0
// consumer-activity ingestion contract.
//
// Every consumer activity that must reach Houszu is enqueued here with a
// stable idempotency key; flushIdentityOutbox drains the queue with
// claim-leased concurrency protection, retry/backoff, and dead-lettering.
// Until the Houszu-side gateway endpoint is live, events accumulate safely.

import { secrets } from "base44:runtime";
import { resolveLegacyEventName } from "./canonicalContract.ts";

export const OUTBOX_CONTRACT_VERSION = "1.6.0";
export const OUTBOX_SOURCE_APP = "estatesalen";

function newRequestId() {
  return `estatesalen-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Resolve a user's canonical masterUserID from the local User entity.
// Never guessed: returns "" when not resolved.
export async function resolveMasterUserID(base44, { email, userId }) {
  try {
    if (userId) {
      const byId = await base44.asServiceRole.entities.User.filter({ id: userId });
      if (byId.length > 0 && byId[0].masterUserID) return byId[0].masterUserID.toLowerCase();
    }
    if (email) {
      const norm = String(email).trim().toLowerCase();
      const byEmail = await base44.asServiceRole.entities.User.filter({ email: norm });
      if (byEmail.length > 0 && byEmail[0].masterUserID) return byEmail[0].masterUserID.toLowerCase();
    }
  } catch (e) {
    console.error("[identityActivityOutbox] masterUserID lookup failed:", e.message);
  }
  return "";
}

// Enqueue one canonical activity. Returns the outbox record (or null on failure —
// the caller's local business action must never depend on enqueue success).
export async function enqueueActivity(
  base44,
  {
    request_id,
    masterUserID,
    localUserID,
    event_type,
    identity_context,
    product_context,
    agent_context,
    territory_context,
    consent_context,
    payload,
    occurred_at,
  }
) {
  try {
    // Canonical validation (contract metadata — see canonicalContract.ts):
    // - canonical event/operation name → queued as pending (deliverable)
    // - legacy name with an approved deterministic mapping → mapped exactly
    //   once to the existing canonical name; original name kept as diagnostics
    // - anything else → registry_gap quarantine: NEVER delivered to Houszu,
    //   never retried, and the raw caller payload is NOT stored (privacy).
    const resolved = resolveLegacyEventName(event_type);
    const quarantined = resolved.kind === "registry_gap";
    const record = {
      request_id: request_id || newRequestId(),
      contract_version: OUTBOX_CONTRACT_VERSION,
      source_app: OUTBOX_SOURCE_APP,
      masterUserID: (masterUserID || "").toLowerCase(),
      localUserID: localUserID || "",
      event_type: quarantined ? String(event_type || "unknown") : resolved.canonical_name,
      legacy_event_name:
        resolved.kind === "mapped" || quarantined ? (resolved.legacy_name || event_type || null) : null,
      identity_context: identity_context || {},
      product_context: product_context || {},
      agent_context: agent_context || null,
      territory_context: territory_context || null,
      consent_context: consent_context || { status: "absent" },
      payload: quarantined ? {} : (payload || {}),
      occurred_at: occurred_at || new Date().toISOString(),
      status: quarantined ? "registry_gap" : "pending",
      attempts: 0,
      claim_token: null,
      claimed_until: null,
      last_error: quarantined
        ? `registry_gap: "${String(event_type || "")}" is not in the certified Houszu v1.6.0 canonical vocabulary (frozen validation snapshot). Quarantined for admin review — not delivered, not retried.`
        : null,
    };
    return await base44.asServiceRole.entities.IdentityActivityOutbox.create(record);
  } catch (e) {
    console.error("[identityActivityOutbox] enqueue failed:", e.message);
    return null;
  }
}