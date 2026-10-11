// Publish Sale → Destination (Publication service entrypoint).
// Actions: publish | unpublish | status.
// Authenticated user actions only; authorization enforced server-side.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  publishSaleToDestination,
  unpublishSaleFromDestination,
  authorizeSaleActor
} from '../../shared/publicationService.ts';

async function loadSale(base44, saleId) {
  try {
    return await base44.asServiceRole.entities.EstateSale.get(saleId);
  } catch (e) {
    return null;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'publish';
    const saleId = body.sale_id;
    const destinationId = body.destination_id;

    if (!saleId) return Response.json({ error: 'sale_id_required' }, { status: 400 });

    // Every action requires an authenticated, authorized actor — fail closed.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      user = null;
    }
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const sale = await loadSale(base44, saleId);
    if (!sale) return Response.json({ error: 'sale_not_found' }, { status: 404 });

    const auth = await authorizeSaleActor(base44, user, sale);
    if (!auth.allowed) return Response.json({ error: auth.reason }, { status: 403 });

    if (action === 'status') {
      const pubsRaw = await base44.asServiceRole.entities.Publication.filter({ sale_id: saleId }, { limit: 100 });
      const pubs = (pubsRaw && pubsRaw.items) ? pubsRaw.items : (pubsRaw || []);
      const destIds = [...new Set(pubs.map(p => p.destination_id))];
      const destinations = [];
      for (const dId of destIds) {
        try {
          destinations.push(await base44.asServiceRole.entities.Destination.get(dId));
        } catch (e) { /* destination removed */ }
      }
      const destById = Object.fromEntries(destinations.map(d => [d.id, d]));
      // Non-secret destinations available to this sale's company (for first-time publish).
      const availRaw = await base44.asServiceRole.entities.Destination.filter({ company_id: sale.company_id || '__none__' }, { limit: 50 });
      const availableDestinations = ((availRaw && availRaw.items) ? availRaw.items : (availRaw || [])).map(d => ({
        id: d.id, name: d.name, destination_type: d.destination_type, status: d.status
      }));
      return Response.json({
        available_destinations: availableDestinations,
        publications: pubs.map(p => ({
          id: p.id,
          status: p.status,
          external_reference: p.external_reference,
          adopted: p.adopted,
          source_version: p.source_version,
          published_at: p.published_at,
          last_success_at: p.last_success_at,
          last_attempt_at: p.last_attempt_at,
          last_error: p.last_error,
          error_category: p.error_category,
          delivery_mode: p.delivery_mode,
          destination: destById[p.destination_id] ? {
            id: destById[p.destination_id].id,
            name: destById[p.destination_id].name,
            destination_type: destById[p.destination_id].destination_type,
            status: destById[p.destination_id].status
          } : null
        }))
      });
    }

    if (action === 'publish') {
      if (!destinationId) return Response.json({ error: 'destination_id_required' }, { status: 400 });
      const result = await publishSaleToDestination(base44, saleId, destinationId);
      if (!result.ok) return Response.json({ error: result.error }, { status: result.http || 400 });
      return Response.json({ publication: result.publication, delivery: result.delivery });
    }

    if (action === 'unpublish') {
      if (!destinationId) return Response.json({ error: 'destination_id_required' }, { status: 400 });
      const result = await unpublishSaleFromDestination(base44, saleId, destinationId);
      if (!result.ok) return Response.json({ error: result.error }, { status: result.http || 404 });
      return Response.json({ publication: result.publication, delivery: result.delivery });
    }

    return Response.json({ error: 'unsupported_action' }, { status: 400 });
  } catch (error) {
    console.error('publishSale error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}