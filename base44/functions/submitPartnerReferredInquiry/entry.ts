// Chapter 11 P1 — partner-attributed seller inquiry intake.
// Public endpoint: the opaque partner_referral_token is the check. The
// referring professional's identity is resolved SERVER-SIDE from the token
// (the seller never selects or types the referrer), then the inquiry flows
// through the ONE Chapter 10 inquiry bridge into the canonical
// SaleConversionPipeline opportunity with:
//   - inquiry_source_type: professional_referral
//   - referral_source_contact_id: the referring Contact (exact identity)
//   - deterministic seeded next action (4-hour speed-to-lead grace, unchanged)
// Marketing consent is NEVER granted by inquiry capture (bridge doctrine).
//
// Phase 2A/2B consent sequencing (explicit, recoverable, idempotent):
//   - DISABLED rollout (today): the unpaid intake flow behaves exactly as
//     before and accurately returns consent_recorded: false.
//   - ENABLED rollout: affirmative acceptance of the exact versioned text
//     is validated BEFORE ANY WRITE; the consent record is stored BEFORE
//     the inquiry is forwarded to recipients; a consent-storage failure
//     prevents forwarding; the public form's STABLE SUBMISSION ID makes
//     every step idempotent — a retry reuses the same lead, the same
//     consent, and re-attempts only failed stages (no duplicate consent,
//     inquiry, or forwarding). Delivery is never claimed beyond what
//     actually completed.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { bridgeSellerInquiry } from '../../shared/sellerInquiryBridge.ts';
import { getSellerConsentConfig } from '../../shared/sellerConsentControl.ts';
import { runConsentIntake } from '../../shared/consentIntakeEngine.ts';
import { consentProductionStorage } from '../../shared/consentProductionStorage.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.first_name || '').trim();
    const state = String(body.state || '').trim().toUpperCase();
    // Phase 2B — stable submission identifier (client uuid, reused across
    // retries of the same submission). Idempotency anchor in BOTH rollout
    // states; optional while the rollout is disabled.
    const submissionId = String(body.submission_id || '').trim();

    if (!token || token.length < 8) {
      return Response.json({ ok: false, error: 'invalid_referral_link' }, { status: 400 });
    }
    if (!firstName || !email || !state) {
      return Response.json({ ok: false, error: 'first_name_email_and_state_required' }, { status: 400 });
    }

    const service = base44.asServiceRole;

    // Exact token lookup — no enumeration, no partial matches.
    const page = await service.entities.Contact.filter(
      { partner_referral_token: token }, { limit: 1 });
    const referrerContact = (page.items || page || [])[0];
    if (!referrerContact) {
      return Response.json({ ok: false, error: 'invalid_referral_link' }, { status: 400 });
    }

    // The referring professional belongs to a specific operator's network —
    // the operator is derived server-side, never client-supplied.
    const operatorId = referrerContact.created_by_id || referrerContact.assigned_to;
    if (!operatorId) {
      return Response.json({ ok: false, error: 'referral_operator_unresolved' }, { status: 500 });
    }

    const profile = referrerContact.professional_profile || {};
    const person = [referrerContact.first_name, referrerContact.last_name].filter(Boolean).join(' ');
    const referrerName = profile.organization_name || person || 'A professional referral';

    // Chapter 11 attribution mapping — category → Chapter 2 source vocabulary.
    const category = (profile.service_categories || [])[0];
    const sourceTypeMap: any = {
      real_estate: 'real_estate_agent',
      elder_law: 'attorney',
      probate_estate_law: 'attorney',
      accounting_tax: 'attorney',
      organizing: 'professional_organizer',
      senior_move: 'senior_move_manager',
      moving: 'senior_move_manager',
    };
    const notesParts = ['Inquiry via a professional partner referral link.'];
    if (body.need_notes) notesParts.push(`Seller need: ${String(body.need_notes).trim()}`);
    if (body.county || body.city) {
      notesParts.push(`Location: ${[body.city, body.county].filter(Boolean).join(', ')}, ${state}.`);
    }

    const input = { ...Object.fromEntries(['last_name', 'phone', 'city', 'county', 'zip_code', 'need_notes', 'source_url']
      .map((key) => [key, String(body[key] || '').trim()])), first_name: firstName, email, state,
      submission_id: submissionId, consent_accepted: body.consent_accepted === true,
      consent_text_version: String(body.consent_text_version || ''),
      operator_id: operatorId, referrer_id: referrerContact.id };
    const result = await runConsentIntake(input, {
      config: getSellerConsentConfig(), storage: consentProductionStorage(service),
      clock: () => new Date().toISOString(), newId: () => `SC-${crypto.randomUUID()}`,
      forward: (lead) => bridgeSellerInquiry(service, {
        operator_id: operatorId,
        client: { first_name: firstName, last_name: input.last_name, email, phone: input.phone },
        property: { address: null, city: input.city, state }, notes: notesParts.join(' '),
        source: { inquiry_source_type: 'professional_referral', inquiry_source_record_id: lead.id,
          inquiry_received_at: lead.created_date || new Date().toISOString(),
          referral_source_type: sourceTypeMap[category] || 'other', referral_source_name: referrerName,
          referral_source_contact_id: referrerContact.id, source_label: `a referral from ${referrerName}` },
        notify_user_ids: [operatorId],
      }),
    });
    return Response.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    console.error('submitPartnerReferredInquiry error:', (error as Error).message);
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}