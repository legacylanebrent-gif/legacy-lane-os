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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS)
    });
    if (res.ok) return { delivered: true, mode: 'webhook', retryable: false, detail: 'delivered' };
    return {
      delivered: false,
      mode: 'webhook',
      retryable: res.status >= 500,
      detail: `receiver_responded_${res.status}`
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