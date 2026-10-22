// Phase 1B — server-signed Master Referral Agreement submission.
//
// Replaces direct client creation of MasterReferralAgreement records. The
// server binds the signature to:
//   - the AUTHENTICATED user (user_id / signed_email derived server-side),
//   - a SERVER-GENERATED timestamp,
//   - the SERVER-PINNED terms version (TERMS_VERSION below).
// A client can never assert a timestamp, a different terms version, or
// someone else's signature. Idempotent: an already-active agreement is
// returned, never duplicated.
//
// A signed acknowledgement is NOT verified licensing, broker approval, or an
// executed brokerage referral agreement — it only records that this user
// acknowledged the displayed terms of this version.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// The exact terms version currently displayed in the signing flow.
// Bump this ONLY when the displayed terms change, and record the change.
const TERMS_VERSION = 'MRA-V1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const signedName = String(body.signed_name || '').trim();
    if (signedName.length < 2) {
      return Response.json({ error: 'signed_name is required' }, { status: 400 });
    }

    // Idempotency: never create a second active agreement for the same user.
    const existing = await base44.asServiceRole.entities.MasterReferralAgreement.filter({
      user_id: user.id,
      status: 'active'
    });
    if (existing.length > 0) {
      return Response.json({
        success: true,
        already_signed: true,
        agreement: existing[0]
      });
    }

    // Server-derived identity — never trusted from the client.
    const userType =
      user.primary_account_type === 'real_estate_agent'
        ? 'agent'
        : 'Estate Sale Company Owner';

    const agreementId = `MRA-${Date.now()}-${user.id.slice(-6).toUpperCase()}`;
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const signedIp = forwardedFor.split(',')[0]?.trim() || '';

    const agreement = await base44.asServiceRole.entities.MasterReferralAgreement.create({
      agreement_id: agreementId,
      user_id: user.id,
      user_type: userType,
      signed_name: signedName,
      signed_email: user.email,
      signed_timestamp: new Date().toISOString(),
      signed_ip: signedIp,
      terms_version: TERMS_VERSION,
      status: 'active'
    });

    return Response.json({
      success: true,
      already_signed: false,
      agreement,
      terms_version: TERMS_VERSION
    });
  } catch (error) {
    console.error('[signMasterReferralAgreement] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});