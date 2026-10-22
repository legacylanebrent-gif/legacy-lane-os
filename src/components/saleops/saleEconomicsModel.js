// Chapter 4 P1 / Chapter 23 P0-P1 — canonical sale economics model. SINGLE source of financial truth.
//
// DOCTRINE (never use one concept as another):
//   GROSS = canonical sold merchandise total (Item.sold_price || price, status 'sold').
//   REFUNDS (completed) are part of the original financial story: the original sale and
//   payment truth are NEVER rewritten — settlement consumes them as an adjustment.
//   NET MERCHANDISE PROCEEDS = gross − completed refunds.
//   COMPANY REVENUE = MAX(commission, contractual minimum fee) + client-authorized service charges,
//   computed on NET merchandise proceeds when refunds exist.
//   CLIENT PROCEEDS = net merchandise proceeds − company revenue − authorized reimbursable expenses.
//   DIRECT COSTS = sale-scoped Expense + LaborEntry-derived cash labor (hours × rate, non-owner).
//   OWNER TIME = hours only, never cash cost.
//   CONTRIBUTION = company revenue − direct costs. NOT net profit (overhead and owner time excluded).
//   THE AGREEMENT CONTROLS THE MATH: settlement uses the ACCEPTED commercial terms snapshot
//   when one exists (accepted_terms_snapshot), and surfaces drift when live deal terms differ.
//   UNKNOWN IS DATA: per-hour metrics return null when hours are unknown/zero, never 0-as-fact.
//
// Authoritative actuals persist via ONE writer: settlement finalize (SettlementStatement).
import { asArray } from './saleDecisionModel';

export const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);

export const LABOR_CATEGORIES = [
  { key: 'preparation', label: 'Preparation' },
  { key: 'sorting', label: 'Sorting' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'research', label: 'Research' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'staging', label: 'Staging' },
  { key: 'grouping', label: 'Grouping' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'signage', label: 'Signage' },
  { key: 'photography', label: 'Photography' },
  { key: 'measurement', label: 'Measurement' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'moving', label: 'Moving' },
  { key: 'sale_day', label: 'Sale Day' },
  { key: 'sale_floor_maintenance', label: 'Sale-Floor Maintenance' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'closeout', label: 'Closeout' },
  { key: 'travel', label: 'Travel' },
  { key: 'other', label: 'Other' },
];

export const laborCategoryLabel = (key) => LABOR_CATEGORIES.find(c => c.key === key)?.label || key;

// ── GROSS ────────────────────────────────────────────────────────────────────
export function saleGross(items) {
  return asArray(items)
    .filter(i => i.status === 'sold')
    .reduce((s, i) => s + (Number(i.sold_price) || Number(i.price) || 0), 0);
}

// ── REFUNDS (Chapter 23 P0-1) ────────────────────────────────────────────────
// A refund is part of the ORIGINAL financial story: the original Order/payment is
// never rewritten. Only FINANCIALLY EFFECTIVE refunds adjust settlement:
//   RECORDED        = operator-authorized & recorded (cash back, or recorded truth)
//   PROVIDER_COMPLETED = provider-side completion recorded from the merchant dashboard
// PROVIDER_PENDING is NOT yet effective (pending refund must never masquerade as
// completed). CANCELLED never was. Each refund record is its own financial event —
// summing distinct records cannot double count; the original amounts stay untouched.
export const EFFECTIVE_REFUND_STATUSES = ['RECORDED', 'PROVIDER_COMPLETED'];
export const PENDING_REFUND_STATUSES = ['PROVIDER_PENDING'];

export function completedRefunds(refunds) {
  return asArray(refunds).filter(r => EFFECTIVE_REFUND_STATUSES.includes(r.status));
}
export function completedRefundsTotal(refunds) {
  return completedRefunds(refunds).reduce((s, r) => s + (Number(r.amount) || 0), 0);
}
export function pendingRefunds(refunds) {
  return asArray(refunds).filter(r => PENDING_REFUND_STATUSES.includes(r.status));
}

