// WebsiteTenantMedia control surface (Phase 4B — Part 5).
// Tenant-scoped website presentation media library. Authorization uses the
// certified chain: authenticated user → Company membership → Company →
// WebsiteTenant (assertTenantAccess — admin role OR tenant member). Records
// are written with the service role; clients never CRUD the entity directly
// (RLS create is admin-only). company_id is ALWAYS derived from the tenant.
// Media URLs point at the app's PUBLIC storage (live websites must render for
// anonymous visitors); library ACCESS is tenant-isolated. Cross-tenant
// requests are denied by the tenant-membership check below (Part 40).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertTenantAccess } from '../../shared/websiteTenantService.ts';
import { MEDIA_CATEGORIES } from '../../shared/websiteSettingsService.ts';
import { assertWebsiteManagement, logActivity } from '../../shared/websiteCollabShared.ts';

const MAX_MEDIA_PER_TENANT = 200;

function jerr(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

const cleanStr = (v, cap) => (typeof v === 'string' ? (v.trim() === '' ? '' : v.trim().slice(0, cap || 1000)) : '');
const httpsUrl = (v) => (typeof v === 'string' && /^https:\/\/\S+$/i.test(v.trim()) && v.length <= 1000) ? v.trim() : null;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id || '').catch(() => null);
    if (!tenant) return jerr('tenant_not_found', 'Website tenant not found', 404);
    const access = assertTenantAccess(user, tenant);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });

    const Media = service.entities.WebsiteTenantMedia;
    const action = body.action || 'list';

    // Phase 4D — media MUTATIONS require website-management capability; reads
    // stay tenant-member level (Part 9 permission matrix).
    if (action !== 'list') {
      const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
      const manage = assertWebsiteManagement(user, tenant, company);
      if (!manage.ok) return Response.json({ error: manage.error.code }, { status: manage.error.status || 403 });
    }

    if (action === 'list') {
      const page = await Media.filter({ website_tenant_id: tenant.id }, { limit: 300, sort: 'sort_order' });
      const rows = (page.items || page).map(m => ({
        id: m.id, category: m.category, url: m.url, file_name: m.file_name || null,
        caption: m.caption || null, alt_text: m.alt_text || null,
        visible: m.visible !== false, sort_order: m.sort_order || 0, created_date: m.created_date
      }));
      return Response.json({ ok: true, media: rows });
    }

    if (action === 'add') {
      const url = httpsUrl(body.url);
      if (!url) return jerr('invalid_url', 'A valid https image URL is required', 400);
      if (!MEDIA_CATEGORIES.includes(body.category)) return jerr('invalid_category', 'Unknown media category', 400);
      const count = await Media.count({ website_tenant_id: tenant.id });
      if (count >= MAX_MEDIA_PER_TENANT) return jerr('media_limit_reached', `Maximum ${MAX_MEDIA_PER_TENANT} media items per website`, 409);
      const created = await Media.create({
        website_tenant_id: tenant.id,
        company_id: tenant.company_id, // derived server-side — never client-supplied
        category: body.category,
        url,
        file_name: cleanStr(body.file_name, 300),
        caption: cleanStr(body.caption, 300),
        alt_text: cleanStr(body.alt_text, 300),
        visible: body.visible !== false,
        sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 0,
        member_user_ids: tenant.member_user_ids || []
      });
      await logActivity(service, tenant, { actorUser: user, role: user.role === 'admin' ? 'admin' : 'client', action: 'media_added', section: created.category, detail: created.file_name || created.url });
      return Response.json({ ok: true, media: { id: created.id, url: created.url, category: created.category } });
    }

    // update / delete / reorder all require the record to belong to THIS tenant.
    const loadOwned = async (id) => {
      const m = await Media.get(id || '').catch(() => null);
      if (!m || m.website_tenant_id !== tenant.id) return null; // cross-tenant → not found (Part 40)
      return m;
    };

    if (action === 'update') {
      const m = await loadOwned(body.id);
      if (!m) return jerr('media_not_found', 'Media not found for this website', 404);
      const patch = {};
      if (body.caption !== undefined) patch.caption = cleanStr(body.caption, 300);
      if (body.alt_text !== undefined) patch.alt_text = cleanStr(body.alt_text, 300);
      if (body.category !== undefined && MEDIA_CATEGORIES.includes(body.category)) patch.category = body.category;
      if (body.visible !== undefined) patch.visible = body.visible === true;
      if (body.sort_order !== undefined && Number.isInteger(body.sort_order)) patch.sort_order = body.sort_order;
      const updated = await Media.update(m.id, patch);
      return Response.json({ ok: true, media: { id: updated.id, visible: updated.visible, caption: updated.caption, alt_text: updated.alt_text, category: updated.category, sort_order: updated.sort_order } });
    }

    if (action === 'delete') {
      const m = await loadOwned(body.id);
      if (!m) return jerr('media_not_found', 'Media not found for this website', 404);
      await Media.delete(m.id);
      await logActivity(service, tenant, { actorUser: user, role: user.role === 'admin' ? 'admin' : 'client', action: 'media_removed', section: m.category, detail: m.file_name || m.url });
      return Response.json({ ok: true });
    }

    if (action === 'reorder') {
      const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
      for (const it of items) {
        const m = await loadOwned(it && it.id);
        if (m && Number.isInteger(it.sort_order)) await Media.update(m.id, { sort_order: it.sort_order });
      }
      return Response.json({ ok: true });
    }

    return jerr('unknown_action', 'Supported actions: list, add, update, delete, reorder', 400);
  } catch (error) {
    console.error('websiteMediaAdmin error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}