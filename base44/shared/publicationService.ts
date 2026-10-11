// Canonical publication service.
// publishSale(sale_id, destination_id) — create/reuse publication idempotently,
// build canonical payload, dispatch through the destination adapter, record result.
// Shared by the publishSale (user-invoked) and syncSalePublications (workflow) functions.
import { computeSourceVersion, buildCanonicalSalePayload } from './publicationPayload.ts';
import { getDestinationAdapter } from './destinationAdapters.ts';

const RECEIVING_STATUSES = ['published', 'pending', 'failed', 'update_pending'];

function page(res) {
  return (res && res.items) ? res.items : (res || []);
}

async function getOrThrow(base44, entity, id) {
  try {
    return await base44.asServiceRole.entities[entity].get(id);
  } catch (e) {
    return null;
  }
}

// Actor authorization: admin, the sale's operator, or a member/primary contact
// of the sale's canonical Company.
export async function authorizeSaleActor(base44, user, sale) {
  if (!user) return { allowed: false, reason: 'unauthorized' };
  if (user.role === 'admin') return { allowed: true };
  if (sale.operator_id && sale.operator_id === user.id) return { allowed: true };
  if (sale.company_id) {
    const company = await getOrThrow(base44, 'Company', sale.company_id);
    if (company) {
      if (company.primary_contact_user_id === user.id) return { allowed: true };
      if (Array.isArray(company.member_user_ids) && company.member_user_ids.includes(user.id)) return { allowed: true };
    }
  }
  return { allowed: false, reason: 'not_authorized_for_company' };
}

async function resolvePublication(base44, saleId, destinationId, companyId) {
  const existing = page(await base44.asServiceRole.entities.Publication.filter({ sale_id: saleId, destination_id: destinationId }, { limit: 50, sort: 'created_date' }));
  if (existing.length > 0) {
    // Collapse any duplicates created by concurrent races — keep the oldest.
    const primary = existing[0];
    if (existing.length > 1) {
      for (const extra of existing.slice(1)) {
        await base44.asServiceRole.entities.Publication.delete(extra.id);
      }
    }
    return primary;
  }
  // operator_website destinations use the established LLS presentation convention:
  // the destination-side record id is os_<canonical sale id>. Adopting, not creating.
  const externalReference = `os_${saleId}`;
  const created = await base44.asServiceRole.entities.Publication.create({
    company_id: companyId,
    sale_id: saleId,
    destination_id: destinationId,
    status: 'pending',
    external_reference: externalReference,
    adopted: true,
    attempts: 0
  });
  // Concurrency safety net: if a parallel request created one first, keep the oldest.
  const after = page(await base44.asServiceRole.entities.Publication.filter({ sale_id: saleId, destination_id: destinationId }, { limit: 50, sort: 'created_date' }));
  if (after.length > 1) {
    for (const extra of after.slice(1)) {
      if (extra.id !== created.id) await base44.asServiceRole.entities.Publication.delete(extra.id);
    }
  }
  return after.length > 0 ? after[0] : created;
}

// Core publish. Returns {ok, publication?, delivery?, error?, http?}.
export async function publishSaleToDestination(base44, saleId, destinationId) {
  const sale = await getOrThrow(base44, 'EstateSale', saleId);
  if (!sale) return { ok: false, error: 'sale_not_found', http: 404 };

  const destination = await getOrThrow(base44, 'Destination', destinationId);
  if (!destination) return { ok: false, error: 'destination_not_found', http: 404 };

  // Fail closed: destination must be active.
  if (destination.status !== 'active') {
    return { ok: false, error: 'destination_not_active', http: 403 };
  }

  // Fail closed: strict company ownership — Sale.company_id must equal Destination.company_id.
  const saleCompanyId = sale.company_id || null;
  if (!saleCompanyId || saleCompanyId !== destination.company_id) {
    return { ok: false, error: 'company_mismatch', http: 403 };
  }

  const company = await getOrThrow(base44, 'Company', saleCompanyId);
  const publication = await resolvePublication(base44, saleId, destinationId, saleCompanyId);

  const items = page(await base44.asServiceRole.entities.Item.filter({ estate_sale_id: saleId }, { limit: 2000, fields: ['id', 'title', 'description', 'category', 'subcategory', 'brand', 'condition', 'price', 'sold_price', 'status', 'featured', 'images', 'updated_date'] }));
  const sourceVersion = computeSourceVersion(sale, items);

  const adapter = getDestinationAdapter(destination.destination_type);
  if (!adapter) {
    return { ok: false, error: 'no_adapter_for_destination_type', http: 400, publication };
  }

  const event = publication.published_at ? 'update' : 'publish';
  const payload = buildCanonicalSalePayload({ sale, items, company, publication, event });

  const result = await adapter({ destination, payload, publication });
  const now = new Date().toISOString();

  const updates = {
    last_attempt_at: now,
    source_version: sourceVersion,
    adopted: true,
    delivery_mode: result.mode,
    attempts: (publication.attempts || 0) + 1
  };

  let newStatus;
  if (result.delivered) {
    newStatus = 'published';
    updates.published_at = publication.published_at || now;
    updates.last_success_at = now;
    updates.last_error = null;
    updates.error_category = null;
  } else if (result.mode === 'none') {
    // Receiver endpoint not configured yet — publication relationship exists,
    // delivery pending destination-side configuration. Retryable by re-publish.
    newStatus = 'pending';
    updates.last_error = result.detail;
    updates.error_category = 'not_configured';
  } else {
    newStatus = 'failed';
    updates.last_error = result.detail;
    updates.error_category = result.retryable ? 'retryable_delivery' : 'permanent_delivery';
  }
  updates.status = newStatus;

  const updated = await base44.asServiceRole.entities.Publication.update(publication.id, updates);
  return { ok: true, publication: updated, delivery: result };
}

