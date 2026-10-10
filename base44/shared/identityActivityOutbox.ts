// Shared durable outbox for the canonical Houszu Partner API v1.6.0
// consumer-activity ingestion contract.
//
// Every consumer activity that must reach Houszu is enqueued here with an
// idempotency key; flushIdentityOutbox drains the queue with retry/backoff.
// Until the Houszu-side gateway endpoint is live, events accumulate safely.

export async function enqueueActivity(
  base44,
  { masterUserID, localUserID, event_type, payload, occurred_at }
) {
  try {
    const record = {
      masterUserID: (masterUserID || "").toLowerCase(),
      localUserID: localUserID || "",
      event_type: event_type || "consumer_activity",
      payload: payload || {},
      occurred_at: occurred_at || new Date().toISOString(),
      status: "pending",
      attempts: 0,
      request_id: `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
    };
    return await base44.asServiceRole.entities.IdentityActivityOutbox.create(record);
  } catch (e) {
    console.error("[identityActivityOutbox] enqueue failed:", e.message);
    return null;
  }
}