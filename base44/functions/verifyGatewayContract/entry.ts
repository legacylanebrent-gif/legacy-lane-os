import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  getContract,
  gatewayHealth,
  getIngestionStatus,
  ingestConsumerActivity,
} from '../../shared/houszuPartnerClient.ts';

// ─────────────────────────────────────────────────────────────
// verifyGatewayContract
// Admin-only operational check of EstateSalen's own Partner API
// client against the certified Houszu production dispatcher.
// Modes:
//   { operation: "contract" }  (default) — get_contract via EstateSalen's
//     own client: verifies HTTP 200 + contract_version + required capabilities.
//   { operation: "health" }    — authenticated liveness probe; proves the
//     configured credential maps to the ESTATESALEN partner app.
//   { operation: "status", request_id } — reconciliation read.
//   { operation: "replay", record_id }  — controlled idempotency replay:
//     re-sends the SAME stored outbox record's exact dispatcher payload
//     with the SAME request_id (never regenerated).
// Never returns or logs credential material.
// ─────────────────────────────────────────────────────────────

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const op = body.operation || 'contract';

    if (op === 'health') {
      const h = await gatewayHealth();
      return Response.json({ ok: h.ok, http_status: h.status, body: h.body, error: h.error || null });
    }

    if (op === 'status') {
      const rid = String(body.request_id || '').trim();
      if (!rid) return Response.json({ error: 'request_id required' }, { status: 400 });
      const s = await getIngestionStatus(rid);
      return Response.json({ ok: s.ok, http_status: s.status, body: s.body, error: s.error || null });
    }

    if (op === 'replay') {
      const rec = await base44.asServiceRole.entities.IdentityActivityOutbox.get(body.record_id);
      if (!rec) return Response.json({ error: 'Outbox record not found' }, { status: 404 });
      const out = await ingestConsumerActivity(rec);
      return Response.json({
        ok: out.ok,
        http_status: out.status,
        body: out.body,
        request_payload: out.request_payload,
        error: out.error || null,
      });
    }

    // Default: contract discovery through EstateSalen's own client
    const c = await getContract();
    const contract = c.body && c.body.contract ? c.body.contract : null;
    const caps = contract && contract.capabilities ? contract.capabilities : null;
    return Response.json({
      ok: c.ok,
      http_status: c.status,
      api_version: c.body && c.body.api_version ? c.body.api_version : null,
      contract_version_verified: c.body && c.body.api_version === '1.6.0',
      capabilities: caps ? {
        ingestion_status: caps.ingestion_status === true,
        canonical_event_write: caps.canonical_event_write === true,
        idempotency: caps.idempotency === true,
        retry_safe: caps.retry_safe === true,
      } : null,
      error: c.error || null,
    });
  } catch (error) {
    console.error('[verifyGatewayContract] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}