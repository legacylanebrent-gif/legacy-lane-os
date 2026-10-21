// Chapter 14 P1 — discovery / sorting / prep-zone model. Pure helpers only:
// vocabularies, badge styling, deterministic prep priority cues and the
// end-of-day summary. No entity writes, no AI, no fake percentages.
//
// DOCTRINES: DISCOVERED ≠ INVENTORIED. SORTED ≠ PRICED. RESEARCH REQUIRED ≠
// LOW VALUE. SENSITIVE ≠ MERCHANDISE. RESTRICTED ≠ DISCARDED. WHEN THE TEAM
// DOESN'T KNOW, UNCERTAINTY BECOMES A WORKFLOW. NOBODY GUESSES.

export const DISCOVERY_TYPES = [
  { key: 'ordinary_merchandise', label: 'Ordinary merchandise' },
  { key: 'potential_high_value', label: 'Potential high value' },
  { key: 'cash', label: 'Cash' },
  { key: 'valuable', label: 'Valuable (jewelry, coins, etc.)' },
  { key: 'important_document', label: 'Important document' },
  { key: 'personal_sensitive', label: 'Personal / sensitive material' },
  { key: 'research_needed', label: 'Research needed' },
  { key: 'client_decision', label: 'Client decision needed' },
  { key: 'specialist_review', label: 'Specialist review needed' },
  { key: 'donation', label: 'Donation material' },
  { key: 'restricted_hold', label: 'Restricted / hold' },
  { key: 'other', label: 'Other' },
];
export const discoveryTypeLabel = (key) => DISCOVERY_TYPES.find(t => t.key === key)?.label || key;

// ROUTING = which process the discovery belongs in (deliberately distinct
// from discovery_type: a WATCH is type 'valuable', route 'SPECIALIST').
export const ROUTES = [
  { key: 'UNROUTED', label: 'Unrouted', badge: 'bg-slate-100 text-slate-600 border-slate-300', sign: null, note: 'Recorded but not yet routed — decide which process this belongs in.' },
  { key: 'SELL', label: 'Sell', badge: 'bg-green-50 text-green-700 border-green-300', sign: 'SELL — READY FOR SALE', note: 'Ordinary sale merchandise — promote to formal inventory when ready.' },
  { key: 'RESEARCH', label: 'Research', badge: 'bg-amber-50 text-amber-700 border-amber-300', sign: 'RESEARCH BEFORE PRICING', note: 'Do not price until research is resolved. Research needed is not low value.' },
  { key: 'FAMILY_KEEP', label: 'Family keep', badge: 'bg-indigo-50 text-indigo-700 border-indigo-300', sign: 'FAMILY KEEP — NOT FOR SALE', note: 'Client/family retains — routes through a client decision.' },
  { key: 'CLIENT_DECISION', label: 'Client decision', badge: 'bg-cyan-50 text-cyan-700 border-cyan-300', sign: 'CLIENT DECISION', note: 'Routed to a canonical SaleClientDecision.' },
  { key: 'SPECIALIST', label: 'Specialist', badge: 'bg-violet-50 text-violet-700 border-violet-300', sign: 'SPECIALIST REVIEW', note: 'Routed through the Professional Network (Who Can Help). Nothing auto-sends.' },
  { key: 'SENSITIVE', label: 'Sensitive', badge: 'bg-rose-50 text-rose-700 border-rose-300', sign: 'SENSITIVE MATERIAL — PRIVATE', note: 'Privacy handling: never public gallery, marketing, or buyer surfaces.' },
  { key: 'DONATION', label: 'Donation', badge: 'bg-teal-50 text-teal-700 border-teal-300', sign: 'DONATION', note: 'Routes through the existing donation/disposition workflow.' },
  { key: 'RESTRICTED_HOLD', label: 'Restricted / hold', badge: 'bg-red-50 text-red-700 border-red-300', sign: 'RESTRICTED — HOLD — DO NOT PROCESS', note: 'Ordinary sale processing STOPS pending review. Never a legality/safety conclusion.' },
  { key: 'UNSUITABLE_OTHER', label: 'Unsuitable / other outcome', badge: 'bg-stone-100 text-stone-700 border-stone-300', sign: null, note: 'Unsuitable for ordinary sale is not worthless — record the approved outcome.' },
];
export const routeLabel = (key) => ROUTES.find(r => r.key === key)?.label || key || 'Unrouted';
export const routeBadge = (key) => ROUTES.find(r => r.key === key)?.badge || 'bg-slate-100 text-slate-600 border-slate-300';

