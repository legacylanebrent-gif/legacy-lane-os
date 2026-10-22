// Chapter 27 P1 — OPERATOR 90-DAY LAUNCH MODE model.
// ORCHESTRATION LAYER ONLY: deterministic derivation over canonical records.
// This module never mutates data and never duplicates canonical truth —
// milestones are DERIVED (first consultation, first activated project, first
// completed project, post-sale review) and only non-derivable state is stored
// on Company.launch_mode.
// NAMING: this is the OPERATOR launch mode — deliberately distinct from the
// admin app-quality LaunchReadinessScore / LaunchCommandCenter, the LLBB pilot
// LaunchWizard, and marketing "launch" pages. No numeric launch score exists.

export const LAUNCH_PHASES = [
  { key: 'FOUNDATION', label: 'Foundation', guidance: 'Company identity, services, agreement readiness, Day 1 baseline.' },
  { key: 'MARKET_ENTRY', label: 'Market Entry', guidance: 'Referral relationships and visibility. Get to your first consultation.' },
  { key: 'CONSULTATIONS', label: 'Consultations', guidance: 'Capture, qualify and consult on real opportunities.' },
  { key: 'FIRST_SALE_SELECTION', label: 'First-Sale Selection', guidance: 'First-Sale Fit Review, then accept, decline or refer. You decide.' },
  { key: 'FIRST_PROJECT', label: 'First Project', guidance: 'Run the first project on the full operating system.' },
  { key: 'CLOSEOUT', label: 'Closeout', guidance: 'Pickup, disposition, reconciliation, settlement, completion.' },
  { key: 'LEARNING', label: 'Learning', guidance: 'First-sale review: what worked, what didn\u2019t, what surprised you.' },
  { key: 'QUARTER_TWO', label: 'Quarter Two', guidance: 'Day 90 review, next-quarter priorities, graduation.' },
];

export const PHASE_LABELS = { NOT_STARTED: 'Not Started', GRADUATED: 'Graduated', READY_TO_GRADUATE: 'Ready to Graduate' };

const UNKNOWN_VALUES = ['UNKNOWN', 'NOT YET ESTIMATED', 'NOT APPLICABLE', 'N/A', ''];

export function isUnknownValue(v) {
  return v == null || UNKNOWN_VALUES.includes(String(v).trim().toUpperCase());
}

