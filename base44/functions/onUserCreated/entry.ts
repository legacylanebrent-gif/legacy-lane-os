import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// onUserCreated
// Entity automation: fires when a new User is created.
// 1. Creates/updates ConsumerMarketingProfile
// 2. Calls resolveUserIdentity to obtain masterUserID from Houszu
// 3. Syncs to Customer.io using masterUserID
// ─────────────────────────────────────────────

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : "";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const userData = body.data;
    if (!userData || !userData.id) {
      return Response.json({ success: false, reason: "No user data in payload" });
    }

    const normalizedEmail = normalizeEmail(userData.email);
    const now = new Date().toISOString();

    // ── Step 1: Create/update ConsumerMarketingProfile ──
    const existing = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({
      email: normalizedEmail,
    });

    const profileData = {
      user_id: userData.id,
      email: normalizedEmail,
      first_name: userData.full_name?.split(" ")[0] || "",
      last_name: userData.full_name?.split(" ").slice(1).join(" ") || "",
      zip_code: userData.zip_code || "",
      city: userData.city || "",
      state: userData.state || "",
      global_marketing_opt_in: true,
      estate_sale_alerts_opt_in: true,
      vip_alerts_opt_in: false,
      weekly_digest_opt_in: false,
      updated_at: now,
    };

    let profileId;
    if (existing.length > 0) {
      await base44.asServiceRole.entities.ConsumerMarketingProfile.update(existing[0].id, profileData);
      profileId = existing[0].id;
    } else {
      const created = await base44.asServiceRole.entities.ConsumerMarketingProfile.create({
        ...profileData,
        source: "website_signup",
        created_at: now,
      });
      profileId = created.id;
    }

    // Mark user as synced
    await base44.asServiceRole.entities.User.update(userData.id, {
      consumer_marketing_synced: true,
    });

    // ── Step 2: Resolve identity via Houszu Central Identity API ──
    let identityResult = null;
    try {
      identityResult = await base44.asServiceRole.functions.invoke("resolveUserIdentity", {
        action: "resolve",
        localUserID: userData.id,
        emailVerified: true,
        userData: {
          id: userData.id,
          email: normalizedEmail,
          full_name: userData.full_name,
          business_phone: userData.business_phone,
          primary_account_type: userData.primary_account_type,
          subscription_tier: userData.subscription_tier,
          subscription_status: userData.subscription_status,
        },
      });
    } catch (e) {
      console.error("[onUserCreated] Identity resolution failed:", e.message);
      // Mark as retrying — identity will be resolved by backfill
      await base44.asServiceRole.entities.User.update(userData.id, {
        identityResolutionStatus: "retrying",
        identityLastCheckedAt: now,
        identitySyncError: e.message,
      });
    }

    return Response.json({
      success: true,
      profile_id: profileId,
      identity: identityResult,
    });
  } catch (error) {
    console.error("[onUserCreated] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});