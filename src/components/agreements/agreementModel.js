import { asArray } from '@/components/saleops/saleDecisionModel';
import { money } from '@/components/saleops/saleEconomicsModel';
import { OUTCOME_LABELS, ACTIONABLE_OUTCOMES } from './proposalModel';

// Chapter 9 P0/P1 — agreement + readiness model.
// THE AGREEMENT RECORDS WHAT EVERYONE ACCEPTED. A finalized agreement is a
// HISTORICAL SNAPSHOT, not a live-editable record. EstateSalen populates the
// operator's OWN template variables — it never authors legal language, never
// claims a template is attorney-approved unless the operator says so, and never
// validates signatures. Language is OPERATIONAL, never legal conclusions.

export const AGREEMENT_STATUS = {
  DRAFT: { label: 'DRAFT', tone: 'bg-slate-100 text-slate-600 border-slate-300' },
  READY: { label: 'READY TO SIGN', tone: 'bg-sky-100 text-sky-700 border-sky-300' },
  EXECUTED: { label: 'EXECUTED', tone: 'bg-green-100 text-green-700 border-green-300' },
  SUPERSEDED: { label: 'SUPERSEDED', tone: 'bg-slate-100 text-slate-500 border-slate-200' },
  VOIDED: { label: 'VOIDED', tone: 'bg-red-100 text-red-700 border-red-300' },
};

