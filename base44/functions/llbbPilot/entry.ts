// Phase 5A — Controlled Pilot Program control plane (llbbPilot).
// Pilot metadata ONLY: stages, eligibility, invitations preview, milestones,
// friction, interventions, notes, feedback, checklists, checks, acceptance,
// attention, aggregate reporting, presentation reset and synthetic cleanup.
// NEVER creates tenants, domains, publications, sales or leads itself —
// provisioning/launch reuses the certified provisionWebsiteTenant + websiteCollab
// + llbbAdmin seams; invitation send reuses websiteCollab invite_client.
// Authorization: control actions PLATFORM-ADMIN ONLY; operator_status/operator_signal
// additionally allowed for tenant company members (server-derived identity only).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertTenantAccess, evaluateWebsiteEntitlement, SITES_HOST } from '../../shared/websiteTenantService.ts';
import { computeReadiness, detectPlaceholders } from '../../shared/llbbSetupEngine.ts';
import { projectPublicSettings, getTenantSettings } from '../../shared/websiteSettingsService.ts';
import { resolveWebsiteTenant } from '../../shared/websiteRuntimeService.ts';
import { jerr, pageOf } from '../../shared/websiteCollabShared.ts';
import {
  PILOT_STAGES, PILOT_STAGE_LABELS, MILESTONE_STAGE, MILESTONE_LABELS,
  PILOT_CHECKLIST, ELIGIBILITY_CHECKS, FRICTION_KINDS, INTERVENTION_CATEGORIES,
  computeSetupTiming, attentionIssues, pilotScorecard, goNoGo
} from '../../shared/llbbPilotModel.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_ONLY = ['candidates', 'eligibility', 'approve', 'list', 'detail', 'attach_tenant',
  'simulate_invitation', 'record_milestone', 'record_friction', 'record_intervention',
  'add_note', 'add_feature_request', 'toggle_checklist', 'record_check', 'complete_30d',
  'reset_presentation', 'attention', 'aggregate', 'cleanup_synthetic'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || '';

    if (action === 'operator_status') return await operatorStatus(base44, service, user, body);
    if (action === 'operator_signal') return await operatorSignal(base44, service, user, body);

    if (!ADMIN_ONLY.includes(action)) return jerr('unknown_action', 'Unknown llbbPilot action', 400);
    if (user.role !== 'admin') return jerr('admin_only', 'The Pilot Launch Center is platform-admin only', 403);

    switch (action) {
      case 'candidates': return await candidates(service, body);
      case 'eligibility': return await eligibility(service, body);
      case 'approve': return await approve(service, user, body);
      case 'list': return await list(service);
      case 'detail': return await detail(base44, service, body);
      case 'attach_tenant': return await attachTenant(service, user, body);
      case 'simulate_invitation': return await simulateInvitation(service, user, body);
      case 'record_milestone': return await milestoneAction(service, user, body);
      case 'record_friction': return await recordFriction(service, user, body);
      case 'record_intervention': return await recordIntervention(service, user, body);
      case 'add_note': return await addNote(service, user, body);
      case 'add_feature_request': return await addFeatureRequest(service, user, body);
      case 'toggle_checklist': return await toggleChecklist(service, user, body);
      case 'record_check': return await recordCheck(service, user, body);
      case 'complete_30d': return await complete30d(service, user, body);
      case 'reset_presentation': return await resetPresentation(service, user, body);
      case 'attention': return await attention(service);
      case 'aggregate': return await aggregate(service);
      case 'cleanup_synthetic': return await cleanupSynthetic(service, user, body);
      default: return jerr('unknown_action', 'Unknown llbbPilot action', 400);
    }
  } catch (error) {
    console.error('llbbPilot error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}

// ═══════════════ PART 4 — PILOT ELIGIBILITY ═══════════════
async function eligibilityChecks(service, company, adminUserId) {
  const results = [];
  const add = (key, ok, detail) => results.push({ key, label: (ELIGIBILITY_CHECKS.find(c => c.key === key) || {}).label || key, ok: !!ok, detail: detail || null });

  add('company_active', company.status === 'active', `Company status: ${company.status}`);

  let owner = null;
  if (company.primary_contact_user_id) {
    owner = await service.entities.User.get(company.primary_contact_user_id).catch(() => null);
  }
  add('owner_contact', !!owner, owner ? (owner.full_name || owner.email) : 'No authorized owner/contact set');

  const email = (owner && owner.email) || company.email || null;
  add('valid_email', !!(email && EMAIL_RE.test(email)), email ? email : 'No valid email on file');

  const phone = (owner && owner.phone) || company.phone || null;
  add('valid_phone', !!phone, phone ? phone : 'No phone on file (optional)');

  const members = Array.from(new Set([...(company.member_user_ids || []), company.primary_contact_user_id].filter(Boolean)));
  add('membership_valid', members.length > 0, `${members.length} member(s)`);

  const ent = await evaluateWebsiteEntitlement(service, company);
  const tenantPage = await service.entities.WebsiteTenant.filter({ company_id: company.id }, { limit: 500 });
  const tenants = pageOf(tenantPage);
  const live = tenants.filter(t => t.status !== 'archived');
  const capacityOk = ent.allowed && (ent.allowance === 'unlimited' || live.length < ent.allowance);
  add('entitlement', !!ent.allowed, ent.allowed ? `Tier ${ent.tier} (${ent.allowance === 'unlimited' ? 'unlimited' : ent.allowance} site(s), ${live.length} in use)` : (ent.reason || 'not eligible'));
  add('no_conflicting_tenant', capacityOk && live.length === 0 ? true : capacityOk, live.length === 0 ? 'No existing website' : `Existing: ${live.map(t => t.name).join(', ')}`);

  let assigned = null;
  if (adminUserId) assigned = await service.entities.User.get(adminUserId).catch(() => null);
  add('admin_assigned', !!assigned, assigned ? (assigned.full_name || assigned.email) : 'No admin assigned');

  return { checks: results, eligible: results.every(r => r.ok || r.key === 'valid_phone'), company, owner, live, ent };
}

async function candidates(service, body) {
  const q = String(body.q || '').trim();
  const page = q
    ? await service.entities.Company.filter(
        { $or: [{ display_name: { $regex: q, $options: 'i' } }, { legal_name: { $regex: q, $options: 'i' } }] }, { limit: 20 })
    : await service.entities.Company.filter({ status: 'active' }, { limit: 25, sort: '-updated_date' });
  const companies = pageOf(page);
  const pilots = pageOf(await service.entities.LlbbPilot.filter({}, { limit: 500 }));
  const out = [];
  for (const c of companies) {
    const el = await eligibilityChecks(service, c, null);
    const existing = pilots.find(p => p.company_id === c.id && p.stage !== 'PILOT_COMPLETE');
    out.push({
      id: c.id,
      display_name: c.display_name || c.legal_name,
      owner: el.owner ? { name: el.owner.full_name || null, email: el.owner.email || null } : null,
      city: c.city || null, state: c.state || null,
      checks: el.checks,
      eligible: el.eligible,
      already_in_pilot: !!existing
    });
  }
  return Response.json({ ok: true, companies: out });
}

async function eligibility(service, body) {
  const company = await service.entities.Company.get(body.company_id || '').catch(() => null);
  if (!company) return jerr('company_not_found', 'Company not found', 404);
  const el = await eligibilityChecks(service, company, body.assigned_admin_user_id || null);
  return Response.json({
    ok: true,
    checks: el.checks,
    eligible: el.eligible,
    management_mode_options: ['admin_managed', 'client_managed', 'collaborative']
  });
}

// ═══════════════ PART 5 — APPROVE FOR PILOT (no provisioning) ═══════════════
async function approve(service, user, body) {
  const company = await service.entities.Company.get(body.company_id || '').catch(() => null);
  if (!company) return jerr('company_not_found', 'Company not found', 404);
  if (body.confirm !== true) {
    return jerr('confirm_required', 'Approve For Pilot requires explicit confirmation', 400);
  }
  const el = await eligibilityChecks(service, company, body.assigned_admin_user_id || user.id);
  if (!el.eligible) {
    return Response.json({ error: { code: 'not_eligible', message: 'Company is not eligible for pilot — see checks', checks: el.checks } }, { status: 409 });
  }
  const dupPage = await service.entities.LlbbPilot.filter({ company_id: company.id }, { limit: 5 });
  const existing = pageOf(dupPage).find(p => p.stage !== 'PILOT_COMPLETE');
  if (existing) return jerr('already_in_pilot', 'This company already has an active pilot', 409);

  const mode = ['admin_managed', 'client_managed', 'collaborative'].includes(body.management_mode) ? body.management_mode : 'collaborative';
  const assigned = await service.entities.User.get(body.assigned_admin_user_id || user.id).catch(() => null);
  const pilot = await service.entities.LlbbPilot.create({
    company_id: company.id,
    company_name: company.display_name || company.legal_name,
    stage: 'APPROVED_FOR_PILOT',
    management_mode: mode,
    assigned_admin_user_id: assigned ? assigned.id : user.id,
    assigned_admin_name: assigned ? (assigned.full_name || null) : (user.full_name || null),
    invited_email: body.invited_email ? String(body.invited_email).trim().toLowerCase() : ((el.owner && el.owner.email) || null),
    invited_display_name: body.invited_display_name || (el.owner ? el.owner.full_name : null),
    eligibility_snapshot: { checks: el.checks, approved_by: user.id, approved_at: new Date().toISOString(), tier: el.ent.tier || null },
    checklist: PILOT_CHECKLIST.filter(i => i.auto).map(i => ({ key: i.key, label: i.label, done: i.key === 'company_verified' || i.key === 'entitlement_verified', done_at: (i.key === 'company_verified' || i.key === 'entitlement_verified') ? new Date().toISOString() : null })),
    milestones: [],
    setup_choice: 'none',
    is_synthetic: body.is_synthetic === true,
    notes: body.notes || null
  });
  return Response.json({ ok: true, pilot });
}

// ═══════════════ PART 6 — attach launched tenant (certified provisioning ran) ═══════════════
async function attachTenant(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  if (tenant.company_id !== pilot.company_id) return jerr('company_mismatch', 'Tenant belongs to a different Company', 403);
  if (tenant.created_via !== 'llbb') return jerr('not_llbb_tenant', 'Pilot websites must be Business Builder websites', 403);
  if (pilot.website_tenant_id && pilot.website_tenant_id !== tenant.id) return jerr('already_attached', 'Pilot already has a website attached', 409);
  await service.entities.LlbbPilot.update(pilot.id, { website_tenant_id: tenant.id });
  return recordMilestone(service, user, { pilot_id: pilot.id, key: 'website_created', detail: tenant.name });
}

// ═══════════════ PART 8 — INVITATION PREVIEW / SIMULATED SEND ═══════════════
async function simulateInvitation(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!pilot.is_synthetic) return jerr('synthetic_only', 'Simulated invitations are only allowed on synthetic certification pilots — real invitations go through the certified invite seam', 403);
  return recordMilestone(service, user, { pilot_id: pilot.id, key: 'invitation_sent', detail: 'Simulated invitation (synthetic certification — no email sent)' });
}

// ═══════════════ PARTS 11-18 — MILESTONES / FRICTION / NOTES / FEEDBACK ═══════════════
function stageFor(pilot, key) {
  if (key === 'changes_requested') return 'CHANGES_REQUESTED';
  if (key === 'resubmitted') return 'READY_FOR_REVIEW';
  return MILESTONE_STAGE[key] || null;
}

async function recordMilestone(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  const key = body.key;
  if (!MILESTONE_LABELS[key]) return jerr('unknown_milestone', 'Unknown milestone', 400);
  const milestones = [...(pilot.milestones || [])];
  const existing = milestones.find(m => m.key === key);
  if (!existing) {
    milestones.push({ key, at: new Date().toISOString(), by: user ? user.id : 'system', detail: body.detail || null });
  }
  const patch = { milestones };
  // Stage advance (forward only, except the changes_requested branch).
  const target = stageFor(pilot, key);
  if (target) {
    const curIdx = PILOT_STAGES.indexOf(pilot.stage);
    const newIdx = PILOT_STAGES.indexOf(target);
    if (key === 'changes_requested' || key === 'resubmitted' || newIdx > curIdx) patch.stage = target;
  }
  // Checklist auto-ticks.
  const checklist = [...(pilot.checklist || [])];
  const AUTO = {
    website_created: ['website_provisioned'], invitation_sent: ['operator_invited'],
    invitation_accepted: ['invitation_accepted'], setup_started: null, first_preview: ['preview_completed'],
    submitted_for_review: ['submitted', 'readiness_passed'], approved: ['approved'],
    published: ['platform_site_published'], first_sale_published: ['sales_tested'],
    first_inventory_update: ['inventory_tested'], first_seller_lead: ['first_lead_verified'],
    first_buyer_signup: null, review_30d: ['review_30d_complete'], custom_domain_pending: ['custom_domain_if_desired'],
    custom_domain_live: ['custom_domain_if_desired']
  };
  const ticks = AUTO[key];
  if (ticks) {
    for (const t of ticks) {
      if (!checklist.find(c => c.key === t)) checklist.push({ key: t, label: t, done: true, done_at: new Date().toISOString() });
      else {
        const item = checklist.find(c => c.key === t);
        if (!item.done) { item.done = true; item.done_at = new Date().toISOString(); }
      }
    }
    patch.checklist = checklist;
  }
  const updated = await service.entities.LlbbPilot.update(pilot.id, patch);
  return Response.json({ ok: true, pilot: updated, advanced: patch.stage || null });
}

async function milestoneAction(service, user, body) {
  return recordMilestone(service, user, body);
}

async function recordFriction(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!FRICTION_KINDS.includes(body.kind)) return jerr('unknown_friction_kind', 'Unknown friction kind', 400);
  const events = [...(pilot.friction_events || [])];
  events.push({ kind: body.kind, detail: String(body.detail || '').slice(0, 500), at: new Date().toISOString(), resolved: body.resolved === true });
  const updated = await service.entities.LlbbPilot.update(pilot.id, { friction_events: events });
  return Response.json({ ok: true, pilot: updated });
}

