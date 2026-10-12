// Phase 4F — LLBB AI WEBSITE BUILDER (server seam).
// Every action is tenant-scoped via server-derived identity; generation input
// is a structured allowlist; output is schema + claims validated; applied
// content stays inside certified Template #1 structured settings. AI NEVER
// provisions, publishes, or edits canonical Company/Sale data. Failure of the
// AI service never fails the website — tenants remain valid and the operator
// can retry, continue manually, or apply starter content (Parts 40-44).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertTenantAccess } from '../../shared/websiteTenantService.ts';
import { getTenantSettings } from '../../shared/websiteSettingsService.ts';
import { logActivity, jerr } from '../../shared/websiteCollabShared.ts';
import {
  SERVICE_VOCAB, TONES, PALETTES, buildGenerationInput, buildPrompt, OUTPUT_SCHEMA,
  validateDraft, editToolPrompt, starterDraft, buildSettingsPatch, loadActiveLibrary,
  PROVENANCE_SECTIONS
} from '../../shared/llbbAiContent.ts';

const pageOf = (p) => (p.items || p);
const LIB_VERSION_LABEL = 'v1';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case 'generate': return await generate(base44, service, user, body);
      case 'status': return await status(service, body);
      case 'regenerate_section': return await regenerateSection(base44, service, user, body);
      case 'edit_tool': return await editTool(base44, service, user, body);
      case 'apply_starter': return await applyStarter(base44, service, user, body);
      case 'confirm_facts': return await confirmFacts(base44, service, user, body);
      case 'versions': return await versions(service, user, body);
      case 'restore_version': return await restoreVersion(base44, service, user, body);
      default: return jerr('unknown_action', 'Unknown action', 400);
    }
  } catch (error) {
    console.error('llbbAiBuilder error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}

// ── Access + context ─────────────────────────────────────────────────────────
async function loadContext(service, user, tenantId) {
  const tenantPage = await service.entities.WebsiteTenant.filter({ id: tenantId }, { limit: 1 });
  const tenant = pageOf(tenantPage)[0];
  if (!tenant) return { error: jerr('tenant_not_found', 'Website not found', 404) };
  const access = assertTenantAccess(user, tenant);
  if (access.error) return { error: jerr(access.error.code, access.error.message, access.status || 403) };
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  const settings = await getTenantSettings(service, tenant.id);
  return { tenant, company, settings };
}

// ── GENERATE (Parts 21/22/40/41) ─────────────────────────────────────────────
async function generate(base44, service, user, body) {
  const ctx = await loadContext(service, user, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company, settings } = ctx;
  const requestId = typeof body.request_id === 'string' && body.request_id.length <= 80
    ? body.request_id : null;
  if (!requestId) return jerr('bad_request', 'request_id required', 400);

  // Idempotency (Part 41): a repeated click resolves to the same record —
  // generating returns the in-flight record, ready returns the draft.
  const existingPage = await service.entities.LlbbAiGeneration.filter(
    { website_tenant_id: tenant.id, request_id: requestId }, { limit: 1 });
  const existing = pageOf(existingPage)[0];
  if (existing && (existing.status === 'ready' || existing.status === 'generating' || existing.status === 'preparing')) {
    return Response.json({ request_id: requestId, status: existing.status, output: existing.output || null, rejected_fields: existing.rejected_fields || [] });
  }

  const interview = body.interview || {};
  const library = await loadActiveLibrary(service, interview.services);
  const input = buildGenerationInput({ company, tenant, settings, interview, library });

  let record = existing;
  if (!record) {
    record = await service.entities.LlbbAiGeneration.create({
      website_tenant_id: tenant.id, company_id: tenant.company_id, request_id: requestId,
      status: 'generating', target: 'full_draft',
      input_config: input,
      content_library_version: (library || []).map(m => `${m.content_key}@${m.version || 1}`).join(','),
      model: 'automatic',
      attempts: existing ? (existing.attempts || 1) + 1 : 1,
      member_user_ids: tenant.member_user_ids || []
    });
  } else {
    await service.entities.LlbbAiGeneration.update(record.id, {
      status: 'generating', attempts: (record.attempts || 1) + 1, last_error: null,
      input_config: input
    });
  }

  const prompt = buildPrompt(input, 'full_draft');
  let raw = null;
  try {
    raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt, response_json_schema: OUTPUT_SCHEMA
    });
  } catch (e) {
    // Part 40 — AI failure never fails the website: truthful failed status.
    await service.entities.LlbbAiGeneration.update(record.id, {
      status: 'failed', last_error: String(e && e.message || 'generation failed').slice(0, 500)
    });
    return Response.json({ request_id: requestId, status: 'failed', fallback_options: ['try_again', 'continue_manually', 'use_starter_content'] });
  }

  const { clean, rejected } = validateDraft(raw, input, library);
  await service.entities.LlbbAiGeneration.update(record.id, {
    status: 'ready', output: clean, rejected_fields: rejected, model: 'automatic'
  });

  const applied = await applyDraft(base44, service, user, tenant, settings, clean, input, library, requestId);
  return Response.json({
    request_id: requestId, status: 'ready', output: clean, rejected_fields: rejected,
    applied_sections: applied.sections, version_id: applied.versionId,
    fallback_options: []
  });
}

