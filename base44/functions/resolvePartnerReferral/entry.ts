// Chapter 11 P1 — safe server-side PARTNER referral-token resolver.
// Public lookup for the attributed seller-intake link: the opaque token is
// the check. Exact-match only; returns ONLY the minimum public-safe display
// name. No user list, no emails/phones unless intentionally part of intake,
// no internal Contact IDs, no other users. Invalid token = safe failure.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const token = String((body as any).token || '').trim();

    // Reject a missing/blank token before any lookup.
    if (!token || token.length < 8) {
      return Response.json({ valid: false });
    }

    const page = await base44.asServiceRole.entities.Contact.filter(
      { partner_referral_token: token }, { limit: 1 });
    const contact = (page.items || page || [])[0];

    if (!contact) {
      // Safe failure — does not reveal whether any professional exists.
      return Response.json({ valid: false });
    }

    const person = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
    const displayName = (contact.professional_profile || {}).organization_name || person || 'A local professional';

    return Response.json({ valid: true, partner_display_name: displayName });
  } catch (error) {
    return Response.json({ valid: false, error: 'resolver_unavailable' }, { status: 200 });
  }
}