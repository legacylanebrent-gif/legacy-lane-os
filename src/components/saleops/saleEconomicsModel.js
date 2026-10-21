// Chapter 4 P1 — canonical sale economics model. SINGLE source of financial truth.
//
// DOCTRINE (never use one concept as another):
//   GROSS = canonical sold merchandise total (Item.sold_price || price, status 'sold').
//   COMPANY REVENUE = MAX(commission, contractual minimum fee) + client-authorized service charges.
//   CLIENT PROCEEDS = gross − company revenue.
//   DIRECT COSTS = sale-scoped Expense + LaborEntry-derived cash labor (hours × rate, non-owner).
//   OWNER TIME = hours only, never cash cost.
//   CONTRIBUTION = company revenue − direct costs. NOT net profit (overhead and owner time excluded).
//
// Authoritative actuals persist via ONE writer: settlement finalize (SettlementStatement).
import { asArray } from './saleDecisionModel';

export const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);

export const LABOR_CATEGORIES = [
  { key: 'preparation', label: 'Preparation' },
  { key: 'research', label: 'Research' },
  { key: 'staging', label: 'Staging' },
  { key: 'sale_day', label: 'Sale Day' },
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
// Chapter 6 P2: decisions with related_expense_id are REIMBURSEMENT authorizations,
// not service charges — they are excluded here so they never double-count; the linked
// expense flows to settlement through authorizedReimbursables instead.
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
// Without that, it stays a company direct cost and surfaces as AUTHORIZATION NEEDED.
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

// ── ACTUAL SALE ECONOMICS (internal closeout view) ───────────────────────────
export function actualSaleEconomics({ items, deal, financialDecisions, expenses, laborEntries }) {
  const gross = saleGross(items);
  const fee = companyFee({ gross, commissionRate: deal?.commission_rate ?? 35, minimumFee: deal?.minimum_fee });
  const charges = authorizedServiceCharges(financialDecisions);
  const serviceRevenue = charges.reduce((s, d) => s + (Number(d.charge_amount) || 0), 0);
  const companyRevenue = fee.applied + serviceRevenue;
  const netDueToClient = gross - companyRevenue;
  const exp = expenseByGroup(expenses);
  const cashHoursLabor = cashLaborFromHours(laborEntries);
  const cashLaborTotal = cashHoursLabor + exp.laborWages;
  const directCosts = exp.total + cashHoursLabor;
  const contribution = companyRevenue - directCosts;
  return {
    gross, fee, charges, serviceRevenue, companyRevenue, netDueToClient,
    expenses: exp,
    cashHoursLabor, laborWages: exp.laborWages, cashLaborTotal, directCosts,
    contribution,
    ownerHours: ownerHours(laborEntries),
    totalHours: totalLaborHours(laborEntries),
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
    .map(l => ({ hours: Number(l.hours) || 0, rate: Number(l.rate) || 0 }));
  const estHours = labor.reduce((s, l) => s + l.hours, 0);
  const estLaborCost = labor.reduce((s, l) => s + l.hours * l.rate, 0);
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
    estHours, estLaborCost, advertising, supplies, transportation, processing, other,
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