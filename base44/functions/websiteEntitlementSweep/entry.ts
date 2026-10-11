// Entitlement lifecycle synchronization sweep (Phase 3C, Part 42).
// Strategy: LIFECYCLE SYNCHRONIZATION — the public runtime never queries
// Subscription per request. This admin-invoked sweep re-evaluates website
// entitlement for every ACTIVE tenant and suspends tenants whose Company no
// longer holds an active website entitlement (same certified evaluation as
// provisioning). Suspension hides all operator content; nothing is deleted.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { evaluateWebsiteEntitlement, validateLifecycleTransition } from '../../shared/websiteTenantService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const service = base44.asServiceRole;

    const page = await service.entities.WebsiteTenant.filter({ status: 'active' }, { limit: 1000 });
    const tenants = page.items || page;
    const suspended = [];
    let checked = 0;
    for (const tenant of tenants) {
      checked += 1;
      const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
      const eligible = !!company && company.status === 'active' &&
        (await evaluateWebsiteEntitlement(service, company)).allowed;
      if (!eligible) {
        const transition = validateLifecycleTransition(tenant.status, 'suspended');
        if (!transition.ok) continue;
        await service.entities.WebsiteTenant.update(tenant.id, {
          status: 'suspended',
          suspended_by: 'system',
          suspended_at: new Date().toISOString(),
          status_reason: 'entitlement_lost'
        });
        suspended.push(tenant.id);
      }
    }
    return Response.json({ ok: true, checked, suspended_count: suspended.length, suspended });
  } catch (error) {
    console.error('websiteEntitlementSweep error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}