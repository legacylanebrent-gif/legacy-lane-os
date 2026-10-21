// Chapter 6 P2 — shared vocabulary for the Compliance Questions system.
// Doctrine: QUESTION ≠ ANSWER. These records organize what needs investigating and
// what was learned, with provenance. Statuses describe WHO/WHAT the answer came from,
// never that EstateSalen guarantees a legal conclusion.

export const CQ_CATEGORIES = [
  { key: 'BUSINESS', label: 'Business' },
  { key: 'TAX', label: 'Tax' },
  { key: 'EMPLOYMENT', label: 'Employment' },
  { key: 'INSURANCE', label: 'Insurance' },
  { key: 'SIGNAGE', label: 'Signage' },
  { key: 'PARKING', label: 'Parking' },
  { key: 'PERMIT', label: 'Permit' },
  { key: 'HOA_CONDO', label: 'HOA / Condo' },
  { key: 'PROPERTY_ACCESS', label: 'Property Access' },
  { key: 'SALES', label: 'Sales' },
  { key: 'OTHER', label: 'Other' },
];

export const CQ_JURISDICTIONS = [
  { key: 'FEDERAL', label: 'Federal' },
  { key: 'STATE', label: 'State' },
  { key: 'COUNTY', label: 'County' },
  { key: 'MUNICIPALITY', label: 'Municipality' },
  { key: 'HOA_CONDO', label: 'HOA / Condo' },
  { key: 'PROPERTY_SPECIFIC', label: 'Property-Specific' },
  { key: 'OTHER', label: 'Other' },
];

export const CQ_STATUSES = [
  { key: 'RESEARCH_NEEDED', label: 'Research Needed', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'OPERATOR_VERIFIED', label: 'Operator Verified', badge: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'PROFESSIONAL_VERIFIED', label: 'Professional Verified', badge: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'AUTHORITY_VERIFIED', label: 'Authority Verified', badge: 'bg-teal-100 text-teal-800 border-teal-300' },
];

export const CQ_SOURCE_TYPES = [
  { key: 'GOVERNMENT', label: 'Government' },
  { key: 'HOA_CONDO', label: 'HOA / Condo' },
  { key: 'PROFESSIONAL', label: 'Professional' },
  { key: 'INSURANCE_PROVIDER', label: 'Insurance Provider' },
  { key: 'OPERATOR_RESEARCH', label: 'Operator Research' },
  { key: 'OTHER', label: 'Other' },
];

// Adviser categories reuse the canonical Contact role taxonomy (Chapter 6 P1).
export const ADVISER_ROLES = [
  { key: 'attorney', label: 'Attorney' },
  { key: 'cpa', label: 'CPA / Accountant' },
  { key: 'tax_adviser', label: 'Tax Adviser' },
  { key: 'insurance', label: 'Insurance Professional' },
  { key: 'employment_adviser', label: 'Employment Adviser' },
  { key: 'payroll', label: 'Payroll Professional' },
  { key: 'bookkeeper', label: 'Bookkeeper' },
  { key: 'contractor', label: 'Contractor' },
];

// Starter prompts to INVESTIGATE — deliberately phrased as questions, never answers.
export const STARTING_QUESTIONS = [
  { category: 'TAX', jurisdiction_type: 'STATE', question: 'Have you confirmed whether your state requires sales-tax registration or collection for your business model?' },
  { category: 'SIGNAGE', jurisdiction_type: 'MUNICIPALITY', question: 'Have you confirmed whether the municipality has rules affecting estate-sale signage?' },
  { category: 'PARKING', jurisdiction_type: 'PROPERTY_SPECIFIC', question: 'Have you confirmed parking or access restrictions for this property?' },
  { category: 'EMPLOYMENT', jurisdiction_type: 'FEDERAL', question: 'Have you reviewed worker-classification questions with the appropriate professional?' },
  { category: 'INSURANCE', jurisdiction_type: 'STATE', question: 'Have you reviewed your insurance needs with an insurance professional?' },
  { category: 'HOA_CONDO', jurisdiction_type: 'HOA_CONDO', question: 'Are there HOA or condominium requirements affecting this sale?' },
];

export const cqCategoryLabel = (k) => CQ_CATEGORIES.find(c => c.key === k)?.label || k || '';
export const cqJurisdictionLabel = (k) => CQ_JURISDICTIONS.find(c => c.key === k)?.label || k || '';
export const cqStatusLabel = (k) => CQ_STATUSES.find(c => c.key === k)?.label || k || '';
export const cqStatusBadge = (k) => CQ_STATUSES.find(c => c.key === k)?.badge || 'bg-slate-100 text-slate-600 border-slate-300';
export const cqSourceLabel = (k) => CQ_SOURCE_TYPES.find(c => c.key === k)?.label || k || '';
export const adviserRoleLabel = (k) => ADVISER_ROLES.find(c => c.key === k)?.label || k || '';

// A verified answer not re-confirmed in 12 months surfaces as REVIEW.
// This is a review prompt, never a claim that anything legally expired.
export const CQ_STALE_DAYS = 365;
export function cqIsStale(q) {
  if (q.status === 'RESEARCH_NEEDED') return false;
  if (!q.last_verified_at) return true;
  return (Date.now() - new Date(q.last_verified_at).getTime()) > CQ_STALE_DAYS * 24 * 60 * 60 * 1000;
}

// Deterministic escalation hints for consequential areas. Hedged language only —
// EstateSalen never claims a professional is legally required.
export function escalationHint(category) {
  const hints = {
    TAX: 'Consider confirming this with your accountant or tax adviser.',
    EMPLOYMENT: 'This question may warrant review by an attorney or employment adviser.',
    INSURANCE: 'Consider confirming this with an insurance professional.',
    PERMIT: 'Consider confirming this with the relevant municipal or county office.',
    HOA_CONDO: 'Consider confirming this with the HOA or condominium association.',
    BUSINESS: 'This question may warrant review by an attorney or CPA.',
  };
  return hints[category] || '';
}