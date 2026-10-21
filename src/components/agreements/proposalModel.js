import { asArray } from '@/components/saleops/saleDecisionModel';
import { money } from '@/components/saleops/saleEconomicsModel';

// Chapter 9 P1 — proposal model.
// THE PROPOSAL EXPLAINS WHAT YOU RECOMMEND. It is a time-stamped SNAPSHOT of
// canonical truth: it is NOT current operational truth (records may change after
// finalization without rewriting it), NOT the agreement, NOT settlement.
// Unknown fields remain unresolved — never fabricated.

export const PROPOSAL_STATUS = {
  DRAFT: { label: 'DRAFT', tone: 'bg-slate-100 text-slate-600 border-slate-300' },
  FINALIZED: { label: 'FINALIZED', tone: 'bg-sky-100 text-sky-700 border-sky-300' },
  ACCEPTED: { label: 'ACCEPTED', tone: 'bg-green-100 text-green-700 border-green-300' },
  DECLINED: { label: 'DECLINED', tone: 'bg-red-100 text-red-700 border-red-300' },
  SUPERSEDED: { label: 'SUPERSEDED', tone: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const OUTCOME_LABELS = {
  CLIENT_RETAINS: 'Client retains remaining merchandise',
  DONATE: 'Donation of remaining merchandise',
  CLEANOUT: 'Cleanout of remaining merchandise',
  BUYOUT: 'Buyout of remaining merchandise',
  SPECIALIST: 'Specialist handling of specific merchandise',
  OTHER_SELLING_METHOD: 'Other selling method',
  DECISION_REQUIRED: 'Client decision still required',
};

export const ACTIONABLE_OUTCOMES = ['DONATE', 'CLEANOUT', 'BUYOUT', 'SPECIALIST', 'OTHER_SELLING_METHOD'];

export const ESTIMATE_NOTE =
  'Merchandise sale proceeds are an ESTIMATE for planning — not a guarantee. Results depend on what sells, market response, and the agreed strategy.';

export const nextProposalVersion = (proposals) =>
  asArray(proposals).reduce((max, p) => Math.max(max, Number(p.version) || 0), 0) + 1;

export const rangeText = (deal) => {
  const low = Number(deal?.estimated_value_low) || null;
  const high = Number(deal?.estimated_value_high) || null;
  if (low && high) return `${money(low)} – ${money(high)}`;
  if (low || high) return `${money(low || high)} (single figure recorded)`;
  if (Number(deal?.estimated_value)) return `${money(deal.estimated_value)} (working estimate)`;
  return null;
};

// ── Build a snapshot from canonical records ONLY (nothing retyped) ───────────
export function buildProposalSnapshot({ sale, deal, scope }) {
  const items = asArray(scope?.scope_items);
  const included = items.filter(i => i.included);
  const optional = items.filter(i => !i.included && i.charge_policy === 'additional_when_authorized');
  const excluded = items.filter(i => !i.included && i.charge_policy !== 'additional_when_authorized');
  const sa = sale?.site_assessment || {};

  return {
    overview: '',
    client: {
      name: deal?.client_name || '',
      email: deal?.client_email || '',
      phone: deal?.client_phone || '',
    },
    property: {
      street: sale?.property_address?.street || deal?.property_address || '',
      city: sale?.property_address?.city || deal?.property_city || '',
      state: sale?.property_address?.state || deal?.property_state || '',
      zip: sale?.property_address?.zip || '',
    },
    recommended_services: included.map(i => ({ name: i.display_name || '', description: i.notes || '' })),
    scope_summary: {
      included: included.map(i => i.display_name || '').filter(Boolean),
      excluded: [...excluded.map(i => i.display_name || '').filter(Boolean), scope?.excluded_work || ''].filter(Boolean),
      optional: optional.map(i => i.display_name || '').filter(Boolean),
    },
    sale_dates: asArray(sale?.sale_dates),
    estimated_range: {
      low: deal?.estimated_value_low ?? null,
      high: deal?.estimated_value_high ?? null,
      working_estimate: deal?.estimated_value ?? null,
    },
    compensation: {
      commission_rate: deal?.commission_rate ?? null,
      minimum_fee: deal?.minimum_fee ?? null,
    },
    additional_services: optional.map(i => ({
      name: i.display_name || '',
      description: i.notes || '',
      charge_policy: 'Performed and charged only when you authorize it',
    })),
    sale_strategy: '',
    discount_approach: scope?.discount_approach || '',
    post_sale_plan: {
      default_outcome: scope?.post_sale_plan?.default_outcome || '',
      notes: scope?.post_sale_plan?.notes || '',
      authorized_by_name: scope?.post_sale_plan?.authorized_by_name || '',
    },
    property_considerations: [
      sa.merchandise_volume && sa.merchandise_volume !== 'unknown' ? `${sa.merchandise_volume} merchandise volume` : '',
      sa.stairs_levels && sa.stairs_levels !== 'unknown' ? `stairs: ${String(sa.stairs_levels).replace('_', ' ')}` : '',
      sa.loading_access && sa.loading_access !== 'unknown' ? `removal access: ${sa.loading_access}` : '',
      sa.community_restrictions && sa.community_restrictions !== 'unknown' ? `${sa.community_restrictions} community restrictions` : '',
    ].filter(Boolean).join('; '),
    next_steps: '',
    estimate_note: ESTIMATE_NOTE,
  };
}

// Labels for facts a finalized proposal still has unresolved (UNKNOWN stays visible).
export function unresolvedFacts(snapshot) {
  const s = snapshot || {};
  const out = [];
  if (!s.client?.name) out.push('Client name');
  if (!s.property?.city && !s.property?.street) out.push('Property address');
  if (!asArray(s.sale_dates).length) out.push('Sale dates');
  if (!s.compensation?.commission_rate && !s.compensation?.minimum_fee) out.push('Compensation terms');
  if (!s.estimated_range?.low && !s.estimated_range?.high && !s.estimated_range?.working_estimate) out.push('Estimated sale range');
  if (!s.scope_summary?.included?.length) out.push('Included services');
  if (!s.discount_approach) out.push('Discount approach');
  if (!s.post_sale_plan?.default_outcome) out.push('Post-sale plan');
  return out;
}