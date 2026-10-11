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
    if (res.ok) return { delivered: true, mode: 'webhook', retryable: false, detail: 'delivered' };
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