async function recordIntervention(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!INTERVENTION_CATEGORIES.includes(body.category)) return jerr('unknown_category', 'Unknown intervention category', 400);
  const events = [...(pilot.interventions || [])];
  events.push({ category: body.category, note: String(body.note || '').slice(0, 500), at: new Date().toISOString(), by: user.id });
  const updated = await service.entities.LlbbPilot.update(pilot.id, { interventions: events });
  return Response.json({ ok: true, pilot: updated });
}

async function addNote(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  const text = String(body.text || '').trim();
  if (!text) return jerr('text_required', 'Note text required', 400);
  const notes = [...(pilot.pilot_notes || [])];
  notes.push({ text: text.slice(0, 1000), at: new Date().toISOString(), by: user.id });
  const updated = await service.entities.LlbbPilot.update(pilot.id, { pilot_notes: notes });
  return Response.json({ ok: true, pilot: updated });
}

async function addFeatureRequest(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!['launch_blocker', 'high_value', 'nice_to_have', 'future'].includes(body.bucket)) return jerr('bad_bucket', 'Unknown bucket', 400);
  const reqs = [...(pilot.feature_requests || [])];
  reqs.push({ title: String(body.title || '').slice(0, 300), bucket: body.bucket, at: new Date().toISOString() });
  const updated = await service.entities.LlbbPilot.update(pilot.id, { feature_requests: reqs });
  return Response.json({ ok: true, pilot: updated });
}

