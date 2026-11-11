// ─────────────────────────────────────────────────────────────
// houszuPersonSync.ts — ONE-WAY person sync: EstateSalen -> Houszu.
//
// Every person who registers, submits a form or gives us their
// details is queued here with the details they actually typed, then
// delivered from a durable outbox to the Houszu partner API
// (operation: ingest_consumer_activity).
//
// Non-negotiable rules encoded below:
//   • The partner credential is read from the server secret store ONLY
//     (HOUSZU_PARTNER_TOKEN, falling back to the existing partner
//     credential name). It is never returned, logged, or placed in a
//     payload or error message.
//   • Only this module performs the HTTP call — server side, never
//     the browser.
//   • Enqueue NEVER throws: a local save must never fail because of
//     the sync.
//   • request_id (uuid v4) is the idempotency key and is reused only
//     for the identical payload.
// ─────────────────────────────────────────────────────────────

import { secrets, waitUntil } from "base44:runtime";

const ENDPOINT = "https://houszuos.base44.app/functions/savorStylePartnerApi";
export const PRODUCT_ID = "estatesalen";

// Backoff sequence required by the partner contract, in seconds.
const BACKOFF_SECONDS = [5, 30, 300];
const MAX_ATTEMPTS = 3;
// 120 requests / 10 minutes per token: drain in small batches, never a burst.
export const FLUSH_BATCH_LIMIT = 20;
const STALE_CLAIM_MS = 5 * 60 * 1000;

const PLACEHOLDERS = /^(unknown|n\/a|n\.a\.|na|tbd|tba)$/i;

const RETRYABLE_CODES = [
  "RATE_LIMITED",
  "TEMPORARY_FAILURE",
  "TEMPORARY_UNAVAILABLE",
  "INTERNAL_ERROR",
];

// ── Credential (server only) ─────────────────────────────────
export function partnerToken() {
  return (
    secrets.get("HOUSZU_PARTNER_TOKEN") ||
    secrets.get("HOUSZU_PARTNER_SERVICE_TOKEN") ||
    ""
  );
}

// ── HTTP ─────────────────────────────────────────────────────
export async function callPartner(operation, data = {}, opts = {}) {
  const auth = opts.auth !== false;
  const timeoutMs = opts.timeoutMs || 30000;
  const token = auth ? partnerToken() : "";
  if (auth && !token) {
    return {
      ok: false,
      status: 0,
      body: null,
      errorCode: "credential_not_configured",
      errorMessage: "Partner credential is not configured on the server",
    };
  }
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ operation, ...data }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: null,
      errorCode: "network_error",
      errorMessage: String((e && e.message) || "network error").slice(0, 300),
    };
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  // The dispatcher may return the operation result at the top level or
  // wrapped in `data` — read both, top level first.
  const opData =
    body && typeof body.data === "object" && body.data ? body.data : {};
  const errorCode =
    (body && body.error && body.error.code) ||
    (opData.error && opData.error.code) ||
    (body && body.code) ||
    null;
  const errorMessage =
    (body && body.error && body.error.message) ||
    (opData.error && opData.error.message) ||
    (body && body.message) ||
    null;
  return { ok: res.ok, status: res.status, body, data: opData, errorCode, errorMessage };
}

export async function getContract() {
  return callPartner("get_contract", {}, { auth: false });
}

export async function health() {
  return callPartner("health");
}

export async function getIngestionStatus(requestId) {
  return callPartner("get_ingestion_status", { request_id: requestId });
}

// ── Normalisation (omit absent, never invent) ────────────────
function clean(value, max = 200) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (PLACEHOLDERS.test(s)) return null;
  return s.slice(0, max);
}

function cleanEmail(value) {
  const s = clean(value, 200);
  if (!s) return null;
  const e = s.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

function stateCode(value) {
  const s = clean(value, 40);
  if (!s) return null;
  const up = s.toUpperCase();
  return /^[A-Z]{2}$/.test(up) ? up : null;
}

function zipCode(value) {
  const s = clean(value, 20);
  return s ? s.replace(/\s+/g, "") : null;
}

function buildAddress(raw) {
  if (!raw || typeof raw !== "object") return null;
  const address = {};
  const street = clean(raw.street, 200);
  const city = clean(raw.city, 120);
  const state = stateCode(raw.state);
  const zip = zipCode(raw.zip || raw.zip_code);
  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (zip) address.zip = zip;
  return Object.keys(address).length ? address : null;
}

// submission.answers — the form's own keys in snake_case, one level deep,
// unanswered questions omitted, types preserved.
function buildAnswers(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const key = String(rawKey)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) continue;
    const value = rawValue;
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      const arr = value
        .map((v) => (typeof v === "string" ? clean(v, 200) : v))
        .filter(
          (v) =>
            v !== null &&
            v !== undefined &&
            v !== "" &&
            ["string", "number", "boolean"].includes(typeof v)
        );
      if (arr.length) out[key] = arr;
      continue;
    }
    if (typeof value === "string") {
      const s = clean(value, 3000);
      if (s) out[key] = s;
    }
  }
  return Object.keys(out).length ? out : null;
}

