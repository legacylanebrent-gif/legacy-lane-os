// Chapter 1 P1 — shared vocabulary and helpers for the Client Authority & Decision layer.
// Single source of truth for scope/decision labels and history entry construction.

export const AUTHORITY_SCOPES = [
  { key: 'general_project', label: 'General Project' },
  { key: 'merchandise_decisions', label: 'Merchandise Decisions' },
  { key: 'pricing_approval', label: 'Pricing Approval' },
  { key: 'disposition', label: 'Disposition' },
  { key: 'financial_settlement', label: 'Financial / Settlement' },
  { key: 'property_access', label: 'Property Access' },
  { key: 'other', label: 'Other' },
];

export const DECISION_TYPES = [
  { key: 'general', label: 'General' },
  { key: 'merchandise', label: 'Merchandise (Keep/Sell/Review)' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'disposition', label: 'Disposition' },
  { key: 'financial', label: 'Financial / Settlement' },
  { key: 'property_access', label: 'Property Access' },
  { key: 'other', label: 'Other' },
];

export const DECISION_SOURCES = ['phone', 'email', 'in_person', 'text', 'contract', 'other'];

export const MERCH_OPTIONS = [
  { key: 'keep', label: 'KEEP', badge: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'sell', label: 'SELL', badge: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { key: 'review', label: 'REVIEW', badge: 'bg-amber-100 text-amber-700 border-amber-300' },
];

export function scopeLabel(key) {
  return AUTHORITY_SCOPES.find(s => s.key === key)?.label || key;
}

export function decisionTypeLabel(key) {
  return DECISION_TYPES.find(t => t.key === key)?.label || key;
}

export function merchBadgeClass(decision) {
  return MERCH_OPTIONS.find(o => o.key === decision)?.badge || 'bg-slate-100 text-slate-600 border-slate-300';
}

export function buildHistoryEntry({ decision, authority, source, reason, notes, user }) {
  return {
    decision,
    authorized_by: authority?.id || '',
    authorized_by_name: authority?.full_name || '',
    decided_at: new Date().toISOString(),
    source: source || 'other',
    reason: reason || '',
    notes: notes || '',
    recorded_by: user?.id || '',
    recorded_by_name: user?.full_name || '',
  };
}

// Reads: is this record visible to an array-returning filter result?
export function asArray(result) {
  if (Array.isArray(result)) return result;
  return result?.items || [];
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < startOfToday();
}

export function isDueSoon(dueDate, status) {
  if (!dueDate || status === 'completed' || isOverdue(dueDate, status)) return false;
  const due = new Date(dueDate);
  const soon = new Date(startOfToday().getTime() + 3 * 24 * 60 * 60 * 1000);
  return due <= soon;
}

export function fmtDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(value);
  }
}

export function fmtDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(value);
  }
}