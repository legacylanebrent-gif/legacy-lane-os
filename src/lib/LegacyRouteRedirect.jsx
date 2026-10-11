// Phase 3D.4 (Parts 19/20/21) — legacy Legacy Lane URL redirects.
// HOSTNAME-AWARE: legacy-path redirects apply ONLY on non-platform hosts
// (the production custom domain, e.g. legacylanesales.com, once routed).
// Preview/test/platform hosts (*.base44.app, *.estatesalen.com, localhost)
// NEVER redirect — and no redirect ever sends a visitor to a different host:
// they map legacy paths to operator-website routes on the SAME host.
// Redirects use location.replace() (permanent, no history pollution).
// Status-code note: these are runtime-level permanent redirects; host-level
// 301s (Domains → page redirects) can be layered at the domain edge at cutover.
import React, { useEffect } from 'react';
import PageNotFound from './PageNotFound';

const PLATFORM_HOST_SUFFIXES = ['base44.app', 'estatesalen.com', 'localhost'];

const REDIRECT_MAP = {
  '/sales': '/site/sales',
  '/services': '/site/services',
  '/contact': '/site/contact',
  '/about': '/site/about',
  '/serviceestatesales': '/site/services',
  '/servicerealestate': '/site/services',
  '/serviceappraisals': '/site/services',
  '/servicecleanouts': '/site/services',
  '/serviceconsignment': '/site/services',
  '/serviceconsultation': '/site/services',
  // /Subscribe retires to the closest live replacement (contact/VIP list).
  '/subscribe': '/site/contact'
  // /Partnership: intentional retirement — no Template #1 equivalent; it keeps
  // its natural 404 (no dead navigation links point at it).
};

export default function LegacyRouteRedirect() {
  useEffect(() => {
    const host = (window.location.hostname || '').toLowerCase();
    const isPlatformHost = PLATFORM_HOST_SUFFIXES.some(s => host === s || host.endsWith('.' + s));
    if (isPlatformHost) return;
    const norm = (window.location.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
    if (norm === '/saledetails') {
      // Deterministic where a canonical reference exists: ?id=os_<canonical_sale_id>
      // resolves to that sale's runtime detail route. Legacy LLS-local ids have no
      // EstateSalen-side mapping table yet — they fall back to the Sales list
      // (per-sale map is a cutover-time data task on the LLS side).
      const id = new URLSearchParams(window.location.search).get('id') || '';
      const canonical = id.startsWith('os_') ? id.slice(3) : '';
      window.location.replace(canonical ? `/site/sale/${encodeURIComponent(canonical)}` : '/site/sales');
    } else if (REDIRECT_MAP[norm]) {
      window.location.replace(REDIRECT_MAP[norm]);
    }
  }, []);
  return <PageNotFound />;
}