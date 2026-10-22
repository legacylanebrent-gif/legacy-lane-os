// Chapter 22 P1 — Transition Completion projections. Pure derivations over
// canonical records; this model OWNS nothing and STORES nothing. Mirrors the
// backend gate (approveTransitionCompletion) so the UI never promises a
// completion the backend will refuse.

export const OUTCOME_LABELS = {
  RESELL: 'Resell / sell elsewhere',
  SPECIALIST: 'Specialist',
  BUYOUT: 'Buyout',
  DONATE: 'Donate',
  CLEANOUT: 'Cleanout',
  CLIENT_RETAINS: 'Client retains',
  DISPOSE: 'Dispose',
  DECISION_REQUIRED: 'Decision needed',
};

export const OUTCOME_STYLES = {
  RESELL: 'bg-blue-100 text-blue-700',
  SPECIALIST: 'bg-purple-100 text-purple-700',
  BUYOUT: 'bg-amber-100 text-amber-700',
  DONATE: 'bg-pink-100 text-pink-700',
  CLEANOUT: 'bg-cyan-100 text-cyan-700',
  CLIENT_RETAINS: 'bg-emerald-100 text-emerald-700',
  DISPOSE: 'bg-slate-200 text-slate-700',
  DECISION_REQUIRED: 'bg-red-100 text-red-700',
};

export const CONSEQUENTIAL = ['SPECIALIST', 'BUYOUT', 'DONATE', 'CLEANOUT', 'CLIENT_RETAINS', 'DISPOSE'];

export const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function saleEventEnded(sale) {
  if (sale?.status === 'completed') return true;
  const dates = (sale?.sale_dates || []).map((d) => d.date).filter(Boolean);
  if (!dates.length) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dates.every((d) => d < today);
}

// NOTHING IS LEFTOVER — every remaining tracked item resolves into a bucket.
export function remainingBuckets(items) {
  const b = { awaitingPickup: [], retained: [], donation: [], cleanout: [], buyout: [], specialist: [], dispose: [], resell: [], decisionNeeded: [], unrouted: [], resolved: [] };
  for (const it of items || []) {
    const d = it.post_sale_disposition || {};
    if (it.status === 'sold') {
      if (!it.pickup_completed_at && (it.fulfillment_options || ['pickup']).includes('pickup')) b.awaitingPickup.push(it);
      else b.resolved.push(it);
      continue;
    }
    if (d.resolved_at) { b.resolved.push(it); continue; }
    if (d.outcome === 'CLIENT_RETAINS') b.retained.push(it);
    else if (d.outcome === 'DONATE') b.donation.push(it);
    else if (d.outcome === 'CLEANOUT') b.cleanout.push(it);
    else if (d.outcome === 'BUYOUT') b.buyout.push(it);
    else if (d.outcome === 'SPECIALIST' || it.offsite_research?.status === 'OFFSITE') b.specialist.push(it);
    else if (d.outcome === 'DISPOSE') b.dispose.push(it);
    else if (d.outcome === 'RESELL') b.resell.push(it);
    else if (d.outcome === 'DECISION_REQUIRED') b.decisionNeeded.push(it);
    else b.unrouted.push(it);
  }
  return b;
}

export function protectionPreview(item) {
  if (item.status === 'sold') return item.pickup_completed_at ? 'SOLD and released' : 'PROTECTED — paid, awaiting buyer pickup';
  if (item.offsite_research?.status === 'OFFSITE') return 'PROTECTED — specialist custody';
  const d = item.post_sale_disposition || {};
  if (d.outcome === 'CLIENT_RETAINS' && d.decision_id) return 'PROTECTED — client-retained';
  if (d.resolved_at) return 'Resolved — ended';
  return null;
}

