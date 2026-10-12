// Operator website page — Template #1 host page (Phase 3D.1).
// Fetches ONLY through the certified runtime seam (Part 23): components
// receive safe view models and never query Sale/Inventory/Publication/
// Destination/Company entities. Hostname: ?site= routing override during
// preview/cert, otherwise the actual browser hostname — the SERVER always
// re-resolves and re-authorizes.
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@/templates/registry';
import TemplateErrorState from '@/templates/operatorTemplate1/TemplateErrorState';

function setMeta(key, content, attr = 'name') {
  if (content == null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function injectJsonLd(id, data) {
  const scriptId = `t1-jsonld-${id}`;
  let el = document.getElementById(scriptId);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function OperatorSitePage({ pageType }) {
  const params = useParams();
  const [state, setState] = useState({ loading: true, error: null, website: null, detail: null, leadContext: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ loading: true, error: null, website: null, detail: null, leadContext: null });
      const urlParams = new URLSearchParams(window.location.search);
      const hostname = (urlParams.get('site') || window.location.hostname || '').trim().toLowerCase();
      try {
        const siteRes = await base44.functions.invoke('websiteRuntime', { hostname });
        const site = siteRes.data;
        if (!site || !site.ok) { if (!cancelled) setState({ loading: false, error: 'unknown_template' }); return; }
        if (cancelled) return;
        if (pageType === 'sale_detail') {
          const detailRes = await base44.functions.invoke('websiteRuntime', { hostname, action: 'sale', public_sale_id: params.saleSlug });
          const d = detailRes.data;
          if (!d || !d.ok) {
            if (!cancelled) setState({ loading: false, error: d && d.error === 'sale_not_found' ? 'sale_not_found' : 'unavailable', website: site.website });
            return;
          }
          const lc = await base44.functions.invoke('websiteRuntime', { hostname, action: 'lead_context' });
          if (!cancelled) setState({ loading: false, website: site.website, detail: d, leadContext: (lc.data && lc.data.lead_context) || null });
        } else if (pageType === 'contact') {
          const lc = await base44.functions.invoke('websiteRuntime', { hostname, action: 'lead_context' });
          if (!cancelled) setState({ loading: false, website: site.website, leadContext: (lc.data && lc.data.lead_context) || null });
        } else if (pageType === 'service_detail') {
          // Dedicated service pages are pure tenant-settings content — no
          // canonical data access, no extra runtime call (Phase 4B, Part 13).
          if (!cancelled) setState({ loading: false, website: site.website, detail: { service_slug: params.serviceSlug } });
        } else {
          if (!cancelled) setState({ loading: false, website: site.website });
        }
      } catch (e) {
        if (cancelled) return;
        const status = e.response && e.response.status;
        const code = e.response && e.response.data && e.response.data.error;
        if (status === 404 && code === 'unknown_host') setState({ loading: false, error: 'unknown_site' });
        else if (status === 404) setState({ loading: false, error: 'sale_not_found' });
        else setState({ loading: false, error: 'unavailable' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [pageType, params.saleSlug]);

  // SEO foundation (Part 36): tenant defaults + presentation overrides;
  // canonical URL derives from the RESOLVED hostname — never hardcoded.
  useEffect(() => {
    if (!state.website) return;
    const settings = state.website.settings || {};
    const host = state.website.hostname;
    const siteLabel = settings.display_business_name || state.website.site_name;
    let title = (settings.seo && settings.seo.default_title) || `${siteLabel} | Estate Sales`;
    let description = (settings.seo && settings.seo.default_description) || null;
    let image = (settings.seo && settings.seo.social_image_url) || null;
    if (pageType === 'sale_detail' && state.detail && state.detail.sale) {
      const p = state.detail.presentation || {};
      title = p.seo_title || `${state.detail.sale.title} | ${siteLabel}`;
      description = p.seo_description || state.detail.sale.meta_description || description;
      image = p.hero_image_url || image;
    }
    document.title = title;
    setMeta('description', description || '');
    setMeta('og:title', title, 'property');
    setMeta('og:description', description || '', 'property');
    setMeta('og:image', image, 'property');
    setCanonical(`https://${host}${window.location.pathname}`);

    // Structured data (Phase 4C, Part 34): Organization on the home page;
    // Event + BreadcrumbList on sale detail — public projection data only.
    if (pageType === 'home') {
      injectJsonLd('org', {
        '@context': 'https://schema.org', '@type': 'Organization',
        name: siteLabel, url: `https://${host}/site`,
        ...(image ? { logo: image } : {})
      });
    } else if (pageType === 'sale_detail' && state.detail && state.detail.sale) {
      const sale = state.detail.sale;
      const addr = sale.address || {};
      const dates = Array.isArray(sale.sale_dates) ? sale.sale_dates.filter(d => d && d.date) : [];
      const first = dates[0] || {};
      const start = first.date ? `${first.date}T${first.start_time || '09:00:00'}` : null;
      const end = first.date ? `${first.date}T${first.end_time || '17:00:00'}` : null;
      const canonical = `https://${host}/site/sale/${sale.public_id}`;
      injectJsonLd('org', { '@context': 'https://schema.org', '@type': 'Organization', name: siteLabel, url: `https://${host}/site` });
      if (start) {
        injectJsonLd('event', {
          '@context': 'https://schema.org', '@type': 'Event',
          name: sale.title,
          description: sale.meta_description || sale.description || undefined,
          image: image || undefined,
          startDate: start,
          endDate: end || undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: addr.formatted_address || [addr.city, addr.state].filter(Boolean).join(', ') || undefined,
            address: { '@type': 'PostalAddress', streetAddress: addr.street, addressLocality: addr.city, addressRegion: addr.state, postalCode: addr.zip }
          },
          organizer: { '@type': 'Organization', name: siteLabel },
          url: canonical
        });
      }
      injectJsonLd('crumb', {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${host}/site` },
          { '@type': 'ListItem', position: 2, name: 'Estate Sales', item: `https://${host}/site/sales` },
          { '@type': 'ListItem', position: 3, name: sale.title, item: canonical }
        ]
      });
    }
  }, [state.website, state.detail, pageType]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" aria-label="Loading website" />
      </div>
    );
  }

  if (!state.website || (pageType === 'sale_detail' && !state.detail)) {
    return (
      <div className="min-h-screen bg-white">
        <TemplateErrorState kind={state.error === 'sale_not_found' ? 'sale_not_found' : (state.error || 'unavailable')} />
      </div>
    );
  }

  const boundId = (state.website.template && state.website.template.id) || DEFAULT_TEMPLATE_ID;
  const tpl = getTemplate(boundId);
  if (!tpl) return <div className="min-h-screen bg-white"><TemplateErrorState kind="unknown_template" /></div>;
  const TemplateComponent = tpl.component;

  if (state.error === 'sale_not_found') {
    return (
      <div className="min-h-screen" style={{ background: '#fff' }}>
        <TemplateErrorState kind="sale_not_found" />
      </div>
    );
  }

  return <TemplateComponent pageType={pageType} website={state.website} detail={state.detail} leadContext={state.leadContext} />;
}