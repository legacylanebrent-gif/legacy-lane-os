// Chapter 11 P0-2 — safe server-side referral-code resolver.
// The public referral landing page calls this instead of listing users.
// The opaque code is the check; ONLY the minimum public-safe metadata
// (display name) is returned. No user list, no emails, no internal IDs.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const code = String((body as any).code || (body as any).referralCode || '').trim().toUpperCase();

    // Reject a missing/blank code before any lookup.
    if (!code || code.length < 6) {
      return Response.json({ valid: false });
    }

    const users = await base44.asServiceRole.entities.User.list();
    // Accept both historical code forms: first-8 (links) and last-8 (QR).
    const referrer = (users || []).find((u: any) =>
      String(u.id || '').slice(0, 8).toUpperCase() === code ||
      String(u.id || '').slice(-8).toUpperCase() === code
    );

    if (!referrer) {
      // Safe failure — does not reveal whether any user exists.
      return Response.json({ valid: false });
    }

    return Response.json({
      valid: true,
      referrer_name: referrer.full_name || 'A EstateSalen partner',
    });
  } catch (error) {
    return Response.json({ valid: false, error: 'resolver_unavailable' }, { status: 200 });
  }
}