// Open-obligation gate — deterministic, required obligations only.
export function transitionBlockers({ sale, items, decisions, issues, equipment, donations, cleanouts, attempts, deal, expenses }) {
  const transition = sale?.transition || {};
  const standard = transition.completion_standard?.standard;
  const requiresDisposition = transition.completion_standard?.requires_item_disposition !== false;
  const blockers = [];

  const awaiting = (items || []).filter((i) => i.status === 'sold' && !i.pickup_completed_at && (i.fulfillment_options || ['pickup']).includes('pickup'));
  if (awaiting.length) blockers.push(`${awaiting.length} paid item(s) still awaiting buyer pickup — under company custody.`);

  for (const d of donations || []) {
    if ((d.included_item_ids || []).length && !['completed', 'cancelled'].includes(d.status)) blockers.push(`Donation "${d.title}" is not completed (status ${d.status}).`);
  }
  for (const c of cleanouts || []) {
    if ((c.included_item_ids || []).length && !['completed', 'cancelled'].includes(c.status)) blockers.push(`Cleanout "${c.title}" is not completed (status ${c.status}).`);
  }
  const award = transition.buyout_award;
  if (award && !award.transferred_at) blockers.push('Buyout awarded but transfer not recorded.');

  const offsite = (items || []).filter((i) => i.offsite_research?.status === 'OFFSITE');
  if (offsite.length) blockers.push(`${offsite.length} item(s) still in specialist custody (offsite).`);

  if (requiresDisposition) {
    const unrouted = (items || []).filter((i) => i.status !== 'sold' && !(i.post_sale_disposition || {}).outcome && !(i.post_sale_disposition || {}).resolved_at);
    if (unrouted.length) blockers.push(`${unrouted.length} remaining item(s) have NO recorded disposition or reason.`);
    const needDecision = (items || []).filter((i) => (i.post_sale_disposition || {}).outcome === 'DECISION_REQUIRED' && !(i.post_sale_disposition || {}).resolved_at);
    if (needDecision.length) blockers.push(`${needDecision.length} item(s) still need a client disposition decision.`);
    const pending = (items || []).filter((i) => ['DONATE', 'CLEANOUT', 'BUYOUT', 'DISPOSE'].includes((i.post_sale_disposition || {}).outcome) && !(i.post_sale_disposition || {}).resolved_at);
    if (pending.length) blockers.push(`${pending.length} routed item(s) not yet physically resolved.`);
    if (['PROPERTY_CLEARED', 'ROOMS_CLEARED'].includes(standard)) {
      const retained = (items || []).filter((i) => (i.post_sale_disposition || {}).outcome === 'CLIENT_RETAINS' && !i.pickup_completed_at && !(i.post_sale_disposition || {}).resolved_at);
      if (retained.length) blockers.push(`${retained.length} client-retained item(s) still at the property — this completion standard requires them released.`);
    }
  }

  const openDecisions = (decisions || []).filter((d) => ['merchandise', 'disposition'].includes(d.decision_type) && d.status === 'open');
  if (openDecisions.length) blockers.push(`${openDecisions.length} open merchandise/disposition client decision(s).`);

  const blockingIssues = (issues || []).filter((i) => i.status === 'OPEN' && (i.blocking_areas || []).some((a) => ['pickup', 'cleanout_disposition', 'settlement'].includes(a)));
  if (blockingIssues.length) blockers.push(`${blockingIssues.length} open blocking issue(s) (pickup/disposition/settlement).`);

  const pendingEquip = (equipment || []).filter((a) => a.packed && a.entry_type === 'REUSABLE_EQUIPMENT' && (a.packout_state || 'PENDING') === 'PENDING');
  if (pendingEquip.length) blockers.push(`${pendingEquip.length} company equipment assignment(s) with no pack-out ending.`);

  const unknownAttempts = (attempts || []).filter((a) => a.status === 'UNKNOWN');
  if (unknownAttempts.length) blockers.push(`${unknownAttempts.length} payment attempt(s) with UNKNOWN result — resolve before completion.`);

  if (deal && !deal.settlement_finalized) blockers.push('Client settlement record not finalized — give the financial ending its record.');
  if (!standard) blockers.push('No completion standard recorded — define what finished means for this project before completing it.');
  if (standard && standard !== 'SALE_SERVICES_ONLY' && !transition.walkthrough?.completed_at) blockers.push('Final walkthrough not completed (human room confirmations).');

  return blockers;
}

export function completionStatesSafe(sale, deal) {
  const t = sale?.transition || {};
  return {
    saleComplete: saleEventEnded(sale),
    financiallyComplete: !!deal?.settlement_finalized,
    transitionComplete: !!t.transition_completed_at,
    transitionOpen: !t.transition_completed_at,
  };
}

export function clientCompletionSummary(buckets, items) {
  const resolvedOutcome = (o) => (buckets.resolved || []).filter((i) => (i.post_sale_disposition || {}).outcome === o).length;
  const sold = (items || []).filter((i) => i.status === 'sold');
  return {
    sold: sold.length,
    buyerPickupsResolved: sold.filter((i) => i.pickup_completed_at).length,
    retained: (buckets.retained || []).length + resolvedOutcome('CLIENT_RETAINS'),
    donated: resolvedOutcome('DONATE'),
    cleanoutRemoved: resolvedOutcome('CLEANOUT'),
    buyoutTransferred: resolvedOutcome('BUYOUT'),
    specialistResolved: resolvedOutcome('SPECIALIST'),
    disposed: resolvedOutcome('DISPOSE'),
    resold: resolvedOutcome('RESELL'),
    unresolvedExceptions: ((buckets.unrouted || []).length) + ((buckets.decisionNeeded || []).length),
  };
}

export function unsoldIntelligence(items, transactions) {
  const all = items || [];
  const sold = all.filter((i) => i.status === 'sold');
  const remaining = all.filter((i) => i.status !== 'sold' && !(i.post_sale_disposition || {}).resolved_at);
  const remainingByCategory = {};
  for (const i of remaining) remainingByCategory[i.category || 'other'] = (remainingByCategory[i.category || 'other'] || 0) + 1;
  return {
    totalItems: all.length,
    soldItems: sold.length,
    sellThroughByCount: all.length ? `${sold.length} of ${all.length}` : 'No tracked items',
    remainingByCategory,
    unsoldAskingValue: remaining.reduce((s, i) => s + (Number(i.price) || 0), 0),
    actualRevenue: (transactions || []).reduce((s, t) => s + (Number(t.total) || 0), 0),
  };
}

