// Phase 5A — Controlled Pilot Program model.
// The pilot stage model is SEPARATE from the WebsiteTenant technical lifecycle
// and the LLBB product workflow (llbbWorkflowModel.ts). Pilot tooling NEVER
// transitions tenant lifecycle states and NEVER bypasses certified seams —
// provisioning, review, approval, publication, domains and leads all reuse the
// certified Phase 3B/4A/4C/4D/4E/4F flows unchanged.

export const PILOT_STAGES = [
  'CANDIDATE',
  'APPROVED_FOR_PILOT',
  'WEBSITE_CREATED',
  'OPERATOR_INVITED',
  'SETUP_IN_PROGRESS',
  'READY_FOR_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PLATFORM_SITE_LIVE',
  'CUSTOM_DOMAIN_PENDING',
  'CUSTOM_DOMAIN_LIVE',
  'FIRST_SALE_PUBLISHED',
  'FIRST_LEAD_RECEIVED',
  'REVIEW_30_DAY',
  'PILOT_COMPLETE'
];

export const PILOT_STAGE_LABELS = {
  CANDIDATE: 'Candidate',
  APPROVED_FOR_PILOT: 'Approved for Pilot',
  WEBSITE_CREATED: 'Website Created',
  OPERATOR_INVITED: 'Operator Invited',
  SETUP_IN_PROGRESS: 'Setup In Progress',
  READY_FOR_REVIEW: 'Ready for Review',
  CHANGES_REQUESTED: 'Changes Requested',
  APPROVED: 'Approved',
  PLATFORM_SITE_LIVE: 'Platform Site Live',
  CUSTOM_DOMAIN_PENDING: 'Custom Domain Pending',
  CUSTOM_DOMAIN_LIVE: 'Custom Domain Live',
  FIRST_SALE_PUBLISHED: 'First Sale Published',
  FIRST_LEAD_RECEIVED: 'First Lead Received',
  REVIEW_30_DAY: '30-Day Review',
  PILOT_COMPLETE: 'Pilot Complete'
};

export const PILOT_STAGE_BADGE = {
  CANDIDATE: 'bg-slate-100 text-slate-700 border-slate-200',
  APPROVED_FOR_PILOT: 'bg-blue-50 text-blue-700 border-blue-200',
  WEBSITE_CREATED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  OPERATOR_INVITED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SETUP_IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
  READY_FOR_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800 border-orange-200',
  APPROVED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  PLATFORM_SITE_LIVE: 'bg-green-100 text-green-800 border-green-200',
  CUSTOM_DOMAIN_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CUSTOM_DOMAIN_LIVE: 'bg-green-100 text-green-800 border-green-200',
  FIRST_SALE_PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FIRST_LEAD_RECEIVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REVIEW_30_DAY: 'bg-purple-100 text-purple-800 border-purple-200',
  PILOT_COMPLETE: 'bg-slate-900 text-white border-slate-900'
};

// Milestone key → stage it advances the pilot to (with a floor guard: the
// stage never regresses to an EARLIER index except the CHANGES_REQUESTED
// branch, which is its own state). Milestones are workflow timing events —
// recorded by the server seam only.
export const MILESTONE_STAGE = {
  website_created: 'WEBSITE_CREATED',
  invitation_sent: 'OPERATOR_INVITED',
  invitation_accepted: 'SETUP_IN_PROGRESS',
  setup_started: 'SETUP_IN_PROGRESS',
  first_draft: 'SETUP_IN_PROGRESS',
  setup_completed: 'SETUP_IN_PROGRESS',
  submitted_for_review: 'READY_FOR_REVIEW',
  changes_requested: 'CHANGES_REQUESTED',
  resubmitted: 'READY_FOR_REVIEW',
  approved: 'APPROVED',
  published: 'PLATFORM_SITE_LIVE',
  custom_domain_pending: 'CUSTOM_DOMAIN_PENDING',
  custom_domain_live: 'CUSTOM_DOMAIN_LIVE',
  first_sale_published: 'FIRST_SALE_PUBLISHED',
  first_seller_lead: 'FIRST_LEAD_RECEIVED',
  first_buyer_signup: 'FIRST_LEAD_RECEIVED',
  first_inventory_update: null, // timing milestone only — no stage move
  first_preview: null,
  first_human_edit: null,
  ai_interview_started: null,
  ai_interview_completed: null,
  check_24h: null,
  check_7d: null,
  review_30d: 'REVIEW_30_DAY'
};

