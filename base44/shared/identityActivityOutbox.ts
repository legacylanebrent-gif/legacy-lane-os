// Shared durable outbox for the canonical Houszu Partner API v1.6.0
// consumer-activity ingestion contract.
//
// Every consumer activity that must reach Houszu is enqueued here with a
// stable idempotency key; flushIdentityOutbox drains the queue with
// claim-leased concurrency protection, retry/backoff, and dead-lettering.
// Until the Houszu-side gateway endpoint is live, events accumulate safely.

import { secrets } from "base44:runtime";

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
    const record = {
      request_id: request_id || newRequestId(),
      contract_version: OUTBOX_CONTRACT_VERSION,
      source_app: OUTBOX_SOURCE_APP,
      masterUserID: (masterUserID || "").toLowerCase(),
      localUserID: localUserID || "",
      event_type: event_type || "consumer_activity",
      identity_context: identity_context || {},
      product_context: product_context || {},
      agent_context: agent_context || null,
      territory_context: territory_context || null,
      consent_context: consent_context || { status: "absent" },
      payload: payload || {},
      occurred_at: occurred_at || new Date().toISOString(),
      status: "pending",
      attempts: 0,
      claim_token: null,
      claimed_until: null,
    };
    return await base44.asServiceRole.entities.IdentityActivityOutbox.create(record);
  } catch (e) {
    console.error("[identityActivityOutbox] enqueue failed:", e.message);
    return null;
  }
}