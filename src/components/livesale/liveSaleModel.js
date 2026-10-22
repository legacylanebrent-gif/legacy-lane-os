// Chapter 20 P1 — deterministic LIVE SALE assembly helpers. Pure derivations
// from canonical records; this module stores NO truth. Honest labels only:
// attendance is never occupancy, approximate is labeled approximate, and no
// readiness percentage exists anywhere.

export const OPENING_CHECKLIST = [
  'Entrances ready (unlocked, path clear, greeter sign)',
  'Checkout physically ready (table, register, bags, change)',
  'Payment equipment checked (card reader working, change drawer)',
  'Signs placed (entry, checkout, pickup, discount)',
  'Restricted areas secured (doors/covers in place)',
  'High-Value placement reviewed (controlled display secure)',
  'Property walkthrough complete (floors, stairs, hazards clear)',
];

export const SECURITY_WALKTHROUGH = [
  'Entrance sightline check',
  'Restricted area check',
  'High-Value display check',
  'Vulnerable area check (back rooms, garage)',
  'Property path and exit check',
];

export const EOD_RESET_CHECKLIST = [
  'Straighten and consolidate displays',
  'Sold items marked and set aside',
  'Awaiting-pickup items staged for tomorrow',
  'High-Value check (controlled location confirmed)',
  'Checkout supplies restowed; devices charging',
  'Pricing/discount stage reviewed for next day',
  'Open issues reviewed for tomorrow',
];

export const CLOSING_CHECKLIST = [
  'Last customers out',
  'Open transactions reviewed',
  'Payment issues reviewed',
  'Sold merchandise reviewed',
  'Awaiting pickups staged and secure',
  'Property secured (doors, windows — human confirmation)',
  'Restricted areas secured',
  'Cash/payment handoff complete (human record)',
  'Next-day work noted',
];

export const dayKey = () => new Date().toISOString().slice(0, 10);
export const checklistPrefix = (kind) => `Day ${dayKey()} ${kind}:`;
export const inChecklist = (tasks, kind) =>
  (tasks || []).filter((t) => (t.name || '').startsWith(checklistPrefix(kind)));

// Current/next discount stage from the operator's approved schedule. GUIDANCE
// ONLY — the system never applies a discount; a human makes any price change
// through the authorized price-change path.
export function currentDiscountStage(sale, now = new Date()) {
  const stages = ((sale && sale.discount_schedule) || []).filter((s) => s && s.start_at);
  if (((sale && sale.discount_schedule) || []).length === 0) return { hasSchedule: false, active: null, next: null };
  const iso = now.toISOString();
  const sorted = [...stages].sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
  const active = [...sorted].reverse().find((s) => String(s.start_at) <= iso) || null;
  const next = sorted.find((s) => String(s.start_at) > iso) || null;
  return { hasSchedule: true, active, next };
}

export function nextDiscountStage(sale, now = new Date()) {
  const cur = currentDiscountStage(sale, now);
  return cur.next || (cur.active ? cur.active : null);
}

// P1-21 — honest hold states derived from the item's hold block.
export function holdState(item, now = new Date()) {
  const h = item && item.hold;
  if (!h || !h.created_at) return 'NONE';
  if (!h.expires_at) return 'ACTIVE';
  if (h.expires_at <= now.toISOString()) return 'EXPIRED';
  return (new Date(h.expires_at).getTime() - now.getTime() < 60 * 60000) ? 'EXPIRING' : 'ACTIVE';
}

// P1-40/P1-41 — deterministic manager attention ordering. No AI, no opaque
// score: CRITICAL is a rule, a human can always escalate.
export function priorityRank(issue, now = new Date()) {
  const cat = issue.category || 'other';
  if (issue.is_incident) return 'CRITICAL';
  if ((issue.urgency || 'ROUTINE') === 'URGENT' && ['safety', 'security', 'payment'].includes(cat)) return 'CRITICAL';
  const overdue = issue.answer_by && issue.answer_by < now.toISOString().slice(0, 10)
    && ['OPEN', 'WAITING'].includes(issue.status || 'OPEN');
  if (['URGENT', 'IMPORTANT'].includes(issue.urgency || 'ROUTINE') || overdue) return 'IMPORTANT';
  return 'ROUTINE';
}

export function priorityQueue(issues, now = new Date()) {
  const rank = { CRITICAL: 0, IMPORTANT: 1, ROUTINE: 2 };
  return [...(issues || [])]
    .filter((i) => ['OPEN', 'WAITING'].includes(i.status || 'OPEN'))
    .sort((a, b) =>
      (rank[priorityRank(a, now)] ?? 2) - (rank[priorityRank(b, now)] ?? 2)
      || String(a.created_date || '').localeCompare(String(b.created_date || '')));
}

// P1-19 — factual offer clustering. Multiple INDEPENDENT offers around
// similar amounts are shown as RECENT OFFER ACTIVITY — never "market value".
export function offerClusters(items, offers) {
  const byItem = {};
  for (const o of offers || []) {
    if (o.item_id) (byItem[o.item_id] = byItem[o.item_id] || []).push(o);
  }
  return Object.entries(byItem)
    .filter(([, list]) => list.length >= 2)
    .map(([itemId, list]) => ({
      item: (items || []).find((i) => i.id === itemId) || null,
      item_id: itemId,
      offers: list.sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || ''))),
      amounts: list.map((o) => Number(o.offer_amount) || 0),
    }));
}

// Serious offers on items still available — closing/follow-up review.
export function offersOnAvailableItems(items, offers) {
  const avail = new Set((items || []).filter((i) => i.status === 'available').map((i) => i.id));
  return (offers || []).filter((o) => o.item_id && avail.has(o.item_id));
}

// P1-5 — meaningful recent changes from canonical timestamps only.
export function changesSince({ items = [], offers = [], issues = [], decisions = [], assignments = [], since } = {}) {
  const ts = (r) => String(r.updated_date || r.created_date || '');
  return {
    since,
    sold: (items || []).filter((i) => i.status === 'sold' && i.sold_date && String(i.sold_date) >= since),
    updatedItems: (items || []).filter((i) => i.status !== 'sold' && i.status !== 'available' && ts(i) >= since),
    offers: (offers || []).filter((o) => String(o.created_date || '') >= since),
    issues: (issues || []).filter((o) => String(o.created_date || '') >= since),
    decisions: (decisions || []).filter((o) => ts(o) >= since),
    assignmentChanges: (assignments || []).filter((o) => ts(o) >= since),
  };
}

// P1-11 — honest approximate occupancy: manual entries minus manual exits today.
export function approxInside(entriesToday, exitsToday) {
  return { inside: Math.max(0, (entriesToday || 0) - (exitsToday || 0)) };
}

export const OBSERVATION_KINDS = ['Crowding', 'Bottleneck', 'Buyer interest', 'Checkout pressure', 'Weak area', 'Property concern', 'Other'];