// ── ACCEPTED SETTLEMENT TERMS (Chapter 23 P1 — the agreement controls the math) ─
// Settlement reads the ACCEPTED terms snapshot when one exists; the live deal fields
// remain working/projected truth. DRIFT = live terms differ from what the client
// accepted — surfaced for review, never silently used for the client-facing math.
export function settlementTerms(deal) {
  const snap = deal?.accepted_terms_snapshot || {};
  const snapRate = snap.commission_rate != null ? Number(snap.commission_rate) : null;
  const snapMin = snap.minimum_fee != null ? Number(snap.minimum_fee) : null;
  const liveRate = Number(deal?.commission_rate) || 0;
  const liveMin = Number(deal?.minimum_fee) || 0;
  const hasSnapshot = snapRate != null;
  const commissionRate = hasSnapshot ? snapRate : liveRate;
  const minimumFee = hasSnapshot ? (snapMin || 0) : liveMin;
  const drift = hasSnapshot && (snapRate !== liveRate || (snapMin || 0) !== liveMin);
  return {
    commissionRate,
    minimumFee,
    source: hasSnapshot ? 'ACCEPTED_TERMS' : 'DEAL_CURRENT',
    drift,
    acceptedAt: snap.accepted_at || deal?.commercial_terms_accepted_at || null,
  };
}

// ── COMPANY FEE (commission vs contractual minimum) ──────────────────────────
export function companyFee({ gross, commissionRate, minimumFee }) {
  const rate = Number(commissionRate) || 0;
  const commission = (Number(gross) || 0) * (rate / 100);
  const minimum = Number(minimumFee) || 0;
  const applied = minimum > 0 ? Math.max(commission, minimum) : commission;
  return { commission, minimum, applied, minimumApplied: minimum > 0 && minimum > commission };
}

// ── AUTHORIZED SERVICE CHARGES (SaleClientDecision 'financial') ───────────────
// Only client-AUTHORIZED financial decisions with a recorded authority flow to settlement.
// Decisions with related_expense_id are REIMBURSEMENT authorizations, not service
// charges — excluded here so they never double-count; the linked expense flows to
// settlement through authorizedReimbursables instead.
export function authorizedServiceCharges(decisions) {
  return asArray(decisions).filter(d =>
    d.decision_type === 'financial' &&
    !d.related_expense_id &&
    d.current_decision === 'authorized' &&
    (Number(d.charge_amount) || 0) > 0 &&
    !!(d.authorized_by || d.authorized_by_name)
  );
}
export const serviceChargesTotal = (decisions) =>
  authorizedServiceCharges(decisions).reduce((s, d) => s + (Number(d.charge_amount) || 0), 0);

// ── AUTHORIZED CLIENT-REIMBURSABLE EXPENSES (Chapter 6 P2) ───────────────────
// Doctrine: a company expense NEVER reduces client proceeds merely because
// is_reimbursable=true. It reduces client proceeds ONLY when an authorized financial
// SaleClientDecision links it (related_expense_id) — the client-authorization basis.
export function authorizedReimbursables(expenses, decisions) {
  const marked = asArray(expenses).filter(e => !!e.is_reimbursable);
  const authorizedById = new Map();
  asArray(decisions).forEach(d => {
    if (d.related_expense_id && d.decision_type === 'financial' && d.current_decision === 'authorized') {
      const existing = authorizedById.get(d.related_expense_id);
      if (!existing || (d.decided_at || '') > (existing.decided_at || '')) authorizedById.set(d.related_expense_id, d);
    }
  });
  const authorized = marked
    .filter(e => authorizedById.has(e.id))
    .map(e => ({ expense: e, decision: authorizedById.get(e.id) }));
  const unauthorized = marked.filter(e => !authorizedById.has(e.id));
  const total = authorized.reduce((s, r) => s + (Number(r.expense.amount) || 0), 0);
  return { authorized, unauthorized, total };
}

