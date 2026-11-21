// Chapter 8 P2 — DETERMINISTIC sale preparation analysis. Given canonical
// records ONLY, this produces per-area statuses (READY / NEEDS ATTENTION /
// NEEDS REVIEW / NOT APPLICABLE / UNKNOWN), actionable findings with deep
// links, and a timing phase. AI never determines a readiness status — AI may
// only explain or prioritize what this model computed.
// Doctrine: UNKNOWN IS DATA. ZERO IS A NUMBER. Absence of a record is
// reported as NOT REVIEWED / NEEDS REVIEW — never as failure or as "none".

export const STATUS = {
  READY: 'READY',
  NEEDS_ATTENTION: 'NEEDS ATTENTION',
  NEEDS_REVIEW: 'NEEDS REVIEW',
  NOT_APPLICABLE: 'NOT APPLICABLE',
  UNKNOWN: 'UNKNOWN',
};

export const STATUS_STYLES = {
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NEEDS_ATTENTION: 'bg-red-50 text-red-700 border-red-200',
  NEEDS_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  NOT_APPLICABLE: 'bg-slate-50 text-slate-500 border-slate-200',
  UNKNOWN: 'bg-slate-50 text-slate-600 border-slate-200',
};

// Plain words for the operator. The stored STATUS values never change.
export const STATUS_LABELS = {
  READY: 'Ready',
  NEEDS_ATTENTION: 'Needs attention',
  NEEDS_REVIEW: 'Needs a look',
  NOT_APPLICABLE: 'Not needed',
  UNKNOWN: 'Not started',
};

export const PHASE_LABELS = {
  'EARLY PREP': 'Early planning',
  'ACTIVE PREP': 'Prep in progress',
  'FINAL PRE-OPEN REVIEW': 'Final check',
  'SALE DAYS': 'Sale days',
  'POST-SALE': 'After the sale',
  UNKNOWN: 'No dates yet',
};

const SECURITY_PREFIX = 'Security:';
const CHECKOUT_PREFIX = 'Checkout Setup:';

// ── Timing (uses existing sale dates; no invented panic states) ──────────────
export function timingFor(sale, now = new Date()) {
  const dates = (sale.sale_dates || []).map(d => d?.date).filter(Boolean).sort();
  if (dates.length === 0) return { phase: 'UNKNOWN', daysUntilFirst: null, firstDate: null, lastDate: null };
  const first = new Date(dates[0] + 'T00:00:00');
  const last = new Date(dates[dates.length - 1] + 'T23:59:59');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilFirst = Math.round((first - today) / 86400000);
  let phase;
  if (now > last) phase = 'POST-SALE';
  else if (now >= first) phase = 'SALE DAYS';
  else if (daysUntilFirst <= 3) phase = 'FINAL PRE-OPEN REVIEW';
  else if (daysUntilFirst <= 14) phase = 'ACTIVE PREP';
  else phase = 'EARLY PREP';
  return { phase, daysUntilFirst, firstDate: dates[0], lastDate: dates[dates.length - 1] };
}

// ── Checklist review state (executed through the existing SaleTask system) ────
// none  = checklist not added yet → NOT REVIEWED (truthfully unknown)
// open  = some checklist items not completed
// done  = all checklist items completed → CHECKLIST REVIEWED (never "safe")
export function checklistState(tasks, prefix) {
  const items = tasks.filter(t => (t.name || '').startsWith(prefix));
  if (items.length === 0) return { state: 'none', items: [], total: 0, completed: 0 };
  const completed = items.filter(t => t.status === 'completed').length;
  return {
    state: completed === items.length ? 'done' : 'open',
    items,
    total: items.length,
    completed,
  };
}

