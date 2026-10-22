// Chapter 27 P1 — FIRST-SALE FIT REVIEW.
// A LENS over the certified Chapter 11/12 Sale Acceptance Review architecture
// (saleEconomicsModel / acceptanceReviewModel / client_fit) — it DUPLICATES
// NOTHING and never restores a numeric opportunity score. Advisory evidence
// only: the human operator accepts, declines, or refers. No scoring of people;
// only documented operational/authority conditions from canonical deal data.

const CF_LABELS = {
  authority_clarity: 'Authority clarity',
  deadline_realism: 'Deadline realism',
  expectation_realism: 'Client expectation realism',
  property_access: 'Property access',
  communication: 'Communication',
  responsiveness: 'Responsiveness',
  family_complexity: 'Family/authority complexity',
  scope_stability: 'Scope stability',
};

// First-sale lens: which observable conditions matter most for a NEW operator.
const FIRST_SALE_KEYS = ['authority_clarity', 'deadline_realism', 'expectation_realism', 'property_access', 'scope_stability'];

export function firstSaleFitReview(deal) {
  const cf = deal?.client_fit || {};
  const consult = deal?.consultation || {};
  const reasons = [];

  const concerns = [];
  const cautions = [];
  FIRST_SALE_KEYS.forEach((k) => {
    const v = cf[k];
    if (v === 'concern') concerns.push(CF_LABELS[k]);
    else if (v === 'caution') cautions.push(CF_LABELS[k]);
    else if (v !== 'good') reasons.push(`${CF_LABELS[k]}: not yet assessed \u2014 complete the consultation before judging fit.`);
  });
  if (concerns.length) reasons.push(`CONCERN-level conditions: ${concerns.join(', ')} \u2014 these make a first project materially harder.`);
  if (cautions.length) reasons.push(`Caution-level conditions: ${cautions.join(', ')} \u2014 manageable with attention.`);

  const laborRows = (deal?.labor_estimates || []).filter(r => !r.is_owner_time);
  const laborHours = laborRows.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  if (laborHours > 0) {
    reasons.push(`Projected non-owner labor: ${laborHours} hours.`);
    if (laborHours > 80) reasons.push('High projected labor demand for a first project \u2014 consider whether you can staff it.');
  } else {
    reasons.push('Labor demand not yet estimated \u2014 unknown, not zero. Estimate it in the consultation before deciding.');
  }

  const rooms = consult.rooms || [];
  const researchRooms = rooms.filter(r => r.research_needed).length;
  if (researchRooms) reasons.push(`${researchRooms} area(s) flagged as needing research \u2014 specialist/high-value merchandise raises first-project complexity.`);
  const accessConcerns = rooms.filter(r => r.access_concern).length;
  if (accessConcerns) reasons.push(`${accessConcerns} area(s) with access/removal concerns.`);

  const deadlines = (consult.external_deadlines || []).filter(d => d.date);
  if (deadlines.length) reasons.push('External deadline(s) recorded \u2014 check whether the timeline is realistic for your first cycle.');

  let verdict;
  if (concerns.length || researchRooms > 0) {
    verdict = 'CHALLENGING FIRST PROJECT';
  } else if (cautions.length >= 2 || laborHours > 80) {
    verdict = 'MANAGEABLE WITH ATTENTION';
  } else if (!Object.keys(cf).length || FIRST_SALE_KEYS.every(k => !cf[k] || cf[k] === 'unknown')) {
    verdict = 'NOT YET ASSESSABLE';
  } else {
    verdict = 'GOOD FIRST-SALE FIT';
  }

  return {
    verdict,
    reasons,
    advisory: 'ADVISORY EVIDENCE ONLY. The first project should be chosen for learning and manageability \u2014 not ego \u2014 and a well-evaluated decline is progress. YOU accept, decline, or refer; this review never does.',
  };
}

export const FIRST_SALE_FIT_TONES = {
  'GOOD FIRST-SALE FIT': 'bg-green-100 text-green-700 border-green-300',
  'MANAGEABLE WITH ATTENTION': 'bg-amber-100 text-amber-700 border-amber-300',
  'CHALLENGING FIRST PROJECT': 'bg-red-100 text-red-700 border-red-300',
  'NOT YET ASSESSABLE': 'bg-slate-100 text-slate-600 border-slate-300',
};