// ── LABOR (hours in, cash cost out — never the reverse) ──────────────────────
export const totalLaborHours = (entries) => asArray(entries).reduce((s, e) => s + (Number(e.hours) || 0), 0);
export const ownerHours = (entries) => asArray(entries).filter(e => e.is_owner_time).reduce((s, e) => s + (Number(e.hours) || 0), 0);
export const cashLaborFromHours = (entries) => asArray(entries)
  .filter(e => !e.is_owner_time)
  .reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.hourly_rate) || 0), 0);

// ── SALE-SCOPED EXPENSE GROUPING ─────────────────────────────────────────────
export const EXPENSE_GROUPS = {
  advertising: ['advertising_marketing', 'signage_banners'],
  supplies: ['supplies_materials'],
  transportation: ['transportation_fuel'],
  processing: ['processing_fees'],
};

export function expenseByGroup(expenses) {
  const list = asArray(expenses);
  const amount = (e) => Number(e.amount) || 0;
  const sumCats = (cats) => list.filter(e => cats.includes(e.category)).reduce((s, e) => s + amount(e), 0);
  const laborWages = sumCats(['labor_wages']);
  const advertising = sumCats(EXPENSE_GROUPS.advertising);
  const supplies = sumCats(EXPENSE_GROUPS.supplies);
  const transportation = sumCats(EXPENSE_GROUPS.transportation);
  const processing = sumCats(EXPENSE_GROUPS.processing);
  const total = list.reduce((s, e) => s + amount(e), 0);
  const other = total - laborWages - advertising - supplies - transportation - processing;
  return { total, laborWages, advertising, supplies, transportation, processing, other };
}

// ── ACTUAL SALE ECONOMICS (internal closeout + settlement view) ───────────────
// Chapter 23 P0-1: refunds are consumed here — ORIGINAL SALE + ORIGINAL PAYMENT +
// REFUND ACTIVITY = NET FINANCIAL EFFECT. The waterfall:
//   gross merchandise sales
//   − completed refunds
//   = net merchandise proceeds
//   − company fee (MAX(net × accepted commission%, accepted minimum))
//   − authorized service charges
//   − authorized reimbursable expenses
//   = net due to client
export function actualSaleEconomics({ items, deal, financialDecisions, expenses, laborEntries, refunds, reimbursableTotal }) {
  const gross = saleGross(items);
  const refundList = completedRefunds(refunds);
  const refundsTotal = refundList.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const netMerchandiseProceeds = gross - refundsTotal;
  const terms = settlementTerms(deal);
  const fee = companyFee({ gross: netMerchandiseProceeds, commissionRate: terms.commissionRate, minimumFee: terms.minimumFee });
  const charges = authorizedServiceCharges(financialDecisions);
  const serviceRevenue = charges.reduce((s, d) => s + (Number(d.charge_amount) || 0), 0);
  const companyRevenue = fee.applied + serviceRevenue;
  const reimbTotal = reimbursableTotal != null ? reimbursableTotal : authorizedReimbursables(expenses, financialDecisions).total;
  const netDueToClient = netMerchandiseProceeds - companyRevenue - reimbTotal;
  const exp = expenseByGroup(expenses);
  const cashHoursLabor = cashLaborFromHours(laborEntries);
  const cashLaborTotal = cashHoursLabor + exp.laborWages;
  const directCosts = exp.total + cashHoursLabor;
  const contribution = companyRevenue - directCosts;
  const totalHours = totalLaborHours(laborEntries);
  const ownerHrs = ownerHours(laborEntries);
  return {
    gross, refunds: refundList, refundsTotal, netMerchandiseProceeds,
    terms, fee, charges, serviceRevenue, companyRevenue,
    reimbursableTotal: reimbTotal,
    netDueToClient,
    expenses: exp,
    cashHoursLabor, laborWages: exp.laborWages, cashLaborTotal, directCosts,
    contribution,
    margin: companyRevenue > 0 ? contribution / companyRevenue : null,
    ownerHours: ownerHrs,
    employeeHours: Math.max(0, totalHours - ownerHrs),
    totalHours,
    ownerSharePct: totalHours > 0 ? ownerHrs / totalHours : null,
    revenuePerLaborHour: totalHours > 0 ? companyRevenue / totalHours : null,
    contributionPerLaborHour: totalHours > 0 ? contribution / totalHours : null,
  };
}