// Explicit publication-level unpublish. Never deletes the canonical Sale.
export async function unpublishSaleFromDestination(base44, saleId, destinationId) {
  const sale = await getOrThrow(base44, 'EstateSale', saleId);
  if (!sale) return { ok: false, error: 'sale_not_found', http: 404 };
  const destination = await getOrThrow(base44, 'Destination', destinationId);
  if (!destination) return { ok: false, error: 'destination_not_found', http: 404 };

  const existing = page(await base44.asServiceRole.entities.Publication.filter({ sale_id: saleId, destination_id: destinationId }, { limit: 1 }));
  if (existing.length === 0) return { ok: false, error: 'publication_not_found', http: 404 };
  let publication = existing[0];

  const items = page(await base44.asServiceRole.entities.Item.filter({ estate_sale_id: saleId }, { limit: 2000, fields: ['id', 'title', 'description', 'category', 'subcategory', 'brand', 'condition', 'price', 'sold_price', 'status', 'featured', 'images', 'updated_date'] }));
  const company = await getOrThrow(base44, 'Company', sale.company_id);

  // Best-effort notification of unpublish to the destination.
  const adapter = getDestinationAdapter(destination.destination_type);
  let delivery = null;
  if (adapter) {
    const payload = buildCanonicalSalePayload({ sale, items, company, publication, event: 'unpublish' });
    delivery = await adapter({ destination, payload, publication });
  }

  const now = new Date().toISOString();
  publication = await base44.asServiceRole.entities.Publication.update(publication.id, {
    status: 'unpublished',
    unpublished_at: now,
    last_attempt_at: now,
    last_error: delivery && !delivery.delivered && delivery.mode !== 'none' ? delivery.detail : null,
    error_category: delivery && !delivery.delivered && delivery.mode !== 'none' ? 'retryable_delivery' : null
  });
  return { ok: true, publication, delivery };
}

// Change propagation: republish existing publications for a sale whose canonical
// data changed since the last success. Never creates publications on its own —
// a sale with no publication is a no-op (fail closed).
export async function syncSalePublications(base44, saleId) {
  const publications = page(await base44.asServiceRole.entities.Publication.filter({ sale_id: saleId }, { limit: 100 }));
  if (publications.length === 0) return [];

  const results = [];
  for (const p of publications) {
    if (!RECEIVING_STATUSES.includes(p.status)) {
      results.push({ publication_id: p.id, action: 'skipped', status: p.status });
      continue;
    }
    const sale = await getOrThrow(base44, 'EstateSale', saleId);
    if (!sale) {
      results.push({ publication_id: p.id, action: 'skipped', reason: 'sale_not_found' });
      continue;
    }
    const items = page(await base44.asServiceRole.entities.Item.filter({ estate_sale_id: saleId }, { limit: 2000, fields: ['id', 'updated_date', 'status'] }));
    const currentVersion = computeSourceVersion(sale, items);

    if (currentVersion === p.source_version && p.status === 'published') {
      results.push({ publication_id: p.id, action: 'up_to_date' });
      continue;
    }
    // Mark update_needed, then republish safely.
    if (p.status !== 'update_pending') {
      await base44.asServiceRole.entities.Publication.update(p.id, { status: 'update_pending' });
    }
    const r = await publishSaleToDestination(base44, saleId, p.destination_id);
    results.push({
      publication_id: p.id,
      action: r.ok ? 'republished' : 'error',
      status: r.ok ? r.publication.status : null,
      error: r.ok ? null : r.error
    });
  }
  return results;
}