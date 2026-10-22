import { canConfirmWithdrawal, canReportWithdrawal, minimalText, validateReceived, relayError } from './withdrawalRelayPolicy.ts';

// Append-only event records, not read-modify-write history arrays.
// Report != confirmed withdrawal != queued notification != delivery receipt.
export async function runWithdrawalRelay(user, input, deps) {
  if (!user) throw relayError('unauthorized', 401);
  const action = input.action;
  const reviewer = canConfirmWithdrawal(user);
  if (action === 'list') return { ok: true, can_confirm: reviewer, ...(await deps.list(user)) };
  if (!['report_request', 'confirm_withdrawal', 'propagate'].includes(action)) {
    throw relayError('explicit_withdrawal_action_required');
  }
  if (action !== 'report_request' && !reviewer) throw relayError('designated_withdrawal_admin_required', 403);
  const consent = await deps.findConsent(minimalText(input.consent_id, 'consent_id', 100));
  if (!consent) throw relayError('consent_not_found', 404);
  const actual = await deps.actualRecipients(consent);
  if (!canReportWithdrawal(user, consent, actual.ids)) throw relayError('not_authorized_for_this_consent', 403);
  const at = deps.clock();
  const actor = { actor_id: user.id, actor_name: user.full_name || 'Staff member', at,
    consent_record_id: consent.id, consent_id: consent.consent_id };
  if (action === 'report_request') {
    const request = await deps.append({ ...actor, event_type: 'request_received',
      ...validateReceived(input, at) });
    return { ok: true, request_id: request.id, withdrawal_state: 'pending_admin_review',
      consent_status: consent.status, note: 'Request recorded only. Seller authorization has not been verified.' };
  }
  if (action === 'confirm_withdrawal') {
    // No-write idempotency: an already-designated-confirmed consent returns
    // without touching state or history. Concurrent first confirms are
    // serialized by the storage adapter's single-record conditional update.
    if (consent.withdrawal_confirmation) {
      return { ok: true, withdrawal_state: 'confirmed', already_withdrawn: true,
        notification_state: 'not_attempted',
        note: 'Withdrawal already confirmed by a designated administrator. Queue notices separately.' };
    }
    const request = await deps.getEvent(minimalText(input.request_id, 'request_id', 100));
    if (!request || request.event_type !== 'request_received' || request.consent_record_id !== consent.id) {
      throw relayError('withdrawal_request_not_found', 404);
    }
    validateReceived(request, at);
    const verification = { verification_method: minimalText(input.verification_method, 'verification_method', 120),
      verification_reference: minimalText(input.verification_reference, 'verification_reference') };
    if (request.claimed_capacity.toLowerCase() !== 'seller' && input.representative_authority_verified !== true) {
      throw relayError('representative_authority_verification_required');
    }
    const event = { ...actor, ...verification, event_type: 'withdrawal_confirmed',
      request_id: request.id, representative_authority_verified: input.representative_authority_verified === true };
    // One atomic write: state, confirmed identity/time and append-only history.
    const won = await deps.confirm(consent, event);
    return { ok: true, withdrawal_state: 'confirmed', already_withdrawn: !won,
      notification_state: 'not_attempted', note: 'Confirmed withdrawal is separate from propagation. Queue notices next.' };
  }
  if (consent.status !== 'withdrawn' || !consent.withdrawal_confirmation?.actor_id) {
    throw relayError('administrator_confirmed_withdrawal_required', 409);
  }
  // Missing delivery evidence is an unresolved dependency, NEVER assumed no recipients.
  if (actual.unresolved) throw relayError('recipient_delivery_records_unresolved', 409);
  if (!await deps.claimPropagation(consent)) throw relayError('propagation_in_progress', 409);
  const appended = [];
  try {
    const events = await deps.notificationHistory(consent.id);
    const queued = new Set([...(consent.downstream_notifications || []), ...events]
      .filter((e) => e.state === 'queued' || e.event_type === 'notification_queued').map((e) => e.recipient_user_id));
    for (const recipientId of actual.ids.filter((id) => !queued.has(id))) {
      let notification;
      try { notification = await deps.notify(recipientId, consent); }
      catch {
        appended.push(await deps.append({ ...actor, event_type: 'notification_failed',
          recipient_user_id: recipientId, reference_note: 'Notification queue failed; retry required.' }));
        continue;
      }
      // A queue write is NOT confirmed delivery. Failed audit persistence bubbles up.
      appended.push(await deps.append({ ...actor, event_type: 'notification_queued',
        recipient_user_id: recipientId, notification_id: notification.id,
        reference_note: 'Queued in-app. Delivery and acknowledgement are not confirmed.' }));
    }
  } finally { await deps.releasePropagation(consent); }
  const failed = appended.filter((e) => e.event_type === 'notification_failed').length;
  return { ok: true, withdrawal_state: 'confirmed', notification_state: failed ? 'retry_required' : 'all_queued_or_none_required',
    queued_this_attempt: appended.length - failed, failed_this_attempt: failed,
    delivery_state: 'unconfirmed', note: 'Queued notifications are not delivery receipts.' };
}