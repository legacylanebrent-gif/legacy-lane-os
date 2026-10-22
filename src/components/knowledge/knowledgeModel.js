// Chapter 25 P1 — shared vocabulary for the company knowledge surfaces.
export const KNOWLEDGE_CATEGORIES = ['SOP', 'POLICY', 'TRAINING', 'CHECKLIST'];

export const CATEGORY_LABELS = {
  SOP: 'Procedure',
  POLICY: 'Policy',
  TRAINING: 'Training',
  CHECKLIST: 'Checklist / Reference',
};

export const SOP_STATUS_LABELS = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED: 'Current',
  SUPERSEDED: 'Superseded',
};

export const SOP_STATUS_TONES = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-300',
  IN_REVIEW: 'bg-amber-100 text-amber-800 border-amber-300',
  APPROVED: 'bg-green-100 text-green-700 border-green-300',
  SUPERSEDED: 'bg-stone-100 text-stone-500 border-stone-300',
};

export const ROLE_OPTIONS = [
  'ENTRY', 'CHECKOUT', 'FLOOR_ZONE', 'HIGH_VALUE', 'NEGOTIATION',
  'FURNITURE', 'PICKUP', 'CUSTOMER_ISSUES', 'SALE_FLOOR_RECOVERY', 'ALL_STAFF',
];

export const SOURCE_LABELS = {
  EMPLOYEE_OBSERVATION: 'Employee observation',
  SALE_ISSUE: 'Sale issue',
  NEAR_MISS: 'Near miss',
  SALE_RECAP: 'Post-sale review',
  MANAGER_OBSERVATION: 'Manager observation',
  MANUAL: 'Manual',
};

export const OUTCOME_LABELS = {
  BETTER: 'Better — it helped',
  NO_CHANGE: 'No change',
  WORSE: 'Worse',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
};

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '');
export const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');