export function parseNum(v) {
  if (v == null || isUnknownValue(v)) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ── READINESS ───────────────────────────────────────────────────────────────
// Truthful CRITICAL / NEEDS ATTENTION / IMPROVE LATER semantics. Legal, tax,
// insurance and employment items are NEVER classified by AI judgment — they are
// "on file / not on file" facts plus PROFESSIONAL REVIEW RECOMMENDED language.
// EstateSalen is not the legal/compliance authority for anything here.

export function buildReadinessItems({ user, company, services, documents, complianceQuestions, equipment, launch }) {
  const items = [];
  const docs = documents || [];
  const hasName = !!((company && (company.display_name || company.legal_name)) || (user.company_name || '').trim());
  const hasLocation = !!((company && (company.city || company.state)) || (user.location?.lat && user.location?.lng));
  items.push({
    id: 'company_profile', tier: 'CRITICAL', label: 'Company identity & service area',
    complete: hasName && hasLocation,
    why: 'Buyers and referral partners need to find and recognize you.',
    action: { label: 'Complete your profile', to: '/MyProfile' },
  });
  const enabledServices = (services || []).filter(s => s.enabled !== false);
  items.push({
    id: 'service_defined', tier: 'CRITICAL', label: 'At least one service defined',
    complete: enabledServices.length > 0,
    why: 'Your service catalog feeds sale scopes, agreements and your public presence.',
    action: { label: 'Define your services', to: '/OperatorServices' },
  });
  items.push({
    id: 'agreement_readiness', tier: 'CRITICAL', label: 'Client agreement ready',
    complete: docs.some(d => d.category === 'AGREEMENT' && d.status !== 'ARCHIVED'),
    why: 'You need an operator-approved agreement template before your first engagement.',
    action: { label: 'Set up your agreement template', to: '/BusinessDocuments' },
  });
  items.push({
    id: 'day1_baseline', tier: 'CRITICAL', label: 'Day 1 baseline recorded',
    complete: !!(launch && launch.baseline && launch.baseline.recorded_at),
    why: 'Day 1 runs on assumptions; Day 90 runs on evidence. Without a baseline, the Day 90 comparison is just storytelling.',
    action: { label: 'Record your Day 1 baseline', to: '/OperatorLaunchMode' },
  });

  const insuranceOnFile = docs.some(d => d.category === 'INSURANCE' && d.status !== 'ARCHIVED');
  items.push({
    id: 'insurance_on_file', tier: 'ATTENTION', label: 'Insurance document on file',
    complete: insuranceOnFile, professionalReview: true,
    why: insuranceOnFile
      ? 'On file. On file \u2260 adequate \u2014 professional guidance may be appropriate to confirm your coverage fits your work.'
      : 'NOT YET CONFIRMED. A document on file only records that you stored one \u2014 professional guidance may be appropriate to confirm coverage fits your work.',
    action: { label: 'Business document vault', to: '/BusinessDocuments' },
  });
  const openQuestions = (complianceQuestions || []).filter(
    q => q.status === 'RESEARCH_NEEDED' && ['BUSINESS', 'TAX', 'EMPLOYMENT', 'INSURANCE'].includes(q.category)
  );
  items.push({
    id: 'foundation_questions', tier: 'ATTENTION', label: 'Foundation requirement questions',
    complete: openQuestions.length === 0, professionalReview: true,
    why: openQuestions.length
      ? `${openQuestions.length} foundation question(s) still need research \u2014 REVIEW NEEDED; professional guidance may be appropriate. EstateSalen never declares these resolved for you.`
      : 'Your recorded foundation questions have answers with provenance (who/what verified them).',
    action: { label: 'Requirement questions', to: '/ComplianceQuestions' },
  });
  items.push({
    id: 'equipment_minimum', tier: 'ATTENTION', label: 'Basic equipment inventoried',
    complete: (equipment || []).length > 0,
    why: 'Tables, pricing tools and dollies get a first sale running \u2014 you do not need the fifth-sale business before the first sale.',
    action: { label: 'Equipment manager', to: '/EquipmentManager' },
  });

  // IMPROVE LATER — guidance, no pass/fail judgment (honest: not tracked here).
  items.push({ id: 'payment_approach', tier: 'OPTIONAL', label: 'Confirm your sale-day payment approach', action: { label: 'Checkout station', to: '/CheckoutStation' }, why: 'Decide how you will take money before sale day. Merchant account setup happens in the payments dashboard \u2014 outside EstateSalen.' });
  items.push({ id: 'bookkeeping_approach', tier: 'OPTIONAL', label: 'Bookkeeping approach', action: { label: 'How you will keep books', to: '/BusinessDocuments' }, why: 'EstateSalen captures project money truthfully; setting up your accounting system remains your responsibility with a qualified professional.' });
  items.push({ id: 'professional_advisers', tier: 'OPTIONAL', label: 'Professional advisers identified', action: { label: 'Professional network', to: '/ProfessionalNetwork' }, why: 'Attorneys, accountants and insurance professionals you can call.' });
  items.push({ id: 'web_presence', tier: 'OPTIONAL', label: 'Public presence reviewed', action: { label: 'Your public profile', to: '/MyProfile' }, why: 'Your public operator profile exists automatically; review it when you can.' });
  return items;
}

export function readinessStatus(items) {
  const criticals = items.filter(i => i.tier === 'CRITICAL');
  const attention = items.filter(i => i.tier === 'ATTENTION');
  const openCriticals = criticals.filter(i => !i.complete);
  const openAttention = attention.filter(i => !i.complete);
  if (openCriticals.length) {
    return {
      status: 'BLOCKED', tone: 'red',
      why: `Launch-critical items unresolved: ${openCriticals.map(i => i.label).join('; ')}. Responsibly ready \u2260 perfect, but NOT RESPONSIBLY READY \u2260 READY ENOUGH.`,
    };
  }
  if (openAttention.length) {
    return {
      status: 'NEEDS ATTENTION', tone: 'amber',
      why: `All critical items are addressed. ${openAttention.length} item(s) need attention but do not block market activity: ${openAttention.map(i => i.label).join('; ')}.`,
    };
  }
  return {
    status: 'RESPONSIBLY READY', tone: 'green',
    why: 'All critical and attention items addressed. Remaining items are genuinely optional \u2014 do not keep doing setup instead of talking to sellers.',
  };
}

// ── PHASES ──────────────────────────────────────────────────────────────────
// Deterministic from canonical records. Calendar days are guidance only —
// progress is evidence. Nothing here accepts/declines anything for anyone.

export function deriveLaunchPhase({ launch, readinessItems, deals, sales, firstReviewDone }) {
  if (!launch || !launch.mode) return { phase: 'NOT_STARTED', why: 'Launch Mode not started.' };
  if (launch.mode === 'GRADUATED') return { phase: 'GRADUATED', why: 'Graduated \u2014 running the normal operating system.' };
  const openCriticals = (readinessItems || []).filter(i => i.tier === 'CRITICAL' && !i.complete);
  if (openCriticals.length) return { phase: 'FOUNDATION', why: `${openCriticals.length} launch-critical item(s) still incomplete.` };

  // LAUNCH WINDOW: only opportunities and projects created AFTER the operator
  // started Launch Mode count as launch milestones. History before launch
  // belongs to the operator's past, not to this launch.
  const started = launch.started_at ? new Date(launch.started_at).getTime() : 0;
  const inWindow = (r) => !started || !r.created_date || new Date(r.created_date).getTime() >= started;
  deals = (deals || []).filter(inWindow);
  sales = (sales || []).filter(inWindow);
  const pipeline = deals.filter(d => !['lost', 'referred'].includes(d.stage));
  if (!pipeline.length) return { phase: 'MARKET_ENTRY', why: 'No seller opportunities yet \u2014 outreach and visibility come first.' };
  const consulted = pipeline.some(d => d.consultation?.started_at || ['consultation_scheduled', 'contract_signed', 'setup_in_progress', 'sale_live', 'completed'].includes(d.stage));
  if (!consulted) return { phase: 'CONSULTATIONS', why: 'Work your first real consultation.' };

  const activated = (sales || []).filter(s => s.activation?.activated_at || ['upcoming', 'active', 'completed'].includes(s.status));
  if (!activated.length) return { phase: 'FIRST_SALE_SELECTION', why: 'Evaluate your first project \u2014 First-Sale Fit Review, then YOU accept, decline or refer.' };

  const completed = activated.filter(s => s.status === 'completed' || s.transition?.transition_completed_at);
  if (!completed.length) {
    const live = activated.find(s => s.status !== 'completed') || activated[0];
    return { phase: 'FIRST_PROJECT', why: `Run \u201c${live.title}\u201d on the full operating system.`, saleId: live.id };
  }
  const first = completed[0];
  if (!first.transition?.transition_completed_at) return { phase: 'CLOSEOUT', why: `Finish closeout on \u201c${first.title}\u201d (pickup, disposition, reconciliation, settlement, completion).`, saleId: first.id };
  if (!firstReviewDone) return { phase: 'LEARNING', why: 'Complete the first-sale review \u2014 the first sale should make the second sale better.', saleId: first.id };
  const lm = launch;
  if (!lm.day90_review?.completed_at || !lm.quarter_two?.created_at) {
    return { phase: 'QUARTER_TWO', why: 'Complete the Day 90 review and build your Quarter Two plan.', saleId: first.id };
  }
  return { phase: 'READY_TO_GRADUATE', why: 'All launch milestones complete \u2014 review the graduation checklist.', saleId: first.id };
}

// ── GRADUATION ──────────────────────────────────────────────────────────────
// Evidence-based, human-confirmed. Never granted because 90 days passed.

export function graduationEligibility({ readinessItems, launch, sales, firstReviewDone }) {
  const started = launch?.started_at ? new Date(launch.started_at).getTime() : 0;
  const inWindow = (r) => !started || !r.created_date || new Date(r.created_date).getTime() >= started;
  const firstProjectDone = (sales || []).filter(inWindow).some(s => s.transition?.transition_completed_at);
  const nA = !!launch?.first_project_not_applicable;
  return [
    { key: 'foundation', label: 'Foundation critically addressed (no unresolved launch-critical items)', done: !(readinessItems || []).some(i => i.tier === 'CRITICAL' && !i.complete) },
    { key: 'first_cycle', label: 'One complete project cycle (transition completion recorded)', done: firstProjectDone || nA, waived: nA && !firstProjectDone },
    { key: 'first_review', label: 'First-sale review completed', done: firstReviewDone || nA, waived: nA && !firstReviewDone },
    { key: 'day90', label: 'Day 90 review completed', done: !!launch?.day90_review?.completed_at },
    { key: 'quarter_two', label: 'Quarter Two plan created', done: !!launch?.quarter_two?.created_at },
  ];
}

// ── DAY 90 COMPARISONS ──────────────────────────────────────────────────────
// Baseline (assumptions) vs ACTUAL canonical evidence. Never fabricate actuals:
// missing evidence is INSUFFICIENT EVIDENCE, never $0 or "no activity".

function classifyNum(expected, actual, hasEvidence) {
  const exp = parseNum(expected);
  if (exp == null) return 'INSUFFICIENT EVIDENCE \u2014 no baseline value recorded';
  if (!hasEvidence) return 'NOT YET TESTED \u2014 no actual evidence yet';
  const ratio = actual / exp;
  if (ratio >= 0.75 && ratio <= 1.25) return 'CLOSE TO EXPECTATION';
  return ratio > 1.25 ? 'HIGHER THAN EXPECTED' : 'LOWER THAN EXPECTED';
}

function classifyText(expected, actual, hasEvidence) {
  if (isUnknownValue(expected)) return 'INSUFFICIENT EVIDENCE \u2014 no baseline value recorded';
  if (!hasEvidence) return 'NOT YET TESTED \u2014 no actual evidence yet';
  return String(expected).trim().toLowerCase() === String(actual).trim().toLowerCase()
    ? 'CLOSE TO EXPECTATION' : 'CHANGED';
}

export function day90Comparisons({ baseline, actuals }) {
  const a = actuals || {};
  const b = baseline?.assumptions || {};
  const rows = [];
  rows.push({
    key: 'project_volume', label: 'Projects completed',
    expected: b.expected_project_volume || '',
    actual: a.hasCompletedSales ? `${a.completedSales}` : '',
    classification: classifyNum(b.expected_project_volume, a.completedSales, a.hasCompletedSales),
  });
  rows.push({
    key: 'prep_hours', label: 'Preparation labor (recorded hours, all labor)',
    expected: b.expected_prep_hours || '',
    actual: a.hasLaborData ? `${a.laborHours} hours recorded` : '',
    classification: classifyNum(b.expected_prep_hours, a.laborHours, a.hasLaborData),
  });
  rows.push({
    key: 'owner_hours', label: 'Owner hours recorded',
    expected: b.expected_owner_hours || '',
    actual: a.hasLaborData ? `${a.ownerHours} hours recorded` : '',
    classification: classifyNum(b.expected_owner_hours, a.ownerHours, a.hasLaborData),
  });
  rows.push({
    key: 'company_revenue', label: 'Company revenue (commission recorded on completed sales)',
    expected: b.expected_company_revenue || '',
    actual: a.hasCompletedSales ? `$${a.companyRevenue} recorded` : '',
    classification: classifyNum(b.expected_company_revenue, a.companyRevenue, a.hasCompletedSales),
  });
  rows.push({
    key: 'lead_source', label: 'Primary lead source',
    expected: b.expected_lead_source || '',
    actual: a.topLeadSource || '',
    classification: classifyText(b.expected_lead_source, a.topLeadSource, !!a.topLeadSource),
  });
  rows.push({
    key: 'service_model', label: 'Service model',
    expected: b.expected_service_model || '',
    actual: a.actualServiceModel || '',
    classification: classifyText(b.expected_service_model, a.actualServiceModel, !!a.actualServiceModel),
  });
  return rows;
}

export const QUARTER_TWO_PRIORITIES = [
  { key: 'MORE_CONSULTATIONS', label: 'More consultations' },
  { key: 'BETTER_PROJECT_SELECTION', label: 'Better project selection' },
  { key: 'PROFITABILITY', label: 'Profitability' },
  { key: 'LABOR_EFFICIENCY', label: 'Labor efficiency' },
  { key: 'PRICING', label: 'Pricing' },
  { key: 'STAFFING', label: 'Staffing' },
  { key: 'TRAINING', label: 'Training' },
  { key: 'REFERRALS', label: 'Referrals' },
  { key: 'BUYER_AUDIENCE', label: 'Buyer audience (permission-based)' },
  { key: 'MARKETING', label: 'Marketing' },
  { key: 'SYSTEMS_SOPS', label: 'Systems / SOPs' },
  { key: 'OWNER_CAPACITY', label: 'Owner capacity' },
  { key: 'OTHER', label: 'Other' },
];

export function daysSince(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}