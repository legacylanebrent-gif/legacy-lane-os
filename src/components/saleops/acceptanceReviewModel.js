// Chapter 4 P1 / Chapter 12 P1 — THE canonical Sale Acceptance Review engine.
// Extracted from DealEconomicsPanel so Consultation Mode shares ONE deterministic
// model (never a second calculation). Deterministic calculation only; scenario and
// comparison modeling are analysis-only (never persisted; signed contract terms and
// actual records are never overwritten). ADVISORY: the operator makes the
// accept/reject decision. NO numeric score — evidence-based classifications with
// written reasons, forever.
import { projectedDealEconomics, money } from './saleEconomicsModel';
import { CLIENT_FIT_DIMENSIONS } from './ClientFitPanel';

export const ACTIVE_STAGES = ['new_lead', 'consultation_scheduled', 'contract_signed', 'setup_in_progress', 'sale_live'];

export const DEFAULT_SCENARIO = { grossPct: -20, extraHours: 16, extraRate: '', extraAdvertising: 250, extraSupplies: 0, extraOther: 0 };

export const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);

// Calendar overlap with other active deals (Chapter 3 information — CAPACITY
// VISIBILITY only; never a capacity conclusion).
export function calendarOverlap(deal, allDeals) {
  const start = deal?.estimated_sale_start_date;
  const end = deal?.estimated_sale_end_date || start;
  if (!start) return { count: null, others: [] };
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const others = (allDeals || []).filter(d => {
    if (d.id === deal.id) return false;
    if (!ACTIVE_STAGES.includes(d.stage)) return false;
    const ds = d.estimated_sale_start_date;
    if (!ds) return false;
    const dss = new Date(ds).getTime();
    const dee = new Date(d.estimated_sale_end_date || ds).getTime();
    return dss <= e && dee >= s;
  });
  return { count: others.length, others };
}

// Chapter 5 P1 advisory inputs: client fit (deal), distance (deal snapshot or the
// linked sale's snapshot), site complexity (canonical EstateSale site assessment).
// These NEVER change the deterministic financial rating; they add explainable reasons.
export function advisoryInputs(deal, linkedSale) {
  const cf = deal?.client_fit || {};
  const flagged = CLIENT_FIT_DIMENSIONS
    .filter(d => cf[d.key] === 'caution' || cf[d.key] === 'concern')
    .map(d => ({ label: d.label, level: cf[d.key] }));
  const cfWorst = flagged.some(f => f.level === 'concern') ? 'CONCERN'
    : flagged.length ? 'CAUTION'
      : CLIENT_FIT_DIMENSIONS.some(d => cf[d.key] === 'good') ? 'CLEAR' : 'NOT ASSESSED';
  const site = linkedSale?.site_assessment || {};
  const siteFlags = [];
  if (site.gated_access === 'gated' || site.gated_access === 'controlled_entry') siteFlags.push('gated/controlled access');
  if (site.community_restrictions === 'some' || site.community_restrictions === 'significant') siteFlags.push(`${site.community_restrictions} community restrictions`);
  if (site.parking === 'limited' || site.parking === 'difficult') siteFlags.push(`${site.parking} parking`);
  if (site.loading_access === 'limited' || site.loading_access === 'difficult') siteFlags.push(`${site.loading_access} loading/removal access`);
  if (site.merchandise_volume === 'heavy') siteFlags.push('heavy merchandise volume');
  if (site.pickup_constraints === 'limited' || site.pickup_constraints === 'difficult') siteFlags.push(`${site.pickup_constraints} pickup constraints`);
  if (site.stairs_levels === 'multiple_flights') siteFlags.push('multiple flights of stairs');
  const distance = deal?.distance_miles ?? linkedSale?.distance_miles ?? null;
  return { cfWorst, flagged, distance, siteFlags };
}

// Conservative scenario: lower gross, extra hours, higher costs. ANALYSIS ONLY.
export function conservativeScenario(draftDeal, base, scenario) {
  const blendedRate = base.estHours > 0 ? base.estLaborCost / base.estHours : 25;
  const scenarioRate = toNum(scenario.extraRate) || blendedRate || 25;
  const hours = base.estHours + (Number(scenario.extraHours) || 0);
  const laborCost = base.estLaborCost + (Number(scenario.extraHours) || 0) * scenarioRate;
  const gross = base.estGross * (1 + (Number(scenario.grossPct) || 0) / 100);
  return projectedDealEconomics(
    { ...draftDeal, estimated_value: gross, min_company_revenue_threshold: null, min_contribution_threshold: null },
    {
      advertising: base.advertising + (Number(scenario.extraAdvertising) || 0),
      supplies: base.supplies + (Number(scenario.extraSupplies) || 0),
      other: base.other + (Number(scenario.extraOther) || 0),
      laborEstimates: [{ hours, rate: laborCost / (hours || 1) }],
    }
  );
}

