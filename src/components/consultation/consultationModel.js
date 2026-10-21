// Chapter 12 P1 — Consultation Mode ORCHESTRATION model.
// Consultation Mode orchestrates canonical systems; it NEVER becomes a second
// source of truth. Economics = saleEconomicsModel; authority = SaleAuthority;
// fit = deal.client_fit; research = Item.research_status; labor = deal.labor_estimates;
// recommendation = the OPERATOR'S human choice. UNKNOWN IS DATA: unknown is never
// zero, never CLEAR, never VERIFIED. OBSERVATION IS NOT VERIFIED FACT.
import { projectedDealEconomics, money } from '@/components/saleops/saleEconomicsModel';

export const CONSULTATION_SECTIONS = [
  { key: 'before', label: 'Before You Arrive', num: 1 },
  { key: 'client', label: 'Client & Authority', num: 2 },
  { key: 'property', label: 'Property', num: 3 },
  { key: 'rooms', label: 'Room-by-Room', num: 4 },
  { key: 'prep', label: 'Preparation & Access', num: 5 },
  { key: 'goals', label: 'Goals & Expectations', num: 6 },
  { key: 'research', label: 'Research & Handling', num: 7 },
  { key: 'labor', label: 'Labor & Capacity', num: 8 },
  { key: 'economics', label: 'Projected Economics', num: 9 },
  { key: 'risks', label: 'Risks & Unknowns', num: 10 },
  { key: 'acceptance', label: 'Acceptance Review', num: 11 },
  { key: 'recommendation', label: 'Recommendation', num: 12 },
  { key: 'summary', label: 'Summary', num: 13 },
  { key: 'handoff', label: 'Proposal Handoff', num: 14 },
];

export const CLIENT_GOAL_OPTIONS = [
  { value: 'maximize_proceeds', label: 'Maximize proceeds' },
  { value: 'speed', label: 'Speed' },
  { value: 'empty_property', label: 'Empty the property' },
  { value: 'minimal_client_involvement', label: 'Minimal client involvement' },
  { value: 'specialized_handling', label: 'Specialized handling' },
  { value: 'other', label: 'Other' },
];

export const DEADLINE_TYPES = [
  { value: 'property_closing', label: 'Property closing' },
  { value: 'movers', label: 'Movers' },
  { value: 'travel', label: 'Travel' },
  { value: 'lease_expiration', label: 'Lease expiration' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'property_turnover', label: 'Property turnover' },
  { value: 'court_probate', label: 'Court / probate' },
  { value: 'other', label: 'Other' },
];

export const CONDITION_CATEGORIES = [
  { value: 'dirt_heavy_cleaning', label: 'Dirt / heavy cleaning' },
  { value: 'damage', label: 'Damage' },
  { value: 'smoke_odor', label: 'Smoke / odor' },
  { value: 'pests', label: 'Pests' },
  { value: 'moisture_concern', label: 'Moisture concern' },
  { value: 'possible_mold_concern', label: 'Possible mold concern' },
  { value: 'missing_parts', label: 'Missing parts' },
  { value: 'trip_access_concern', label: 'Trip / access concern' },
  { value: 'structural_property_concern', label: 'Structural / property concern' },
  { value: 'other', label: 'Other' },
];

export const ATTENTION_LEVELS = [
  { value: 'watch', label: 'WATCH' },
  { value: 'concern', label: 'CONCERN' },
  { value: 'requires_professional_review', label: 'PROFESSIONAL REVIEW RECOMMENDED' },
];

