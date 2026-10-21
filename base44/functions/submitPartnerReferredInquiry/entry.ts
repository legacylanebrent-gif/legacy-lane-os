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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { bridgeSellerInquiry } from '../../shared/sellerInquiryBridge.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.first_name || '').trim();
    const state = String(body.state || '').trim().toUpperCase();

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

    // Record the source inquiry on the canonical EstateTransitionLead record
    // (the source-of-truth inquiry with its own consent flags — none granted here).
    const lead = await service.entities.EstateTransitionLead.create({
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
    });

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

    const result = await bridgeSellerInquiry(service, {
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

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error || 'bridge_failed' }, { status: 500 });
    }

    return Response.json({ ok: true, created: result.created, replayed: result.replayed });
  } catch (error) {
    console.error('submitPartnerReferredInquiry error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}