// Phase 4E (Parts 31/32/33) — public website analytics event tracking seam.
// PUBLIC endpoint (operator-website visitors are anonymous). EVERYTHING about
// attribution is derived server-side from hostname resolution — client-supplied
// tenant/company/destination ids are ignored and cannot influence attribution.
// Privacy (Part 31): NO PII — no IP storage, no visitor profiles; referrer is
// reduced to origin host; session id is a client-generated pseudonymous random
// value. Live tenants only — draft/preview/suspended sites are never tracked.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveWebsiteTenant } from '../../shared/websiteRuntimeService.ts';

const TRACKABLE = new Set([
  'page_view', 'sale_view', 'inventory_view', 'seller_cta_click',
  'phone_click', 'email_click', 'directions_click', 'share_click', 'calendar_add'
]); // seller_lead / buyer_signup are written ONLY by the canonical lead funnel.

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 200) : '');
const pathOnly = (v) => {
  const p = clean(v, 400);
  if (!p.startsWith('/')) return null;
  const cut = p.indexOf('?');
  return (cut >= 0 ? p.slice(0, cut) : p).slice(0, 300) || null;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const routedHost = req.headers.get('x-forwarded-host') || null;
    const hostname = clean(body.hostname || routedHost, 250).toLowerCase();
    const eventType = clean(body.event_type, 40);
    if (!hostname || !TRACKABLE.has(eventType)) {
      return Response.json({ ok: true, tracked: false }); // silent no-op, no detail leaked
    }

    const ctx = await resolveWebsiteTenant(service, hostname);
    if (!ctx.ok) return Response.json({ ok: true, tracked: false }); // only LIVE public sites are tracked

    // Referrer → origin host only (never the full URL with paths/queries).
    let refHost = '';
    const refRaw = clean(body.referrer, 1000);
    if (refRaw) {
      try { refHost = new URL(refRaw).hostname.toLowerCase().slice(0, 200); } catch { refHost = ''; }
    }
    const refHeader = req.headers.get('referer') || '';
    if (!refHost && refHeader) {
      try { refHost = new URL(refHeader).hostname.toLowerCase().slice(0, 200); } catch { refHost = ''; }
    }

    // Campaign attribution from trusted utm_* params only.
    const utm = (k) => clean(body[k] || '', 120) || null;

    const page = pathOnly(body.page) || '/site';
    const sessionHash = clean(body.session_hash, 64).replace(/[^a-zA-Z0-9_-]/g, '') || null;

    await service.entities.WebsiteEvent.create({
      website_tenant_id: ctx.tenant.id,
      company_id: ctx.company.id,
      event_type: eventType,
      hostname: ctx.hostname,
      page,
      sale_public_id: clean(body.sale_public_id, 120) || null,
      item_public_id: clean(body.item_public_id, 120) || null,
      referrer: refHost || null,
      utm_source: utm('utm_source'),
      utm_medium: utm('utm_medium'),
      utm_campaign: utm('utm_campaign'),
      session_hash: sessionHash,
      member_user_ids: ctx.tenant.member_user_ids || []
    });

    return Response.json({ ok: true, tracked: true });
  } catch (error) {
    console.error('trackWebsiteEvent error:', error && error.message);
    return Response.json({ ok: true, tracked: false }); // analytics never breaks the visitor experience
  }
}