export const PREPARATION_WORK_OPTIONS = [
  { value: 'sorting', label: 'Sorting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'staging', label: 'Staging' },
  { value: 'research', label: 'Research' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'furniture_movement', label: 'Furniture movement' },
  { value: 'trash', label: 'Trash removal' },
  { value: 'personal_papers', label: 'Personal papers' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'packed_storage', label: 'Packed storage' },
  { value: 'display_setup', label: 'Display setup' },
  { value: 'other', label: 'Other' },
];

export const RECOMMENDATION_OPTIONS = [
  { value: 'strong_candidate', label: 'Strong Candidate', tone: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'conditional_candidate', label: 'Conditional Candidate', tone: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'research_required', label: 'Research Required', tone: 'bg-sky-100 text-sky-700 border-sky-300' },
  { value: 'alternative_solution', label: 'Alternative Solution', tone: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'decline', label: 'Decline', tone: 'bg-red-100 text-red-700 border-red-300' },
];

export const ALTERNATIVE_TYPES = [
  { value: 'donation', label: 'Donation' },
  { value: 'cleanout', label: 'Cleanout' },
  { value: 'buyout', label: 'Buyout' },
  { value: 'auction', label: 'Auction' },
  { value: 'consignment', label: 'Consignment' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'real_estate_houszu', label: 'Real estate / Houszu' },
  { value: 'other', label: 'Other' },
];

export const OCCUPANCY_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'partially_occupied', label: 'Partially occupied' },
  { value: 'unknown', label: 'Unknown' },
];

export const PREP_LEVELS = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'unknown', label: 'Unknown' },
];

export const CONDITION_LABEL = (value) => CONDITION_CATEGORIES.find(c => c.value === value)?.label || value;
export const GOAL_LABEL = (value) => CLIENT_GOAL_OPTIONS.find(g => g.value === value)?.label || value;
export const DEADLINE_LABEL = (value) => DEADLINE_TYPES.find(d => d.value === value)?.label || value;
export const ALTERNATIVE_LABEL = (value) => ALTERNATIVE_TYPES.find(a => a.value === value)?.label || value;
export const RECOMMENDATION_LABEL = (value) => RECOMMENDATION_OPTIONS.find(r => r.value === value)?.label || value;
export const RECOMMENDATION_TONE = (value) => RECOMMENDATION_OPTIONS.find(r => r.value === value)?.tone || 'bg-slate-100 text-slate-600 border-slate-300';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ── Consultation lifecycle (P1-1) ────────────────────────────────────────────
export function consultationState(deal) {
  const c = deal?.consultation;
  if (!c || (!c.started_at && !hasAnyCapture(c))) return { status: 'not_started', action: 'START CONSULTATION' };
  if (c.completed_at) return { status: 'completed', action: 'REVIEW CONSULTATION' };
  return { status: 'in_progress', action: 'CONTINUE CONSULTATION' };
}

export function hasAnyCapture(c) {
  return !!(c && (
    (c.rooms || []).length ||
    (c.condition_observations || []).length ||
    (c.external_deadlines || []).length ||
    (c.client_goals || []).length ||
    (c.acceptance_conditions || []).length ||
    (c.photos || []).length ||
    c.recommendation?.classification ||
    Object.keys(c.questionnaire || {}).some(k => c.questionnaire[k]) ||
    Object.values(c.client_expectations || {}).some(Boolean) ||
    (c.preparation_work || []).length
  ));
}

