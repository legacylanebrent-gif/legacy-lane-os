// Referral Rebuild — Phase 2A/2B: withdraw a seller's recorded consent.
//
// The seller (usually no platform account) withdraws through an authorized
// recipient relaying their request, so:
//   - identity is derived from the AUTHENTICATED session (never client-
//     supplied), and the caller must be an admin, the consent's operator, or
//     one of its intended recipients resolved from the CONSENT RECORD itself
//     — an operator attribution link, a referral token, or mere knowledge
//     of a consent ID authorizes NOTHING;
//   - the timestamp is SERVER-generated;
//   - recipients are resolved from the record's own delivery fields — never
//     caller-supplied recipient IDs;
//   - each recipient's notification carries an EXPLICIT state: 'queued'
//     (an in-app notification row exists — which is NOT proof the recipient
//     has seen it) or 'failed' (retry required). The overall response
//     reports withdrawal_state and notification_state separately:
//     withdrawal recorded ≠ notifications queued ≠ notifications delivered;
//   - repeat withdrawal is IDEMPOTENT: the withdrawal itself never
//     duplicates, already-queued recipients are never re-notified, and a
//     repeat call RETRIES only failed/missing recipients — each retry
//     APPENDS new history entries (earlier entries are never rewritten);
//   - this touches ONLY consent state. It never alters deals, contacts, or
//     any compensation/financial record, never deletes transaction records,
//     and never asserts that withdrawal reverses processing already
//     completed.
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

    // ACTUAL RECORDED FORWARDING DESTINATION: if forwarding completed to a
    // canonical deal, the deal's operator ALSO received the seller's
    // information — reconcile them (from the RECORD, never caller input)
    // into both authorization and the notification recipient set.
    const tracking = record.intake_tracking || {};
    let dealOperatorId: string | null = null;
    if (tracking.deal_id) {
      try {
        const deal = await service.entities.SaleConversionPipeline.get(tracking.deal_id);
        dealOperatorId = deal?.operator_id || null;
      } catch {
        dealOperatorId = null;
      }
    }

    // Authorization: admin, the consent's operator, an intended recipient,
    // or the operator of the deal the inquiry was actually forwarded to —
    // all resolved from the RECORD, never from caller input. A consent ID,
    // an attribution token, or an unrelated account authorizes NOTHING.
    const isAdmin = user.role === 'admin';
    const isRecipient =
      record.operator_id === user.id ||
      dealOperatorId === user.id ||
      (record.intended_recipient_ids || []).includes(user.id);
    if (!isAdmin && !isRecipient) {
      return Response.json({ ok: false, error: 'not_authorized_for_this_consent' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const byName = user.full_name || user.email || 'Authorized recipient';
    const history = record.downstream_notifications || [];

    // Recipients from the record's delivery fields only (consent list
    // RECONCILED with the actual forwarding destination). Already-queued
    // recipients are never re-notified; only failed/missing ones are
    // (re)attempted, and each attempt APPENDS history.
    const recipientIds = [...new Set(
      [record.operator_id, dealOperatorId, ...(record.intended_recipient_ids || [])]
        .filter(Boolean)
    )];
    const alreadyQueuedFor = new Set(
      history.filter((e: any) => e.state === 'queued')
        .map((e: any) => e.recipient_user_id));
    const toNotify = recipientIds.filter((id: string) => !alreadyQueuedFor.has(id));

    if (record.status === 'withdrawn' && toNotify.length === 0) {
      // Idempotent repeat: nothing to do, nothing duplicated.
      return Response.json({
        ok: true,
        already_withdrawn: true,
        consent_id: record.consent_id,
        withdrawn_at: record.withdrawn_at,
        notification_state: 'all_queued_or_none_required',
        notification_note:
          'Queued in-app notifications are not delivery receipts — recipient acknowledgement is not tracked here.',
      });
    }

    const appended: any[] = [];
    let failedCount = 0;
    for (const recipientId of toNotify) {
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
        // QUEUED — the notification row exists; this is NOT a delivery
        // receipt and the response never claims delivered.
        appended.push({
          at: now,
          recipient_user_id: recipientId,
          notification_id: notification.id,
          state: 'queued',
          note: 'Withdrawal queued to the recipient notification center. Queued is not delivery.',
        });
      } catch (e) {
        failedCount += 1;
        appended.push({
          at: now,
          recipient_user_id: recipientId,
          state: 'failed',
          note: `Notification failed, retry required: ${(e as Error).message}`,
        });
      }
    }

    // Append-only history: prior entries preserved verbatim.
    const updatedHistory = [...history, ...appended];

    await service.entities.SellerConsent.update(record.id, {
      status: 'withdrawn',
      withdrawn_at: record.withdrawn_at || now,
      withdrawal_reason: record.withdrawal_reason || reason || null,
      withdrawn_by: record.withdrawn_by || user.id,
      withdrawn_by_name: record.withdrawn_by_name || byName,
      downstream_notifications: updatedHistory,
    });

    const notificationState = failedCount > 0
      ? (appended.length > failedCount ? 'partial_failure' : 'failed_retry_required')
      : 'queued';

    return Response.json({
      ok: true,
      consent_id: record.consent_id,
      withdrawn_at: record.withdrawn_at || now,
      withdrawal_state: 'recorded',
      notification_state: notificationState,
      notified_this_attempt: appended.filter((e) => e.state === 'queued').length,
      failed_this_attempt: failedCount,
      notification_note:
        notificationState === 'queued'
          ? 'Notifications are queued in-app; queued is not delivered — recipient acknowledgement is not tracked here.'
          : 'One or more notifications failed. Repeat this request to retry only the failed recipients; already-queued recipients are never duplicated.',
    });
  } catch (error) {
    console.error('withdrawSellerConsent error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
});