export const MILESTONE_LABELS = {
  website_created: 'Website created',
  invitation_sent: 'Invitation sent',
  invitation_accepted: 'Invitation accepted',
  setup_started: 'Setup started',
  ai_interview_started: 'AI interview started',
  ai_interview_completed: 'AI interview completed',
  first_draft: 'First AI draft generated',
  first_preview: 'First preview opened',
  first_human_edit: 'First human edit',
  setup_completed: 'Setup completed',
  submitted_for_review: 'Submitted for review',
  changes_requested: 'Changes requested',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  published: 'Website published (platform hostname)',
  custom_domain_pending: 'Custom domain connection started',
  custom_domain_live: 'Custom domain live',
  first_sale_published: 'First sale published',
  first_inventory_update: 'First inventory update reflected',
  first_seller_lead: 'First seller lead received',
  first_buyer_signup: 'First buyer signup received',
  check_24h: '24-hour check',
  check_7d: '7-day check',
  review_30d: '30-day review'
};

// Part 28 — per-pilot launch checklist.
export const PILOT_CHECKLIST = [
  { key: 'company_verified', label: 'Company verified', auto: true },
  { key: 'entitlement_verified', label: 'Entitlement verified', auto: true },
  { key: 'website_provisioned', label: 'Website provisioned', auto: true },
  { key: 'operator_invited', label: 'Operator invited', auto: true },
  { key: 'invitation_accepted', label: 'Invitation accepted', auto: true },
  { key: 'business_confirmed', label: 'Business confirmed' },
  { key: 'branding_configured', label: 'Branding configured' },
  { key: 'services_configured', label: 'Services configured' },
  { key: 'content_completed', label: 'AI/manual content completed' },
  { key: 'preview_completed', label: 'Preview completed' },
  { key: 'readiness_passed', label: 'Readiness passed' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'platform_site_published', label: 'Platform site published', auto: true },
  { key: 'forms_tested', label: 'Forms tested' },
  { key: 'sales_tested', label: 'Sales tested' },
  { key: 'inventory_tested', label: 'Inventory tested' },
  { key: 'seo_checked', label: 'SEO checked' },
  { key: 'analytics_checked', label: 'Analytics checked' },
  { key: 'site_health_checked', label: 'Site Health checked' },
  { key: 'custom_domain_if_desired', label: 'Custom domain connected (if desired)' },
  { key: 'first_lead_verified', label: 'First lead verified' },
  { key: 'review_30d_complete', label: '30-day review complete' }
];

// Part 4 — eligibility check keys shown to the admin before Approve For Pilot.
export const ELIGIBILITY_CHECKS = [
  { key: 'company_active', label: 'Company active' },
  { key: 'owner_contact', label: 'Authorized company owner/contact' },
  { key: 'valid_email', label: 'Valid contact email' },
  { key: 'valid_phone', label: 'Valid contact phone (where required)' },
  { key: 'membership_valid', label: 'Company membership valid' },
  { key: 'entitlement', label: 'Website entitlement eligible' },
  { key: 'no_conflicting_tenant', label: 'No conflicting website tenant' },
  { key: 'admin_assigned', label: 'Platform admin assigned' }
];

// Part 13 — friction kinds; normal optional omissions are never failures.
export const FRICTION_KINDS = [
  'ai_generation_failed', 'save_failed', 'upload_failed', 'readiness_blocker',
  'invitation_expired', 'review_rejected', 'domain_verification_failed',
  'form_health_failed', 'publication_failed', 'runtime_failed', 'step_abandoned'
];

// Part 14 — admin intervention categories.
export const INTERVENTION_CATEGORIES = [
  'account', 'business_information', 'branding', 'content', 'media', 'services',
  'sales', 'domain', 'seo', 'lead_forms', 'other'
];

// Part 42 — feature-request buckets (captured only; never auto-built).
export const FEATURE_BUCKETS = ['launch_blocker', 'high_value', 'nice_to_have', 'future'];