// ── Timeline visibility (P1-7) — deterministic date math, no scheduling engine ─
export function timelineFlags(deal) {
  const c = deal?.consultation || {};
  const deadlines = (c.external_deadlines || []).filter(d => d.date);
  const saleStart = deal?.estimated_sale_start_date;
  const saleEnd = deal?.estimated_sale_end_date || saleStart;
  const today = new Date();
  const out = [];
  for (const d of deadlines) {
    const dt = new Date(d.date + 'T00:00:00');
    const days = Math.ceil((dt - today) / 86400000);
    let level = 'ok';
    let text = `${DEADLINE_LABEL(d.type)} ${d.date}${d.is_estimated ? ' (estimated)' : ''}${days >= 0 ? ` — ${days} day${days === 1 ? '' : 's'} away` : ' — date has passed'}${d.note ? `: ${d.note}` : ''}`;
    if (saleStart) {
      if (dt < new Date(saleStart + 'T00:00:00')) {
        level = 'conflict';
        text = `CONFLICT — property must be cleared by ${d.date} (${DEADLINE_LABEL(d.type)}), but the proposed sale starts ${saleStart}. The clearance deadline comes BEFORE the sale.`;
      } else if (saleEnd && dt < new Date(saleEnd + 'T00:00:00')) {
        level = 'needs_review';
        text = `NEEDS REVIEW — ${DEADLINE_LABEL(d.type)} deadline ${d.date} falls during the proposed sale window (${saleStart}${saleEnd !== saleStart ? ` – ${saleEnd}` : ''}). Confirm the sale can finish before the deadline.`;
      }
    }
    out.push({ level, text });
  }
  if (!deadlines.length) out.push({ level: 'unknown', text: 'No external deadlines recorded. ASK AT CONSULTATION — a clearance or closing date changes what is possible.' });
  if (!saleStart) out.push({ level: 'unknown', text: 'No estimated sale dates on the deal. Timeline visibility is UNKNOWN until dates or deadlines exist.' });
  return out;
}

