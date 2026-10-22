// Referral Rebuild — Phase 2B public seller-consent configuration.
//
// Read-only seam the public referral form uses to know whether the
// introduction-consent step is active, and to display the EXACT versioned
// text the seller must affirmatively accept. Returns NO text while the
// rollout is disabled (draft wording is never shown to sellers).
//
// Fail-closed: this reports rollout_enabled only when BOTH the flag is set
// AND approved non-empty text exists. It exposes nothing else — no IDs, no
// recipients, no records.
import { getSellerConsentConfig } from '../../shared/sellerConsentControl.ts';

export default async function(req: Request): Promise<Response> {
  try {
    return Response.json({ ok: true, config: getSellerConsentConfig() });
  } catch (error) {
    console.error('sellerConsentConfig error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}