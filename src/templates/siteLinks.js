// Internal template route helper. Tenant hostnames route through the SAME app
// paths; during preview/certification the ?site= parameter carries the tenant
// hostname (mirroring the certified Phase 3C runtime boundary — the SERVER
// always re-resolves and re-authorizes the hostname; this param is a routing
// convenience, never an authorization).
export function sitePath(hostname, path) {
  if (!hostname) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}site=${encodeURIComponent(hostname)}`;
}