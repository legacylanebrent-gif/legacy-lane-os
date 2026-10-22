export const ELIGIBILITY_BUILD_VERSION = '2B-REPAIR-2026-10-22.1';
export const ELIGIBILITY_SCHEMA_VERSION = 2;
export const CONTRACT_FAILURE = 'Unexpected eligibility response. No approval was confirmed. Refresh and try again.';
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function validateEligibilityResponse(data, operation, userId) {
  if (!object(data) || data.operation !== operation || data.build_version !== ELIGIBILITY_BUILD_VERSION ||
    data.schema_version !== ELIGIBILITY_SCHEMA_VERSION || typeof data.ok !== 'boolean') throw new Error(CONTRACT_FAILURE);
  if (!data.ok) throw new Error(`Action failed: ${data.error || 'unknown error'}`);
  if (typeof data.compensation_enabled !== 'boolean') throw new Error(CONTRACT_FAILURE);
  if (operation === 'list') {
    if (!Array.isArray(data.profiles) || data.profile || data.profiles.some((p) => !object(p) || !p.id || !p.user_id || !p.status)) throw new Error(CONTRACT_FAILURE);
  } else {
    const p = data.profile;
    if (!object(p) || !p.user_id || !p.status || data.profiles || (userId && p.user_id !== userId)) throw new Error(CONTRACT_FAILURE);
    const expected = { 'review.approve': 'verified', 'review.reject': 'rejected', 'review.suspend': 'suspended',
      'review.request_corrections': 'corrections_required', 'review.reinstate': 'verified' }[operation];
    if (expected && (p.status !== expected || !p.id)) throw new Error(CONTRACT_FAILURE);
  }
  return data;
}