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
import {
  recordSellerConsent,
  updateConsentIntakeState,
  getSellerConsentConfig,
} from '../../shared/sellerConsentControl.ts';

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

    // ── Phase 2B: consent PRE-VALIDATION (before ANY write) ──
    const consentCfg = getSellerConsentConfig();
    if (consentCfg.rollout_enabled) {
      if (!submissionId) {
        return Response.json({ ok: false, error: 'submission_id_required' }, { status: 400 });
      }
      if (body.consent_accepted !== true) {
        // Acceptance is NEVER inferred from a timestamp or a referral token.
        return Response.json({ ok: false, error: 'consent_acceptance_required' }, { status: 400 });
      }
      if (String(body.consent_text_version || '') !== consentCfg.text_version) {
        // The seller accepted a different (stale) version than the current one.
        return Response.json({ ok: false, error: 'consent_version_mismatch' }, { status: 400 });
      }
    }

    // ── INTAKE — idempotent by stable submission id ──
    let lead: any = null;
    let intakeReused = false;
    if (submissionId) {
      const existing = await service.entities.EstateTransitionLead.filter(
        { partner_submission_id: submissionId });
      lead = (existing.items || existing || [])[0] || null;
      intakeReused = !!lead;
      if (lead && String(lead.email || '').toLowerCase() !== email) {
        // An idempotency key belongs to ONE seller's request. A different
        // seller reusing it must never attach to, overwrite, or piggyback on
        // the recorded inquiry — reject instead of processing.
        return Response.json(
          { ok: false, error: 'submission_id_conflict' }, { status: 400 });
      }
    }
    if (!lead) {
      lead = await service.entities.EstateTransitionLead.create({
        first_name: firstName,
        last_name: String(body.last_name || '').trim() || null,
        email,
        phone: String(body.phone || '').trim() || null,
        city: String(body.city || '').trim() || null,
        county: String(body.county || '').trim() || null,
        state,
        zip_code: String(body.zip_code || '').trim() || null,
        life_event_type: 'other',
        needs_estate_sale: true,
        source_page_type: 'partner_referral',
        source_url: String(body.source_url || '') || null,
        notes: String(body.need_notes || '').trim() || null,
        partner_submission_id: submissionId || null,
      });
    }

    // ── CONSENT — stored BEFORE forwarding; failure prevents forwarding ──
    let consent: any = { recorded: false, reason: 'consent_rollout_disabled' };
    if (consentCfg.rollout_enabled) {
      try {
        consent = await recordSellerConsent(service, {
          source_type: 'partner_referred_inquiry',
          source_id: lead.id,
          operator_id: operatorId,
          intended_recipient_ids: [operatorId],
          attribution_source: 'partner_referral_link',
          submission_id: submissionId,
          consent_accepted: body.consent_accepted === true,
          consent_text_version: String(body.consent_text_version || ''),
        });
      } catch (e) {
        // Storage/validation failure: DO NOT forward the seller's
        // information. The intake record survives for the retry to reuse.
        console.error('recordSellerConsent error:', (e as Error).message);
        return Response.json({
          ok: false,
          error: (e as Error).message,
          stage: 'consent_recording',
          retryable: true,
          consent_recorded: false,
        }, { status: 500 });
      }
    }

    // ── FORWARDING — to the operator's pipeline + notification queue ──
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

    let result: any;
    try {
      result = await bridgeSellerInquiry(service, {
        operator_id: operatorId,
        client: {
          first_name: firstName,
          last_name: String(body.last_name || '').trim() || null,
          email,
          phone: String(body.phone || '').trim() || null,
        },
        property: {
          address: null,
          city: String(body.city || '').trim() || null,
          state,
        },
        notes: notesParts.join(' '),
        source: {
          inquiry_source_type: 'professional_referral',
          inquiry_source_record_id: lead.id,
          inquiry_received_at: lead.created_date || new Date().toISOString(),
          referral_source_type: sourceTypeMap[category] || 'other',
          referral_source_name: referrerName,
          referral_source_contact_id: referrerContact.id,
          source_label: `a referral from ${referrerName}`,
        },
        notify_user_ids: [operatorId],
      });
    } catch (e) {
      // Forwarding failed AFTER consent was saved: mark retry_required and
      // fail explicitly — never claim completion. A retry reuses the same
      // lead + consent (no duplicates) and re-attempts forwarding only.
      console.error('bridgeSellerInquiry error:', (e as Error).message);
      if (consent.id) {
        try {
          await updateConsentIntakeState(service, consent.id, {
            forwarding_status: 'retry_required',
            last_error: (e as Error).message,
          });
        } catch (trackErr) {
          console.error('updateConsentIntakeState error:', (trackErr as Error).message);
        }
      }
      return Response.json({
        ok: false,
        error: 'forwarding_failed',
        stage: 'forwarding',
        retryable: true,
        consent_recorded: !!consent.recorded,
      }, { status: 500 });
    }

    if (!result.ok) {
      if (consent.id) {
        try {
          await updateConsentIntakeState(service, consent.id, {
            forwarding_status: 'retry_required',
            last_error: result.error || 'bridge_failed',
          });
        } catch (trackErr) {
          console.error('updateConsentIntakeState error:', (trackErr as Error).message);
        }
      }
      return Response.json({
        ok: false,
        error: result.error || 'bridge_failed',
        stage: 'forwarding',
        retryable: true,
        consent_recorded: !!consent.recorded,
      }, { status: 500 });
    }

    // Forwarding completed (deal created/replayed + notification queued).
    if (consent.id) {
      try {
        await updateConsentIntakeState(service, consent.id, {
          forwarding_status: 'completed',
          last_error: null,
          deal_id: result.deal_id,
        });
      } catch (trackErr) {
        console.error('updateConsentIntakeState error:', (trackErr as Error).message);
      }
    }

    return Response.json({
      ok: true,
      created: result.created,
      replayed: result.replayed,
      consent_recorded: !!consent.recorded,
      intake_reused: intakeReused,
      stage: 'completed',
    });
  } catch (error) {
    console.error('submitPartnerReferredInquiry error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}