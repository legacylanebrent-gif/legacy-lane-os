/**
 * Chapter 19 P1-10/P1-11 — the ONE deterministic AUTHORITY MATRIX derivation.
 *
 * Shared by the mySaleDay backend function (and any operator surface) so the
 * employee view and the operator view derive identical guidance from the same
 * canonical inputs (Company.negotiation_policy + whether HIGH_VALUE
 * merchandise exists on the sale).
 *
 * DOCTRINE — every row is GUIDANCE for humans, derived from recorded truth:
 *  - CAN DECIDE      : the employee may act within the stated boundary.
 *  - ASK MANAGER     : act only after the operator/manager answers.
 *  - STOP / ESCALATE : do not proceed; raise it (Ask for Help) — the decision
 *                      belongs to the operator or an explicit client decision.
 * The matrix never decides anything itself and never auto-accepts/declines an
 * Offer. It is NOT a legal, HR, or compliance determination.
 */

export const AUTHORITY_LEVELS = ['CAN DECIDE', 'ASK MANAGER', 'STOP / ESCALATE'];

export const AUTHORITY_AREA_LABELS = {
  PRICE_CHANGE: 'Change a price (ordinary merchandise)',
  PRICE_CHANGE_HIGH_VALUE: 'Change a price (High Value merchandise)',
  DISCOUNT: 'Give a discount',
  OFFER_ACCEPTANCE: 'Accept a buyer offer',
  HOLD: 'Place a hold on an item',
  PRE_SALE: 'Sell before the sale opens',
  PAYMENT_ISSUE: 'A payment fails or cannot be confirmed',
  HIGH_VALUE_ACTION: 'Handle High Value merchandise (price, custody, release)',
  CLIENT_INSTRUCTION: 'A client or family member gives an instruction',
  PICKUP_RELEASE: 'Release paid merchandise to the buyer',
  FOUND_VALUABLE: 'Find cash, valuables, or personal documents',
  SAFETY_SECURITY: 'Safety or security problem',
};

export function buildAuthorityMatrix({ negotiationPolicy = {}, hasHighValueItems = false } = {}) {
  const policy = negotiationPolicy && typeof negotiationPolicy === 'object' ? negotiationPolicy : {};
  const rows = [];
  const push = (area, level, note) => rows.push({ area, label: AUTHORITY_AREA_LABELS[area], level, note });

  push('PRICE_CHANGE', 'CAN DECIDE',
    'Use the price-change flow so your change and reason are recorded.');

  push('PRICE_CHANGE_HIGH_VALUE', 'STOP / ESCALATE',
    'High Value prices are changed by the operator (or someone they authorize) through the price-change flow, with a recorded reason.');

  // DISCOUNT derives from the company's recorded negotiation policy.
  const p = policy.policy;
  const unitLabel = policy.employee_authority_unit === 'percent' ? '%' : '$';
  const max = policy.employee_authority_max != null ? policy.employee_authority_max : null;
  const threshold = policy.escalation_threshold != null ? policy.escalation_threshold : null;
  if (p === 'NO_NEGOTIATION') {
    push('DISCOUNT', 'STOP / ESCALATE',
      'The company policy is no negotiation. Prices stand as marked.');
  } else if (p === 'EMPLOYEE_AUTHORITY_LIMIT') {
    push('DISCOUNT', 'CAN DECIDE',
      max != null
        ? `You may accept up to ${unitLabel}${max} off without asking. Above that, ask the operator.`
        : 'The company allows employee discounts within a limit, but no limit is recorded — ask the operator.');
  } else if (p === 'MANAGER_APPROVAL_THRESHOLD') {
    push('DISCOUNT', 'ASK MANAGER',
      threshold != null
        ? `Discounts at or past ${unitLabel}${threshold} need the operator first.`
        : 'Discounts need the operator first (no threshold recorded).');
  } else if (p === 'OPERATOR_ONLY') {
    push('DISCOUNT', 'ASK MANAGER', 'Only the operator gives discounts for this company.');
  } else {
    push('DISCOUNT', 'ASK MANAGER',
      'No discount policy is recorded for this company — ask the operator before discounting anything.');
  }

  push('OFFER_ACCEPTANCE', 'ASK MANAGER',
    'Record the offer and who made it; the operator accepts or declines. Item-level no-discount overrides always win over general authority.');

  push('HOLD', 'CAN DECIDE',
    'You may place a hold on an item. Record who it is for and when they will return.');

  push('PRE_SALE', 'ASK MANAGER',
    'Pre-sale selling is enabled per item by the operator. Never promise merchandise before the sale opens.');

  push('PAYMENT_ISSUE', 'STOP / ESCALATE',
    'A failed or unknown payment is never paid. Do not release merchandise. Raise a payment issue and find the operator.');

  push('HIGH_VALUE_ACTION', 'STOP / ESCALATE',
    hasHighValueItems
      ? 'This sale has High Value merchandise. Only the operator prices, moves custody of, or releases it.'
      : 'Applies when High Value merchandise exists on the sale. Only the operator prices, moves custody of, or releases it.');

  push('CLIENT_INSTRUCTION', 'STOP / ESCALATE',
    'Never act on a client or family statement as authorization. Record what they said and escalate — only a recorded client decision counts.');

  push('PICKUP_RELEASE', 'CAN DECIDE',
    'Release merchandise when the sale record shows it paid. If anything is unclear about payment, stop and ask.');

  push('FOUND_VALUABLE', 'STOP / ESCALATE',
    'Stop, secure it, and record a discovery with a photo. Never price it or sell it on the spot. Found cash is never sale revenue.');

  push('SAFETY_SECURITY', 'STOP / ESCALATE',
    'Stop work and find the operator immediately. Raise a safety or security issue so it is recorded.');

  return rows;
}

/** Sale-day zones that staff must treat as restricted (deterministic). */
export function restrictedZones(sale = {}) {
  const zones = Array.isArray(sale.prep_zones) ? sale.prep_zones : [];
  return zones
    .filter((z) => ['STAFF_ONLY', 'CLOSED_RESTRICTED', 'CHECKOUT'].includes(z && z.access_class))
    .map((z) => ({ zone_id: z.zone_id, name: z.name, access_class: z.access_class }));
}