import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// ─────────────────────────────────────────────
// flushIdentityOutbox
// Drains the IdentityActivityOutbox to the certified Houszu Partner API
// v1.6.0 consumer-activity ingestion endpoint.
// - Batch of up to 50 due events per run (pending or retrying with next_retry_at due)
// - Exponential backoff (30 min * attempts, capped at 24h); dead_letter after 12 attempts
// - When the gateway URL secret is not configured or the endpoint is not yet
//   live, events stay queued safely and the run reports queue depth.
// Admin-only; also callable from a scheduled workflow (service-role request).
// ─────────────────────────────────────────────

const MAX_ATTEMPTS = 12;
const BASE_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

function sanitize(text) {
  return String(text || "")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 300);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Allow service-role (scheduled workflow) or admin user
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = !!user && user.role === "admin";
    } catch { /* service-role call has no user */ }
    if (!isAdmin) {
      // Scheduled/service-role calls authenticate via function token; treat as allowed
      // only when there is genuinely no user context (webhook-style invocation).
      const hasUserHeader = !!req.headers.get("authorization");
      if (hasUserHeader) {
        return Response.json({ error: "Admin only" }, { status: 403 });
      }
    }

    const outbox = base44.asServiceRole.entities.IdentityActivityOutbox;
    const nowIso = new Date().toISOString();
    const due = new Date(Date.now() + 1000).toISOString();

    // Fetch due events (small pages, oldest first)
    const pendingPage = await outbox.filter(
      { status: "pending" }, { sort: "created_date", limit: 50 }
    );
    const retryingPage = await outbox.filter(
      { status: "retrying", next_retry_at: { $lte: due } }, { sort: "created_date", limit: 50 }
    );
    const events = [...(pendingPage.items || []), ...(retryingPage.items || [])].slice(0, 50);

    const queueCounts = {};
    for (const st of ["pending", "retrying", "sent", "dead_letter"]) {
      try { queueCounts[st] = await outbox.count({ status: st }); } catch { queueCounts[st] = null; }
    }

    const gatewayUrl = secrets.get("HOUSZU_PARTNER_API_URL") || "";
    const partnerToken = secrets.get("HOUSZU_PARTNER_SERVICE_TOKEN") || "";

    if (!gatewayUrl) {
      return Response.json({
        success: true,
        mode: "gateway_not_configured",
        queued: events.length,
        queueCounts,
        message: "Set the HOUSZU_PARTNER_API_URL secret to the certified v1.6.0 ingestion base once Houszu deploys it.",
      });
    }

    if (events.length === 0) {
      return Response.json({ success: true, mode: "drained", queueCounts, sent: 0 });
    }

    const sent = [];
    const retried = [];
    const dead = [];

    for (const ev of events) {
      const attempts = (ev.attempts || 0) + 1;
      try {
        const res = await fetch(`${gatewayUrl.replace(/\/$/, "")}/api/partner/v1/ingest_consumer_activity`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + partnerToken,
            "x-houszu-shared-key": secrets.get("HOUSZU_SHARED_API_KEY") || "",
          },
          body: JSON.stringify({
            platform: "estatesalen",
            request_id: ev.request_id,
            masterUserID: ev.masterUserID,
            event_type: ev.event_type,
            occurred_at: ev.occurred_at,
            activity: ev.payload,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const text = await res.text();

        if (res.ok) {
          await outbox.update(ev.id, {
            status: "sent",
            attempts,
            last_attempt_at: nowIso,
            last_error: null,
          });
          sent.push(ev.id);
        } else if (res.status === 404 || res.status === 405) {
          // Endpoint not live yet — safe backoff, not an error spike
          throw new Error(`gateway_not_live (${res.status})`);
        } else {
          throw new Error(`gateway ${res.status}: ${sanitize(text)}`);
        }
      } catch (e) {
        const giveUp = attempts >= MAX_ATTEMPTS && !String(e.message).includes("gateway_not_live");
        const nextRetry = new Date(
          Date.now() + Math.min(BASE_BACKOFF_MS * attempts, MAX_BACKOFF_MS)
        ).toISOString();
        await outbox.update(ev.id, {
          status: giveUp ? "dead_letter" : "retrying",
          attempts,
          last_attempt_at: nowIso,
          last_error: sanitize(e.message),
          next_retry_at: nextRetry,
        });
        if (giveUp) dead.push(ev.id); else retried.push(ev.id);
      }
    }

    return Response.json({
      success: true,
      mode: "flushed",
      attempted: events.length,
      sent: sent.length,
      retrying: retried.length,
      dead_lettered: dead.length,
      queueCounts,
    });
  } catch (error) {
    console.error("[flushIdentityOutbox] error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}