// ── Risk / unknown summary (P1-27) — deterministic from canonical records ────
// KNOWN / CLEAR · NEEDS REVIEW · UNRESOLVED · UNKNOWN — no AI, no fake percentage.
export function riskUnknownSummary({ deal, linkedSale, authority, unresolvedResearchItems }) {
  const c = deal?.consultation || {};
  const items = [];

  // AUTHORITY
  if (authority && authority.is_active !== false) {
    if (authority.verification_status === 'VERIFIED') {
      items.push({ area: 'AUTHORITY', level: 'clear', text: `${authority.full_name} — VERIFIED by the operator${authority.source ? `; basis: ${authority.source}` : ''}.` });
    } else if (authority.verification_status === 'DISPUTED') {
      items.push({ area: 'AUTHORITY', level: 'needs_review', text: `${authority.full_name} — DISPUTED. Resolve before presenting the agreement.` });
    } else {
      items.push({ area: 'AUTHORITY', level: 'needs_review', text: `${authority.full_name} — UNRESOLVED. Mark verified when the basis is established.` });
    }
  } else {
    items.push({ area: 'AUTHORITY', level: 'unknown', text: 'No authority record yet (no linked sale, or none added). ASK AT CONSULTATION who can give instructions.' });
  }

  // TIMELINE
  const tl = timelineFlags(deal);
  if (tl.some(f => f.level === 'conflict')) {
    items.push({ area: 'TIMELINE', level: 'needs_review', text: 'A clearance/closing deadline conflicts with the proposed sale dates — see Timeline.' });
  } else if (tl.every(f => f.level === 'ok')) {
    items.push({ area: 'TIMELINE', level: 'clear', text: 'Recorded deadlines do not conflict with the proposed sale dates.' });
  } else {
    items.push({ area: 'TIMELINE', level: 'unknown', text: 'Deadline vs. sale dates not fully known — see Timeline.' });
  }

  // LABOR
  const laborRows = (deal?.labor_estimates || []).filter(l => Number(l.hours) > 0);
  if (laborRows.length) {
    const hrs = laborRows.reduce((s, l) => s + Number(l.hours), 0);
    items.push({ area: 'LABOR', level: 'clear', text: `${hrs} projected hours across ${laborRows.length} categor${laborRows.length === 1 ? 'y' : 'ies'} (owner time reported separately).` });
  } else {
    items.push({ area: 'LABOR', level: 'unknown', text: 'No projected labor hours yet. The estimate is UNKNOWN — not zero.' });
  }

  // ACCESS
  const site = linkedSale?.site_assessment || {};
  const knownSite = ['stairs_levels', 'elevator', 'parking', 'gated_access', 'loading_access', 'pickup_constraints'].filter(k => site[k] && site[k] !== 'unknown');
  if (knownSite.length >= 4) {
    items.push({ area: 'ACCESS', level: 'clear', text: `Site assessed: ${knownSite.map(k => k.replace(/_/g, ' ')).join(', ')} recorded.` });
  } else if (knownSite.length) {
    items.push({ area: 'ACCESS', level: 'needs_review', text: `Site assessment partially known (${knownSite.join(', ')}). Complete the site assessment on the sale.` });
  } else {
    items.push({ area: 'ACCESS', level: 'unknown', text: 'Site/access assessment not recorded (or no linked sale). ASSESS during the walkthrough.' });
  }

  // SAFETY / CONDITION
  const observations = c.condition_observations || [];
  const unresolved = observations.filter(o => !o.resolved);
  if (unresolved.some(o => o.attention === 'requires_professional_review')) {
    items.push({ area: 'SAFETY / CONDITION', level: 'needs_review', text: `${unresolved.length} unresolved observation${unresolved.length === 1 ? '' : 's'}; PROFESSIONAL REVIEW RECOMMENDED on at least one. The system never certifies safety.` });
  } else if (unresolved.length) {
    items.push({ area: 'SAFETY / CONDITION', level: 'needs_review', text: `${unresolved.length} unresolved condition observation${unresolved.length === 1 ? '' : 's'}.` });
  } else if (observations.length) {
    items.push({ area: 'SAFETY / CONDITION', level: 'clear', text: 'All recorded condition observations reviewed/resolved (operational review — never a safety certification).' });
  } else {
    items.push({ area: 'SAFETY / CONDITION', level: 'unknown', text: 'No condition observations recorded yet. UNKNOWN is not "no problem" — observe during the walkthrough.' });
  }

  // CLIENT FIT
  const cf = deal?.client_fit || {};
  const dims = Object.keys(cf).filter(k => cf[k] && cf[k] !== 'unknown');
  const hasConcern = Object.values(cf).includes('concern');
  if (hasConcern) {
    items.push({ area: 'CLIENT FIT', level: 'needs_review', text: 'At least one client-fit dimension is rated CONCERN. Review on the Client Fit tab.' });
  } else if (dims.length) {
    items.push({ area: 'CLIENT FIT', level: 'clear', text: `Client fit assessed (${dims.length} dimensions rated).` });
  } else {
    items.push({ area: 'CLIENT FIT', level: 'unknown', text: 'Client fit not assessed yet (all dimensions unknown).' });
  }

  // EXPECTATIONS
  const exp = c.client_expectations || {};
  const expKnown = Object.values(exp).some(Boolean);
  items.push({
    area: 'EXPECTATIONS',
    level: expKnown ? 'clear' : 'unknown',
    text: expKnown
      ? 'Client expectations recorded (what the CLIENT said — never verified truth).'
      : 'Client expectations not recorded. ASK what they expect about value, timing, and responsibilities.',
  });

  // RESEARCH
  const flaggedRooms = (c.rooms || []).filter(r => r.research_needed);
  const invCount = Number(unresolvedResearchItems) || 0;
  if (invCount > 0) {
    items.push({ area: 'RESEARCH', level: 'needs_review', text: `${invCount} inventoried item${invCount === 1 ? '' : 's'} flagged for research.` });
  } else if (flaggedRooms.length) {
    items.push({ area: 'RESEARCH', level: 'needs_review', text: `Research indicated in: ${flaggedRooms.map(r => r.name).join(', ')} (consultation observations — no inventory record yet).` });
  } else if (linkedSale) {
    items.push({ area: 'RESEARCH', level: 'clear', text: 'No open research flags on inventoried items.' });
  } else {
    items.push({ area: 'RESEARCH', level: 'unknown', text: 'Research needs UNKNOWN — no inventory yet. Flag unfamiliar or possibly important merchandise during the walkthrough.' });
  }

  // ECONOMICS
  if (Number(deal?.estimated_value) || Number(deal?.estimated_value_low) || Number(deal?.estimated_value_high)) {
    const range = Number(deal.estimated_value_low) && Number(deal.estimated_value_high)
      ? `${money(deal.estimated_value_low)} – ${money(deal.estimated_value_high)}`
      : `${money(Number(deal.estimated_value))} (working estimate)`;
    items.push({ area: 'ECONOMICS', level: 'clear', text: `Estimated sale range recorded: ${range}. An estimate is a planning tool, not a promise.` });
  } else {
    items.push({ area: 'ECONOMICS', level: 'unknown', text: 'No estimated sale value recorded. UNKNOWN — never zero.' });
  }

  // CAPACITY VISIBILITY — information only, never a conclusion
  items.push({
    area: 'CAPACITY VISIBILITY',
    level: 'info',
    text: 'See Labor & Capacity for calendar overlap, other active sales, and projected hours. This is capacity VISIBILITY — the system does not conclude "you have capacity."',
  });

  return items;
}

