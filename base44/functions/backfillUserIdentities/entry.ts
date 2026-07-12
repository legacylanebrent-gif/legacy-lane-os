import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// backfillUserIdentities
// Resumable, idempotent batch migration that resolves
// masterUserID for all existing EstateSalen users who lack one.
// ─────────────────────────────────────────────

const IDENTITY_API_URL = Deno.env.get("HOUSZU_IDENTITY_API_URL") || "";
const HOUSZU_SHARED_KEY = Deno.env.get("ATLAS_EXCHANGE_API_KEY") || "";

const CIO_SITE_ID = Deno.env.get("CUSTOMERIO_SITE_ID") || "";
const CIO_API_KEY = Deno.env.get("CUSTOMERIO_API_KEY") || "";
const CIO_REGION = Deno.env.get("CUSTOMERIO_REGION") || "us";
const CIO_BASE_URL = CIO_REGION === "eu" ? "https://track-eu.customer.io" : "https://track.customer.io";
const CIO_ENABLED = Deno.env.get("CUSTOMERIO_ENABLED") === "true";

function cioAuthHeader() { return "Basic " + btoa(CIO_SITE_ID + ":" + CIO_API_KEY); }

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : "";
}

function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return local.slice(0, 2) + "***@" + domain;
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Call Houszu Central Identity API via raw HTTP
// Auth: x-api-key header with HOUSZU_SHARED_API_KEY (matches Houszu's ATLAS_EXCHANGE_API_KEY)
async function callIdentityAPI(payload) {
  const url = `${IDENTITY_API_URL}/functions/identityResolve`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": HOUSZU_SHARED_KEY,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let response;
  try { response = JSON.parse(text); } catch { response = { raw: text }; }
  if (!res.ok) throw new Error(`Identity API error (${res.status}): ${text}`);
  return response;
}