// ── STATUS (truthful; success only after validated persistence) ──────────────
async function status(service, body) {
  if (!body.request_id) return jerr('bad_request', 'request_id required', 400);
  const page = await service.entities.LlbbAiGeneration.filter(
    { website_tenant_id: body.website_tenant_id, request_id: body.request_id }, { limit: 1 });
  const rec = pageOf(page)[0];
  if (!rec) return jerr('not_found', 'Generation not found', 404);
  return Response.json({ request_id: rec.request_id, status: rec.status, output: rec.output || null, rejected_fields: rec.rejected_fields || [], last_error: rec.last_error || null });
}

// ── APPLY (draft settings only — never publish) ──────────────────────────────
const SECTION_FOR = { hero: 'homepage', intro: 'homepage', about: 'about', why_choose_us: 'why_choose_us', process: 'how_it_works', services: 'services', faq: 'faq', cta: 'cta', seo: 'seo' };

async function applyDraft(base44, service, user, tenant, settings, draft, input, library, requestId, onlySections) {
  const previous = {};
  const keepKeys = PROVENANCE_SECTIONS;
  for (const k of keepKeys) previous[k] = settings ? (settings[k] || null) : null;

  const patch = buildSettingsPatch(draft, input, { existingServices: (settings && settings.services && settings.services.items) || [] });
  let scopedPatch = patch;
  if (Array.isArray(onlySections) && onlySections.length) {
    scopedPatch = {};
    for (const s of onlySections) if (SECTION_FOR[s] && patch[SECTION_FOR[s]]) scopedPatch[SECTION_FOR[s]] = patch[SECTION_FOR[s]];
  }

  const now = new Date().toISOString();
  const provenance = (settings && settings.ai_provenance && typeof settings.ai_provenance === 'object') ? { ...settings.ai_provenance } : {};
  provenance.generated_at = now;
  provenance.generated_by_ai = true;
  provenance.content_library_version = LIB_VERSION_LABEL;
  provenance.input_config_version = requestId;
  provenance.last_generated_by = user ? user.id : 'system';
  provenance.sections = provenance.sections || {};
  for (const s of Object.keys(scopedPatch)) {
    provenance.sections[s] = { origin: requestId === 'starter' ? 'library' : 'ai', generated_at: now, human_edited_at: null };
  }
  // Part 36 — factual inputs used, awaiting client confirmation when relevant.
  provenance.factual_inputs = {
    business_name: input.business.name,
    phone: input.contact_present.phone,
    email: input.contact_present.email,
    service_area: (input.business.counties_served || []).concat(input.business.cities_served || []),
    years_experience: input.business.years_experience,
    credentials: input.verified_credentials || []
  };
  if (!provenance.factual_confirmation) provenance.factual_confirmation = { confirmed: false };

  const values = { ...scopedPatch, ai_provenance: provenance, last_saved_section: 'ai_build', last_saved_by: user ? user.id : null };

  let saved;
  if (settings) {
    const ver = (settings.settings_version || 1) + 1;
    saved = await service.entities.WebsiteTenantSettings.update(settings.id, { ...values, settings_version: ver });
  } else {
    saved = await service.entities.WebsiteTenantSettings.create({
      website_tenant_id: tenant.id, company_id: tenant.company_id, is_active: true,
      ...values, settings_version: 1, member_user_ids: tenant.member_user_ids || []
    });
  }

  // Version snapshot BEFORE overwrite (Part 25) — undo for the replaced state.
  let versionId = null;
  const hasPrevious = Object.values(previous).some(v => v && typeof v === 'object' ? Object.keys(v).length > 0 : !!v);
  if (hasPrevious) {
    const snap = await service.entities.LlbbSettingsVersion.create({
      website_tenant_id: tenant.id, company_id: tenant.company_id,
      section: Array.isArray(onlySections) && onlySections.length ? onlySections.join(',') : 'ai_build',
      label: requestId === 'starter' ? 'Before starter content' : 'Before AI draft',
      origin: 'ai_generation', settings_version: (settings && settings.settings_version) || 1,
      snapshot: previous, member_user_ids: tenant.member_user_ids || []
    });
    versionId = snap.id;
  }

  await logActivity(service, tenant, {
    actorUser: user, role: user.role === 'admin' ? 'admin' : 'client',
    action: 'ai_draft_applied', section: 'ai_build',
    detail: requestId === 'starter' ? 'Starter content applied' : 'AI-assisted draft applied'
  });

  return { sections: Object.keys(scopedPatch), versionId };
}

