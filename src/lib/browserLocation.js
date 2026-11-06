// Mobile-safe location resolution.
// Mobile browsers (iOS Safari, in-app browsers, permission-restricted previews)
// frequently fail a bare getCurrentPosition() call: no fix indoors, no timeout,
// or a straight permission block. This tries precise GPS, retries with coarse
// network location, and finally falls back to an approximate IP lookup so the
// "Use My Location" action still returns something usable.

const PRECISE_OPTIONS = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 };
const COARSE_OPTIONS = { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 };

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function lookupApproximateCoords() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    return { lat, lng, approximate: true, zip: String(data.postal || '').slice(0, 5) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves the visitor's current position.
 * @returns {Promise<{lat: number, lng: number, approximate: boolean, zip?: string} | null>}
 */
export async function resolveCurrentLocation() {
  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;

  if (geo && window.isSecureContext) {
    try {
      const pos = await getPosition(PRECISE_OPTIONS);
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, approximate: false };
    } catch (preciseError) {
      // A deliberate "block" (code 1) means asking again is pointless.
      if (preciseError?.code !== 1) {
        try {
          const pos = await getPosition(COARSE_OPTIONS);
          return { lat: pos.coords.latitude, lng: pos.coords.longitude, approximate: true };
        } catch {
          /* fall through to the approximate lookup */
        }
      }
    }
  }

  return lookupApproximateCoords();
}