// WebsiteSalePresentation control surface (Phase 3D.1 — Parts 12-16).
// Authenticated seam for authorized company members/platform admins.
// Invariants enforced server-side:
//   presentation.tenant → tenant; presentation.company_id = tenant.company_id
//   (derived); sale.company_id = tenant.company_id (cross-company FAILS);
//   at most ONE active presentation per tenant+sale (concurrency converges).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { assertTenantAccess } from '../../shared/websiteTenantService.ts';
import {
  assertPresentationTarget, getActivePresentation, arbitrateSinglePresentation,
  projectPublicPresentation, sanitizePresentationPayload
} from '../../shared/websiteSalePresentationService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'auth_required' }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id).catch(() => null);
    if (!tenant) return Response.json({ error: 'tenant_not_found' }, { status: 404 });
    const access = assertTenantAccess(user, tenant);
    if (!access.ok) return Response.json({ error: access.error.code }, { status: access.error.status });

    if (body.action === 'list') {
      const filter = { website_tenant_id: tenant.id };
      if (body.sale_id) filter.sale_id = body.sale_id;
      const page = await service.entities.WebsiteSalePresentation.filter(filter, { limit: 200 });
      return Response.json({ ok: true, presentations: (page.items || page).map(p => ({
        id: p.id, sale_id: p.sale_id, status: p.status, public_projection: projectPublicPresentation(p)
      })) });
    }

    if (body.action === 'upsert') {
      const target = await assertPresentationTarget(service, tenant, body.sale_id);
      if (target.error) {
        return Response.json({ error: target.error }, { status: target.error === 'cross_company_presentation' ? 403 : 404 });
      }
      const patch = sanitizePresentationPayload(body.presentation || {});
      const existing = await getActivePresentation(service, tenant.id, body.sale_id);
      let saved;
      if (existing) {
        saved = await service.entities.WebsiteSalePresentation.update(existing.id, patch);
      } else {
        saved = await service.entities.WebsiteSalePresentation.create({
          website_tenant_id: tenant.id,
          company_id: tenant.company_id, // derived server-side — never client-supplied
          sale_id: body.sale_id,
          status: 'active',
          member_user_ids: tenant.member_user_ids || [],
          ...patch
        });
        const converged = await arbitrateSinglePresentation(service, tenant.id, body.sale_id, saved.id);
        if (!converged.kept) return Response.json({ error: 'presentation_convergence_failed' }, { status: 500 });
      }
      return Response.json({ ok: true, presentation: { id: saved.id, sale_id: saved.sale_id, status: saved.status, public_projection: projectPublicPresentation(saved) } });
    }

    if (body.action === 'delete') {
      const existing = body.presentation_id
        ? await service.entities.WebsiteSalePresentation.get(body.presentation_id).catch(() => null)
        : await getActivePresentation(service, tenant.id, body.sale_id);
      if (!existing || existing.website_tenant_id !== tenant.id) {
        return Response.json({ error: 'presentation_not_found' }, { status: 404 });
      }
      await service.entities.WebsiteSalePresentation.delete(existing.id);
      return Response.json({ ok: true, deleted: existing.id });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('websiteSalePresentationAdmin error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}