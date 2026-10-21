import { parseISO, isPast } from 'date-fns';

// Chapter 10 P1 — canonical pipeline stage vocabulary + deterministic
// discipline rules for the seller-opportunity CRM. NO AI decides any of this.
export const STAGES = [
  { key: 'new_lead',               label: 'New Lead',            color: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400',   border: 'border-slate-200' },
  { key: 'contacted',              label: 'Contacted',           color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500',  border: 'border-indigo-200' },
  { key: 'consultation_scheduled', label: 'Consultation',        color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',    border: 'border-blue-200' },
  { key: 'contract_signed',        label: 'Contract Signed',     color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500',  border: 'border-purple-200' },
  { key: 'setup_in_progress',      label: 'Setup / Staging',     color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500',  border: 'border-orange-200' },
  { key: 'sale_live',              label: 'Sale Live',           color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',   border: 'border-green-200' },
  { key: 'completed',              label: 'Completed',           color: 'bg-cyan-100 text-cyan-700',     dot: 'bg-cyan-500',    border: 'border-cyan-200' },
  { key: 'lost',                   label: 'Lost',                color: 'bg-red-100 text-red-700',       dot: 'bg-red-400',     border: 'border-red-200' },
  { key: 'referred',               label: 'Referred Out',        color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200' },
  { key: 'nurture',                label: 'Nurture',             color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-500',    border: 'border-teal-200' },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

// Outcome truth on the existing stage axis. WON = completed.
// NOT READY IS NOT LOST. REFERRED IS NOT LOST.
export const TERMINAL_STAGES = ['completed', 'lost', 'referred', 'nurture'];
export const ACTIVE_PROGRESS = ['new_lead', 'contacted', 'consultation_scheduled', 'contract_signed', 'setup_in_progress', 'sale_live', 'completed'];

// NEEDS NEXT ACTION: active opportunity with no pending next action.
// OVERDUE: pending next action whose date has passed.
// STALE: pre-consultation active opportunity with NOTHING scheduled — no
// pending next action at all (an overdue action is OVERDUE, not stale noise),
// no future consultation and no accepted commercial terms. Nurture is never stale.
export const needsNextAction = d =>
  !['completed', 'lost', 'referred', 'nurture'].includes(d.stage) && !(d.next_action && !d.next_action_completed_at);

export const isOverdueNextAction = d =>
  !!d.next_action && !d.next_action_completed_at && !!d.next_action_at && isPast(parseISO(d.next_action_at)) && !['lost', 'referred'].includes(d.stage);

export const isStaleDeal = d => {
  if (!['new_lead', 'contacted', 'consultation_scheduled'].includes(d.stage)) return false;
  if (d.commercial_terms_accepted_at) return false;
  if (d.next_action && !d.next_action_completed_at) return false;
  if (d.consultation_date && !isPast(parseISO(d.consultation_date))) return false;
  return true;
};