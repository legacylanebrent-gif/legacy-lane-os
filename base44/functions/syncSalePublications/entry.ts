// Publication change-propagation worker (workflow-invoked).
// Republishes existing publications for a sale when canonical data changed.
// Fail closed: only acts on EXISTING publications — never creates one.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { syncSalePublications } from '../../shared/publicationService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id;
    if (!saleId) return Response.json({ error: 'sale_id_required' }, { status: 400 });

    const results = await syncSalePublications(base44, saleId);
    return Response.json({ sale_id: saleId, results });
  } catch (error) {
    console.error('syncSalePublications error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}