export function scorecard({ sale, deal, econ, blockers, buckets, expenses }) {
  const t = sale?.transition || {};
  const rows = [];
  rows.push({
    label: 'Client objective achieved',
    value: t.objective?.key ? (t.objective.achieved ? t.objective.achieved : 'Not yet recorded') : 'UNKNOWN — record the client objective first',
    unknown: !t.objective?.key || !t.objective?.achieved,
  });
  rows.push({ label: 'Scope completed', value: blockers.length ? `NOT READY — ${blockers.length} open required obligation(s)` : 'No open required obligations — human review at completion', unknown: false });
  const dl = t.property_deadline?.date;
  rows.push({
    label: 'Deadline met',
    value: dl ? (t.transition_completed_at ? (t.transition_completed_at.slice(0, 10) <= dl ? `Met (completed by ${dl})` : `Missed (deadline was ${dl})`) : `Open — property deadline ${dl}`) : 'No deadline recorded',
    unknown: !dl,
  });
  rows.push({ label: 'Sale proceeds', value: deal ? `Net due to client ${money(econ?.netDueToClient)}` : 'No settlement deal record', unknown: !deal });
  rows.push({ label: 'Company profitability', value: econ ? `Sale contribution ${money(econ.contribution)} (not net profit)` : 'UNKNOWN — economics not derivable', unknown: !econ });
  const dispositionCost = (expenses || []).filter((e) => ['dumpster_disposal', 'cleaning_services', 'professional_services'].includes(e.category)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  rows.push({ label: 'Disposition cost', value: `Recorded disposition-related expenses: ${money(dispositionCost)} (client-paid provider invoices are NOT company expense)`, unknown: false });
  const exceptions = ((buckets.unrouted || []).length) + ((buckets.decisionNeeded || []).length);
  rows.push({ label: 'Remaining exceptions', value: exceptions ? `${exceptions} item(s) without a resolved path` : 'None', unknown: false });
  return rows;
}

export function closeoutCalendar({ sale, items, donations, cleanouts, tasks }) {
  const entries = [];
  const t = sale?.transition || {};
  if (t.property_deadline?.date) entries.push({ label: `Property deadline — ${t.property_deadline.deadline_type || 'deadline'}`, date: t.property_deadline.date, kind: 'deadline' });
  for (const i of items || []) {
    if (i.status === 'sold' && !i.pickup_completed_at && i.pickup_due_date) entries.push({ label: `Buyer pickup due — ${i.title}`, date: i.pickup_due_date, kind: 'pickup' });
    const pd = i.post_sale_disposition?.pickup_deadline;
    if (pd && !i.post_sale_disposition?.resolved_at) entries.push({ label: `Family pickup due — ${i.title}`, date: pd, kind: 'pickup' });
  }
  for (const d of donations || []) entries.push({ label: `Donation pickup deadline — ${d.title}`, date: d.pickup_deadline, kind: 'donation' });
  for (const c of cleanouts || []) entries.push({ label: `Cleanout deadline — ${c.title}`, date: c.cleanout_deadline, kind: 'cleanout' });
  for (const k of tasks || []) if (k.due_date) entries.push({ label: `Task — ${k.name}`, date: k.due_date, kind: 'task' });
  return entries.filter((e) => e.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function changeImpact(item, { donations, cleanouts, buyoutAward }) {
  const id = item?.id;
  const events = [];
  for (const d of donations || []) {
    if ((d.included_item_ids || []).includes(id)) events.push(`Donation "${d.title}" (in load)`);
    if ((d.excluded_item_ids || []).includes(id)) events.push(`Donation "${d.title}" (excluded)`);
  }
  for (const c of cleanouts || []) {
    if ((c.included_item_ids || []).includes(id)) events.push(`Cleanout "${c.title}" (in scope)`);
    if ((c.excluded_item_ids || []).includes(id)) events.push(`Cleanout "${c.title}" (excluded)`);
  }
  if (buyoutAward && (buyoutAward.included_item_ids || []).includes(id)) events.push('Buyout award (included)');
  const releases = (item?.releases || []).length;
  return { events, releases };
}

// SCOPE CREEP SHOULD BECOME VISIBLE BEFORE IT BECOMES FREE LABOR —
// deterministic flag on post-sale-end manual work for operator review.
export function additionalWork({ tasks, saleEndedAt }) {
  if (!saleEndedAt) return [];
  return (tasks || []).filter((t) => t.created_date && t.created_date.slice(0, 10) > saleEndedAt && t.status !== 'completed');
}

export function deadlineRisk({ sale, blockers, calendar }) {
  const dl = sale?.transition?.property_deadline?.date;
  if (!dl) return null;
  const today = new Date().toISOString().slice(0, 10);
  const late = (calendar || []).filter((e) => e.date < today && e.kind !== 'deadline' && !['completed', 'cancelled'].includes(e.done));
  const overdue = blockers.length && today > dl;
  if (overdue) return `PROPERTY DEADLINE ${dl} HAS PASSED with ${blockers.length} open required obligation(s).`;
  if (late.length) return `${late.length} dated step(s) are past due against the property deadline ${dl}.`;
  return null;
}