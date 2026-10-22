// Referral Rebuild — Phase 2A: withdraw a seller's recorded consent.
//
// The seller (usually no platform account) withdraws through an authorized
// recipient relaying their request, so:
//   - identity is derived from the AUTHENTICATED session (never client-
//     supplied), and the caller must be an admin, the consent's operator, or
//     one of its intended recipients;
//   - the timestamp is SERVER-generated;
//   - withdrawal APPENDS a notification for every other recipient (propagates
//     to the recipient notification queue) and logs each one in the consent's
//     append-only downstream_notifications history — earlier entries are
//     never rewritten;
//   - withdrawing an already-withdrawn consent is an idempotent no-op (no
//     duplicate notifications);
//   - this touches ONLY consent state. It never alters deals, contacts, or
//     any compensation/financial record.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const consentId = String(body.consent_id || '').trim();
    const reason = String(body.reason || '').trim();
    if (!consentId) {
      return Response.json({ ok: false, error: 'consent_id_required' }, { status: 400 });
    }

    const service = base44.asServiceRole;
    const page = await service.entities.SellerConsent.filter({ consent_id: consentId });
    const record = (page.items || page || [])[0];
    if (!record) {
      return Response.json({ ok: false, error: 'consent_not_found' }, { status: 404 });
    }

    // Authorization: admin, the consent's operator, or an intended recipient.
    const isAdmin = user.role === 'admin';
    const isRecipient =
      record.operator_id === user.id ||
      (record.intended_recipient_ids || []).includes(user.id);
    if (!isAdmin && !isRecipient) {
      return Response.json({ ok: false, error: 'not_authorized_for_this_consent' }, { status: 403 });
    }

    // Idempotent: re-withdrawing does nothing and notifies nobody again.
    if (record.status === 'withdrawn') {
      return Response.json({ ok: true, already_withdrawn: true, consent_id: record.consent_id });
    }

    const now = new Date().toISOString();
    const byName = user.full_name || user.email || 'Authorized recipient';

    // Propagate to every OTHER recipient's notification queue.
    const recipientIds = [...new Set(
      [record.operator_id, ...(record.intended_recipient_ids || [])].filter(Boolean)
    )].filter((id: string) => id !== user.id);

    const logged: any[] = [];
    for (const recipientId of recipientIds) {
      try {
        const notification = await service.entities.Notification.create({
          user_id: recipientId,
          type: 'seller_consent_withdrawn',
          title: 'Seller Consent Withdrawn',
          message: `A seller withdrew their consent to be contacted (consent ${record.consent_id}). Do not contact the seller for this inquiry without fresh consent.`,
          read: false,
          link_to_page: 'SaleConversionPipeline',
          related_entity_type: 'SellerConsent',
          related_entity_id: record.id,
        });
        logged.push({
          at: now,
          recipient_user_id: recipientId,
          notification_id: notification.id,
          note: 'Withdrawal propagated in-app.',
        });
      } catch (e) {
        logged.push({
          at: now,
          recipient_user_id: recipientId,
          note: `Notification failed: ${(e as Error).message}`,
        });
      }
    }

    // Append-only history: prior entries preserved verbatim.
    const history = [...(record.downstream_notifications || []), ...logged];

    await service.entities.SellerConsent.update(record.id, {
      status: 'withdrawn',
      withdrawn_at: now,
      withdrawal_reason: reason || null,
      withdrawn_by: user.id,
      withdrawn_by_name: byName,
      downstream_notifications: history,
    });

    return Response.json({
      ok: true,
      consent_id: record.consent_id,
      withdrawn_at: now,
      notified: logged.length,
    });
  } catch (error) {
    console.error('withdrawSellerConsent error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
});