// ── Main deterministic analysis ───────────────────────────────────────────────
export function analyzePreparation(input) {
  const { sale, scope, tasks, itemCount, researchItems, attentionItems, assignments, kit, marketingKit, openDecisions, authorities = [] } = input;
  const timing = timingFor(sale);
  const areas = [];
  const push = (id, label, status, detail, link, linkLabel) =>
    areas.push({ id, label, status, detail, link, linkLabel });

  // SALE BASICS
  const hasDates = (sale.sale_dates || []).length > 0;
  const hasAddress = !!(sale.property_address && (sale.property_address.city || sale.property_address.street));
  if (!sale.title || !hasDates) {
    push('basics', 'Sale Details', STATUS.NEEDS_ATTENTION,
      !sale.title ? 'This sale still needs a title.' : 'Pick the sale dates.',
      `/SaleEditor?saleId=${sale.id}`, 'Edit sale');
  } else {
    push('basics', 'Sale Details', STATUS.READY,
      hasAddress ? 'Dates and address are set.' : 'Dates are set. Add the property address.',
      `/SaleEditor?saleId=${sale.id}`, 'Edit sale');
  }

  // CLIENT / SCOPE (Chapter 9 P1 adds the operational AUTHORITY check —
  // UNKNOWN AUTHORITY IS NOT AUTHORITY; wording stays operational, never legal)
  const activeAuth = authorities.filter(a => a.is_active);
  const primaryAuth = activeAuth.find(a => a.is_primary) || activeAuth[0];
  const authIssue = !activeAuth.length
    ? 'Say who can make decisions for this client.'
    : primaryAuth?.verification_status !== 'VERIFIED'
      ? `${primaryAuth?.full_name || 'Your client'} is not confirmed as the decision-maker yet.`
      : null;
  if (openDecisions.length > 0) {
    push('client_scope', 'Client & Scope', STATUS.NEEDS_ATTENTION,
      `${openDecisions.length} question${openDecisions.length === 1 ? '' : 's'} waiting on your client.${authIssue ? ` ${authIssue}` : ''}`,
      `/SaleClientDecisions?saleId=${sale.id}`, 'Open questions');
  } else if (authIssue) {
    push('client_scope', 'Client & Scope', STATUS.NEEDS_ATTENTION, authIssue,
      `/ProposalAgreement?saleId=${sale.id}`, 'Who decides');
  } else if (scope) {
    const included = (scope.scope_items || []).filter(s => s.included).length;
    push('client_scope', 'Client & Scope', STATUS.READY,
      `What this client hired you for is recorded (${included} service${included === 1 ? '' : 's'}).`);
  } else {
    push('client_scope', 'Client & Scope', STATUS.NEEDS_REVIEW,
      'No agreed scope yet. Note what this client hired you to do.',
      `/SaleEditor?saleId=${sale.id}`, 'Add scope');
  }

  // PROPERTY / ROOMS
  const sa = sale.site_assessment || {};
  const assessed = ['property_type', 'approx_size', 'stairs_levels', 'parking', 'loading_access', 'merchandise_volume', 'community_restrictions', 'pickup_constraints']
    .some(k => sa[k] && sa[k] !== 'unknown');
  if (assessed) {
    const bits = [];
    if (sa.stairs_levels && sa.stairs_levels !== 'unknown') bits.push(`stairs: ${sa.stairs_levels.replace('_', ' ')}`);
    if (sa.parking && sa.parking !== 'unknown') bits.push(`parking: ${sa.parking}`);
    if (sa.merchandise_volume && sa.merchandise_volume !== 'unknown') bits.push(`volume: ${sa.merchandise_volume}`);
    push('property', 'Property & Rooms', STATUS.READY,
      `Site notes are on file${bits.length ? ` (${bits.join(', ')})` : ''}.`,
      `/SaleEditor?saleId=${sale.id}`, 'Site notes');
  } else {
    push('property', 'Property & Rooms', STATUS.NEEDS_REVIEW,
      'No site notes yet. Add property type, stairs, parking and how much there is.',
      `/SaleEditor?saleId=${sale.id}`, 'Site notes');
  }

  // INVENTORY
  if (itemCount === 0) {
    push('inventory', 'Items', STATUS.NEEDS_ATTENTION,
      'No items on this sale yet.',
      `/SaleInventory?id=${sale.id}`, 'Open items');
  } else {
    push('inventory', 'Items', STATUS.READY,
      `${itemCount} item${itemCount === 1 ? '' : 's'} on this sale.`,
      `/SaleInventory?id=${sale.id}`, 'Open items');
  }

  // RESEARCH
  if (researchItems.length > 0) {
    push('research', 'Research', STATUS.NEEDS_ATTENTION,
      `${researchItems.length} item${researchItems.length === 1 ? '' : 's'} still need research or a check.`,
      `/SaleInventory?id=${sale.id}`, 'Research list');
  } else {
    push('research', 'Research', STATUS.READY, 'Nothing is waiting on research.', `/SaleInventory?id=${sale.id}`, 'Research list');
  }

  // SECURITY (checklist through SaleTask)
  const security = checklistState(tasks, SECURITY_PREFIX);
  if (security.state === 'none') {
    push('security', 'Security', STATUS.NEEDS_REVIEW,
      'Not reviewed yet. Add the walkthrough checklist below.',
      '#security', 'Open checklist');
  } else if (security.state === 'open') {
    push('security', 'Security', STATUS.NEEDS_ATTENTION,
      `${security.completed} of ${security.total} points checked.`,
      '#security', 'Open checklist');
  } else {
    push('security', 'Security', STATUS.READY,
      `All ${security.total} points checked.`,
      '#security', 'View checklist');
  }

  // CHECKOUT (checklist through SaleTask)
  const checkout = checklistState(tasks, CHECKOUT_PREFIX);
  if (checkout.state === 'none') {
    push('checkout', 'Checkout', STATUS.NEEDS_REVIEW,
      'Not reviewed yet. Add the checkout checklist below.',
      '#checkout', 'Open checklist');
  } else if (checkout.state === 'open') {
    push('checkout', 'Checkout', STATUS.NEEDS_ATTENTION,
      `${checkout.completed} of ${checkout.total} points checked.`,
      '#checkout', 'Open checklist');
  } else {
    push('checkout', 'Checkout', STATUS.READY,
      `All ${checkout.total} points checked.`,
      '#checkout', 'View checklist');
  }

  // HIGH-VALUE / CONTROLLED ITEMS (handling decided in the security walkthrough)
  if (attentionItems.length === 0) {
    push('high_value', 'High-Value Items', STATUS.NOT_APPLICABLE,
      'Nothing is flagged for special handling.',
      `/SaleInventory?id=${sale.id}`, 'Open items');
  } else if (security.state === 'done') {
    push('high_value', 'High-Value Items', STATUS.READY,
      `${attentionItems.length} item${attentionItems.length === 1 ? '' : 's'} flagged — how to display them is covered in the security checklist.`,
      `#security`, 'View checklist');
  } else {
    push('high_value', 'High-Value Items', STATUS.NEEDS_REVIEW,
      `${attentionItems.length} item${attentionItems.length === 1 ? '' : 's'} flagged. Decide how to display them in the security checklist.`,
      `#security`, 'Open checklist');
  }

  // EQUIPMENT / LOAD-OUT
  const unpacked = assignments.filter(a => !a.packed);
  const unresolvedPackout = assignments.filter(a => a.packed && a.entry_type === 'REUSABLE_EQUIPMENT' && (a.packout_state || 'PENDING') === 'PENDING');
  if (assignments.length === 0 && !kit) {
    push('equipment', 'Equipment', STATUS.NEEDS_REVIEW,
      'No equipment list for this sale yet.',
      '/EquipmentManager', 'Set up equipment');
  } else if (assignments.length === 0 && kit) {
    push('equipment', 'Equipment', STATUS.NEEDS_ATTENTION,
      `Your standard kit "${kit.name}" has not been added to this sale yet.`,
      `/SaleEquipment?saleId=${sale.id}`, 'Add kit');
  } else if (unpacked.length > 0) {
    push('equipment', 'Equipment', STATUS.NEEDS_ATTENTION,
      `${unpacked.length} of ${assignments.length} still need packing.`,
      `/SaleEquipment?saleId=${sale.id}`, 'Packing list');
  } else if (unresolvedPackout.length > 0 && timing.phase === 'POST-SALE') {
    push('equipment', 'Equipment', STATUS.NEEDS_ATTENTION,
      `${unresolvedPackout.length} company item${unresolvedPackout.length === 1 ? '' : 's'} left with no return recorded.`,
      `/SaleEquipment?saleId=${sale.id}`, 'Record returns');
  } else {
    push('equipment', 'Equipment', STATUS.READY,
      `${assignments.length} item${assignments.length === 1 ? '' : 's'} packed for this sale.`,
      `/SaleEquipment?saleId=${sale.id}`, 'Packing list');
  }

  // MARKETING (derived from actual MarketingKit component states)
  if (!marketingKit) {
    push('marketing', 'Marketing', STATUS.NEEDS_REVIEW,
      'No marketing kit for this sale yet.',
      `/MarketingKit?saleId=${sale.id}`, 'Open marketing kit');
  } else {
    const comps = marketingKit.component_status || {};
    const keys = ['description', 'social', 'email', 'sms', 'qr', 'signs', 'featured'];
    const notReady = keys.filter(k => comps[k] && comps[k] !== 'ready');
    const untouched = keys.filter(k => !comps[k]);
    if (notReady.length === 0 && untouched.length === 0) {
      push('marketing', 'Marketing', STATUS.READY,
        'Marketing kit is ready.',
        `/MarketingKit?saleId=${sale.id}`, 'Open marketing kit');
    } else {
      const bits = [];
      if (notReady.length) bits.push(`${notReady.length} still in draft`);
      if (untouched.length) bits.push(`${untouched.length} not started`);
      push('marketing', 'Marketing', STATUS.NEEDS_ATTENTION,
        `Not finished yet — ${bits.join(', ')}.`,
        `/MarketingKit?saleId=${sale.id}`, 'Open marketing kit');
    }
  }

  // TEAM / TASKS
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdue = openTasks.filter(t => t.due_date && t.due_date < todayStr);
  if (tasks.length === 0) {
    push('team_tasks', 'Team & Tasks', STATUS.NEEDS_REVIEW,
      'No tasks on this sale yet.',
      `/SaleTasks?saleId=${sale.id}`, 'Open tasks');
  } else if (overdue.length > 0) {
    push('team_tasks', 'Team & Tasks', STATUS.NEEDS_ATTENTION,
      `${overdue.length} late, ${openTasks.length} still open.`,
      `/SaleTasks?saleId=${sale.id}`, 'Open tasks');
  } else {
    push('team_tasks', 'Team & Tasks', STATUS.READY,
      `${tasks.length} task${tasks.length === 1 ? '' : 's'}, ${openTasks.length} open, none late.`,
      `/SaleTasks?saleId=${sale.id}`, 'Open tasks');
  }

  // Findings: every NEEDS ATTENTION / NEEDS REVIEW area leads somewhere useful.
  const findings = areas
    .filter(a => a.status === STATUS.NEEDS_ATTENTION || a.status === STATUS.NEEDS_REVIEW)
    .map(a => ({
      area: a.id,
      areaLabel: a.label,
      status: a.status,
      detail: a.detail,
      link: a.link,
      linkLabel: a.linkLabel,
    }));

  const summary = {
    ready: areas.filter(a => a.status === STATUS.READY).length,
    attention: areas.filter(a => a.status === STATUS.NEEDS_ATTENTION).length,
    review: areas.filter(a => a.status === STATUS.NEEDS_REVIEW).length,
    na: areas.filter(a => a.status === STATUS.NOT_APPLICABLE).length,
  };

  return { areas, findings, summary, timing, security, checkout };
}

