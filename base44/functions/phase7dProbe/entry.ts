import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Phase 7D probe: discover the certified Houszu Partner API v1.6.0 endpoints.
// Admin-only. Returns only status codes + short sanitized bodies (never tokens).

const HOUSZU_APP_ID = "69d11abfe3a01036002a99a2";
const FN_CANDIDATES = [
  "ingestConsumerActivity",
  "getIngestionStatus",
  "partnerIngestConsumerActivity",
  "canonicalIngest",
  "ingest_consumer_activity",
];

function sanitize(text) {
  return String(text)
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 250);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const token = secrets.get("HOUSZU_PARTNER_SERVICE_TOKEN") || "";
    const apiBase = secrets.get("HOUSZU_API_URL") || "";
    const results = {};
    const urls = [];
    const identityBase = secrets.get("HOUSZU_IDENTITY_API_URL") || "";

    const bases = new Set();
    if (apiBase) bases.add(apiBase);
    if (identityBase) bases.add(identityBase);

    const ingestCandidates = [
      "activityIngest",
      "centralIngest",
      "houszuIngest",
      "canonicalGateway",
      "partnerGateway",
      "consumerActivityIngest",
      "ingestCanonicalActivity",
      "ingestEvent",
      "ingestEvents",
      "eventIngest",
      "canonicalEventIngest",
      "consumerActivity",
      "canonicalActivity",
      "partnerActivity",
      "apiIngest",
      "gatewayIngest",
      "v1Ingest",
      "ingestV1",
      "canonicalApi",
      "partnerApi",
      "canonicalPartnerApi",
      "partnerIngestV1",
      "canonicalActivityIngest",
      "houszuPartnerApi",
    ];

    const domains = ["https://houszu.com"];
    for (const d of domains) {
      for (const fn of ingestCandidates) {
        urls.push(`${d}/functions/${fn}`);
      }
      // Method + existence calibration on the /api path space
      urls.push(`${d}/api/partner/v1/ingest_consumer_activity`); // POST
      urls.push(`${d}/api/definitely_not_a_real_route_calibration`); // POST control
      urls.push(`${d}/api/partner/v1/contracts`); // GET control handled below
    }

    // GET probes for the partner contract paths (some may expose GET status/contract info)
    const getUrls = [
      "https://houszu.com/api/partner/v1/ingest_consumer_activity",
      "https://houszu.com/api/partner/v1/get_ingestion_status",
      "https://houszu.com/api/definitely_not_a_real_route_calibration",
    ];

    const short = (u) => u.replace("https://base44.app/api/apps/", "app:").replace("https://base44.app", "");
    const sharedKey = secrets.get("HOUSZU_SHARED_API_KEY") || "";
    for (const url of [...getUrls]) {
      try {
        const res = await fetch(url, { method: "GET", headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(10000) });
        const text = await res.text();
        if (res.status === 404) continue;
        results["GET " + res.status + " " + short(url)] = { body: sanitize(text) };
      } catch (e) { /* ignore */ }
    }
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ shared_key: sharedKey }),
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        if (res.status === 404) continue; // only show non-404s to keep output small
        results[res.status + " " + short(url)] = { body: sanitize(text) };
      } catch (e) {
        results[short(url)] = { error: e.message };
      }
    }
    return Response.json({ apiBasePrefix: apiBase.replace("https://base44.app/api/apps/", "appId:"), results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}