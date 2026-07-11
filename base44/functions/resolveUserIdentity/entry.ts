import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// resolveUserIdentity
// Calls the Houszu Central Identity API to obtain/confirm
// a permanent masterUserID for an EstateSalen user.
// Then syncs the resolved identity to Customer.io.
// ─────────────────────────────────────────────

const IDENTITY_API_URL = Deno.env.get("HOUSZU_IDENTITY_API_URL") || "";
const IDENTITY_API_KEY = Deno.env.get("HOUSZU_IDENTITY_API_KEY") || "";
const IDENTITY_WEBHOOK_SECRET = Deno.env.get("HOUSZU_IDENTITY_WEBHOOK_SECRET") || "";

// Customer.io Track API config (inlined — functions deploy independently)
const CIO_SITE_ID = Deno.env.get("CUSTOMERIO_SITE_ID") || "";
const CIO_API_KEY = Deno.env.get("CUSTOMERIO_API_KEY") || "";
const CIO_REGION = Deno.env.get("CUSTOMERIO_REGION") || "us";
const CIO_BASE_URL = CIO_REGION === "eu" ? "https://track-eu.customer.io" : "https://track.customer.io";
const CIO_ENABLED = Deno.env.get("CUSTOMERIO_ENABLED") === "true";

function cioAuthHeader() {
  return "Basic " + btoa(CIO_SITE_ID + ":" + CIO_API_KEY);
}

