// Chapter 16 — PRICING & COMPARABLE EVIDENCE helpers (pure, deterministic).
// Doctrines: PRICING IS A DECISION SUPPORTED BY EVIDENCE. ASKING ≠ SOLD.
// ONE COMPARABLE ≠ THE MARKET. AI SUGGESTION ≠ VERIFIED IDENTIFICATION.
// The system makes uncertainty VISIBLE, never absent.

export const EVIDENCE_TYPES = [
  { value: 'ASKING', label: 'Asking (active listing)', hint: 'A listing/asking price — not a completed sale' },
  { value: 'SOLD', label: 'Sold (completed sale)', hint: 'Evidence the item actually sold at this price' },
  { value: 'UNKNOWN', label: 'Unknown / other', hint: 'The source does not say' },
];

export const SOURCE_TYPES = [
  { value: 'ESTATESALEN_INTERNAL', label: 'My company sales history (EstateSalen)' },
  { value: 'ONLINE_MARKETPLACE', label: 'Online marketplace (eBay, Etsy...)' },
  { value: 'AUCTION_RESULT', label: 'Auction result' },
  { value: 'DEALER_RETAIL', label: 'Dealer listing' },
  { value: 'RETAIL_LISTING', label: 'Retail listing' },
  { value: 'OTHER', label: 'Other' },
];

export const USEFULNESS = [
  { value: 'STRONG', label: 'Strong', hint: 'Same item, condition and market — the closest evidence' },
  { value: 'USEFUL', label: 'Useful', hint: 'Similar enough to inform the decision' },
  { value: 'LIMITED', label: 'Limited', hint: 'Use with caution — materially different' },
];

export const MARKET_CONTEXTS = [
  { value: 'LOCAL_PICKUP', label: 'Local pickup market' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'ONLINE_SHIPPED', label: 'Online / shipped' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

export const SELLING_CHANNELS = [
  { value: 'ESTATE_SALE', label: 'Estate sale (floor)' },
  { value: 'AUCTION', label: 'Auction' },
  { value: 'CONSIGNMENT', label: 'Consignment' },
  { value: 'SPECIALTY_MARKETPLACE', label: 'Specialty marketplace/dealer' },
  { value: 'DIRECT_SALE', label: 'Direct sale' },
  { value: 'OTHER', label: 'Other' },
];

export const SPECIALIST_RELATIONSHIPS = [
  { value: 'INDEPENDENT', label: 'Independent' },
  { value: 'POTENTIAL_BUYER', label: 'Potential buyer' },
  { value: 'BOTH', label: 'Both / other' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

// Chapter 16 P1-8 — the body of evidence: SOLD and ASKING ranges are summarized
// SEPARATELY, never mixed into one unlabeled "market range". A small sample is
// stated as such — no fake precision, no invented averages.
export function summarizeEvidence(comparables = []) {
  const active = (comparables || []).filter(c => !c.outlier);
  const sold = active.filter(c => c.evidence_type === 'SOLD' && Number.isFinite(Number(c.price)));
  const asking = active.filter(c => c.evidence_type === 'ASKING' && Number.isFinite(Number(c.price)));
  const unknown = active.filter(c => !['SOLD', 'ASKING'].includes(c.evidence_type) && Number.isFinite(Number(c.price)));
  const outliers = (comparables || []).filter(c => c.outlier);

  const range = list => {
    if (!list.length) return null;
    const prices = list.map(c => Number(c.price));
    return { count: list.length, low: Math.min(...prices), high: Math.max(...prices) };
  };

  return {
    sold: range(sold),
    asking: range(asking),
    unknown: range(unknown),
    outliers: outliers.map(o => ({ id: o.id, price: o.price, reason: o.outlier_reason })),
    total: (comparables || []).length,
    // Honest small-sample warning — never imply statistical precision.
    thinSample: sold.length < 3,
  };
}

export function evidenceRangeText(r) {
  if (!r) return null;
  if (r.count === 1) return `$${r.low.toLocaleString()} (1 observation)`;
  return `$${r.low.toLocaleString()} – $${r.high.toLocaleString()} (${r.count} observations)`;
}

// Chapter 16 P1-10 — research status display vocabulary. READY_TO_PRICE means
// sufficient evidence for a HUMAN decision — never certainty or authentication.
export const RESEARCH_STATE_META = {
  CLEAR: { label: 'Clear', tone: 'bg-green-100 text-green-700' },
  RESEARCH_NEEDED: { label: 'Research needed', tone: 'bg-violet-100 text-violet-700' },
  VERIFY: { label: 'Verify', tone: 'bg-violet-100 text-violet-700' },
  SPECIALIST_REVIEW: { label: 'Specialist review', tone: 'bg-amber-100 text-amber-800' },
  READY_TO_PRICE: { label: 'Ready to price', tone: 'bg-cyan-100 text-cyan-700' },
};

// Chapter 16 P1-36/P1-37 — deterministic NEGOTIATION AUTHORITY guidance shown to
// the team. Guidance only: the system never auto-accepts or auto-declines an Offer.
// An item-level override always wins over the company policy.
export function negotiationGuidance(item, companyPolicy) {
  if (item && item.negotiation_override === 'NO_DISCOUNT_WITHOUT_OPERATOR') {
    return {
      level: 'ITEM_OVERRIDE',
      text: 'This item is locked: NO DISCOUNT without operator approval. Any offer goes to the operator.',
    };
  }
  const p = companyPolicy || {};
  if (!p.policy) {
    return { level: 'NO_POLICY', text: 'No company negotiation policy recorded — the operator sets the ground rules on each offer.' };
  }
  const labels = {
    NO_NEGOTIATION: 'Company policy: prices are firm — no negotiation.',
    EMPLOYEE_AUTHORITY_LIMIT: p.employee_authority_max != null
      ? `Company policy: employees may accept up to ${p.employee_authority_unit === 'percent' ? `${p.employee_authority_max}%` : `$${p.employee_authority_max}`} off without escalation.`
      : 'Company policy: employees have limited discount authority — the operator sets the limit.',
    MANAGER_APPROVAL_THRESHOLD: 'Company policy: discounts require manager approval above the company threshold.',
    OPERATOR_ONLY: 'Company policy: only the operator accepts offers or discounts.',
  };
  return { level: p.policy, text: labels[p.policy] || 'Follow the company negotiation policy.' };
}

// Chapter 16 P1-39/P1-40 — planned discount stages are GUIDANCE for the team.
// An item excluded from discounts is never silently reduced; the stage just
// tells a human to make an explicit authorized price change (which for
// HIGH_VALUE goes through changeItemPrice with a reason).
export function itemExcludedFromDiscounts(item) {
  return !!(item && item.excluded_from_discounts);
}

// Chapter 16 P1-12 — high-consequence research surfacing (display only).
export function highConsequence(item) {
  return !!(item && item.high_consequence_research);
}