async function toggleChecklist(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  const checklist = [...(pilot.checklist || [])];
  let item = checklist.find(c => c.key === body.key);
  if (!item) {
    const def = PILOT_CHECKLIST.find(c => c.key === body.key);
    if (!def) return jerr('unknown_item', 'Unknown checklist item', 400);
    item = { key: def.key, label: def.label, done: false, done_at: null };
    checklist.push(item);
  }
  item.done = body.done !== false;
  item.done_at = item.done ? new Date().toISOString() : null;
  if (body.note) item.note = String(body.note).slice(0, 300);
  const updated = await service.entities.LlbbPilot.update(pilot.id, { checklist });
  return Response.json({ ok: true, pilot: updated });
}

async function recordCheck(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!['24h', '7d', '30d'].includes(body.kind)) return jerr('bad_kind', 'kind must be 24h, 7d or 30d', 400);
  if (!['pass', 'warn', 'fail'].includes(body.result)) return jerr('bad_result', 'result must be pass/warn/fail', 400);
  const checks = [...(pilot.checks || [])];
  checks.push({
    kind: body.kind, at: new Date().toISOString(), result: body.result,
    summary: String(body.summary || '').slice(0, 500),
    items: Array.isArray(body.items) ? body.items.slice(0, 30) : []
  });
  const patch = { checks };
  if (body.kind === '7d') {
    const ms = [...(pilot.milestones || [])];
    if (!ms.find(m => m.key === 'check_7d')) {
      ms.push({ key: 'check_7d', at: new Date().toISOString(), by: user.id, detail: body.result });
      patch.milestones = ms;
    }
  }
  const updated = await service.entities.LlbbPilot.update(pilot.id, patch);
  return Response.json({ ok: true, pilot: updated });
}