// Route → flag defaults (the route a team member chooses sets the protection flags).
export const ROUTE_FLAG_DEFAULTS = {
  SENSITIVE: { is_sensitive: true },
  RESTRICTED_HOLD: { is_restricted: true },
  RESEARCH: { research_needed: true },
  SPECIALIST: { specialist_needed: true },
};

export const ZONE_STATUSES = [
  { key: 'untouched', label: 'Untouched', badge: 'bg-slate-100 text-slate-600 border-slate-300' },
  { key: 'sorting', label: 'Sorting', badge: 'bg-amber-50 text-amber-700 border-amber-300' },
  { key: 'waiting_decision', label: 'Waiting on decision', badge: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
  { key: 'waiting_research', label: 'Waiting on research', badge: 'bg-violet-50 text-violet-700 border-violet-300' },
  { key: 'ready_for_inventory', label: 'Ready for inventory / pricing', badge: 'bg-green-50 text-green-700 border-green-300' },
  { key: 'complete', label: 'Complete', badge: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
];
export const zoneStatusLabel = (key) => ZONE_STATUSES.find(s => s.key === key)?.label || key || 'Untouched';
export const zoneStatusBadge = (key) => ZONE_STATUSES.find(s => s.key === key)?.badge || 'bg-slate-100 text-slate-600 border-slate-300';

export const ACCESS_CLASSES = [
  { key: 'UNCLASSIFIED', label: 'Unclassified' },
  { key: 'OPEN_TO_CUSTOMERS', label: 'Open to customers' },
  { key: 'STAFF_ONLY', label: 'Staff only' },
  { key: 'CLOSED_RESTRICTED', label: 'Closed / restricted' },
  { key: 'PICKUP_ONLY', label: 'Pickup only' },
  { key: 'CHECKOUT', label: 'Checkout' },
];
export const accessClassLabel = (key) => ACCESS_CLASSES.find(a => a.key === key)?.label || 'Unclassified';

export const SECURITY_FLAGS = [
  { key: 'difficult_to_monitor', label: 'Difficult to monitor' },
  { key: 'high_value_control_needed', label: 'High-value control needed' },
  { key: 'customer_flow_concern', label: 'Customer flow concern' },
  { key: 'other_security_concern', label: 'Other security concern' },
];

export const CUSTODY_EVENTS = [
  { key: 'FOUND', label: 'Found' },
  { key: 'MOVED_TO_CONTROLLED_LOCATION', label: 'Moved to controlled location' },
  { key: 'CLIENT_NOTIFIED', label: 'Client notified' },
  { key: 'TRANSFERRED', label: 'Transferred' },
  { key: 'RETURNED_TO_CLIENT', label: 'Returned to client' },
  { key: 'ADDED_TO_SALE', label: 'Added to sale' },
  { key: 'OTHER', label: 'Other' },
];

export const RESOLUTIONS = [
  { key: 'open', label: 'Open (unresolved)' },
  { key: 'promoted_to_item', label: 'Promoted to inventory (Item)' },
  { key: 'returned_to_client', label: 'Returned to client' },
  { key: 'family_keep', label: 'Family keep' },
  { key: 'research_routed', label: 'Research completed / routed' },
  { key: 'specialist_routed', label: 'Specialist routed' },
  { key: 'donated', label: 'Donation' },
  { key: 'restricted_handled', label: 'Restricted handling completed' },
  { key: 'other', label: 'Other' },
];

// Append-only custody history — earlier events are never rewritten.
export function appendCustodyEvent(existing, event, note, by, byName) {
  return [...(existing || []), {
    event, note: note || '', by: by || '', by_name: byName || '',
    at: new Date().toISOString(),
  }];
}

// Deterministic per-zone discovery counts (derived — never stored).
export function zoneDiscoveryCounts(zones, discoveries) {
  const counts = {};
  (zones || []).forEach(z => { counts[z.zone_id] = { total: 0, open: 0, sensitive: 0, restricted: 0, research: 0 }; });
  (discoveries || []).forEach(d => {
    const c = counts[d.zone_id];
    if (!c) return;
    c.total += 1;
    if ((d.resolution_status || 'open') === 'open') {
      c.open += 1;
      if (d.is_sensitive) c.sensitive += 1;
      if (d.is_restricted) c.restricted += 1;
      if (d.research_needed) c.research += 1;
    }
  });
  return counts;
}

// P1-11 — deterministic prep attention cues. No AI, no value score.
export function prepPriorityCues({ zones, discoveries, tasks, issues, decisions, daysUntilFirst }) {
  const cues = [];
  const open = (discoveries || []).filter(d => (d.resolution_status || 'open') === 'open');
  const restricted = open.filter(d => d.is_restricted);
  const sensitive = open.filter(d => d.is_sensitive);
  if (restricted.length) cues.push({ tone: 'red', label: `${restricted.length} restricted discovery(ies) unresolved`, detail: 'Ordinary sale processing stopped — review required (never a legality/safety conclusion).' });
  if (sensitive.length) cues.push({ tone: 'red', label: `${sensitive.length} sensitive discovery(ies) unresolved`, detail: 'Private material — must not enter public gallery, marketing, or buyer surfaces.' });
  const researchOpen = open.filter(d => d.research_needed || d.routing_status === 'RESEARCH');
  if (researchOpen.length) cues.push({ tone: 'amber', label: `${researchOpen.length} discovery(ies) waiting on research`, detail: 'Research before pricing — no ordinary pricing/publication until resolved or explicitly overridden.' });
  const awaitingDecision = open.filter(d => d.routing_status === 'CLIENT_DECISION');
  if (awaitingDecision.length) cues.push({ tone: 'cyan', label: `${awaitingDecision.length} discovery(ies) awaiting a client decision`, detail: 'Blocking work — route/resolve through the canonical client decision.' });
  const significant = open.filter(d => ['cash', 'valuable', 'important_document'].includes(d.discovery_type));
  if (significant.length) cues.push({ tone: 'amber', label: `${significant.length} significant find(s) unresolved`, detail: 'Cash / valuables / important documents need custody + client notification + resolution.' });
  const overdueIssues = (issues || []).filter(i => ['OPEN', 'WAITING'].includes(i.status || 'OPEN') && i.answer_by && i.answer_by < new Date().toISOString().slice(0, 10));
  if (overdueIssues.length) cues.push({ tone: 'red', label: `${overdueIssues.length} SaleIssue(s) answer overdue`, detail: 'Unanswered operational questions holding up the project.' });
  const blockedTasks = (tasks || []).filter(t => t.blocked && t.status !== 'completed');
  if (blockedTasks.length) cues.push({ tone: 'amber', label: `${blockedTasks.length} blocked task(s)`, detail: 'Waiting on dependencies — see SaleTasks.' });
  const notReady = (zones || []).filter(z => ['untouched', 'sorting', 'waiting_decision', 'waiting_research'].includes(z.prep_status || 'untouched'));
  if (daysUntilFirst != null && daysUntilFirst <= 14 && notReady.length) cues.push({ tone: 'amber', label: `${notReady.length} zone(s) not ready and sale day approaching`, detail: `${daysUntilFirst} day(s) until the first sale date.` });
  return cues;
}

// P1-47 — deterministic end-of-day prep review. Everything shown persists in
// canonical records, so the next prep day carries forward with NO re-entry.
export function endOfDaySummary({ zones, discoveries, tasks, issues, decisions, laborEntries, today }) {
  const day = today || new Date().toISOString().slice(0, 10);
  const zs = zones || [];
  const openDisc = (discoveries || []).filter(d => (d.resolution_status || 'open') === 'open');
  const todayLabor = (laborEntries || []).filter(e => (e.entry_date || '').slice(0, 10) === day);
  return {
    zonesComplete: zs.filter(z => z.prep_status === 'complete').map(z => z.name),
    zonesSorting: zs.filter(z => z.prep_status === 'sorting').map(z => z.name),
    zonesWaiting: zs.filter(z => ['waiting_decision', 'waiting_research'].includes(z.prep_status)).map(z => z.name),
    zonesUntouched: zs.filter(z => !z.prep_status || z.prep_status === 'untouched').map(z => z.name),
    openDiscoveries: openDisc.length,
    researchOpen: openDisc.filter(d => d.research_needed || d.routing_status === 'RESEARCH').length,
    sensitiveUnresolved: openDisc.filter(d => d.is_sensitive).length,
    restrictedUnresolved: openDisc.filter(d => d.is_restricted).length,
    decisionsOpen: (decisions || []).filter(d => d.status === 'open').length,
    issuesOpen: (issues || []).filter(i => ['OPEN', 'WAITING'].includes(i.status || 'OPEN')).length,
    tasksBlocked: (tasks || []).filter(t => t.blocked && t.status !== 'completed').length,
    tasksDueToday: (tasks || []).filter(t => t.status !== 'completed' && t.due_date && t.due_date <= day).length,
    laborEntriesToday: todayLabor.length,
    laborHoursToday: todayLabor.reduce((s, e) => s + (Number(e.hours) || 0), 0),
  };
}