export const READINESS_STATUS = {
  COMPLETE: { label: 'COMPLETE', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NEEDS_REVIEW: { label: 'NEEDS REVIEW', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  NOT_APPLICABLE: { label: 'NOT APPLICABLE', tone: 'bg-slate-50 text-slate-500 border-slate-200' },
  UNKNOWN: { label: 'UNKNOWN', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
};

// ── Merge variables (explicit, operator-approved templates only) ─────────────
export const MERGE_FIELDS = [
  { token: '{{COMPANY_NAME}}', label: 'Company name' },
  { token: '{{SALE_TITLE}}', label: 'Sale title' },
  { token: '{{CLIENT_NAME}}', label: 'Client name' },
  { token: '{{PROPERTY_ADDRESS}}', label: 'Property address' },
  { token: '{{SALE_DATES}}', label: 'Sale dates' },
  { token: '{{COMMISSION_RATE}}', label: 'Commission rate' },
  { token: '{{MINIMUM_FEE}}', label: 'Minimum fee' },
  { token: '{{ESTIMATE_RANGE}}', label: 'Estimated sale range' },
  { token: '{{SCOPE_SUMMARY}}', label: 'Scope summary' },
  { token: '{{ADDITIONAL_SERVICES}}', label: 'Additional services' },
  { token: '{{EXCLUSIONS}}', label: 'Exclusions / boundaries' },
  { token: '{{DISCOUNT_APPROACH}}', label: 'Discount approach' },
  { token: '{{POST_SALE_PLAN}}', label: 'Post-sale plan' },
  { token: '{{ACCESS_RESPONSIBILITIES}}', label: 'Access responsibilities (codes are never merged)' },
  { token: '{{PAYMENT_EXPECTATIONS}}', label: 'Payment / reconciliation expectations' },
];

const dateRange = (dates) =>
  asArray(dates).map(d => d?.date).filter(Boolean).sort().join(', ');

// Build approved merge values from canonical structured truth. Sensitive access
// CODES are deliberately never merged — only responsibility-level facts.
export function buildMergeValues({ sale, deal, scope, acceptedProposal, companyName }) {
  const snap = acceptedProposal?.snapshot || {};
  const ad = sale?.site_assessment?.access_details || {};
  const psp = scope?.post_sale_plan || {};
  const items = asArray(scope?.scope_items);
  const included = items.filter(i => i.included).map(i => i.display_name).filter(Boolean);
  const optional = items.filter(i => !i.included && i.charge_policy === 'additional_when_authorized').map(i => i.display_name).filter(Boolean);
  const excluded = [scope?.excluded_work, ...items.filter(i => !i.included && i.charge_policy !== 'additional_when_authorized').map(i => i.display_name)].filter(Boolean);

  const accessResponsibilities = [
    ad.key_access_method ? `Access method / responsibility: ${ad.key_access_method}` : '',
    ad.access_windows ? `Access windows: ${ad.access_windows}` : '',
    ad.association_requirements ? `Association access requirements: ${ad.association_requirements}` : '',
    ad.contractors ? `Expected contractors: ${ad.contractors}` : '',
    ad.pets ? `Pets on site: ${ad.pets}` : '',
  ].filter(Boolean).join('. ');

  const values = {
    '{{COMPANY_NAME}}': companyName || sale?.operator_name || '',
    '{{SALE_TITLE}}': sale?.title || '',
    '{{CLIENT_NAME}}': deal?.client_name || snap.client?.name || '',
    '{{PROPERTY_ADDRESS}}': [sale?.property_address?.street, sale?.property_address?.city, sale?.property_address?.state, sale?.property_address?.zip].filter(Boolean).join(', ') || deal?.property_address || '',
    '{{SALE_DATES}}': dateRange(sale?.sale_dates),
    '{{COMMISSION_RATE}}': deal?.commission_rate != null ? `${deal.commission_rate}%` : '',
    '{{MINIMUM_FEE}}': deal?.minimum_fee != null ? money(deal.minimum_fee) : '',
    '{{ESTIMATE_RANGE}}': (() => {
      const r = snap.estimated_range || {};
      if (r.low && r.high) return `${money(r.low)} – ${money(r.high)} (estimate, not a guarantee)`;
      if (r.working_estimate) return `${money(r.working_estimate)} (estimate, not a guarantee)`;
      if (deal?.estimated_value_low && deal?.estimated_value_high) return `${money(deal.estimated_value_low)} – ${money(deal.estimated_value_high)} (estimate, not a guarantee)`;
      return '';
    })(),
    '{{SCOPE_SUMMARY}}': included.length ? `Included: ${included.join(', ')}${optional.length ? `. Optional / additional (only when authorized): ${optional.join(', ')}` : ''}` : '',
    '{{ADDITIONAL_SERVICES}}': optional.length ? optional.join(', ') : '',
    '{{EXCLUSIONS}}': excluded.length ? excluded.join('; ') : '',
    '{{DISCOUNT_APPROACH}}': scope?.discount_approach || '',
    '{{POST_SALE_PLAN}}': psp.default_outcome
      ? `${OUTCOME_LABELS[psp.default_outcome] || psp.default_outcome}${psp.notes ? ` — ${psp.notes}` : ''}${psp.authorized_by_name ? ` (authorized by ${psp.authorized_by_name}${psp.authorization_source ? `, ${psp.authorization_source}` : ''})` : ACTIONABLE_OUTCOMES.includes(psp.default_outcome) ? ' (AUTHORIZATION NOT YET DOCUMENTED — no post-sale action may be taken on silence alone)' : ''}`
      : '',
    '{{ACCESS_RESPONSIBILITIES}}': accessResponsibilities,
    '{{PAYMENT_EXPECTATIONS}}': (() => {
      const rate = deal?.commission_rate;
      const min = deal?.minimum_fee;
      if (rate == null && min == null) return '';
      const parts = [];
      if (rate != null) parts.push(`Commission of ${rate}% of gross merchandise sales`);
      if (min != null) parts.push(`contract minimum fee of ${money(min)} (the greater of commission or minimum applies)`);
      parts.push('client proceeds are reconciled and settled per the agreement after the sale concludes');
      return parts.join('; ') + '.';
    })(),
  };

  const missing = MERGE_FIELDS.filter(f => !String(values[f.token] || '').trim());
  return { values, missing };
}

// Merge into the operator's template TEXT. Unknown placeholder = MISSING VALUE
// (visible and flagged), never silently removed or fabricated.
export function mergeTemplate(templateText, values) {
  let body = String(templateText || '');
  const missing = [];
  MERGE_FIELDS.forEach(f => {
    const val = String(values[f.token] || '').trim();
    const has = body.includes(f.token);
    if (has && !val) missing.push(f.label);
    if (has) body = body.split(f.token).join(val || `\u2039MISSING VALUE: ${f.token}\u203a`);
  });
  return { body, missing };
}

// ── Deterministic AGREEMENT READINESS (no AI judgment) ───────────────────────
export function analyzeAgreementReadiness({ sale, deal, scope, authorities, openDecisions, items, proposals, agreements }) {
  const areas = [];
  const push = (id, label, status, detail, link, linkLabel) => areas.push({ id, label, status, detail, link, linkLabel });
  const saleLink = sale?.id ? `/ProposalAgreement?saleId=${sale.id}` : null;
  const authList = asArray(authorities).filter(a => a.is_active);
  const primary = authList.find(a => a.is_primary) || authList[0];

  // 1 — PROPOSAL ACCEPTED
  const accepted = asArray(proposals).find(p => p.status === 'ACCEPTED');
  if (accepted) {
    push('proposal', 'Accepted Proposal', 'COMPLETE',
      `Proposal v${accepted.version} accepted${accepted.accepted_at ? ` on ${new Date(accepted.accepted_at).toLocaleDateString()}` : ''}${accepted.accepted_by ? ` by ${accepted.accepted_by}` : ''}.`);
  } else if (asArray(proposals).length) {
    push('proposal', 'Accepted Proposal', 'NEEDS_REVIEW',
      `${asArray(proposals).length} proposal version(s) exist but none is marked ACCEPTED yet.`, saleLink, 'Open Proposal & Agreement');
  } else {
    push('proposal', 'Accepted Proposal', 'NEEDS_REVIEW',
      'No proposal recorded for this sale — UNKNOWN, not "no proposal needed". Build the proposal first.', saleLink, 'Build Proposal');
  }

  // 2 — AUTHORITY (operational classification only)
  if (!authList.length) {
    push('authority', 'Authorized Decision-Maker', 'NEEDS_REVIEW',
      'No authorized decision-maker recorded — AUTHORITY NEEDS REVIEW. This is an operational warning, not a legal conclusion.', `/SaleClientDecisions?saleId=${sale?.id}`, 'Record Authority');
  } else if (!primary?.verification_status || primary.verification_status === 'UNRESOLVED') {
    push('authority', 'Authorized Decision-Maker', 'NEEDS_REVIEW',
      `AUTHORITY NEEDS REVIEW — operator classification for ${primary.full_name} is UNRESOLVED. Mark it verified when the basis is established.`, `/SaleClientDecisions?saleId=${sale?.id}`, 'Review Authority');
  } else if (primary.verification_status === 'DISPUTED') {
    push('authority', 'Authorized Decision-Maker', 'NEEDS_REVIEW',
      `AUTHORITY NEEDS REVIEW — operator classification for ${primary.full_name} is DISPUTED. Resolve before presenting the agreement (operational, not a legal conclusion).`, `/SaleClientDecisions?saleId=${sale?.id}`, 'Review Authority');
  } else {
    push('authority', 'Authorized Decision-Maker', 'COMPLETE',
      `${primary.full_name}${primary.authority_role ? ` (${primary.authority_role})` : ''} — VERIFIED by the operator${primary.source ? `; basis: ${primary.source}` : ''}.`);
  }

  // 3 — SCOPE
  if (scope) {
    const includedCount = asArray(scope.scope_items).filter(s => s.included).length;
    push('scope', 'Agreed Scope', 'COMPLETE', `Agreed scope on file (version ${scope.version || 1}; ${includedCount} included service${includedCount === 1 ? '' : 's'}).`);
  } else {
    push('scope', 'Agreed Scope', 'NEEDS_REVIEW', 'No agreed-scope record — UNKNOWN, not "no scope".', `/SaleClientDecisions?saleId=${sale?.id}`, 'Record Scope');
  }

  // 4 — COMMERCIAL TERMS
  if (deal && (deal.commission_rate != null || deal.minimum_fee != null)) {
    if (deal.commercial_terms_accepted_at) {
      push('commercial_terms', 'Commercial Terms', 'COMPLETE',
        `Accepted ${new Date(deal.commercial_terms_accepted_at).toLocaleDateString()}${deal.commercial_terms_accepted_by ? ` by ${deal.commercial_terms_accepted_by}` : ''} — the accepted snapshot is preserved on the deal.`);
    } else {
      push('commercial_terms', 'Commercial Terms', 'NEEDS_REVIEW',
        'Terms are recorded but NOT marked accepted — projected terms are not accepted terms.', saleLink, 'Open Proposal & Agreement');
    }
  } else {
    push('commercial_terms', 'Commercial Terms', 'NEEDS_REVIEW', 'No commission/minimum recorded on the deal — UNKNOWN.', `/SaleConversionPipeline?saleId=${sale?.id}`, 'Open Deal Economics');
  }

  // 5 — ESTIMATE / RANGE
  const hasRange = (deal?.estimated_value_low && deal?.estimated_value_high) || Number(deal?.estimated_value) > 0;
  if (hasRange) {
    const range = deal?.estimated_value_low && deal?.estimated_value_high
      ? `${money(deal.estimated_value_low)} – ${money(deal.estimated_value_high)}`
      : `${money(deal.estimated_value)} (working estimate)`;
    push('estimate', 'Estimated Sale Range', 'COMPLETE', `${range} — an estimate for planning, not a guarantee.`);
  } else {
    push('estimate', 'Estimated Sale Range', 'NEEDS_REVIEW', 'No estimated sale value recorded — UNKNOWN, not zero.', `/SaleConversionPipeline?saleId=${sale?.id}`, 'Open Deal Economics');
  }

  // 6 — SALE DATES
  if (asArray(sale?.sale_dates).length) {
    push('sale_dates', 'Sale Dates', 'COMPLETE', `Sale dates on file: ${dateRange(sale.sale_dates)}.`);
  } else {
    push('sale_dates', 'Sale Dates', 'NEEDS_REVIEW', 'No sale dates scheduled yet — the agreement cannot describe the sale window.', `/SaleEditor?saleId=${sale?.id}`, 'Open Sale Editor');
  }

  // 7 — PROPERTY ACCESS RESPONSIBILITIES
  const ad = sale?.site_assessment?.access_details || {};
  const adAny = Object.values(ad).some(v => String(v || '').trim());
  if (adAny) {
    push('access', 'Property Access', 'COMPLETE', 'Access plan recorded (private). Only responsibility-level facts merge into the agreement — codes and key locations never do.');
  } else {
    push('access', 'Property Access', 'NEEDS_REVIEW', 'Access plan not recorded — NOT REVIEWED, not "no access issues". Record who provides access and when.', `/SaleEditor?saleId=${sale?.id}`, 'Open Site Assessment');
  }

  // 8 — EXCLUSIONS / KEEP-SELL-REVIEW
  const reviewOpen = asArray(openDecisions).filter(d => d.decision_type === 'merchandise' && d.current_decision === 'review');
  if (!items) {
    push('exclusions', 'Exclusions / Keep-Sell-Review', 'NOT_APPLICABLE', 'No merchandise recorded for this sale yet.');
  } else if (reviewOpen.length) {
    push('exclusions', 'Exclusions / Keep-Sell-Review', 'NEEDS_REVIEW', `${reviewOpen.length} item(s) still awaiting a KEEP / SELL / REVIEW client decision.`, `/SaleClientDecisions?saleId=${sale?.id}`, 'Open Client Decisions');
  } else {
    push('exclusions', 'Exclusions / Keep-Sell-Review', 'COMPLETE', 'No unresolved KEEP / SELL / REVIEW decisions. Recorded exclusions appear in the scope.');
  }

  // 9 — DISCOUNT APPROACH
  if (scope?.discount_approach) {
    push('discount', 'Discount Approach', 'COMPLETE', 'Discount approach recorded on the agreed scope.');
  } else {
    push('discount', 'Discount Approach', 'NEEDS_REVIEW', 'No discount approach recorded — UNKNOWN, not "no discounts". Record what was discussed.', `/SaleClientDecisions?saleId=${sale?.id}`, 'Record Discount Approach');
  }

  // 10 — POST-SALE PLAN
  const psp = scope?.post_sale_plan || {};
  if (!psp.default_outcome) {
    push('post_sale', 'Post-Sale Plan', 'NEEDS_REVIEW', 'No plan recorded for remaining merchandise — UNKNOWN, not "client keeps everything".', saleLink, 'Open Proposal & Agreement');
  } else if (psp.default_outcome === 'DECISION_REQUIRED') {
    push('post_sale', 'Post-Sale Plan', 'NEEDS_REVIEW', 'A client decision on remaining merchandise is still required — silence is not a decision.', saleLink, 'Open Proposal & Agreement');
  } else if (ACTIONABLE_OUTCOMES.includes(psp.default_outcome) && !psp.authorized_by_name) {
    push('post_sale', 'Post-Sale Plan', 'NEEDS_REVIEW', `Plan recorded (${OUTCOME_LABELS[psp.default_outcome] || psp.default_outcome}) but NO AUTHORIZATION documented — no post-sale action may be inferred from silence.`, saleLink, 'Open Proposal & Agreement');
  } else {
    push('post_sale', 'Post-Sale Plan', 'COMPLETE',
      `${OUTCOME_LABELS[psp.default_outcome] || psp.default_outcome}${psp.authorized_by_name ? ` — authorized by ${psp.authorized_by_name}` : ''}.`);
  }

  // 11 — OPEN REQUIRED CLIENT DECISIONS
  const openCount = asArray(openDecisions).length;
  if (openCount > 0) {
    push('open_decisions', 'Open Client Decisions', 'NEEDS_REVIEW', `${openCount} open client decision(s) awaiting an instruction before presenting the agreement.`, `/SaleClientDecisions?saleId=${sale?.id}`, 'Open Client Decisions');
  } else {
    push('open_decisions', 'Open Client Decisions', 'COMPLETE', 'No open client decisions.');
  }

  const counts = {
    complete: areas.filter(a => a.status === 'COMPLETE').length,
    review: areas.filter(a => a.status === 'NEEDS_REVIEW').length,
    na: areas.filter(a => a.status === 'NOT_APPLICABLE').length,
    unknown: areas.filter(a => a.status === 'UNKNOWN').length,
    total: areas.length,
  };
  const headline = counts.review === 0
    ? 'OPERATIONAL INFORMATION COMPLETE'
    : 'ITEMS STILL NEED REVIEW BEFORE PRESENTING THE AGREEMENT';
  return { areas, counts, headline };
}

// ── Post-sale authorization warning (deterministic; used by closeout) ────────
// NO POST-SALE ACTION SHOULD BE INFERRED FROM SILENCE.
export function postSaleAuthorizationWarning(scope, { donations = [], cleanouts = [] } = {}) {
  const psp = scope?.post_sale_plan || {};
  const actionable = ACTIONABLE_OUTCOMES.includes(psp.default_outcome);
  if (actionable && !psp.authorized_by_name) {
    return `POST-SALE AUTHORIZATION: the recorded plan (${OUTCOME_LABELS[psp.default_outcome] || psp.default_outcome}) has no documented client authorization — no post-sale action may be taken on silence alone.`;
  }
  if ((donations.length || cleanouts.length) && !psp.authorized_by_name && !actionable) {
    return `POST-SALE AUTHORIZATION: donation/cleanout activity is recorded on this sale without a documented disposition authorization.`;
  }
  return null;
}