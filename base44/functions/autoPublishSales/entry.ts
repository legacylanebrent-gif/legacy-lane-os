// Canonical auto-publish entrypoint — invoked by the Publication Sync on Sale
// Change workflow BEFORE change propagation. Creates/updates the canonical
// Publication for eligible LLBB runtime-served websites; never touches
// receiver-based (Legacy Lane) destinations. See shared/websiteAutoPublish.ts.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { autoPublishForSale } from '../../shared/websiteAutoPublish.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.id;
    if (!saleId) return Response.json({ error: 'sale_id_required' }, { status: 400 });
    const result = await autoPublishForSale(base44.asServiceRole, String(saleId));
    console.log('[autoPublishSales]', JSON.stringify(result));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('autoPublishSales error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}