async function complete30d(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!['pass', 'pass_with_improvements', 'extend_pilot', 'fail'].includes(body.recommendation)) {
    return jerr('bad_recommendation', 'Recommendation must be pass / pass_with_improvements / extend_pilot / fail', 400);
  }
  const patch = { review_30d: { recommendation: body.recommendation, summary: String(body.summary || '').slice(0, 2000), at: new Date().toISOString(), by: user.id } };
  const ms = [...(pilot.milestones || [])];
  if (!ms.find(m => m.key === 'review_30d')) {
    ms.push({ key: 'review_30d', at: new Date().toISOString(), by: user.id, detail: body.recommendation });
    patch.milestones = ms;
  }
  const updated = await service.entities.LlbbPilot.update(pilot.id, patch);
  return Response.json({ ok: true, pilot: updated });
}

// ═══════════════ PARTS 32/33 — SAFE PRESENTATION RESET ═══════════════
async function resetPresentation(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (body.confirm !== true) return jerr('confirm_required', 'Reset requires explicit confirmation — human edits will be lost', 400);
  const tenant = pilot.website_tenant_id ? await service.entities.WebsiteTenant.get(pilot.website_tenant_id).catch(() => null) : null;
  if (!tenant) return jerr('tenant_not_found', 'This pilot has no website yet', 404);
  if (tenant.status === 'active') return jerr('site_live', 'Presentation reset is not allowed while the site is live — suspend it first', 409);
  const settings = await getTenantSettings(service, tenant.id);
  if (!settings) return jerr('settings_not_found', 'Website settings not found', 404);

  // Snapshot the current presentation first (rollback safety, Part 34).
  const SNAP_KEYS = ['homepage', 'why_choose_us', 'how_it_works', 'trust', 'about', 'services', 'testimonials', 'gallery', 'faq', 'cta', 'branding'];
  const snapshot = {};
  for (const k of SNAP_KEYS) snapshot[k] = settings[k] || null;
  await service.entities.LlbbSettingsVersion.create({
    website_tenant_id: tenant.id, company_id: tenant.company_id,
    section: 'pilot_reset', label: 'Before pilot presentation reset',
    origin: 'human_edit', settings_version: settings.settings_version || 1,
    snapshot, member_user_ids: tenant.member_user_ids || []
  });

  // Reset content + design tokens to platform defaults. Never touches:
  // Company, Sales, Inventory, Leads, domains, Publication, contact, legal, seo.
  const RESET = {};
  for (const k of ['homepage', 'why_choose_us', 'how_it_works', 'trust', 'about', 'services', 'testimonials', 'gallery', 'faq', 'cta']) RESET[k] = {};
  RESET.branding = { logo_url: (settings.branding || {}).logo_url || null };
  RESET.ai_provenance = { ...(settings.ai_provenance || {}), sections: {}, generated_at: null, generated_by_ai: false, reset_at: new Date().toISOString(), reset_by: user.id };
  await service.entities.WebsiteTenantSettings.update(settings.id, {
    ...RESET, settings_version: (settings.settings_version || 1) + 1,
    last_saved_section: 'pilot_reset', last_saved_by: user.id
  });
  return Response.json({ ok: true, reset: true, snapshot_preserved: true });
}

