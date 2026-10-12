// WebsiteTenantSettings control surface (Phase 3D.1 — Parts 2/4/18).
// Authenticated seam for authorized company members (or platform admins).
// company_id is ALWAYS derived from the tenant; ownership flows
// WebsiteTenant → Company → membership; clients never supply it.
// Public exposure happens ONLY through the runtime's allowlisted projection.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  assertSettingsAccess, getTenantSettings, sanitizeSettingsPayload, projectPublicSettings
} from '../../shared/websiteSettingsService.ts';
import { assertWebsiteManagement, logActivity, jerr } from '../../shared/websiteCollabShared.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id).catch(() => null);
    if (!tenant) return Response.json({ error: 'tenant_not_found' }, { status: 404 });
    const access = assertSettingsAccess(user, tenant);
    if (!access.ok) return Response.json({ error: access.error.code }, { status: access.error.status });

    // Phase 4D — writes additionally require website-management capability and
    // respect the management mode (admin_managed tenants are read-only for
    // ungranted members). Reads stay tenant-member level.
    if (body.action === 'update') {
      const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
      const manage = assertWebsiteManagement(user, tenant, company);
      if (!manage.ok) return Response.json({ error: manage.error.code }, { status: manage.error.status || 403 });
    }

    if (body.action === 'get') {
      const settings = await getTenantSettings(service, tenant.id);
      const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
      return Response.json({ ok: true, settings: settings || null, public_projection: projectPublicSettings(settings, company) });
    }

    if (body.action === 'update') {
      const patch = sanitizeSettingsPayload(body.settings || {});
      // Change attribution (Part 4B/27): which section and who saved last.
      patch.last_saved_section = typeof body.section === 'string' && body.section.length <= 50 ? body.section : undefined;
      patch.last_saved_by = user.id;
      const existing = await getTenantSettings(service, tenant.id);

      // Phase 4F (Part 24) — human-edit protection: manual saves of AI-written
      // sections stamp provenance so AI regeneration warns before overwriting
      // operator edits. Never applied to a setting the AI never touched.
      const sectionKey = typeof body.section === 'string' ? body.section : null;
      const stampable = sectionKey && ['homepage', 'about', 'services', 'faq', 'seo'].includes(sectionKey)
        ? (sectionKey === 'homepage' ? ['homepage', 'why_choose_us', 'how_it_works', 'cta'] : [sectionKey])
        : [];
      if (stampable.length && existing && existing.ai_provenance && typeof existing.ai_provenance === 'object') {
        const prov = { ...existing.ai_provenance };
        prov.sections = { ...(prov.sections || {}) };
        const nowIso = new Date().toISOString();
        for (const k of stampable) {
          if (prov.sections[k]) prov.sections[k] = { ...prov.sections[k], origin: 'human', human_edited_at: nowIso };
        }
        patch.ai_provenance = prov;
      }

      // Part 15 — stale concurrent-edit protection. The client sends the
      // updated_date it loaded; a mismatch means someone else saved in between.
      const expected = typeof body.expected_updated_at === 'string' ? body.expected_updated_at : null;
      if (existing && expected && existing.updated_date && existing.updated_date !== expected) {
        return Response.json({
          error: { code: 'stale_edit', message: 'This section changed since you opened it. Reload before saving.' },
          current_updated_at: existing.updated_date
        }, { status: 409 });
      }

      let saved;
      if (existing) {
        // settings_version is server-owned (Phase 4D): every save advances it.
        const version = (existing.settings_version || 1) + 1;
        saved = await service.entities.WebsiteTenantSettings.update(existing.id, { ...patch, settings_version: version });
      } else {
        saved = await service.entities.WebsiteTenantSettings.create({
          website_tenant_id: tenant.id,
          company_id: tenant.company_id, // derived server-side — never client-supplied
          is_active: true,
          member_user_ids: tenant.member_user_ids || [],
          ...patch
        });
        // MVP one-active invariant: deactivate any other config rows for the tenant.
        const page = await service.entities.WebsiteTenantSettings.filter(
          { website_tenant_id: tenant.id, is_active: true }, { limit: 10, sort: 'created_date' });
        const rows = page.items || page;
        for (const r of rows) {
          if (r.id !== saved.id) await service.entities.WebsiteTenantSettings.update(r.id, { is_active: false }).catch(() => {});
        }
      }
      // Part 16 — meaningful-action activity history (section saves only;
      // never per-keystroke).
      if (body.section) {
        await logActivity(service, tenant, {
          actorUser: user,
          role: user.role === 'admin' ? 'admin' : 'client',
          action: 'section_updated',
          section: String(body.section).slice(0, 60)
        });
      }
      return Response.json({ ok: true, settings: saved });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('websiteTenantSettingsAdmin error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}