// Compact facts string for grounded AI panels (Operations Coach / Prep Brief).
export function prepFactsString({ sale, analysis, researchItems, attentionItems, assignments, openDecisions, tasks }) {
  const lines = [];
  lines.push(`SALE: "${sale.title}" — status ${sale.status || 'unknown'}, timing phase ${analysis.timing.phase}${analysis.timing.daysUntilFirst !== null ? ` (${analysis.timing.daysUntilFirst} days until first date)` : ' (no dates set)'}.`);
  lines.push('WHAT THE RECORDS SHOW (computed, not written by AI):');
  for (const a of analysis.areas) lines.push(`- ${a.label}: ${a.status} — ${a.detail}`);
  if (researchItems.length) lines.push(`RESEARCH FLAGGED ITEMS: ${researchItems.map(i => `"${i.title}" (${i.research_status})`).join('; ')}`);
  if (attentionItems.length) lines.push(`DISPLAY ATTENTION ITEMS: ${attentionItems.map(i => `"${i.title}" (${i.display_attention})`).join('; ')}`);
  if (openDecisions.length) lines.push(`OPEN CLIENT DECISIONS: ${openDecisions.map(d => `"${d.subject}"`).join('; ')}`);
  const openTasks = (tasks || []).filter(t => t.status !== 'completed');
  if (openTasks.length) lines.push(`OPEN TASKS: ${openTasks.slice(0, 15).map(t => `"${t.name}"${t.due_date ? ` (due ${t.due_date})` : ''}`).join('; ')}`);
  const unpacked = (assignments || []).filter(a => !a.packed);
  if (unpacked.length) lines.push(`UNPACKED EQUIPMENT: ${unpacked.map(a => `"${a.name}"`).join('; ')}`);
  lines.push('Anything not listed above is UNKNOWN from records — do not invent it.');
  return lines.join('\n');
}