// ═══════════════ PARTS 2/26/27/30 — LIST / DETAIL / ATTENTION ═══════════════
async function list(service) {
  const pilots = pageOf(await service.entities.LlbbPilot.filter({}, { limit: 500, sort: '-created_date' }));
  const rows = [];
  for (const p of pilots) {
    const ctx = await tenantCtx(service, p);
    rows.push(rowFor(p, ctx));
  }
  return Response.json({ ok: true, rows, labels: PILOT_STAGE_LABELS });
}

async function tenantCtx(service, p) {
  if (!p.website_tenant_id) return { tenant: null };
  const tenant = await service.entities.WebsiteTenant.get(p.website_tenant_id).catch(() => null);
  if (!tenant) return { tenant: null };
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  const domPage = await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 25 });
  const domains = pageOf(domPage);
  const platformDomain = domains.find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const customDomains = domains.filter(d => d.domain_type === 'custom_domain');
  const destination = tenant.destination_id ? await service.entities.Destination.get(tenant.destination_id).catch(() => null) : null;
  const settings = await getTenantSettings(service, tenant.id);
  const pubPage = destination ? await service.entities.Publication.filter({ destination_id: destination.id }, { limit: 500 }) : { items: [] };
  const pubs = pageOf(pubPage);
  const leadCount = await service.entities.WebsiteLead.count({ website_tenant_id: tenant.id }).catch(() => 0);

  // Inline summarized Site Health (full center stays in websiteSiteHealth).
  let health = 'unknown', healthDetail = null;
  const isLive = tenant.status === 'active';
  const resolution = isLive ? await resolveWebsiteTenant(service, `${tenant.slug}.${SITES_HOST}`).catch(() => ({ ok: false, error: 'probe_failed' })) : { ok: true };
  const pubFailed = pubs.filter(x => x.status === 'failed').length;
  const contactOk = settings && (((settings.contact || {}).phone_display) || ((settings.contact || {}).email_display) || (company && company.phone) || (company && company.email));
  const placeholders = settings ? detectPlaceholders(settings) : [];
  if (!isLive) { health = 'not_live'; healthDetail = 'Website not published yet'; }
  else if (!resolution.ok || pubFailed > 0) { health = 'fail'; healthDetail = !resolution.ok ? `Runtime: ${resolution.error}` : 'Publication failures'; }
  else if (!contactOk || placeholders.length > 0) { health = 'warning'; healthDetail = !contactOk ? 'No contact path for forms' : `${placeholders.length} placeholder section(s)`; }
  else { health = 'healthy'; }

  const readiness = computeReadiness({ tenant, settings: projectPublicSettings(settings, company), destination, domains });
  return {
    tenant, company, domains, platformDomain, customDomains, destination, settings, pubs,
    lead_count: leadCount, health, health_detail: healthDetail,
    publication_health: {
      published: pubs.filter(x => x.status === 'published').length,
      failed: pubs.filter(x => x.status === 'failed').length,
      update_pending: pubs.filter(x => x.status === 'update_pending').length
    },
    readiness, workflow_status: tenant.workflow_status || 'draft',
    last_activity_at: tenant.last_activity_at || tenant.updated_date || null
  };
}

function rowFor(p, ctx) {
  const t = ctx.tenant;
  const issues = ctx.tenant ? attentionIssues(p, {
    workflow_status: ctx.workflow_status, tenant_status: t.status,
    publication_health: ctx.publication_health, health: ctx.health,
    custom_domains: ctx.customDomains, last_activity_at: ctx.last_activity_at
  }) : [];
  const checklistDone = (p.checklist || []).filter(c => c.done).length;
  const checklistTotal = Math.max((p.checklist || []).length, PILOT_CHECKLIST.length);
  return {
    id: p.id,
    company: { id: p.company_id, name: p.company_name },
    owner: ctx.company ? { name: null, email: ctx.company.email || null, phone: ctx.company.phone || null } : null,
    entitlement_tier: (p.eligibility_snapshot || {}).tier || null,
    website_status: t ? (t.workflow_status || 'draft') : null,
    management_mode: p.management_mode,
    setup_percent: ctx.readiness ? ctx.readiness.percent : null,
    review_status: t ? (t.workflow_status === 'ready_for_review' ? 'waiting_review' : t.workflow_status === 'changes_requested' ? 'changes_requested' : t.approved_at ? 'approved' : 'not_submitted') : null,
    publication_status: ctx.publication_health || null,
    platform_hostname: ctx.platformDomain ? ctx.platformDomain.hostname : (t ? `${t.slug}.${SITES_HOST}` : null),
    custom_domains: (ctx.customDomains || []).map(d => ({ hostname: d.hostname, status: d.status, verification_status: d.verification_status })),
    domain_status: (ctx.customDomains || []).length === 0 ? 'none' : ((ctx.customDomains || []).some(d => d.status === 'active' || d.status === 'verified') ? 'connected' : 'action_required'),
    last_activity_at: ctx.last_activity_at,
    health: ctx.health,
    sale_connection: ctx.publication_health ? { published: ctx.publication_health.published, failed: ctx.publication_health.failed } : null,
    lead_connection: ctx.tenant ? { count: ctx.lead_count, funnel_ok: ctx.health !== 'fail' } : null,
    stage: p.stage,
    stage_label: PILOT_STAGE_LABELS[p.stage] || p.stage,
    assigned_admin: p.assigned_admin_name || null,
    attention_required: issues,
    checklist_progress: { done: checklistDone, total: checklistTotal },
    is_synthetic: !!p.is_synthetic,
    setup_timing: computeSetupTiming(p.milestones)
  };
}

