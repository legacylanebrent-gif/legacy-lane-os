// Destination adapter registry.
// Publication service → adapter registry → destination-specific delivery.
// Never hardcode destination-specific conditionals in the publication service.
import { secrets } from 'base44:runtime';

const DELIVERY_TIMEOUT_MS = 10000;

// operator_website adapter: delivers the canonical publication payload to the
// destination's registered receiver endpoint. Authentication uses a platform
// secret referenced BY NAME in destination.configuration.auth_secret_name —
// raw secret values are never stored in the Destination record.
async function operatorWebsiteAdapter({ destination, payload }) {
  const cfg = destination.configuration || {};
  const url = cfg.webhook_url;
  if (!url) {
    // No receiver endpoint registered yet — relationship may exist, delivery awaits
    // destination-side configuration. Not an error; not retried until configured.
    return { delivered: false, mode: 'none', retryable: false, detail: 'no_delivery_endpoint_configured' };
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-EstateSalen-Source': 'canonical-publication'
  };
  if (cfg.auth_secret_name) {
    const secretValue = secrets.get(cfg.auth_secret_name);
    if (secretValue) headers['Authorization'] = `Bearer ${secretValue}`;
  }

  // Certified receiver contract (LLS receivePublication): identity must ALSO be
  // present as top-level fields. Additive — nested canonical structure unchanged.
  // Top-level source_version is the receiver's monotonic guard and is the
  // delivery-attempt epoch (always advances); the DETERMINISTIC canonical
  // version marker stays in the nested publication.source_version and in the
  // EstateSalen Publication record.
  const versionEpoch = String(Date.now());
  const event = payload.event || 'publish';
  const intentStatus = event === 'unpublish' ? 'unpublished' : 'published';
  const envelope = {
    ...payload,
    publication_id: (payload.publication && payload.publication.id) || null,
    company_id: (payload.company && payload.company.id) || null,
    destination_id: destination.id,
    sale_id: (payload.sale && payload.sale.id) || null,
    source_version: versionEpoch,
    status: intentStatus,
    publication: payload.publication
      ? { ...payload.publication, status: intentStatus }
      : payload.publication
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS)
    });
    if (res.ok) {
      // Capture a sanitized receiver acknowledgment (counts + provenance) —
      // known keys only, no payloads, no secrets.
      let receiver = null;
      try {
        const body = await res.json();
        if (body && typeof body === 'object' && !body.error) {
          const it = (body.items && typeof body.items === 'object') ? body.items : {};
          receiver = {
            status: body.status || null,
            external_reference: body.external_reference || (body.publication && body.publication.external_reference) || null,
            source_version: body.source_version || null,
            adopted: typeof body.adopted === 'boolean' ? body.adopted : null,
            items: {
              received: typeof it.received === 'number' ? it.received : (typeof it.total === 'number' ? it.total : null),
              processed: typeof it.processed === 'number' ? it.processed : null,
              mapped: typeof it.mapped === 'number' ? it.mapped : null,
              created: typeof it.created === 'number' ? it.created : null,
              updated: typeof it.updated === 'number' ? it.updated : null,
              unmapped: typeof it.unmapped === 'number' ? it.unmapped : null,
              duplicated: typeof it.duplicated === 'number' ? it.duplicated : null,
              persistence_failures: typeof it.persistence_failures === 'number' ? it.persistence_failures : null
            },
            presentation: (body.presentation && typeof body.presentation === 'object') ? {
              id: body.presentation.id || null,
              count: typeof body.presentation.count === 'number' ? body.presentation.count : null,
              duplicated_sales: typeof body.presentation.duplicated_sales === 'number' ? body.presentation.duplicated_sales : null,
              publication_managed: typeof body.presentation.publication_managed === 'boolean' ? body.presentation.publication_managed : null,
              provenance_stamped: typeof body.presentation.provenance_stamped === 'boolean' ? body.presentation.provenance_stamped : null,
              publication_id: body.presentation.publication_id || null,
              estatesalen_company_id: body.presentation.estatesalen_company_id || null,
              destination_id: body.presentation.destination_id || null,
              source_version: body.presentation.source_version || null
            } : null,
            condition_errors: typeof body.condition_errors === 'number' ? body.condition_errors : null,
            media_errors: typeof body.media_errors === 'number' ? body.media_errors : null
          };
        }
      } catch (e) { /* non-JSON success body */ }
      return { delivered: true, mode: 'webhook', retryable: false, detail: 'delivered', receiver };
    }
    // Sanitized receiver diagnostic: error code/message only — no payloads, no secrets.
    let receiverDetail = '';
    try {
      const body = await res.json();
      if (body && body.error) receiverDetail = `${body.error.code || ''}: ${body.error.message || ''}`.slice(0, 200);
    } catch (e) { /* non-JSON body */ }
    return {
      delivered: false,
      mode: 'webhook',
      retryable: res.status >= 500,
      detail: `receiver_responded_${res.status}${receiverDetail ? ` [${receiverDetail}]` : ''}`
    };
  } catch (e) {
    return { delivered: false, mode: 'webhook', retryable: true, detail: `delivery_error_${(e && e.name) || 'unknown'}` };
  }
}

export const destinationAdapters = {
  operator_website: operatorWebsiteAdapter
};

export function getDestinationAdapter(destinationType) {
  return destinationAdapters[destinationType] || null;
}