// ── SETTLEMENT READINESS (Chapter 23 P0-2) ───────────────────────────────────
// Deterministic blockers — settlement must NOT finalize while required financial
// truth is unresolved. UNKNOWN stays UNKNOWN (never treated as paid/failed/zero);
// variance is never silently zeroed; a duplicate payment never inflates sales.
// difference / differenceExplained cover the transaction↔payment comparison (P1).
export function settlementReadiness({ attempts = [], issues = [], cashSessions = [], refunds = [], reconciliationDifference = null, differenceExplained = false } = {}) {
  const blockers = [];
  const unresolvedAttempts = asArray(attempts).filter(a => ['PROCESSING', 'UNKNOWN'].includes(a.status));
  if (unresolvedAttempts.length > 0) {
    blockers.push(`${unresolvedAttempts.length} unresolved payment attempt(s) — PROCESSING/UNKNOWN payment truth cannot be finalized away. Resolve in Checkout Health first.`);
  }
  const duplicateIssues = asArray(issues).filter(i =>
    i.category === 'payment' && ['OPEN', 'WAITING'].includes(i.status || 'OPEN') &&
    /duplicate/i.test(i.title || '')
  );
  if (duplicateIssues.length > 0) {
    blockers.push(`${duplicateIssues.length} possible duplicate payment exception(s) requiring review — the extra charge is preserved but must be resolved before settlement.`);
  }
  const openPaymentIssues = asArray(issues).filter(i =>
    i.category === 'payment' && ['OPEN', 'WAITING'].includes(i.status || 'OPEN') &&
    !/duplicate/i.test(i.title || '')
  );
  if (openPaymentIssues.length > 0) {
    blockers.push(`${openPaymentIssues.length} open payment exception(s) — resolve each before settlement.`);
  }
  const openVariance = asArray(cashSessions).filter(s => s.status === 'CLOSED' && (s.variance_status || 'OPEN') === 'OPEN');
  openVariance.forEach(s => {
    blockers.push(`Cash variance unresolved: ${money(s.variance)} (${s.session_date}${s.register_label ? `, ${s.register_label}` : ''}) — explain or resolve in Cash Controls. Never auto-zeroed.`);
  });
  const pendingRefundList = pendingRefunds(refunds);
  if (pendingRefundList.length > 0) {
    blockers.push(`${pendingRefundList.length} refund(s) still pending with the payment provider — confirm completion (or cancellation) before settlement.`);
  }
  if (reconciliationDifference != null && Math.abs(reconciliationDifference) >= 0.01 && !differenceExplained) {
    blockers.push(`Reconciliation difference of ${money(reconciliationDifference)} between recorded merchandise sales and payment truth is UNEXPLAINED — record the explanation or correct the records. The difference is never auto-balanced.`);
  }
  return {
    ready: blockers.length === 0,
    blockers,
    unresolvedAttempts,
    duplicateIssues,
    openPaymentIssues,
    openVariance,
    pendingRefundList,
  };
}

