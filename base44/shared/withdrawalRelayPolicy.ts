// Explicit designation: the authenticated app-owner administrator verified during repair.
// Adding a reviewer requires an intentional server-side policy change, never a User custom field.
export const WITHDRAWAL_REVIEWER_IDS = Object.freeze(['69471383fc72e5b50c72fcc8']);
export function canConfirmWithdrawal(user) {
  return !!user && user.role === 'admin' && WITHDRAWAL_REVIEWER_IDS.includes(user.id);
}
export function canReportWithdrawal(user, consent, actualRecipientIds = []) {
  return !!user && (user.role === 'admin' || consent.operator_id === user.id ||
    (consent.intended_recipient_ids || []).includes(user.id) || actualRecipientIds.includes(user.id));
}
export function relayError(code, status = 400) {
  return Object.assign(new Error(code), { status });
}
export function minimalText(value, field, max = 300) {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw relayError(`${field}_required_or_too_long`);
  return text;
}
export function validateReceived(input, now) {
  const received = String(input.request_received_at || '');
  if (!Number.isFinite(Date.parse(received)) || Date.parse(received) > Date.parse(now)) {
    throw relayError('valid_request_received_date_required');
  }
  return { request_received_at: new Date(received).toISOString(),
    channel: minimalText(input.channel, 'channel', 80),
    requester_identity: minimalText(input.requester_identity, 'requester_identity', 120),
    claimed_capacity: minimalText(input.claimed_capacity, 'claimed_capacity', 120),
    reference_note: minimalText(input.reference_note, 'reference_note') };
}