// ── Setup timing (Part 12) ────────────────────────────────────────────────────
// Durations are computed from milestone timestamps only. "Active" = operator
// driven segments (setup events); "Waiting" = segments ending in an admin or
// platform driven milestone. No false precision — durations are approximate.
export function computeSetupTiming(milestones) {
  const at = {};
  for (const m of milestones || []) at[m.key] = m.at;
  const ms = (a, b) => (at[a] && at[b] ? new Date(at[b]) - new Date(at[a]) : null);
  const hrs = (v) => (v == null ? null : Math.round((v / 3600000) * 10) / 10);
  const day = (v) => (v == null ? null : Math.round((v / 86400000) * 10) / 10);
  const segments = {
    invitation_acceptance: { label: 'Invitation sent → accepted', hours: day(ms('invitation_sent', 'invitation_accepted')), kind: 'waiting' },
    acceptance_to_setup: { label: 'Accepted → first setup', hours: hrs(ms('invitation_accepted', 'setup_started')), kind: 'active' },
    setup_to_draft: { label: 'Setup start → first draft', hours: hrs(ms('setup_started', 'first_draft')), kind: 'active' },
    draft_to_review: { label: 'First draft → review submission', hours: day(ms('first_draft', 'submitted_for_review')), kind: 'active' },
    review_to_approval: { label: 'Review → approval', hours: day(ms('submitted_for_review', 'approved')), kind: 'waiting' },
    approval_to_publish: { label: 'Approval → publication', hours: hrs(ms('approved', 'published')), kind: 'waiting' }
  };
  const total = { label: 'Website created → live', hours: day(ms('website_created', 'published')), kind: 'total' };
  return { segments, total };
}

// ── Part 27 — daily attention rules (only actionable issues) ──────────────────
export function attentionIssues(pilot, ctx) {
  // ctx: { workflow_status, tenant_status, publication_health, health,
  //        custom_domains, invitations, first_sale_pending_days }
  const out = [];
  const DAY = 24 * 3600 * 1000;
  const since = (key) => {
    const m = (pilot.milestones || []).find(x => x.key === key);
    return m ? Date.now() - new Date(m.at).getTime() : null;
  };
  const stage = pilot.stage;
  if (stage === 'OPERATOR_INVITED' && since('invitation_sent') != null && since('invitation_sent') > 2 * DAY) {
    out.push({ code: 'invitation_not_accepted', label: 'Invitation not accepted', severity: 'yellow' });
  }
  if (stage === 'SETUP_IN_PROGRESS' && ctx.last_activity_at && Date.now() - new Date(ctx.last_activity_at).getTime() > 7 * DAY) {
    out.push({ code: 'setup_stalled', label: 'Setup stalled', severity: 'yellow' });
  }
  if (ctx.workflow_status === 'ready_for_review') out.push({ code: 'waiting_for_review', label: 'Waiting for review', severity: 'yellow' });
  if (ctx.workflow_status === 'changes_requested') out.push({ code: 'changes_requested', label: 'Changes requested', severity: 'yellow' });
  if ((ctx.custom_domains || []).some(d => d.status === 'reserved' || d.status === 'verification_pending')) {
    out.push({ code: 'domain_verification_pending', label: 'Domain verification pending', severity: 'yellow' });
  }
  if (ctx.publication_health && (ctx.publication_health.failed > 0 || ctx.publication_health.update_pending > 0)) {
    out.push({ code: 'publication_error', label: 'Publication error', severity: 'red' });
  }
  if (ctx.health === 'warning') out.push({ code: 'site_health_warning', label: 'Site Health warning', severity: 'yellow' });
  if (ctx.health === 'fail') out.push({ code: 'site_health_problem', label: 'Site Health problem', severity: 'red' });
  if (ctx.form_problem) out.push({ code: 'form_problem', label: 'Form problem', severity: 'yellow' });
  if (['PLATFORM_SITE_LIVE', 'CUSTOM_DOMAIN_PENDING', 'CUSTOM_DOMAIN_LIVE'].includes(stage)) {
    const published = (pilot.milestones || []).find(x => x.key === 'published');
    if (published && Date.now() - new Date(published.at).getTime() > 3 * DAY && !(pilot.milestones || []).some(x => x.key === 'first_sale_published')) {
      out.push({ code: 'first_sale_not_tested', label: 'First sale not yet tested', severity: 'yellow' });
    }
  }
  return out;
}