async function attention(service) {
  const pilots = pageOf(await service.entities.LlbbPilot.filter({}, { limit: 500 }));
  const out = [];
  for (const p of pilots) {
    if (p.stage === 'PILOT_COMPLETE') continue;
    const ctx = await tenantCtx(service, p);
    const row = rowFor(p, ctx);
    if (row.attention_required.length > 0) out.push({ pilot_id: p.id, company_name: p.company_name, stage: p.stage, issues: row.attention_required, website: row.platform_hostname });
  }
  return Response.json({ ok: true, items: out });
}

// ═══════════════ PARTS 30/18/17/21 — DETAIL (support mode) ═══════════════
async function detail(base44, service, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  const company = await service.entities.Company.get(pilot.company_id).catch(() => null);
  const ctx = await tenantCtx(service, pilot);
  const row = rowFor(pilot, ctx);

  // Support mode (Part 30): current step, blockers, open notes, health, domain, last error.
  const support = {};
  if (ctx.tenant) {
    const checklist = mergeChecklist(pilot.checklist);
    const nextItem = checklist.find(c => !c.done);
    support.current_step = nextItem ? nextItem.label : 'All checklist items complete';
    support.readiness_blockers = (ctx.readiness.blockers || []).map(b => ({ key: b.key, label: b.label, reason: b.reason }));
    support.open_review_notes = (ctx.tenant.id
      ? pageOf(await service.entities.WebsiteReviewNote.filter({ website_tenant_id: ctx.tenant.id, status: 'open' }, { limit: 50 }))
      : []).length;
    support.health = { status: ctx.health, detail: ctx.health_detail };
    support.domain_state = (ctx.customDomains || []).map(d => ({ hostname: d.hostname, status: d.status })) || [];
    support.last_error = null;
    const failedPub = (ctx.pubs || []).find(x => x.status === 'failed');
    if (failedPub) support.last_error = failedPub.last_error || 'publication_failed';
    support.last_activity_at = ctx.last_activity_at;
  }

  // Acceptance report (Parts 17/18) — from ai_provenance only.
  const acceptance = buildAcceptance(ctx.settings, ctx.pubs);

  const scorecard = pilotScorecard(pilot, { acceptance, publication_health: ctx.publication_health, health: ctx.health, custom_domains: ctx.customDomains, milestones: pilot.milestones });
  const timing = computeSetupTiming(pilot.milestones);

  return Response.json({
    ok: true,
    pilot: {
      id: pilot.id, company_id: pilot.company_id, company_name: pilot.company_name,
      website_tenant_id: pilot.website_tenant_id, stage: pilot.stage, stage_label: PILOT_STAGE_LABELS[pilot.stage],
      management_mode: pilot.management_mode, assigned_admin_name: pilot.assigned_admin_name,
      invited_email: pilot.invited_email, invited_display_name: pilot.invited_display_name,
      eligibility_snapshot: pilot.eligibility_snapshot || {}, setup_choice: pilot.setup_choice || 'none',
      checklist: mergeChecklist(pilot.checklist),
      milestones: (pilot.milestones || []).map(m => ({ ...m, label: MILESTONE_LABELS[m.key] || m.key })),
      friction_events: pilot.friction_events || [], interventions: pilot.interventions || [],
      pilot_notes: pilot.pilot_notes || [], operator_feedback: pilot.operator_feedback || [],
      feature_requests: pilot.feature_requests || [], checks: pilot.checks || [],
      review_30d: pilot.review_30d || null, is_synthetic: !!pilot.is_synthetic,
      notes: pilot.notes || null
    },
    website: ctx.tenant ? {
      id: ctx.tenant.id, name: ctx.tenant.name, status: ctx.tenant.status, workflow_status: ctx.workflow_status,
      platform_hostname: row.platform_hostname, custom_domains: row.custom_domains,
      readiness: { percent: ctx.readiness.percent, blockers: (ctx.readiness.blockers || []).map(b => ({ key: b.key, label: b.label, reason: b.reason })) },
      publication_health: ctx.publication_health, lead_count: ctx.lead_count, health: ctx.health, health_detail: ctx.health_detail
    } : null,
    company: company ? { display_name: company.display_name || company.legal_name, email: company.email || null, phone: company.phone || null, city: company.city || null, state: company.state || null, status: company.status } : null,
    support, acceptance, scorecard, timing,
    friction_kinds: FRICTION_KINDS, intervention_categories: INTERVENTION_CATEGORIES
  });
}