function buildTags(raw) {
  if (!Array.isArray(raw)) return null;
  const tags = raw.map((t) => clean(t, 80)).filter(Boolean);
  return tags.length ? tags : null;
}

// ── Payload (exact Houszu v1.7 shape) ────────────────────────
export function buildPersonPayload(input) {
  const email = cleanEmail(input.email);
  if (!email) return null;

  const identity = { email };
  const firstName = clean(input.firstName, 80);
  const lastName = clean(input.lastName, 80);
  if (firstName) identity.first_name = firstName;
  if (lastName) identity.last_name = lastName;
  if (input.canonicalPersonId) identity.canonical_person_id = clean(input.canonicalPersonId, 200);

  const contact = {};
  if (firstName) contact.first_name = firstName;
  if (lastName) contact.last_name = lastName;
  const phone = clean(input.phone, 40);
  const mobile = clean(input.mobilePhone, 40);
  if (phone) contact.phone = phone;
  if (mobile) contact.mobile_phone = mobile;
  const company = clean(input.company, 200);
  const jobTitle = clean(input.jobTitle, 120);
  if (company) contact.company = company;
  if (jobTitle) contact.job_title = jobTitle;
  if (input.contactType) contact.contact_type = input.contactType;

  const address = buildAddress(input.address);
  if (address) contact.address = address;
  const propertyAddress = clean(input.propertyAddress, 300);
  if (propertyAddress) contact.property_address = propertyAddress;
  const notes = clean(input.notes, 4000);
  if (notes) contact.notes = notes;
  const tags = buildTags(input.tags);
  if (tags) contact.tags = tags;

  const submission = {};
  const submittedAt = input.submittedAt || new Date().toISOString();
  submission.submitted_at = submittedAt;
  const submissionId = clean(input.submissionId, 200);
  if (submissionId) submission.submission_id = submissionId;
  const answers = buildAnswers(input.answers);
  if (answers) submission.answers = answers;
  contact.submission = submission;

  const payload = {
    operation: "ingest_consumer_activity",
    request_id: crypto.randomUUID(),
    business_action: input.businessAction,
    identity,
    contact_details: contact,
    product_context: {
      product_id: PRODUCT_ID,
      relationship_type: input.relationshipType || "lead",
      ...(input.registrationMethod
        ? { registration_method: input.registrationMethod }
        : {}),
    },
  };
  return payload;
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Enqueue (never throws) ───────────────────────────────────
export async function enqueuePersonSync(base44, input) {
  try {
    const email = cleanEmail(input.email);
    if (!email) {
      console.warn(
        "[houszuPersonSync] skipped: no valid person email from " + (input.sourceFunction || "unknown")
      );
      return { queued: false, reason: "email_required" };
    }
    const payload = buildPersonPayload({ ...input, email });
    if (!payload) return { queued: false, reason: "payload_incomplete" };

    const hash = await sha256(JSON.stringify(payload));
    const now = new Date().toISOString();
    const record = await base44.asServiceRole.entities.HouszuPartnerOutbox.create({
      request_id: payload.request_id,
      business_action: payload.business_action,
      contact_email: email,
      source_function: input.sourceFunction || null,
      submission_id: input.submissionId ? String(input.submissionId) : null,
      payload,
      payload_hash: hash,
      status: "pending",
      attempts: 0,
      next_attempt_at: now,
      contact_fields_updated: [],
      response_warnings: [],
    });

    // Deliver after the caller's own save completes — never blocks or fails it.
    flushSoon(base44);
    return { queued: true, outbox_id: record.id, request_id: payload.request_id };
  } catch (e) {
    console.error(
      "[houszuPersonSync] enqueue failed (" + (input.sourceFunction || "unknown") + "):",
      (e && e.message) || e
    );
    return { queued: false, reason: "enqueue_failed" };
  }
}

export function flushSoon(base44) {
  try {
    waitUntil(
      flushOutbox(base44, { limit: 5 }).catch((e) =>
        console.error("[houszuPersonSync] background flush failed:", (e && e.message) || e)
      )
    );
  } catch {
    // No post-response hook available — the scheduled flush picks it up.
  }
}

// ── Flush (durable delivery) ─────────────────────────────────
function isDue(record, nowMs) {
  if (record.status === "processing") {
    const claimed = record.claimed_at ? Date.parse(record.claimed_at) : 0;
    return !claimed || nowMs - claimed > STALE_CLAIM_MS;
  }
  if (!record.next_attempt_at) return true;
  const next = Date.parse(record.next_attempt_at);
  return !next || Number.isNaN(next) || next <= nowMs;
}

export async function flushOutbox(base44, opts = {}) {
  const limit = Math.min(opts.limit || FLUSH_BATCH_LIMIT, FLUSH_BATCH_LIMIT);
  const entity = base44.asServiceRole.entities.HouszuPartnerOutbox;

  const page = await entity.filter(
    { status: { $in: ["pending", "failed", "processing"] } },
    { sort: "created_date", limit: FLUSH_BATCH_LIMIT * 3 }
  );
  const candidates = page.items || page || [];
  const nowMs = Date.now();
  const due = candidates.filter((r) => isDue(r, nowMs)).slice(0, limit);

  const summary = {
    processed: 0,
    sent: 0,
    retry_scheduled: 0,
    permanent: 0,
    parked: 0,
    auth_failed: 0,
    results: [],
  };
  if (!partnerToken()) {
    summary.auth_failed = 0;
    summary.error = "credential_not_configured";
    return summary;
  }

  for (const record of due) {
    summary.processed += 1;
    const claimedAt = new Date().toISOString();
    const claimToken = crypto.randomUUID();
    await entity.update(record.id, {
      status: "processing",
      claim_token: claimToken,
      claimed_at: claimedAt,
      last_attempt_at: claimedAt,
    });

    // The stored payload is authoritative: a retry sends the identical body.
    const payload = record.payload || {};
    const attempt = await callPartner(
      "ingest_consumer_activity",
      {
        request_id: payload.request_id || record.request_id,
        business_action: payload.business_action,
        identity: payload.identity,
        contact_details: payload.contact_details,
        product_context: payload.product_context,
      },
      { timeoutMs: 30000 }
    );

    const body = attempt.body || {};
    const data = attempt.data || {};
    const status = attempt.status;
    const code = attempt.errorCode;
    const success =
      status === 200 && !code && data.success !== false && body.success !== false;
    const pick = (key) => data[key] ?? body[key] ?? null;

    const result = {
      request_id: payload.request_id || record.request_id,
      business_action: payload.business_action || record.business_action,
      http_status: status,
      error_code: code,
      idempotent_replay: pick("idempotent_replay") === true,
      contact_status: pick("contact_status"),
      contact_id: pick("contact_id"),
      success,
    };

    if (success) {
      summary.sent += 1;
      await entity.update(record.id, {
        status: "sent",
        http_status: status,
        error_code: null,
        error_message: null,
        canonical_person_id: pick("canonical_person_id") || record.canonical_person_id || null,
        contact_id: pick("contact_id") || record.contact_id || null,
        contact_status: pick("contact_status"),
        contact_fields_updated: Array.isArray(pick("contact_fields_updated"))
          ? pick("contact_fields_updated")
          : [],
        idempotent_replay: pick("idempotent_replay") === true,
        response_warnings: Array.isArray(pick("warnings")) ? pick("warnings").slice(0, 20) : [],
        last_response: attempt.data && Object.keys(attempt.data).length ? attempt.data : body,
        sent_at: new Date().toISOString(),
        next_attempt_at: null,
        claim_token: null,
      });
      summary.results.push(result);
      continue;
    }

    const attempts = (record.attempts || 0) + 1;
    const baseUpdate = {
      http_status: status || null,
      error_code: code || "unknown_error",
      error_message: (attempt.errorMessage || "").slice(0, 500) || null,
      attempts,
      claim_token: null,
      claimed_at: null,
      last_response: attempt.data && Object.keys(attempt.data).length ? attempt.data : body,
    };

    if (status === 401 || code === "INVALID_AUTH") {
      summary.auth_failed += 1;
      await entity.update(record.id, {
        ...baseUpdate,
        status: "auth_failed",
        next_attempt_at: null,
      });
      console.error(
        "[houszuPersonSync] partner credential rejected (INVALID_AUTH) — sync halted for this record"
      );
      summary.results.push(result);
      continue;
    }

    const retryableDirective = pick("retryable") === true;
    const transient =
      status === 429 || status >= 500 || RETRYABLE_CODES.includes(code) || retryableDirective;

    if (!transient) {
      summary.permanent += 1;
      await entity.update(record.id, { ...baseUpdate, status: "permanent", next_attempt_at: null });
      console.warn(
        "[houszuPersonSync] permanent refusal",
        code,
        (attempt.errorMessage || "").slice(0, 200)
      );
      summary.results.push(result);
      continue;
    }

    if (attempts >= MAX_ATTEMPTS) {
      summary.parked += 1;
      await entity.update(record.id, { ...baseUpdate, status: "parked", next_attempt_at: null });
      console.warn("[houszuPersonSync] retries exhausted, parked:", code);
    } else {
      summary.retry_scheduled += 1;
      const delay = BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)];
      await entity.update(record.id, {
        ...baseUpdate,
        status: "failed",
        next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
      });
    }
    summary.results.push(result);
  }

  return summary;
}