// ── REGENERATE ONE SECTION (Parts 22/24) ─────────────────────────────────────
async function regenerateSection(base44, service, user, body) {
  const ctx = await loadContext(service, user, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company, settings } = ctx;
  const section = typeof body.section === 'string' ? body.section : '';
  if (!SECTION_FOR[section]) return jerr('bad_section', 'Unknown section', 400);

  // Part 24 — human edits are protected: regeneration requires confirmation.
  const prov = (settings && settings.ai_provenance) || {};
  const secProv = (prov.sections || {})[SECTION_FOR[section]];
  if (secProv && secProv.human_edited_at && body.confirm_human_overwrite !== true) {
    return Response.json({ needs_confirm: true, message: 'You\'ve edited this section. Regenerating will replace your current version. Your previous version will be kept in version history.' });
  }

  const requestId = typeof body.request_id === 'string' && body.request_id.length <= 80 ? body.request_id : null;
  if (!requestId) return jerr('bad_request', 'request_id required', 400);

  // Reuse the last successful generation input as regeneration context —
  // never another tenant's content (Part 42).
  const genPage = await service.entities.LlbbAiGeneration.filter(
    { website_tenant_id: tenant.id, status: 'ready' }, { limit: 1, sort: '-created_date' });
  const lastGen = pageOf(genPage)[0];
  if (!lastGen || !lastGen.input_config) return jerr('no_generation', 'Run Build My Website For Me first', 400);

  const input = lastGen.input_config;
  const prompt = buildPrompt(input, 'section:' + section);
  let raw = null;
  try {
    raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt, response_json_schema: OUTPUT_SCHEMA
    });
  } catch (e) {
    return Response.json({ request_id: requestId, status: 'failed', fallback_options: ['try_again', 'use_starter_content'] });
  }
  const library = await loadActiveLibrary(service, (input.services || []).map(s => s.key));
  const { clean, rejected } = validateDraft(raw, input, library);

  const regenRecord = await service.entities.LlbbAiGeneration.create({
    website_tenant_id: tenant.id, company_id: tenant.company_id, request_id: requestId,
    status: 'ready', target: 'section:' + section, input_config: input, output: clean,
    rejected_fields: rejected, content_library_version: (library || []).map(m => `${m.content_key}@${m.version || 1}`).join(','),
    model: 'automatic', member_user_ids: tenant.member_user_ids || []
  });

  const applied = await applyDraft(base44, service, user, tenant, settings, clean, input, library, requestId, [section]);
  return Response.json({ request_id: requestId, status: 'ready', section, output: clean, rejected_fields: rejected, applied_sections: applied.sections, version_id: applied.versionId });
}

// ── AI EDITING TOOLS (Part 23) — preview only, never silent overwrite ────────
async function editTool(base44, service, user, body) {
  const ctx = await loadContext(service, user, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const instruction = typeof body.instruction === 'string' ? body.instruction : '';
  const text = typeof body.text === 'string' ? body.text.slice(0, 6000) : '';
  if (!text.trim()) return jerr('bad_request', 'text required', 400);
  let proposal = null;
  try {
    proposal = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: editToolPrompt(instruction, text),
      response_json_schema: { type: 'object', properties: { text: { type: 'string' } } }
    });
  } catch (e) {
    return Response.json({ status: 'failed', fallback_options: ['try_again', 'keep_current'] });
  }
  const proposed = proposal && typeof proposal.text === 'string' ? proposal.text.trim().slice(0, 20000) : null;
  if (!proposed) return Response.json({ status: 'failed', fallback_options: ['keep_current'] });
  return Response.json({ status: 'ready', proposal: proposed });
}