async function syncToCustomerIO(masterUserID, profile) {
  if (!CIO_ENABLED || !CIO_SITE_ID) return { skipped: true };
  const attrs = {
    email: profile.email,
    first_name: profile.firstName || "",
    last_name: profile.lastName || "",
    is_estatesalen_user: true,
    platforms: ["estatesalen"],
    estatesalen_local_user_id: profile.localUserID || "",
    estatesalen_role: profile.role || "consumer",
    source: "estatesalen_backfill",
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(`${CIO_BASE_URL}/api/v1/customers/${encodeURIComponent(masterUserID)}`, {
    method: "PUT",
    headers: { "Authorization": cioAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(attrs),
  });
  if (!res.ok) throw new Error(`CIO sync failed (${res.status})`);
  return { sent: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Admin-only
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const dryRun = body.dryRun === true;
    const offset = body.offset || 0;
    const limit = Math.min(body.limit || 50, 200);

    // Query users missing masterUserID
    const users = await base44.asServiceRole.entities.User.filter(
      { masterUserID: { $exists: false } },
      "-created_date",
      limit
    );

    // Also catch users where masterUserID exists but is empty
    const allMissing = users.filter(u => !u.masterUserID);

    const counts = {
      total: allMissing.length,
      resolved: 0,
      created: 0,
      matched: 0,
      failed: 0,
      unverified: 0,
      reviewRequired: 0,
      skipped: dryRun ? allMissing.length : 0,
    };

    const results = [];

    for (const u of allMissing) {
      const normalizedEmail = normalizeEmail(u.email);
      const now = new Date().toISOString();

      if (dryRun) {
        results.push({
          localUserID: u.id,
          email: maskEmail(normalizedEmail),
          emailValid: isValidEmail(normalizedEmail),
          action: "dry_run",
        });
        continue;
      }

      // Validate email
      if (!isValidEmail(normalizedEmail)) {
        counts.unverified++;
        await base44.asServiceRole.entities.User.update(u.id, {
          identityResolutionStatus: "review_required",
          identityLastCheckedAt: now,
          identitySyncError: "Invalid email during backfill",
        });
        results.push({ localUserID: u.id, email: maskEmail(normalizedEmail), status: "review_required", reason: "Invalid email" });
        continue;
      }

      const requestID = crypto.randomUUID();
      const payload = {
        platform: "estatesalen",
        localUserID: u.id,
        verifiedEmail: normalizedEmail,
        emailVerified: true,
        firstName: u.full_name?.split(" ")[0] || "",
        lastName: u.full_name?.split(" ").slice(1).join(" ") || "",
        requestID,
        timestamp: now,
      };

      try {
        const apiResponse = await callIdentityAPI(payload);

        if (apiResponse.requiresReview) {
          counts.reviewRequired++;
          await base44.asServiceRole.entities.User.update(u.id, {
            identityResolutionStatus: "review_required",
            identityLastCheckedAt: now,
            identitySyncError: apiResponse.message || "Review required",
          });
          results.push({ localUserID: u.id, status: "review_required", message: apiResponse.message });
          continue;
        }

        if (!apiResponse.success || !apiResponse.masterUserID) {
          counts.failed++;
          await base44.asServiceRole.entities.User.update(u.id, {
            identityResolutionStatus: "failed",
            identityLastCheckedAt: now,
            identitySyncError: apiResponse.message || "No masterUserID",
          });
          results.push({ localUserID: u.id, status: "failed", message: apiResponse.message });
          continue;
        }

        const masterUserID = apiResponse.masterUserID.toLowerCase();

        await base44.asServiceRole.entities.User.update(u.id, {
          masterUserID,
          identityResolutionStatus: "resolved",
          identityResolvedAt: now,
          identityLastCheckedAt: now,
          identitySyncError: null,
          centralIdentityVersion: "1.0",
        });

        if (apiResponse.isNewGlobalIdentity) {
          counts.created++;
        } else {
          counts.matched++;
        }
        counts.resolved++;

        // Update ConsumerMarketingProfile
        try {
          const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email: normalizedEmail }, "-updated_date", 1);
          if (profiles.length > 0) {
            await base44.asServiceRole.entities.ConsumerMarketingProfile.update(profiles[0].id, {
              masterUserID,
              identityResolutionStatus: "resolved",
              customerio_profile_id: masterUserID,
            });
          }
        } catch (e) { /* non-fatal */ }

        // Sync to Customer.io
        try {
          await syncToCustomerIO(masterUserID, {
            email: normalizedEmail,
            firstName: u.full_name?.split(" ")[0] || "",
            lastName: u.full_name?.split(" ").slice(1).join(" ") || "",
            localUserID: u.id,
            role: u.primary_account_type || "consumer",
          });
        } catch (e) {
          console.error("[Backfill] CIO sync failed for", u.id, e.message);
        }

        results.push({
          localUserID: u.id,
          masterUserID,
          status: "resolved",
          isNew: apiResponse.isNewGlobalIdentity || false,
          existingPlatforms: apiResponse.existingPlatforms || [],
        });
      } catch (err) {
        counts.failed++;
        await base44.asServiceRole.entities.User.update(u.id, {
          identityResolutionStatus: "retrying",
          identityLastCheckedAt: now,
          identitySyncError: err.message,
        });
        // Log to IdentitySyncError
        try {
          await base44.asServiceRole.entities.IdentitySyncError.create({
            localUserID: u.id,
            maskedEmail: maskEmail(normalizedEmail),
            failureReason: err.message,
            retryCount: 1,
            firstFailureTime: now,
            lastAttemptTime: now,
            nextRetryTime: new Date(Date.now() + 3600000).toISOString(),
            resolutionStatus: "pending_retry",
          });
        } catch (e) { /* ignore */ }
        results.push({ localUserID: u.id, status: "retrying", error: err.message });
      }
    }

    return Response.json({
      success: true,
      dryRun,
      offset,
      batchSize: limit,
      processed: allMissing.length,
      counts,
      results: results.slice(0, 100), // cap response size
      hasMore: allMissing.length === limit,
      nextOffset: offset + allMissing.length,
    });
  } catch (error) {
    console.error("[backfillUserIdentities] error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});