function mergeChecklist(items) {
  const list = [...(items || [])];
  for (const def of PILOT_CHECKLIST) {
    if (!list.find(c => c.key === def.key)) list.push({ key: def.key, label: def.label, done: false, done_at: null });
  }
  const order = PILOT_CHECKLIST.map(c => c.key);
  return list.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

function buildAcceptance(settings, pubs) {
  const prov = (settings && settings.ai_provenance) || {};
  const sections = prov.sections || {};
  const rows = [];
  for (const [key, s] of Object.entries(sections)) {
    rows.push({ section: key, origin: s.origin || 'ai', accepted_unchanged: !s.human_edited_at, human_edited_at: s.human_edited_at || null });
  }
  const edited = rows.filter(r => !r.accepted_unchanged).length;
  return {
    has_ai_content: rows.length > 0,
    sections: rows,
    accepted_count: rows.filter(r => r.accepted_unchanged).length,
    edited_count: edited,
    rejected_count: (prov.rejected_fields || []).length,
    factual_confirmed: !!((prov.factual_confirmation || {}).confirmed)
  };
}

// ═══════════════ PARTS 39/40/41 — AGGREGATE REPORT ═══════════════
async function aggregate(service) {
  const pilots = pageOf(await service.entities.LlbbPilot.filter({}, { limit: 500 }));
  const real = pilots.filter(p => !p.is_synthetic);
  const rows = [];
  const goNoGoRows = [];
  for (const p of real) {
    const ctx = await tenantCtx(service, p);
    const row = rowFor(p, ctx);
    const sc = pilotScorecard(p, { publication_health: ctx.publication_health, health: ctx.health, custom_domains: ctx.customDomains });
    row.scorecard_categories = sc.categories;
    rows.push(row);
    goNoGoRows.push({ ...p, scorecard_categories: sc.categories });
  }
  const has = (p, key) => (p.milestones || []).some(m => m.key === key);
  const inPublishedStages = (p) => ['PLATFORM_SITE_LIVE', 'CUSTOM_DOMAIN_PENDING', 'CUSTOM_DOMAIN_LIVE', 'FIRST_SALE_PUBLISHED', 'FIRST_LEAD_RECEIVED', 'REVIEW_30_DAY', 'PILOT_COMPLETE'].includes(p.stage);
  const durations = real.map(p => computeSetupTiming(p.milestones).total.hours).filter(v => v != null).sort((a, b) => a - b);
  const median = durations.length ? (durations.length % 2 ? durations[(durations.length - 1) / 2] : (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2) : null;
  const frictionCounts = {};
  for (const p of real) for (const f of (p.friction_events || [])) frictionCounts[f.kind] = (frictionCounts[f.kind] || 0) + 1;
  const topFriction = Object.entries(frictionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([kind, count]) => ({ kind, count }));
  const decision = goNoGo(goNoGoRows);
  return Response.json({
    ok: true,
    summary: {
      operators_invited: real.filter(p => p.stage !== 'CANDIDATE' && p.stage !== 'APPROVED_FOR_PILOT').length,
      accepted: real.filter(p => has(p, 'invitation_accepted')).length,
      setup_completed: real.filter(p => has(p, 'setup_completed') || has(p, 'submitted_for_review')).length,
      published: real.filter(p => inPublishedStages(p)).length,
      custom_domains: rows.filter(r => r.domain_status === 'connected').length,
      first_sales: real.filter(p => has(p, 'first_sale_published')).length,
      seller_leads: real.filter(p => has(p, 'first_seller_lead')).length,
      buyer_signups: real.filter(p => has(p, 'first_buyer_signup')).length,
      median_setup_days: median,
      admin_interventions: real.reduce((n, p) => n + (p.interventions || []).length, 0),
      top_friction: topFriction,
      health_issues: rows.filter(r => r.health === 'warning' || r.health === 'fail').length
    },
    rows, decision
  });
}

// ═══════════════ PART 50 — SYNTHETIC CLEANUP (exact IDs) ═══════════════
async function cleanupSynthetic(service, user, body) {
  const pilot = await service.entities.LlbbPilot.get(body.pilot_id || '').catch(() => null);
  if (!pilot) return jerr('pilot_not_found', 'Pilot not found', 404);
  if (!pilot.is_synthetic) return jerr('not_synthetic', 'Only synthetic certification pilots can be cleaned this way', 403);
  const ids = pilot.synthetic_ids || {};
  const deleted = [];
  const del = async (entity, id) => {
    if (!id) return;
    const ok = await service.entities[entity].delete(id).then(() => true).catch(() => false);
    if (ok) deleted.push(`${entity}:${id}`);
  };
  for (const id of (ids.publication_ids || [])) await del('Publication', id);
  for (const id of (ids.item_ids || [])) await del('Item', id);
  for (const id of (ids.lead_ids || [])) await del('WebsiteLead', id);
  for (const id of (ids.event_ids || [])) await del('WebsiteEvent', id);
  for (const id of (ids.outbox_ids || [])) await del('IdentityActivityOutbox', id);
  for (const id of (ids.generation_ids || [])) await del('LlbbAiGeneration', id);
  for (const id of (ids.version_ids || [])) await del('LlbbSettingsVersion', id);
  for (const id of (ids.activity_ids || [])) await del('WebsiteActivity', id);
  for (const id of (ids.invitation_ids || [])) await del('WebsiteInvitation', id);
  for (const id of (ids.review_note_ids || [])) await del('WebsiteReviewNote', id);
  await del('ConsumerMarketingProfile', ids.buyer_profile_id || null);
  await del('WebsiteSalePresentation', ids.presentation_id || null);
  await del('WebsiteTenantSettings', ids.settings_id || null);
  await del('WebsiteDomain', ids.domain_id || null);
  await del('WebsiteTenant', ids.tenant_id || null);
  await del('Destination', ids.destination_id || null);
  await del('EstateSale', ids.sale_id || null);
  await del('Company', ids.company_id || null);
  await service.entities.LlbbPilot.delete(pilot.id);
  return Response.json({ ok: true, deleted, residue: 0 });
}

// ═══════════════ OPERATOR-SIDE SEAM (tenant members) ═══════════════
async function pilotForTenant(service, tenantId) {
  const page = await service.entities.LlbbPilot.filter({ website_tenant_id: tenantId }, { limit: 5 });
  return pageOf(page)[0] || null;
}

async function operatorStatus(base44, service, user, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const pilot = await pilotForTenant(service, tenant.id);
  if (!pilot) return Response.json({ ok: true, pilot: null });
  // Workflow timing (Part 11): first operator arrival marks invitation accepted + setup started.
  const ms = [...(pilot.milestones || [])];
  let changed = false;
  for (const key of ['invitation_accepted', 'setup_started']) {
    if (!ms.find(m => m.key === key)) {
      ms.push({ key, at: new Date().toISOString(), by: user.id, detail: 'operator opened their website' });
      changed = true;
    }
  }
  if (changed) {
    const checklist = [...(pilot.checklist || [])];
    for (const t of ['invitation_accepted']) {
      const item = checklist.find(c => c.key === t);
      if (!item) checklist.push({ key: t, label: 'Invitation accepted', done: true, done_at: new Date().toISOString() });
      else if (!item.done) { item.done = true; item.done_at = new Date().toISOString(); }
    }
    const stage = pilot.stage === 'OPERATOR_INVITED' || pilot.stage === 'WEBSITE_CREATED' ? 'SETUP_IN_PROGRESS' : pilot.stage;
    await service.entities.LlbbPilot.update(pilot.id, { milestones: ms, checklist, stage });
    pilot.milestones = ms; pilot.checklist = checklist; pilot.stage = stage;
  }
  return Response.json({
    ok: true,
    pilot: {
      stage: pilot.stage, stage_label: PILOT_STAGE_LABELS[pilot.stage] || pilot.stage,
      setup_choice: pilot.setup_choice || 'none',
      feedback_given: (pilot.operator_feedback || []).map(f => f.kind),
      can_rate_draft: (pilot.milestones || []).some(m => m.key === 'first_draft'),
      can_survey: ['PLATFORM_SITE_LIVE', 'CUSTOM_DOMAIN_PENDING', 'CUSTOM_DOMAIN_LIVE', 'FIRST_SALE_PUBLISHED', 'FIRST_LEAD_RECEIVED', 'REVIEW_30_DAY', 'PILOT_COMPLETE'].includes(pilot.stage)
    }
  });
}

async function operatorSignal(base44, service, user, body) {
  const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
  if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const pilot = await pilotForTenant(service, tenant.id);
  if (!pilot) return Response.json({ ok: true, pilot: null, recorded: false });
  const kind = body.kind;
  const patch = {};

  if (kind === 'setup_choice') {
    const value = body.value === 'ai_build' ? 'ai_build' : body.value === 'self_custom' ? 'self_custom' : null;
    if (!value) return jerr('bad_value', 'setup_choice must be ai_build or self_custom', 400);
    patch.setup_choice = value;
    await service.entities.LlbbPilot.update(pilot.id, patch);
    return Response.json({ ok: true, recorded: true });
  }

  if (['ai_interview_started', 'ai_interview_completed', 'first_draft', 'first_preview', 'first_human_edit', 'setup_completed'].includes(kind)) {
    const r = await recordMilestone(service, user, { pilot_id: pilot.id, key: kind });
    return Response.json({ ok: true, recorded: true });
  }

  if (kind === 'draft_rating' || kind === 'publication_survey') {
    const feedback = [...(pilot.operator_feedback || [])];
    feedback.push({ kind, value: String(body.value || '').slice(0, 60), comment: String(body.comment || '').slice(0, 500), at: new Date().toISOString() });
    await service.entities.LlbbPilot.update(pilot.id, { operator_feedback: feedback });
    return Response.json({ ok: true, recorded: true });
  }

  return jerr('bad_kind', 'Unknown operator signal', 400);
}