function normalizeEmail(email) {
  if (!email) return "";
  return email.trim().toLowerCase();
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

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Call Houszu Central Identity API: POST /api/identity/resolve
async function callIdentityAPI(payload) {
  const payloadStr = JSON.stringify(payload);
  const signature = await hmacSign(IDENTITY_WEBHOOK_SECRET, payloadStr);

  const res = await fetch(`${IDENTITY_API_URL}/api/identity/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Identity-API-Key": IDENTITY_API_KEY,
      "X-Identity-Signature": signature,
      "X-Identity-Timestamp": payload.timestamp,
      "X-Identity-Request-ID": payload.requestID,
    },
    body: payloadStr,
  });

  const responseText = await res.text();
  let response;
  try { response = JSON.parse(responseText); } catch { response = { raw: responseText }; }

  if (!res.ok) {
    throw new Error(`Identity API error (${res.status}): ${responseText}`);
  }

  return response;
}

// Sync to Customer.io using masterUserID as the identifier
async function syncToCustomerIO(masterUserID, profile) {
  if (!CIO_ENABLED || !CIO_SITE_ID || !CIO_API_KEY) {
    console.log("[IdentitySync] Customer.io not configured, skipping CIO sync");
    return { skipped: true };
  }

  const identifier = masterUserID;
  const attrs = {
    email: profile.email,
    first_name: profile.firstName || "",
    last_name: profile.lastName || "",
    is_estatesalen_user: true,
    platforms: ["estatesalen"],
    estatesalen_local_user_id: profile.localUserID || "",
    estatesalen_role: profile.role || "consumer",
    estatesalen_subscription_tier: profile.subscriptionTier || "none",
    estatesalen_subscription_status: profile.subscriptionStatus || "none",
    source: "estatesalen_identity_sync",
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${CIO_BASE_URL}/api/v1/customers/${encodeURIComponent(identifier)}`, {
    method: "PUT",
    headers: {
      "Authorization": cioAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(attrs),
  });

  const responseText = await res.text();
  console.log(`[IdentitySync] CIO identify status=${res.status} identifier=${identifier} response=${responseText}`);

  if (!res.ok) {
    throw new Error(`Customer.io sync failed (${res.status}): ${responseText}`);
  }

  return { sent: true, identifier };
}

// Log error to IdentitySyncError entity
async function logSyncError(base44, { localUserID, email, reason, apiResponse, retryCount }) {
  try {
    const existing = await base44.asServiceRole.entities.IdentitySyncError.filter(
      { localUserID }, "-created_date", 1
    );
    const now = new Date().toISOString();
    const nextRetry = new Date(Date.now() + (retryCount + 1) * 3600000).toISOString();

    if (existing.length > 0) {
      await base44.asServiceRole.entities.IdentitySyncError.update(existing[0].id, {
        failureReason: reason,
        retryCount: (existing[0].retryCount || 0) + 1,
        lastAttemptTime: now,
        nextRetryTime: nextRetry,
        apiResponse: apiResponse || {},
        resolutionStatus: "pending_retry",
      });
    } else {
      await base44.asServiceRole.entities.IdentitySyncError.create({
        localUserID,
        maskedEmail: maskEmail(email),
        failureReason: reason,
        retryCount: 1,
        firstFailureTime: now,
        lastAttemptTime: now,
        nextRetryTime: nextRetry,
        apiResponse: apiResponse || {},
        resolutionStatus: "pending_retry",
      });
    }
  } catch (e) {
    console.error("[IdentitySync] Failed to log error:", e.message);
  }
}

// Main resolve function
async function resolveIdentity(base44, { localUserID, localAccountID, email, emailVerified, firstName, lastName, phone, role, subscriptionTier, subscriptionStatus }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();

  // Validate email
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    await base44.asServiceRole.entities.User.update(localUserID, {
      identityResolutionStatus: "review_required",
      identityLastCheckedAt: now,
      identitySyncError: "Invalid or missing email",
    });
    return { success: false, status: "review_required", message: "Invalid or missing email" };
  }

  if (!emailVerified) {
    await base44.asServiceRole.entities.User.update(localUserID, {
      identityResolutionStatus: "review_required",
      identityLastCheckedAt: now,
      identitySyncError: "Email not verified",
    });
    return { success: false, status: "review_required", message: "Email not verified" };
  }

  const requestID = crypto.randomUUID();
  const payload = {
    platform: "estatesalen",
    localUserID,
    localAccountID: localAccountID || null,
    verifiedEmail: normalizedEmail,
    emailVerified: true,
    firstName: firstName || "",
    lastName: lastName || "",
    phone: phone || "",
    requestID,
    timestamp: now,
  };

  let apiResponse;
  try {
    apiResponse = await callIdentityAPI(payload);
  } catch (err) {
    console.error("[IdentitySync] API call failed:", err.message);
    await base44.asServiceRole.entities.User.update(localUserID, {
      identityResolutionStatus: "retrying",
      identityLastCheckedAt: now,
      identitySyncError: err.message,
    });
    await logSyncError(base44, { localUserID, email: normalizedEmail, reason: err.message, apiResponse: { error: err.message } });
    return { success: false, status: "retrying", error: err.message };
  }

  // Handle requiresReview
  if (apiResponse.requiresReview) {
    await base44.asServiceRole.entities.User.update(localUserID, {
      identityResolutionStatus: "review_required",
      identityLastCheckedAt: now,
      identitySyncError: apiResponse.message || "Identity review required",
    });
    await logSyncError(base44, {
      localUserID,
      email: normalizedEmail,
      reason: apiResponse.message || "Identity review required",
      apiResponse,
      retryCount: 0,
    });
    return { success: false, status: "review_required", message: apiResponse.message, response: apiResponse };
  }

  if (!apiResponse.success || !apiResponse.masterUserID) {
    await base44.asServiceRole.entities.User.update(localUserID, {
      identityResolutionStatus: "failed",
      identityLastCheckedAt: now,
      identitySyncError: apiResponse.message || "Identity API returned no masterUserID",
    });
    await logSyncError(base44, {
      localUserID,
      email: normalizedEmail,
      reason: apiResponse.message || "No masterUserID returned",
      apiResponse,
      retryCount: 0,
    });
    return { success: false, status: "failed", message: apiResponse.message, response: apiResponse };
  }

  const masterUserID = (apiResponse.masterUserID || "").toLowerCase();

  // Update User with resolved identity
  await base44.asServiceRole.entities.User.update(localUserID, {
    masterUserID,
    identityResolutionStatus: "resolved",
    identityResolvedAt: now,
    identityLastCheckedAt: now,
    identitySyncError: null,
    centralIdentityVersion: "1.0",
  });

  // Update ConsumerMarketingProfile with masterUserID
  try {
    const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email: normalizedEmail }, "-updated_date", 1);
    if (profiles.length > 0) {
      await base44.asServiceRole.entities.ConsumerMarketingProfile.update(profiles[0].id, {
        masterUserID,
        identityResolutionStatus: "resolved",
        customerio_profile_id: masterUserID,
      });
    }
  } catch (e) {
    console.error("[IdentitySync] ConsumerMarketingProfile update failed:", e.message);
  }

  // Sync to Customer.io using masterUserID as identifier
  let cioResult = null;
  try {
    cioResult = await syncToCustomerIO(masterUserID, {
      email: normalizedEmail,
      firstName,
      lastName,
      localUserID,
      role,
      subscriptionTier,
      subscriptionStatus,
    });
  } catch (e) {
    console.error("[IdentitySync] Customer.io sync failed:", e.message);
    // Identity is still resolved even if CIO sync fails
    cioResult = { error: e.message };
  }

  // Mark error as resolved if it existed
  try {
    const errors = await base44.asServiceRole.entities.IdentitySyncError.filter({ localUserID }, "-created_date", 1);
    if (errors.length > 0) {
      await base44.asServiceRole.entities.IdentitySyncError.update(errors[0].id, {
        resolutionStatus: "resolved",
        lastAttemptTime: now,
      });
    }
  } catch (e) { /* ignore */ }

  return {
    success: true,
    status: "resolved",
    masterUserID,
    isNewGlobalIdentity: apiResponse.isNewGlobalIdentity || false,
    existingPlatforms: apiResponse.existingPlatforms || [],
    customerio: cioResult,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── resolve: resolve identity for a single user ──
    if (action === "resolve" || !action) {
      const { localUserID } = body;

      // Fetch user data if not provided
      let userData = body.userData;
      if (!userData && localUserID) {
        try {
          userData = await base44.asServiceRole.entities.User.get(localUserID);
        } catch (e) {
          return Response.json({ success: false, error: "User not found: " + localUserID }, { status: 404 });
        }
      }

      if (!userData || !userData.id) {
        return Response.json({ success: false, error: "Missing localUserID or userData" }, { status: 400 });
      }

      // Skip if already resolved (idempotent)
      if (userData.masterUserID && userData.identityResolutionStatus === "resolved") {
        return Response.json({ success: true, status: "already_resolved", masterUserID: userData.masterUserID });
      }

      const result = await resolveIdentity(base44, {
        localUserID: userData.id,
        localAccountID: body.localAccountID || null,
        email: userData.email,
        emailVerified: body.emailVerified !== false, // default true if not specified
        firstName: userData.full_name?.split(" ")[0] || body.firstName || "",
        lastName: userData.full_name?.split(" ").slice(1).join(" ") || body.lastName || "",
        phone: body.phone || userData.business_phone || "",
        role: userData.primary_account_type || "consumer",
        subscriptionTier: userData.subscription_tier || "none",
        subscriptionStatus: userData.subscription_status || "none",
      });

      return Response.json(result);
    }

    // ── getStatus: return identity status for a user ──
    if (action === "getStatus") {
      const { localUserID } = body;
      if (!localUserID) return Response.json({ error: "Missing localUserID" }, { status: 400 });
      const user = await base44.asServiceRole.entities.User.get(localUserID);
      return Response.json({
        localUserID: user.id,
        masterUserID: user.masterUserID || null,
        identityResolutionStatus: user.identityResolutionStatus || "pending",
        identityResolvedAt: user.identityResolvedAt || null,
        identityLastCheckedAt: user.identityLastCheckedAt || null,
        identitySyncError: user.identitySyncError || null,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[resolveUserIdentity] error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});