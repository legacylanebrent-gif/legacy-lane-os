// enforceSalePublication — server-side backstop for the public listing.
// Runs whenever a sale reaches a public status (and on demand for an admin sweep).
// It re-derives publishing rights from server truth and takes back anything a
// browser published without them. Paid featured placements are verified the same
// way: a switch a browser flipped is not a purchase.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  verifySalePublishing,
  hasPaidFeaturedPlacement,
  loadSale,
  PUBLISHED_SALE_STATUSES,
  nowIso,
} from '../../shared/saleEntitlement.ts';

async function enforceOne(base44, sale) {
  const result = { sale_id: sale.id, reverted: false, featured_cleared: [], reasons: [] };

  // Featured placement never comes from a client toggle.
  const flags = [];
  if (sale.national_featured) {
    const paid = await hasPaidFeaturedPlacement(base44, sale.id, 'national_featured');
    if (!paid) flags.push('national_featured');
  }
  if (sale.local_featured) {
    const paid = await hasPaidFeaturedPlacement(base44, sale.id, 'local_featured');
    if (!paid) flags.push('local_featured');
  }
  if (flags.length > 0) {
    const patch = {};
    flags.forEach((f) => (patch[f] = false));
    await base44.asServiceRole.entities.EstateSale.update(sale.id, patch);
    result.featured_cleared = flags;
    result.reasons.push('unpaid_featured_placement');
  }

  if (!PUBLISHED_SALE_STATUSES.includes(sale.status)) return result;

  const verified = await verifySalePublishing(base44, sale);
  if (!verified.ok) {
    await base44.asServiceRole.entities.EstateSale.update(sale.id, { status: 'draft' });
    result.reverted = true;
    result.reasons.push(verified.reason || 'no_paid_right');
    console.warn(`[enforceSalePublication] reverted sale ${sale.id} (${verified.reason})`);
  } else {
    result.reasons.push(`verified:${verified.source}`);
  }
  return result;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;

    // Single-sale check (called by the publish pipeline / entity automation).
    if (saleId) {
      const sale = await loadSale(base44, saleId);
      if (!sale) return Response.json({ error: 'sale_not_found' }, { status: 404 });
      const result = await enforceOne(base44, sale);
      return Response.json({ ok: !result.reverted, ...result, checked_at: nowIso() });
    }

    // Sweep: admin-only.
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const rows = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: PUBLISHED_SALE_STATUSES } },
      { limit: 200 },
    );
    const sales = Array.isArray(rows) ? rows : rows?.items || [];
    const results = [];
    for (const sale of sales) {
      results.push(await enforceOne(base44, sale));
    }
    return Response.json({
      ok: true,
      checked: sales.length,
      reverted: results.filter((r) => r.reverted).length,
      results,
      checked_at: nowIso(),
    });
  } catch (error) {
    console.error('[enforceSalePublication] error:', error?.message || error);
    return Response.json({ error: error?.message || 'enforcement_failed' }, { status: 500 });
  }
}