// ── RECONCILIATION VIEW (Chapter 23 P1) ──────────────────────────────────────
// Compares recorded merchandise sales (Item truth) against payment truth
// (canonical paid Orders). The difference is displayed honestly — never forced to
// balance and never silently absorbed. Legacy pre-Chapter-21 Transactions are not
// Orders; they are counted by the cash controls, not here.
export function reconciliationView({ items = [], orders = [], refunds = [] } = {}) {
  const recordedGross = saleGross(items);
  const refundsTotal = completedRefundsTotal(refunds);
  const recordedNet = recordedGross - refundsTotal;
  const paidOrders = asArray(orders).filter(o => o.status === 'paid');
  const paymentTruth = paidOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const byMethod = paidOrders.reduce((acc, o) => {
    const m = o.payment_method === 'cash' ? 'cash' : ['online', 'credit_card', 'card'].includes(o.payment_method) ? 'card' : 'other';
    acc[m] = (acc[m] || 0) + (Number(o.total) || 0);
    return acc;
  }, {});
  const difference = Math.round((recordedNet - paymentTruth) * 100) / 100;
  return {
    recordedGross,
    refundsTotal,
    recordedNet,
    paymentTruth,
    byMethod,
    difference,
    reconciled: Math.abs(difference) < 0.005,
  };
}

// ── PROJECTED DEAL ECONOMICS (pre-sale, from the pipeline deal) ──────────────
// overrides (all optional, local-state scenario/comparison use):
//   estGross, commissionRate, minimumFee, serviceRevenue, laborEstimates,
//   advertising, supplies, transportation, processing, other
export function projectedDealEconomics(deal, o = {}) {
  const estGross = num(o.estGross ?? deal?.estimated_value) || 0;
  const rate = num(o.commissionRate ?? deal?.commission_rate) || 0;
  const minimumFee = num(o.minimumFee ?? deal?.minimum_fee) || 0;
  const serviceRevenue = num(o.serviceRevenue ?? deal?.expected_service_revenue) || 0;
  const fee = companyFee({ gross: estGross, commissionRate: rate, minimumFee });
  const companyRevenue = fee.applied + serviceRevenue;
  const labor = asArray(o.laborEstimates ?? deal?.labor_estimates)
    .map(l => ({ hours: Number(l.hours) || 0, rate: Number(l.rate) || 0, isOwner: !!l.is_owner_time }));
  // Projected OWNER hours are reported separately and never counted as projected
  // CASH labor cost (matching the LaborEntry owner-time doctrine).
  const cashLabor = labor.filter(l => !l.isOwner);
  const estOwnerHours = labor.filter(l => l.isOwner).reduce((s, l) => s + l.hours, 0);
  const estHours = cashLabor.reduce((s, l) => s + l.hours, 0);
  const estLaborCost = cashLabor.reduce((s, l) => s + l.hours * l.rate, 0);
  const advertising = num(o.advertising ?? deal?.estimated_advertising) || 0;
  const supplies = num(o.supplies ?? deal?.estimated_supplies) || 0;
  const transportation = num(o.transportation ?? deal?.estimated_transportation) || 0;
  const processing = num(o.processing ?? deal?.estimated_processing) || 0;
  const other = num(o.other ?? deal?.estimated_other_costs) || 0;
  const directCosts = estLaborCost + advertising + supplies + transportation + processing + other;
  const contribution = companyRevenue - directCosts;
  const minRevenueThreshold = num(deal?.min_company_revenue_threshold) || null;
  const minContributionThreshold = num(deal?.min_contribution_threshold) || null;
  return {
    estGross, rate, minimumFee, serviceRevenue, fee, companyRevenue,
    estHours, estLaborCost, estOwnerHours, advertising, supplies, transportation, processing, other,
    directCosts, contribution,
    minRevenueThreshold, minContributionThreshold,
    minRevenueTest: minRevenueThreshold != null ? companyRevenue >= minRevenueThreshold : null,
    minContributionTest: minContributionThreshold != null ? contribution >= minContributionThreshold : null,
  };
}

// Variance formatting for the projected-vs-actual table.
export const variance = (projected, actual) => {
  if (projected == null) return null;
  return (Number(actual) || 0) - (Number(projected) || 0);
};