import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isCanonicalActivityType } from '../../shared/canonicalContract.ts';
import { ingestConsumerActivity, getIngestionStatus } from '../../shared/houszuPartnerClient.ts';

// ─────────────────────────────────────────────
// flushIdentityOutbox
// Drains the IdentityActivityOutbox to the certified Houszu Partner API
// v1.6.0 production dispatcher (Phase 7D.2 gateway activation).
// - Batch of up to 50 due events per run (pending or retrying with next_retry_at due)
// - WORKER LEASE: each eligible record is claim-leased (claim_token +
//   claimed_until) before sending — one record, one active local worker.
//   Expired leases are reclaimable (crash recovery); the canonical
//   request_id is never changed.
// - Exponential backoff (30 min * attempts, capped at 24h); dead_letter after
//   12 attempts for genuine delivery failures only — the gateway_not_live
//   / credential_not_configured deployment condition never dead-letters.
// - Canonical validation: non-canonical activity names are quarantined as
//   registry_gap and are never selected for delivery.
// - Delivery + reconciliation go through the ONE shared Partner API client
//   (base44/shared/houszuPartnerClient.ts): POST dispatcher with
//   operation=ingest_consumer_activity in the body, then get_ingestion_status
//   with the SAME request_id (Houszu's canonical ledger stays authoritative).
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

    // Credential configuration is owned by the ONE shared Partner API client
    // (base44/shared/houszuPartnerClient.ts) — certified production dispatcher
    // host/route + Bearer credential. A missing credential surfaces as a
    // credential_not_configured client result below; records stay retained.

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

    const sent = [];
    const reconciliations = [];
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
        // Delivery through the ONE certified shared Partner API client
        // (dispatcher convention: POST /functions/savorStylePartnerApi with
        // operation=ingest_consumer_activity in the body; partner identity is
        // credential-derived on Houszu — never payload-supplied).
        const res = await ingestConsumerActivity(ev);

        // Dispatcher contract: {"ok":true,"api_version":"1.6.0","operation":...,
        // "data":{"success":true,...}} — success is accepted at the top level
        // or nested under data.
        const gwBody = (res.body && res.body.data) ? res.body.data : res.body;
        if (res.ok && gwBody && (gwBody.success === true || res.body.success === true)) {
          // Accepted by the certified production dispatcher. Reconcile the
          // outbox record against the authoritative Houszu ingestion status
          // (get_ingestion_status) — Houszu's canonical ledger stays
          // authoritative for delivery state.
          let reconciliation = { reconciled: false };
          try {
            const st = await getIngestionStatus(ev.request_id);
            const stBody = (st.body && st.body.data) ? st.body.data : st.body;
            if (st.ok && stBody) {
              reconciliation = {
                reconciled: true,
                status: stBody.status,
                person_resolution_status: stBody.person_resolution_status,
                product_relationship_status: stBody.product_relationship_status,
                consent_status: stBody.consent_status,
                territory_status: stBody.territory_status,
                events: stBody.events,
                delivery: stBody.delivery,
                replay_count: stBody.replay_count,
              };
            }
          } catch (stErr) {
            reconciliation = { reconciled: false, error: "status_read_failed" };
          }
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
          reconciliations.push({ request_id: ev.request_id, reconciliation });
        } else if (res.status === 404 || res.status === 405 || res.error === "credential_not_configured" || res.status === 0) {
          // Gateway not reachable / credential not configured — safe backoff;
          // never dead-letters (deployment condition, not a delivery failure).
          throw new Error(`gateway_not_live (${res.status || res.error})`);
        } else {
          const gwCode = (res.body && res.body.code) || "";
          throw new Error(`gateway ${res.status}${gwCode ? " " + gwCode : ""}: ${sanitize(JSON.stringify(res.body || res.error || ""))}`);
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
      reconciliations,
    });
  } catch (error) {
    console.error("[flushIdentityOutbox] error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}