// The deterministic Sale Acceptance Review. NO numeric score.
// Ratings: STRONG | ACCEPTABLE | MARGINAL | HIGH RISK | NEEDS INPUTS — always with
// written reasons citing actual canonical evidence. Advisory only: never decides.
export function acceptanceReview({ base, scenarioResult, overlap, advisory }) {
  const reasons = [];
  let rating;
  if (!base.estGross) {
    rating = 'NEEDS INPUTS';
    reasons.push('Enter projected gross merchandise sales to evaluate this opportunity.');
  } else if (scenarioResult.contribution < 0 ||
    (base.minRevenueThreshold != null && base.companyRevenue < base.minRevenueThreshold) ||
    (base.minContributionThreshold != null && base.contribution < base.minContributionThreshold)) {
    rating = 'HIGH RISK';
    if (scenarioResult.contribution < 0) reasons.push(`Conservative scenario projects a negative contribution (${money(scenarioResult.contribution)}).`);
    if (base.minRevenueThreshold != null && base.companyRevenue < base.minRevenueThreshold) reasons.push(`Projected company revenue ${money(base.companyRevenue)} is below your minimum revenue threshold ${money(base.minRevenueThreshold)}.`);
    if (base.minContributionThreshold != null && base.contribution < base.minContributionThreshold) reasons.push(`Projected contribution ${money(base.contribution)} is below your minimum contribution threshold ${money(base.minContributionThreshold)}.`);
  } else if ((base.minContributionThreshold != null && scenarioResult.contribution < base.minContributionThreshold) ||
    base.contribution > 0 && scenarioResult.contribution < base.contribution * 0.5 ||
    (overlap.count != null && overlap.count >= 2)) {
    rating = 'MARGINAL';
    if (base.minContributionThreshold != null && scenarioResult.contribution < base.minContributionThreshold) reasons.push(`Conservative contribution ${money(scenarioResult.contribution)} falls below your minimum contribution threshold.`);
    if (base.contribution > 0 && scenarioResult.contribution < base.contribution * 0.5) reasons.push('Conservative scenario removes more than half of the projected contribution.');
    if (overlap.count != null && overlap.count >= 2) reasons.push(`${overlap.count} other active deals overlap this sale window.`);
  } else if (base.contribution > 0 && scenarioResult.contribution >= base.contribution * 0.75) {
    rating = 'STRONG';
    reasons.push('Projection and the conservative scenario both hold up, and the calendar overlap is manageable.');
  } else {
    rating = 'ACCEPTABLE';
    reasons.push('The projection holds, but the conservative scenario erodes a meaningful share of it.');
  }
  if (overlap.count == null) reasons.push('Set the estimated sale dates on the Dates tab to include calendar overlap in this assessment.');
  if (advisory.flagged.length) {
    reasons.push(`Advisory — client fit ${advisory.cfWorst}: ${advisory.flagged.map(f => `${f.label}${f.level === 'concern' ? ' (concern)' : ''}`).join(', ')}.`);
  }
  if (advisory.distance != null) {
    reasons.push(`Advisory — distance from operating base: ${advisory.distance} miles (informational; no distance threshold configured).`);
  }
  if (advisory.siteFlags.length) {
    reasons.push(`Advisory — site complexity: ${advisory.siteFlags.join('; ')}.`);
  }
  return { rating, reasons };
}

// Chapter 12 P1 — consultation-evidence advisories. These NEVER change the
// deterministic rating above; they add explainable reasons so the operator sees
// what needs attention. A warning flag explains — it does not decide.
export function consultationAdvisory({ deal, authority, unresolvedResearchCount }) {
  const c = deal?.consultation || {};
  const reasons = [];
  const conds = (c.acceptance_conditions || []).filter(x => (x.status || 'open') !== 'resolved');
  if (conds.length) {
    reasons.push(`Advisory — ${conds.length} unresolved acceptance condition${conds.length > 1 ? 's' : ''}: ${conds.map(x => x.condition).filter(Boolean).join('; ')}.`);
  }
  const unresolved = (c.condition_observations || []).filter(x => !x.resolved);
  const prof = unresolved.filter(x => x.attention === 'requires_professional_review');
  if (prof.length) {
    reasons.push(`Advisory — ${prof.length} condition observation${prof.length > 1 ? 's' : ''} flagged REQUIRES PROFESSIONAL REVIEW (professional evaluation recommended before relying on that area; the system never certifies safety).`);
  } else if (unresolved.length) {
    reasons.push(`Advisory — ${unresolved.length} unresolved condition observation${unresolved.length > 1 ? 's' : ''} recorded. Review them before the agreement.`);
  }
  if (authority && !authority.is_active === false) {
    if (authority.verification_status === 'UNRESOLVED') {
      reasons.push(`Advisory — authority for ${authority.full_name} is UNRESOLVED. Verify it before presenting the agreement (operational classification, not a legal conclusion).`);
    } else if (authority.verification_status === 'DISPUTED') {
      reasons.push(`Advisory — authority for ${authority.full_name} is DISPUTED. Resolve it before presenting the agreement.`);
    }
  }
  if (Number(unresolvedResearchCount) > 0) {
    reasons.push(`Advisory — ${unresolvedResearchCount} inventoried item${unresolvedResearchCount > 1 ? 's' : ''} still need research before pricing.`);
  }
  const flagRooms = (c.rooms || []).filter(r => r.research_needed);
  if (flagRooms.length) {
    reasons.push(`Advisory — research indicated for merchandise in: ${flagRooms.map(r => r.name).filter(Boolean).join(', ')} (consultation observations — no inventory record yet).`);
  }
  return reasons;
}