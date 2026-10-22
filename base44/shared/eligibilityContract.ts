export const ELIGIBILITY_BUILD_VERSION = '2B-REPAIR-2026-10-22.1';
export const ELIGIBILITY_SCHEMA_VERSION = 2;
export function eligibilityReply(operation, data, init = {}) {
  return Response.json({ ...data, operation, build_version: ELIGIBILITY_BUILD_VERSION,
    schema_version: ELIGIBILITY_SCHEMA_VERSION }, init);
}