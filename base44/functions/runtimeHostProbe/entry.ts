// Phase 3C Part 1 — Runtime host/hostname capability probe.
// Returns ONLY infrastructure metadata (no tenant data) so we can determine
// exactly what request context the Base44 runtime exposes server-side.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  const headerNames = [];
  const headerValues = {};
  try {
    const headers = req.headers;
    const interesting = [
      'host', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port',
      'x-original-host', 'x-forwarded-for', 'forwarded', 'referer', 'origin',
      'x-base44-app-url', 'x-real-ip', 'user-agent'
    ];
    for (const name of interesting) {
      const v = headers.get(name);
      if (v !== null && v !== undefined) { headerNames.push(name); headerValues[name] = v; }
    }
  } catch (e) { /* headers may be absent in some runtimes */ }

  let url = null;
  try { url = req.url; } catch (e) { /* req.url may not exist */ }

  return Response.json({
    ok: true,
    probe: 'runtime_host_probe',
    req_url: url,
    headers_present: headerNames,
    headers: headerValues
  });
}