export const RISK_LEVELS = {
  clear: { label: 'KNOWN / CLEAR', tone: 'bg-green-100 text-green-700 border-green-300' },
  needs_review: { label: 'NEEDS REVIEW', tone: 'bg-red-100 text-red-700 border-red-300' },
  unknown: { label: 'UNKNOWN', tone: 'bg-slate-100 text-slate-600 border-slate-300' },
  info: { label: 'VISIBILITY', tone: 'bg-sky-100 text-sky-700 border-sky-300' },
};

// ── Recommendation validation (P1-31..36) ────────────────────────────────────
// The operator's HUMAN choice. The deterministic review never writes it.
export function recommendationIssue(classification, consultation) {
  const c = consultation || {};
  if (classification === 'conditional_candidate') {
    const open = (c.acceptance_conditions || []).filter(x => (x.status || 'open') !== 'resolved');
    if (!open.length) return 'A conditional recommendation needs at least one OPEN acceptance condition (or create one now) — the project works IF something specific happens.';
  }
  if (classification === 'alternative_solution' && !c.recommendation?.alternative_type) {
    return 'Choose the alternative service (cleanout, donation, buyout, specialist…).';
  }
  if (classification === 'decline' && !c.recommendation?.decline_reason) {
    return 'Record a brief decline reason in your own words.';
  }
  return null;
}

// ── Internal consultation summary (P1-37) — ASSEMBLED, never a duplicate store ─
export function buildInternalSummary({ deal, linkedSale, authority, review, riskItems }) {
  const c = deal?.consultation || {};
  return {
    client: {
      name: deal?.client_name,
      email: deal?.client_email,
      phone: deal?.client_phone,
      contactId: deal?.client_contact_id,
    },
    property: {
      address: [deal?.property_address, deal?.property_city, deal?.property_state].filter(Boolean).join(', '),
      linkedSale: linkedSale ? { id: linkedSale.id, title: linkedSale.title, status: linkedSale.status } : null,
    },
    reason: deal?.situation,
    timeline: {
      consultationDate: deal?.consultation_date,
      saleStart: deal?.estimated_sale_start_date,
      saleEnd: deal?.estimated_sale_end_date,
      deadlines: c.external_deadlines || [],
      flags: timelineFlags(deal),
    },
    goals: { goals: c.client_goals || [], notes: c.client_goals_notes || '' },
    authority: authority ? {
      name: authority.full_name, role: authority.authority_role,
      status: authority.verification_status, active: authority.is_active,
    } : null,
    rooms: c.rooms || [],
    conditions: c.condition_observations || [],
    preparation: { work: c.preparation_work || [], notes: c.preparation_notes || '' },
    expectations: c.client_expectations || {},
    researchRooms: (c.rooms || []).filter(r => r.research_needed),
    recommendation: c.recommendation || {},
    acceptanceConditions: c.acceptance_conditions || [],
    acceptanceReview: review ? { rating: review.rating, reasons: review.reasons } : null,
    riskItems: riskItems || [],
  };
}

