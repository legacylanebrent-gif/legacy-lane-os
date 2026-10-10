import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Phase 7D probe v4: sweep for the v1.6.0 ingestion function on the Houszu app.
// Auth convention = v1.5.0 style: shared_key in the JSON body.
// 404 = function does not exist; anything else is surfaced (sanitized).

const HOUSZU_APP_ID = "69d11abfe3a01036002a99a2";
const BASE = `https://base44.app/api/apps/${HOUSZU_APP_ID}/functions`;

const CANDIDATES = [
  "housszuPing", // control — must exist
  "identityResolve",
  "ingestConsumerActivity",
  "receiveConsumerActivity",
  "logConsumerActivity",
  "trackConsumerActivity",
  "recordConsumerActivity",
  "saveConsumerActivity",
  "upsertConsumerActivity",
  "ingestActivity",
  "ingestActivityEvent",
  "ingestActivityEvents",
  "ingestActivityBatch",
  "batchIngestActivity",
  "partnerIngest",
  "partnerIngestActivity",
  "ingestPartnerActivity",
  "partnerApiIngestActivity",
  "canonicalIngestActivity",
  "ingestCanonicalConsumerActivity",
  "consumerActivityIngestV1",
  "ingestConsumerActivityRequest",
  "ingestion",
  "ingestionGateway",
  "ingestionGatewayV1",
  "partnerApiV1",
  "partnerV1Ingest",
  "receiveActivity",
  "receiveActivityEvent",
  "activityGateway",
  "activityIngestGateway",
  "centralIngestActivity",
  "centralActivityIngest",
  "housezuIngest",
  "houszuIngestActivity",
  "ingestConsumerActivites",
  "ingestConsumerActiviy",
  "getIngestionStatus",
  "getIngestionStatusV1",
  "ingestionStatus",
  "getConsumerActivityStatus",
];

function sanitize(text) {
  return String(text)
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 220);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const sharedKey = secrets.get("HOUSZU_SHARED_API_KEY") || "";
    const results = {};
    for (const fn of CANDIDATES) {
      try {
        const res = await fetch(`${BASE}/${fn}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getStatus", shared_key: sharedKey }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 404) continue;
        const text = await res.text();
        results[fn] = { status: res.status, body: sanitize(text) };
      } catch (e) {
        results[fn] = { error: e.message };
      }
    }
    return Response.json({ probed: CANDIDATES.length, found: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}