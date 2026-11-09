// guestSaleFlags — tells the public maps which of the given sales were published on a
// paid guest (DIY) One-Time Estate Sale package, so the map can label them
// "Sponsored by EstateSalen" and show the individual seller as the contact.
// Public and read-only: returns sale ids only — never an entitlement, payment,
// buyer or seller detail of any kind.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const requested = Array.isArray(body?.sale_ids) ? body.sale_ids : [];
    const ids = [...new Set(requested.filter((id) => typeof id === 'string' && id))].slice(0, 500);
    if (!ids.length) return Response.json({ guest_sale_ids: [] });

    // A bound guest sale package is the only thing that makes a sale an individual's
    // sale rather than a company's, so it is the only signal trusted here.
    const rows = await base44.asServiceRole.entities.SaleEntitlement.filter({
      kind: 'sale_package',
      status: 'bound',
      bound_sale_id: { $in: ids },
    });

    const guestSaleIds = [...new Set((rows || []).map((r) => r.bound_sale_id).filter(Boolean))];
    return Response.json({ guest_sale_ids: guestSaleIds });
  } catch (error) {
    console.error('[guestSaleFlags] error:', error?.message || error);
    return Response.json({ guest_sale_ids: [] });
  }
}