// ── Client-facing recommendation (P1-38) — assembled from approved findings; ─
// NEVER includes private client-fit notes, internal profitability, private
// observations, or condition details beyond what the operator chooses to state.
export function clientRecommendationDraft(deal) {
  const c = deal?.consultation || {};
  const rec = c.recommendation || {};
  const open = (c.acceptance_conditions || []).filter(x => (x.status || 'open') !== 'resolved');
  const base = `Dear ${deal?.client_name || '[Client]'},\n\nThank you for the opportunity to visit the property and discuss your situation.`;
  const closing = `\n\nPlease don't hesitate to reach out with any questions.\n\nSincerely,\n[Your company]`;
  switch (rec.classification) {
    case 'strong_candidate':
      return {
        headline: 'ESTATE SALE RECOMMENDED',
        text: `${base}\n\nBased on our consultation, we believe a professionally managed estate sale is a good fit for this property. We would be glad to prepare a proposal with the services, timeline, and terms we discussed.${open.length ? `\n\nThis recommendation depends on the following: ${open.map(x => x.condition).join('; ')}.` : ''}${rec.note ? `\n\n${rec.note}` : ''}${closing}`,
      };
    case 'conditional_candidate':
      return {
        headline: 'ESTATE SALE RECOMMENDED WITH CONDITIONS',
        text: `${base}\n\nWe believe an estate sale can work for this property, with a few conditions that need to be met first:\n${open.map(x => `- ${x.condition}${x.due_date ? ` (by ${x.due_date})` : ''}`).join('\n')}\nOnce these are resolved, we can move forward with the proposal.${rec.note ? `\n\n${rec.note}` : ''}${closing}`,
      };
    case 'research_required':
      return {
        headline: 'ADDITIONAL RESEARCH REQUIRED',
        text: `${base}\n\nBefore we can give you a confident recommendation, we need a little more time to research some of the merchandise we discussed. We will follow up shortly with what we learn and a clear next step.${open.length ? `\n\nOpen items: ${open.map(x => x.condition).join('; ')}.` : ''}${closing}`,
      };
    case 'alternative_solution': {
      const alt = ALTERNATIVE_LABEL(rec.alternative_type);
      return {
        headline: 'ALTERNATIVE SOLUTION RECOMMENDED',
        text: `${base}\n\nAfter reviewing the property, we believe ${alt.toLowerCase()} is a more appropriate path for your situation than a full estate sale. We are happy to point you toward trusted options for this.${rec.note ? `\n\n${rec.note}` : ''}${closing}`,
      };
    }
    case 'decline':
      return {
        headline: 'WE ARE NOT THE RIGHT FIT',
        text: `${base}\n\nAfter careful consideration, we don't believe we are the right fit for this project${rec.decline_reason ? `, primarily because ${rec.decline_reason}` : ''}. This is not a reflection on you or your situation, and we genuinely appreciate the opportunity. If your circumstances change, we would be glad to hear from you again.${closing}`,
      };
    default:
      return { headline: 'NO RECOMMENDATION RECORDED', text: 'Record the operator recommendation first.' };
  }
}

// ── Professional decline template (P1-39) — reusable, static, never auto-sent ──
export const DECLINE_TEMPLATE = `Dear [Client],

Thank you for the opportunity to visit the property and discuss your situation.

After careful consideration, we have decided we are not the right fit for this project. [Optional one-line truthful reason.]

[If appropriate: Based on what we saw, we believe [alternative service] may serve you better, and we would be glad to introduce you to someone we trust.]

We appreciate your time and wish you the very best. If your circumstances change, we would be glad to hear from you again.

Sincerely,
[Your company]`;