// ── STARTER CONTENT FALLBACK (Part 40 / no-AI path) ──────────────────────────
async function applyStarter(base44, service, user, body) {
  const ctx = await loadContext(service, user, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company, settings } = ctx;
  const interview = body.interview || {};
  const library = await loadActiveLibrary(service, interview.services);
  const input = buildGenerationInput({ company, tenant, settings, interview, library });
  const draft = starterDraft(input, library);
  const applied = await applyDraft(base44, service, user, tenant, settings, draft, input, library, 'starter');
  return Response.json({ status: 'ready', source: 'starter_content', applied_sections: applied.sections, version_id: applied.versionId });
}

// ── FACTUAL INPUTS CONFIRMATION (Part 36) — human, recorded, timestamped ─────
async function confirmFacts(base44, service, user, body) {
  const ctx = await loadContext(service, user, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, settings } = ctx;
  if (!settings) return jerr('no_settings', 'Generate content first', 400);
  const prov = (settings.ai_provenance && typeof settings.ai_provenance === 'object')
    ? { ...settings.ai_provenance } : {};
  prov.factual_confirmation = {
    confirmed: true, confirmed_at: new Date().toISOString(), confirmed_by: user.id
  };
  await service.entities.WebsiteTenantSettings.update(settings.id, {
    ai_provenance: prov, last_saved_section: 'ai_facts', last_saved_by: user.id
  });
  await logActivity(service, tenant, {
    actorUser: user, role: user.role === 'admin' ? 'admin' : 'client',
    action: 'ai_facts_confirmed', section: 'ai_build',
    detail: 'Confirmed the facts used in the AI draft'
  });
  return Response.json({ status: 'ready' });
}

// ── VERSION HISTORY + RESTORE (Parts 25/57) ──────────────────────────────────
async function versions(service, user, body) {
  const ctxPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
  const tenant = pageOf(ctxPage)[0];
  if (!tenant) return jerr('tenant_not_found', 'Website not found', 404);
  const access = assertTenantAccess(user, tenant);
  if (access.error) return jerr(access.error.code, access.error.message, access.status || 403);
  const page = await service.entities.LlbbSettingsVersion.filter(
    { website_tenant_id: tenant.id }, { limit: 20, sort: '-created_date' });
  return Response.json({
    versions: pageOf(page).map(v => ({
      id: v.id, section: v.section, label: v.label, origin: v.origin,
      settings_version: v.settings_version, created_date: v.created_date
    }))
  });
}

async function restoreVersion(base44, service, user, body) {
  const ctx = await loadContext(service, user, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, settings } = ctx;
  if (!settings) return jerr('no_settings', 'No settings to restore onto', 400);
  const vPage = await service.entities.LlbbSettingsVersion.filter({ id: body.version_id }, { limit: 1 });
  const version = pageOf(vPage)[0];
  if (!version || version.website_tenant_id !== tenant.id) return jerr('not_found', 'Version not found', 404);

  // Snapshot the CURRENT state before restoring (undo of the undo).
  const previous = {};
  for (const k of PROVENANCE_SECTIONS) previous[k] = settings[k] || null;
  await service.entities.LlbbSettingsVersion.create({
    website_tenant_id: tenant.id, company_id: tenant.company_id,
    section: version.section, label: 'Before restore of "' + (version.label || version.section) + '"',
    origin: 'restore', settings_version: settings.settings_version || 1,
    snapshot: previous, member_user_ids: tenant.member_user_ids || []
  });

  const patch = {};
  for (const k of PROVENANCE_SECTIONS) {
    if (version.snapshot && version.snapshot[k] !== undefined) patch[k] = version.snapshot[k];
  }
  const prov = (settings.ai_provenance && typeof settings.ai_provenance === 'object') ? { ...settings.ai_provenance } : {};
  for (const k of Object.keys(patch)) {
    prov.sections = prov.sections || {};
    prov.sections[k] = { origin: 'restored', generated_at: null, human_edited_at: new Date().toISOString() };
  }
  const saved = await service.entities.WebsiteTenantSettings.update(settings.id, {
    ...patch, ai_provenance: prov, last_saved_section: 'restore', last_saved_by: user.id,
    settings_version: (settings.settings_version || 1) + 1
  });
  await logActivity(service, tenant, { actorUser: user, role: user.role === 'admin' ? 'admin' : 'client', action: 'version_restored', section: version.section, detail: 'Restored a previous version' });
  return Response.json({ status: 'ready', restored_version_id: version.id });
}