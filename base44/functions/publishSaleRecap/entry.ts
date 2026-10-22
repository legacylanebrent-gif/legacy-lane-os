// Chapter 24 P0-2A — PUBLIC SALE RECAP PUBLICATION IS A HUMAN ACT.
// A recap is generated as a PRIVATE DRAFT by the completion automation; only the
// sale operator (or a platform admin) may review and publish it. Publishing:
//   - strips private financial figures from the record (P0-2B),
//   - records who approved and when (provenance),
//   - is IDEMPOTENT — re-publishing a published recap is a no-op,
//   - logs a HUMAN APPROVAL activity entry so the operator can answer
//     WHY IS THIS PUBLIC? (automation explainability).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const recapId = body?.recap_id || null;
    const saleId = body?.sale_id || null;
    if (!recapId && !saleId) {
      return Response.json({ error: 'recap_id or sale_id is required' }, { status: 400 });
    }

    const page = await base44.asServiceRole.entities.SaleRecap.filter(
      recapId ? { id: recapId } : { sale_id: saleId }
    );
    const recaps = page.items || page;
    const recap = recaps[0] || null;
    if (!recap) return Response.json({ error: 'Recap not found' }, { status: 404 });

    // Idempotent: publishing a published recap changes nothing.
    if (recap.status === 'published') {
      return Response.json({ message: 'already_published', recap_id: recap.id, published_at: recap.published_at || null });
    }

    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: recap.sale_id });
    const sale = sales[0] || null;
    const isOperator = sale && sale.operator_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOperator && !isAdmin) {
      return Response.json({ error: 'Only the sale operator (or an admin) may publish this recap.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.SaleRecap.update(recap.id, {
      status: 'published',
      // Chapter 24 P0-2B — the public record never carries private financial figures.
      actual_revenue: null,
      estimated_sale_value: null,
      published_at: now,
      published_by_name: user.full_name || user.email || 'Operator',
      indexed_status: 'not_submitted',
    });

    try {
      await base44.asServiceRole.entities.Activity.create({
        sale_id: recap.sale_id,
        operator_id: sale ? sale.operator_id : (recap.operator_id || ''),
        user_id: user.id,
        activity_type: 'note',
        subject: 'Sale recap published',
        description: `HUMAN APPROVAL: ${user.full_name || user.email} reviewed the AI-generated draft recap and published it. Private financial figures are stripped from the public record.`,
        status: 'completed',
      });
    } catch (e) {
      console.warn('publishSaleRecap activity log failed:', e && e.message);
    }

    return Response.json({ message: 'published', recap_id: recap.id, published_at: now });
  } catch (error) {
    console.error('publishSaleRecap error:', error && error.message);
    return Response.json({ error: error.message || 'Failed to publish recap' }, { status: 500 });
  }
});