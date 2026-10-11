// Public website sitemap + robots (Phase 3D.1 — Parts 37/38).
// Tenant-safe: everything derives from the resolved hostname. Unpublished
// sales NEVER appear. Hostname comes from query param (GET), forwarded host
// header, or the request host — client cannot influence WHICH tenant beyond
// naming its own resolved hostname.
// Limitation (reported): host-level robots.txt is platform-managed; this
// runtime endpoint provides the tenant-safe sitemap.xml and robots directives
// for each resolved operator hostname.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveWebsiteTenant, getPublicSitemapEntries } from '../../shared/websiteRuntimeService.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const url = new URL(req.url);
    const hostname = String(url.searchParams.get('hostname') || req.headers.get('x-forwarded-host') || '').trim().toLowerCase();
    if (!hostname) return Response.json({ error: 'hostname_required' }, { status: 400 });

    const ctx = await resolveWebsiteTenant(service, hostname);
    if (!ctx.ok) {
      console.error(`[websiteSitemap] resolution denied (${ctx.error})`);
      // Not-yet-live/suspended sites: tell crawlers to stay away (Part 38).
      const disallow = 'User-agent: *\nDisallow: /\n';
      return new Response(disallow, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' } });
    }

    const type = url.searchParams.get('type') === 'robots' ? 'robots' : 'sitemap';
    if (type === 'robots') {
      const body = `User-agent: *\nAllow: /\nSitemap: ${url.origin}/functions/websiteSitemap?hostname=${encodeURIComponent(hostname)}&type=sitemap\n`;
      return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    const entries = await getPublicSitemapEntries(service, ctx);
    const origin = `https://${ctx.hostname}`;
    const urls = [
      ...entries.static_paths.map(p => `${origin}${p}`),
      ...entries.sales.map(s => `${origin}/site/sale/${s.slug}`)
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  } catch (error) {
    console.error('websiteSitemap error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}