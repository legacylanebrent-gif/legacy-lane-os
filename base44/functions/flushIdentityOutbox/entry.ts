import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { isCanonicalActivityType } from '../../shared/canonicalContract.ts';

// ─────────────────────────────────────────────
// flushIdentityOutbox
// Drains the IdentityActivityOutbox to the certified Houszu Partner API
// v1.6.0 consumer-activity ingestion endpoint.
// - Batch of up to 50 due events per run (pending or retrying with next_retry_at due)
// - WORKER LEASE: each eligible record is claim-leased (claim_token +
//   claimed_until) before sending — one record, one active local worker.
//   Expired leases are reclaimable (crash recovery); the canonical
//   request_id is never changed.
// - Exponential backoff (30 min * attempts, capped at 24h); dead_letter after
//   12 attempts for genuine delivery failures only — the gateway_not_live
//   deployment condition never dead-letters (records stay retained).
// - Canonical validation: non-canonical activity names are quarantined as
//   registry_gap and are never selected for delivery.
// - When the gateway URL secret is not configured or the endpoint is not yet
//   live, events stay queued safely and the run reports queue depth.
// Admin-only; also callable from a scheduled workflow (service-role request).
// ─────────────────────────────────────────────

const MAX_ATTEMPTS = 12;
const BASE_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLAIM_LEASE_MS = 10 * 60 * 1000; // 10-minute processing lease

function sanitize(text) {
  return String(text || "")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 300);
}

// True when the record has no claim, or its claim lease has expired.
function claimIsFree(rec, nowMs) {
  if (!rec.claim_token) return true;
  const until = rec.claimed_until ? Date.parse(rec.claimed_until) : 0;
  return !until || until <= nowMs;
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
    const nowMs = Date.now();
    const due = new Date(nowMs + 1000).toISOString();

    // Records with an active (unexpired) claim are invisible to this worker.
    const claimFree = {
      $or: [
        { claim_token: null },
        { claim_token: { $exists: false } },
        { claimed_until: { $lte: nowIso } },
      ],
    };

    // Fetch due events (small pages, oldest first)
    const pendingPage = await outbox.filter(
      { status: "pending", ...claimFree }, { sort: "created_date", limit: 50 }
    );
    const retryingPage = await outbox.filter(
      { status: "retrying", next_retry_at: { $lte: due }, ...claimFree },
      { sort: "created_date", limit: 50 }
    );
    const events = [...(pendingPage.items || []), ...(retryingPage.items || [])].slice(0, 50);

    const queueCounts = {};
    for (const st of ["pending", "retrying", "sent", "dead_letter", "registry_gap"]) {
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

    // Attempt to atomically establish ownership of a record for one lease
    // period. Conditional write + ownership verification; on any CAS failure
    // the worker fails closed (skips the record) — no double local send.
    async function tryClaim(ev) {
      const token = crypto.randomUUID();
      const claimedUntil = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
      try {
        await outbox.updateMany(
          {
            id: ev.id,
            $or: [
              { claim_token: null },
              { claim_token: { $exists: false } },
              { claimed_until: { $lte: nowIso } },
            ],
          },
          { $set: { claim_token: token, claimed_until: claimedUntil } }
        );
      } catch (e) {
        console.error("[flushIdentityOutbox] claim CAS write failed:", e.message);
      }
      try {
        const re = await outbox.get(ev.id);
        if (re && re.claim_token === token) return { token, claimedUntil };
      } catch (e) {
        console.error("[flushIdentityOutbox] claim verification failed:", e.message);
      }
      return null; // another active worker owns this record
    }

    async function releaseClaim(ev) {
      try {
        await outbox.update(ev.id, { claim_token: null, claimed_until: null });
      } catch (e) {
        console.error("[flushIdentityOutbox] claim release failed:", e.message);
      }
    }

    const sent = [];
    const retried = [];
    const dead = [];
    const quarantined = [];
    const skippedClaimed = [];

    for (const ev of events) {
      // Canonical validation at the delivery gate — a record that is not in
      // the certified v1.6.0 vocabulary must never reach Houszu.
      if (!isCanonicalActivityType(ev.event_type)) {
        await outbox.update(ev.id, {
          status: "registry_gap",
          last_error: `registry_gap: "${String(ev.event_type || "")}" is not in the certified Houszu v1.6.0 canonical vocabulary (frozen validation snapshot). Quarantined for admin review — not delivered, not retried.`,
          claim_token: null,
          claimed_until: null,
        });
        quarantined.push(ev.id);
        continue;
      }

      // Lease claim — exactly one active local worker per record.
      const claim = await tryClaim(ev);
      if (!claim) { skippedClaimed.push(ev.id); continue; }

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
          // Success — record accepted; release the claim; request_id unchanged.
          await outbox.update(ev.id, {
            status: "sent",
            attempts,
            last_attempt_at: nowIso,
            last_error: null,
            claim_token: null,
            claimed_until: null,
          });
          sent.push(ev.id);
        } else if (res.status === 404 || res.status === 405) {
          // Endpoint not live yet — safe backoff, not an error spike;
          // never dead-letters (deployment condition, not a delivery failure).
          throw new Error(`gateway_not_live (${res.status})`);
        } else {
          throw new Error(`gateway ${res.status}: ${sanitize(text)}`);
        }
      } catch (e) {
        const giveUp = attempts >= MAX_ATTEMPTS && !String(e.message).includes("gateway_not_live");
        const nextRetry = new Date(
          Date.now() + Math.min(BASE_BACKOFF_MS * attempts, MAX_BACKOFF_MS)
        ).toISOString();
        // Retryable failure — release/expire the claim; the record becomes
        // eligible again only after its backoff window.
        await outbox.update(ev.id, {
          status: giveUp ? "dead_letter" : "retrying",
          attempts,
          last_attempt_at: nowIso,
          last_error: sanitize(e.message),
          next_retry_at: nextRetry,
          claim_token: null,
          claimed_until: null,
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
      registry_gapped: quarantined.length,
      skipped_active_claim: skippedClaimed.length,
      queueCounts,
    });
  } catch (error) {
    console.error("[flushIdentityOutbox] error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}