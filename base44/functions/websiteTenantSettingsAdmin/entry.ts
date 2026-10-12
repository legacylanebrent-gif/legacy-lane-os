// WebsiteTenantSettings control surface (Phase 3D.1 — Parts 2/4/18).
// Authenticated seam for authorized company members (or platform admins).
// company_id is ALWAYS derived from the tenant; ownership flows
// WebsiteTenant → Company → membership; clients never supply it.
// Public exposure happens ONLY through the runtime's allowlisted projection.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  assertSettingsAccess, getTenantSettings, sanitizeSettingsPayload, projectPublicSettings
} from '../../shared/websiteSettingsService.ts';

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
      let saved;
      if (existing) {
        const version = Number.isInteger(patch.settings_version)
          ? patch.settings_version
          : (existing.settings_version || 1);
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
      return Response.json({ ok: true, settings: saved });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('websiteTenantSettingsAdmin error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}