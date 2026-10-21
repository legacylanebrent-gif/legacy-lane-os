// Chapter 13 P1 — deterministic PROJECT CONTROL model: derived milestones,
// assembled timeline, owner attention, and downstream impact facts.
// Everything here is computed from canonical records only — NO AI, no scores,
// no invented states. Unknown stays unknown.
import { isOverdue } from '@/components/saleops/saleDecisionModel';

export const COMM_METHODS = ['EMAIL', 'SMS', 'PHONE', 'OTHER'];
export const CADENCES = ['AS_NEEDED', 'WEEKLY', 'TWICE_WEEKLY', 'MILESTONE', 'CUSTOM'];
export const ISSUE_CATEGORIES = [
  { key: 'client_family', label: 'Client / Family' },
  { key: 'authority', label: 'Authority' },
  { key: 'property_access', label: 'Property / Access' },
  { key: 'merchandise', label: 'Merchandise' },
  { key: 'provider', label: 'Provider' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'disposition', label: 'Disposition' },
  { key: 'financial_settlement', label: 'Financial / Settlement' },
  { key: 'other', label: 'Other' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── MILESTONES (P1-29): derived from canonical state — no milestone records, no engine.
export function computeMilestones({ sale, scope, authorities, tasks, items, prepSummary, linkedDeal }) {
  const list = [];
  const push = (key, label, state, detail) => list.push({ key, label, state, detail });
  const activeAuths = (authorities || []).filter((a) => a.is_active);

  const activated = !!(sale && ((sale.activation && sale.activation.activated_at) || sale.source_deal_id));
  push('ACTIVATED', 'Activated', activated ? 'COMPLETE' : 'PENDING',
    activated ? 'Activated from the accepted opportunity.' : 'Not activated from a pipeline opportunity.');

  const verified = activeAuths.some((a) => a.verification_status === 'VERIFIED');
  push('AUTHORITY_VERIFIED', 'Authority Verified',
    activeAuths.length === 0 ? 'PENDING' : verified ? 'COMPLETE' : 'PENDING',
    activeAuths.length === 0 ? 'No authorized decision-maker recorded yet.'
      : verified ? 'A decision-maker is recorded as VERIFIED.'
      : `Decision-maker recorded as ${activeAuths[0].verification_status || 'UNRESOLVED'} — needs review.`);

  const hasDates = (sale && (sale.sale_dates || []).length > 0);
  const onboardingDone = activated && activeAuths.length > 0 && hasDates && !!scope && (tasks || []).length > 0;
  push('ONBOARDING_COMPLETE', 'Onboarding Complete', onboardingDone ? 'COMPLETE' : 'PENDING',
    onboardingDone ? 'Authority, scope, dates and tasks are in place.'
      : 'Still needed: authority, agreed scope, sale dates, and task setup (see Seller Onboarding).');

  const areas = (sale && sale.excluded_areas) || [];
  const openAreas = areas.filter((a) => !a.resolved);
  push('FAMILY_REMOVALS_COMPLETE', 'Family Removals Complete',
    areas.length === 0 ? 'NOT_APPLICABLE' : openAreas.length === 0 ? 'COMPLETE' : 'PENDING',
    areas.length === 0 ? 'No excluded/retained areas recorded.'
      : openAreas.length === 0 ? 'All excluded areas are handled.'
      : `${openAreas.length} excluded area(s) still to be handled by the family.`);

  const prep = prepSummary || { ready: 0, attention: 0, review: 0 };
  const prepReady = prep.ready > 0 && prep.attention === 0 && prep.review === 0;
  push('PREPARATION_READY', 'Preparation Ready', prepReady ? 'COMPLETE' : 'PENDING',
    prepReady ? 'Deterministic preparation analysis found no attention/review areas.'
      : `${prep.attention} attention + ${prep.review} review area(s) remain.`);

  const saleComplete = sale && sale.status === 'completed';
  push('SALE_READY', 'Sale Ready',
    hasDates ? 'COMPLETE' : 'PENDING',
    hasDates ? 'Sale dates are scheduled.' : 'No sale dates scheduled yet.');

  push('SALE_COMPLETE', 'Sale Complete', saleComplete ? 'COMPLETE' : 'PENDING',
    saleComplete ? 'Sale marked completed.' : 'Sale not completed yet.');

  const soldAwaitingPickup = (items || []).filter((i) => i.status === 'sold' && !i.pickup_completed_at);
  push('PICKUP_COMPLETE', 'Pickup Complete',
    (items || []).length === 0 ? 'NOT_APPLICABLE'
      : soldAwaitingPickup.length === 0 ? 'COMPLETE' : 'PENDING',
    (items || []).length === 0 ? 'No merchandise recorded.'
      : soldAwaitingPickup.length === 0 ? 'No sold merchandise awaiting pickup.'
      : `${soldAwaitingPickup.length} sold item(s) awaiting pickup.`);

  const unsoldAvailable = (items || []).filter((i) => i.status === 'available');
  const plan = (scope && scope.post_sale_plan && scope.post_sale_plan.default_outcome) || null;
  push('DISPOSITION_COMPLETE', 'Disposition Complete',
    !saleComplete ? 'PENDING'
      : plan === 'CLIENT_RETAINS' && unsoldAvailable.length === 0 ? 'COMPLETE'
      : unsoldAvailable.length === 0 ? 'COMPLETE' : 'PENDING',
    unsoldAvailable.length === 0 ? 'No unsold merchandise remaining.'
      : `${unsoldAvailable.length} unsold item(s) remain${plan ? `; agreed plan: ${plan.replace(/_/g, ' ').toLowerCase()}` : '; plan not recorded'}.`);

  const walkthrough = (tasks || []).find((t) => /final property walkthrough/i.test(t.name || ''));
  push('FINAL_WALKTHROUGH_COMPLETE', 'Final Walkthrough Complete',
    !walkthrough ? 'PENDING' : walkthrough.status === 'completed' ? 'COMPLETE' : 'PENDING',
    !walkthrough ? 'Final walkthrough not scheduled yet.'
      : walkthrough.status === 'completed' ? 'Final walkthrough completed.'
      : walkthrough.due_date ? `Scheduled for ${walkthrough.due_date}.` : 'Scheduled (no due date).');

  const closed = !!(linkedDeal && linkedDeal.settlement_finalized);
  push('FINANCIAL_CLOSE', 'Financial Close', closed ? 'COMPLETE' : 'PENDING',
    closed ? 'Settlement finalized on the linked deal.'
      : linkedDeal ? 'Settlement not finalized yet.' : 'No linked settlement deal record.');

  return list;
}

// ── TIMELINE (P1-30): assembled read-only entries — date truth is never duplicated.
export function timelineEntries({ sale, linkedDeal, tasks, issues, excludedAreas }) {
  const entries = [];
  const add = (date, label, kind, detail) => {
    if (!date) return;
    entries.push({ date, label, kind, detail: detail || '' });
  };
  (sale && sale.sale_dates || []).forEach((d) => add(d.date, 'Sale day', 'sale', 'Scheduled sale date'));
  ((linkedDeal && linkedDeal.consultation && linkedDeal.consultation.external_deadlines) || [])
    .forEach((d) => add(d.date, `Client deadline: ${(d.type || 'other').replace(/_/g, ' ')}`, 'client',
      d.note || (d.is_estimated ? 'Estimated date' : '')));
  (excludedAreas || []).forEach((a) => add(a.family_deadline, `Family removal deadline: ${a.name}`, 'family',
    'Client/family action deadline (not a team task due date)'));
  (tasks || []).forEach((t) => {
    if (t.status !== 'completed') add(t.due_date, `Task: ${t.name}`, 'task', t.assignee_name || '');
  });
  (issues || []).forEach((i) => {
    if (i.status === 'OPEN' || i.status === 'WAITING') add(i.answer_by, `Answer needed: ${i.title}`, 'issue', i.owner_name || '');
  });
  const today = todayStr();
  entries.sort((a, b) => (a.date < b.date ? -1 : 1));
  entries.forEach((e) => { e.past = !!e.date && e.date < today; });
  return entries;
}

// ── OWNER ATTENTION (P1-47): deterministic, no AI, no score.
export function attentionItems({ sale, tasks, issues, decisions, authorities, timeline }) {
  const out = [];
  const add = (severity, label, detail, link) => out.push({ severity, label, detail, link });

  (tasks || []).filter((t) => t.status !== 'completed' && isOverdue(t.due_date, t.status))
    .forEach((t) => add('high', `Overdue task: ${t.name}`, `Due ${t.due_date}`, `/SaleTasks?saleId=${sale.id}`));
  (issues || []).filter((i) => (i.status === 'OPEN' || i.status === 'WAITING') && i.answer_by && i.answer_by < todayStr())
    .forEach((i) => add('high', `Overdue issue: ${i.title}`, `Answer was needed by ${i.answer_by}`, `/ProjectDashboard?saleId=${sale.id}`));

  const activeAuths = (authorities || []).filter((a) => a.is_active);
  if (activeAuths.length === 0) {
    add('high', 'No authorized decision-maker recorded', 'Authority needs to be established on the project.', '/SaleClientDecisions?saleId=' + sale.id);
  } else if (!activeAuths.some((a) => a.verification_status === 'VERIFIED')) {
    add('high', 'Authority not verified', 'The recorded decision-maker is UNRESOLVED/DISPUTED — review before relying on instructions.', '/SaleClientDecisions?saleId=' + sale.id);
  }

  (tasks || []).filter((t) => t.status !== 'completed' && t.blocked)
    .forEach((t) => add('medium', `Blocked task: ${t.name}`, t.blocked_reason || 'Blocked', `/SaleTasks?saleId=${sale.id}`));

  (decisions || []).filter((d) => d.request_status === 'REQUESTED' || d.request_status === 'UNDER_REVIEW')
    .forEach((d) => add(d.answer_by && d.answer_by.slice(0, 10) < todayStr() ? 'high' : 'medium',
      `Client request awaiting approval: ${d.subject}`,
      `Requested: ${d.requested_decision}${d.requested_by_name ? ` by ${d.requested_by_name}` : ''}${d.answer_by ? ` · answer by ${d.answer_by.slice(0, 10)}` : ''}`,
      '/ProjectDashboard?saleId=' + sale.id));

  (decisions || []).filter((d) => d.status === 'open')
    .forEach((d) => add('medium', `Open client decision: ${d.subject}`, `Current: ${d.current_decision}`, '/SaleClientDecisions?saleId=' + sale.id));

  (timeline || []).filter((e) => e.kind === 'family' || e.kind === 'client')
    .forEach((e) => add('medium', e.label, e.date, '/ProjectDashboard?saleId=' + sale.id));

  const order = { high: 0, medium: 1 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ── DOWNSTREAM IMPACT (P1-27): only facts the current architecture can truthfully
// establish about an item at change time. No Chapter 15/18/21 prediction.
export function downstreamFacts(item) {
  if (!item) return [];
  const facts = [];
  if (item.research_status && item.research_status !== 'CLEAR') facts.push(`research flagged: ${item.research_status}${item.research_reason ? ` (${item.research_reason})` : ''}`);
  if (item.price) facts.push(`listed price on record: $${Number(item.price).toLocaleString()}`);
  if ((item.images || []).length > 0) facts.push(`${item.images.length} photo(s) recorded`);
  if (item.status === 'sold' || item.sold_date) facts.push('SOLD');
  if (item.sold_price) facts.push(`sold at $${Number(item.sold_price).toLocaleString()}`);
  if (item.status === 'sold' && !item.pickup_completed_at) facts.push('buyer pickup pending');
  if (item.included_in_settlement) facts.push('already included in a settlement statement');
  if (item.barcode || item.sku) facts.push('labeled/scanned');
  if ((item.sales_channels || []).includes('marketplace')) facts.push('listed to the public marketplace');
  return facts;
}