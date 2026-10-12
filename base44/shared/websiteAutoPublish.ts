// LLBB Phase 4C — canonical auto-publish engine.
// AUTO-PUBLISH ELIGIBILITY (documented rule, Part 3):
//   Tenant:   created_via === 'llbb', auto_publish_enabled !== false,
//             technical status 'setup' or 'active' (archived/suspended skipped).
//   Dest:     status 'active', company match with the sale, and RUNTIME-SERVED
//             (no receiver webhook configured, or explicit delivery_mode flag).
//             Receiver-based destinations (e.g. production Legacy Lane) are
//             NEVER auto-published — REAL LEGACY LANE FREEZE.
//   Sale:     same company (invariant), public lifecycle status
//             ('upcoming' | 'active' | 'completed'), has a title and a public
//             address line (city/state). Draft, archived and address-less
//             internal sales are NEVER published.
// Behavior: eligible → create/reuse the canonical Publication and publish it
// (no receiver, no LLS, no feed — runtime_served only). Ineligible while a
// publication is live → explicit unpublish so internal/cancelled sales never
// stay publicly visible. Publication lifecycle (Company+Sale+Destination,
// currentness, timestamps) is fully recorded by the publication service.
import { publishSaleToDestination, unpublishSaleFromDestination } from './publicationService.ts';

const PUBLIC_SALE_STATUSES = ['upcoming', 'active', 'completed'];

function page(res) {
  return (res && res.items) ? res.items : (res || []);
}

export function salePublicationEligible(sale) {
  if (!sale || !sale.company_id) return { eligible: false, reason: 'sale_not_found' };
  if (!PUBLIC_SALE_STATUSES.includes(sale.status)) {
    return { eligible: false, reason: `sale_lifecycle_${sale.status || 'unknown'}` };
  }
  if (!String(sale.title || '').trim()) return { eligible: false, reason: 'sale_title_required' };
  const addr = sale.property_address || {};
  if (!(String(addr.city || '').trim() && String(addr.state || '').trim()) && !String(addr.formatted_address || '').trim()) {
    return { eligible: false, reason: 'sale_public_address_required' };
  }
  return { eligible: true, reason: null };
}

export async function autoPublishForSale(service, saleId) {
  const sale = await service.entities.EstateSale.get(saleId).catch(() => null);
  if (!sale || !sale.company_id) return { results: [], skipped: 'sale_not_found' };

  const tenantPage = await service.entities.WebsiteTenant.filter({ company_id: sale.company_id }, { limit: 100 });
  const tenants = page(tenantPage).filter(t => t.created_via === 'llbb');
  if (tenants.length === 0) return { results: [], skipped: 'no_llbb_tenants' };

  const results = [];
  for (const tenant of tenants) {
    const row = { tenant_id: tenant.id, action: null };
    if (tenant.auto_publish_enabled === false) { row.action = 'skipped_manual_policy'; results.push(row); continue; }
    if (!['setup', 'active'].includes(tenant.status)) { row.action = 'skipped_tenant_lifecycle'; results.push(row); continue; }

    const destination = tenant.destination_id
      ? await service.entities.Destination.get(tenant.destination_id).catch(() => null)
      : null;
    const runtimeServed = !!destination && destination.status === 'active'
      && destination.company_id === tenant.company_id
      && !(destination.configuration || {}).webhook_url; // receiver-based destinations are excluded
    if (!runtimeServed) { row.action = 'skipped_not_runtime_served'; results.push(row); continue; }

    const eligible = salePublicationEligible(sale);
    if (eligible.eligible) {
      const r = await publishSaleToDestination(service, sale.id, destination.id);
      row.action = r.ok ? `published_${r.publication.status}` : `publish_error_${r.error}`;
    } else {
      // Ineligible (draft/cancelled-archived/address-less): ensure it is not
      // publicly visible. Existing live publication → explicit unpublish.
      const existing = page(await service.entities.Publication.filter(
        { sale_id: sale.id, destination_id: destination.id }, { limit: 5 }));
      const live = existing.find(p => ['published', 'pending', 'failed', 'update_pending'].includes(p.status));
      if (live) {
        const u = await unpublishSaleFromDestination(service, sale.id, destination.id);
        row.action = u.ok ? 'unpublished_ineligible' : `unpublish_error_${u.error}`;
      } else {
        row.action = `hidden_ineligible_${eligible.reason}`;
      }
    }
    results.push(row);
  }
  return { results, skipped: null };
}