// ── Part 39 — per-site scorecard (GREEN/YELLOW/RED, documented rules) ─────────
export function pilotScorecard(pilot, ctx) {
  const s = (cond) => (cond === true ? 'GREEN' : cond === false ? 'RED' : 'YELLOW');
  const fr = pilot.friction_events || [];
  const openFr = fr.filter(f => !f.resolved);
  const ai = ctx.acceptance || null;
  return {
    categories: [
      { key: 'onboarding', label: 'Onboarding', status: pilot.stage === 'CANDIDATE' ? 'YELLOW' : s(!(pilot.friction_events || []).some(f => f.kind === 'invitation_expired')) },
      { key: 'setup', label: 'Setup', status: s(!openFr.some(f => ['save_failed', 'upload_failed', 'step_abandoned'].includes(f.kind))) },
      { key: 'content', label: 'Content', status: ai ? (ai.rejected_count > 0 ? 'YELLOW' : 'GREEN') : 'YELLOW' },
      { key: 'sales_integration', label: 'Sales Integration', status: s(!((ctx.publication_health || {}).failed > 0)) },
      { key: 'lead_generation', label: 'Lead Generation', status: s(!(pilot.milestones || []).some(m => m.key === 'first_seller_lead') && ['PLATFORM_SITE_LIVE', 'CUSTOM_DOMAIN_PENDING', 'CUSTOM_DOMAIN_LIVE'].includes(pilot.stage) ? 'YELLOW' : (pilot.milestones || []).some(m => m.key === 'first_seller_lead')) },
      { key: 'domain', label: 'Domain', status: s((ctx.custom_domains || []).some(d => ['reserved', 'verification_pending', 'error'].includes(d.status)) ? 'YELLOW' : true) },
      { key: 'seo', label: 'SEO', status: s(ctx.seo_problem ? 'YELLOW' : true) },
      { key: 'analytics', label: 'Analytics', status: s(ctx.analytics_problem ? 'YELLOW' : true) },
      { key: 'reliability', label: 'Reliability', status: s(ctx.health === 'fail' ? 'RED' : (ctx.health === 'warning' ? 'YELLOW' : true)) },
      { key: 'operator_satisfaction', label: 'Operator Satisfaction', status: latestSatisfaction(pilot) },
      { key: 'support_burden', label: 'Support Burden', status: (pilot.interventions || []).length >= 5 ? 'YELLOW' : 'GREEN' }
    ]
  };
}

function latestSatisfaction(pilot) {
  const fb = (pilot.operator_feedback || []).filter(f => f.kind === 'draft_rating' || f.kind === 'publication_survey');
  if (fb.length === 0) return 'YELLOW';
  const last = fb[fb.length - 1];
  const difficult = ['difficult', 'very_difficult', 'not_satisfied'];
  return difficult.includes(String(last.value || '')) ? 'RED' : 'GREEN';
}

// ── Part 41 — GO/NO-GO evidence framework ─────────────────────────────────────
export function goNoGo(pilots) {
  const p0 = [];
  const p1 = [];
  const p2 = [];
  const real = (pilots || []).filter(p => !p.is_synthetic);
  const published = real.filter(p => ['PLATFORM_SITE_LIVE', 'CUSTOM_DOMAIN_PENDING', 'CUSTOM_DOMAIN_LIVE', 'FIRST_SALE_PUBLISHED', 'FIRST_LEAD_RECEIVED', 'REVIEW_30_DAY', 'PILOT_COMPLETE'].includes(p.stage));
  const withSales = real.filter(p => (p.milestones || []).some(m => m.key === 'first_sale_published'));
  const withLeads = real.filter(p => (p.milestones || []).some(m => m.key === 'first_seller_lead'));
  const withSignups = real.filter(p => (p.milestones || []).some(m => m.key === 'first_buyer_signup'));
  const reds = [];
  for (const p of real) {
    for (const c of (p.scorecard_categories || [])) if (c.status === 'RED') reds.push(`${p.company_name}: ${c.label}`);
  }
  if (reds.some(r => /Sales Integration|Reliability/.test(r))) p0.push('Publication/runtime reliability RED on at least one pilot site');
  if (withLeads.length === 0 && published.length > 0) p1.push('No seller lead captured on any live pilot site — lead funnel unproven on real traffic');
  if (withSales.length === 0 && published.length > 0) p1.push('No sale published on any live pilot site — canonical sale flow unproven');
  const interventionsAvg = real.length ? real.reduce((n, p) => n + (p.interventions || []).length, 0) / real.length : 0;
  if (interventionsAvg >= 5) p1.push('Admin intervention burden high (avg ≥ 5 per pilot)');
  p2.push('Cosmetic/feature requests captured — deferred by design (Part 42)');
  const ready = published.length > 0 && p0.length === 0 && withSales.length > 0;
  return {
    recommendation: ready ? 'READY FOR GENERAL RELEASE' : 'NOT READY FOR GENERAL RELEASE',
    evidence: {
      pilots_total: real.length,
      published,
      with_sales: withSales.length,
      with_seller_leads: withLeads.length,
      with_buyer_signups: withSignups.length,
      avg_interventions: Math.round(interventionsAvg * 10) / 10,
      red_categories: reds
    },
    p0, p1, p2
  };
}