// Template #1 homepage (Phase 4B — Parts 6/7/8/9/11/22/23).
// Controlled section registry: hero + configurable show/hide/reorder sections.
// Zero operator-identity hardcoding; content renders nothing when empty.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';
import SaleCard from './SaleCard.jsx';
import TestimonialsSection from './TestimonialsSection.jsx';
import IconBadge from './IconBadge.jsx';

export const DEFAULT_SECTION_ORDER = ['intro', 'services', 'sales', 'why_choose_us', 'how_it_works', 'testimonials', 'service_area', 'cta'];

function orderedSections(homepage) {
  const configured = (homepage.sections || []);
  const byKey = {};
  for (const s of configured) byKey[s.key] = s;
  const present = new Set(configured.map(s => s.key));
  // Configured sections keep their order; never-configured sections append in
  // default order (backwards compatible with tenants predating section config).
  const ordered = configured.map(s => s.key);
  for (const k of DEFAULT_SECTION_ORDER) if (!present.has(k)) ordered.push(k);
  return ordered.map(key => byKey[key] || { key, visible: true }).filter(s => s.visible !== false);
}

function Hero({ settings, website }) {
  const h = settings.homepage || {};
  const businessName = settings.display_business_name || (website.company || {}).display_name || website.site_name;
  const headline = h.hero_headline || `Estate sales by ${businessName}`;
  const subheadline = h.hero_subheadline || (settings.tagline || 'Trusted local estate sale services');
  const ctaLink = h.cta_link || '/site/sales';
  const ctaLabel = h.cta_label || 'View Our Sales';
  const headingStyle = { fontFamily: (settings.branding || {}).heading_font_family || 'Georgia, serif' };
  const layout = h.hero_layout || 'overlay';
  const img = h.hero_image_url;
  const secondary = h.secondary_cta_text ? (
    <Link to={sitePath(website.hostname, h.secondary_cta_link || '/site/contact')}
      className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-md font-semibold border border-white/60 text-white hover:bg-white/10 sm:mt-6 sm:ml-3">
      {h.secondary_cta_text}
    </Link>
  ) : null;

  if (layout === 'text_left') {
    return (
      <section className="rounded-xl overflow-hidden grid md:grid-cols-2 items-stretch" style={{ background: 'var(--t1-secondary)' }}>
        <div className="p-8 sm:p-12 flex flex-col justify-center text-white">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={headingStyle}>{headline}</h1>
          <p className="mt-3 text-base sm:text-lg opacity-90">{subheadline}</p>
          <div className="flex flex-wrap">
            <Link to={sitePath(website.hostname, ctaLink)} className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-md font-semibold text-white hover:opacity-90" style={{ background: 'var(--t1-primary)' }}>
              {ctaLabel} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            {secondary}
          </div>
        </div>
        {img && <img src={img} alt={headline} className="h-64 md:h-full w-full object-cover" />}
      </section>
    );
  }

  const centered = layout === 'centered';
  const fullBg = layout === 'full_background';
  const bgStyle = img ? {
    backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${img})`,
    backgroundSize: 'cover', backgroundPosition: 'center'
  } : {};
  return (
    <section className="rounded-xl overflow-hidden" style={{ background: 'var(--t1-secondary)' }}>
      <div className={`relative flex items-center ${centered ? 'justify-center text-center' : ''} ${fullBg ? 'min-h-[420px]' : 'min-h-[280px]'}`} style={bgStyle}>
        <div className={`p-8 sm:p-12 text-white ${fullBg ? 'max-w-2xl' : ''}`}>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={headingStyle}>{headline}</h1>
          <p className="mt-3 text-base sm:text-lg opacity-90">{subheadline}</p>
          <div className={`flex flex-wrap ${centered ? 'justify-center' : ''}`}>
            <Link to={sitePath(website.hostname, ctaLink)}
              className={`inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-md font-semibold text-white hover:opacity-90 ${fullBg ? 'mt-8 px-7 py-3 text-base' : ''}`}
              style={{ background: 'var(--t1-primary)' }}>
              {ctaLabel} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            {secondary}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Template1Home({ website }) {
  const settings = website.settings || {};
  const h = settings.homepage || {};
  const services = (((settings.services || {}).items) || []).filter(it => it.show_on_homepage !== false);
  // Homepage: current & upcoming only — completed sales belong on the
  // sales page's Recently Completed archive (Phase 4C, Part 13).
  const sales = (website.published_sales || []).filter(s => s.status !== 'completed');
  const why = settings.why_choose_us || {};
  const how = settings.how_it_works || {};
  const trust = settings.trust || {};
  const biz = settings.business || {};
  const contact = settings.contact || {};
  const cta = settings.cta || {};

  const sections = {
    intro: h.intro_copy ? (
      <section key="intro"><p className="text-base sm:text-lg leading-relaxed opacity-90 max-w-3xl">{h.intro_copy}</p></section>
    ) : null,
    services: services.length > 0 ? (
      <section key="services" aria-labelledby="t1-services-heading">
        <h2 id="t1-services-heading" className="text-2xl font-bold mb-4">Our Services</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((it, i) => (
            <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
              {it.icon && <span className="inline-flex mb-2" style={{ color: 'var(--t1-primary)' }}><IconBadge icon={it.icon} /></span>}
              {it.dedicated_page && it.seo_slug ? (
                <Link to={sitePath(website.hostname, `/site/services/${it.seo_slug}`)} className="font-semibold hover:underline" style={{ color: 'var(--t1-primary)' }}>{it.title}</Link>
              ) : <h3 className="font-semibold">{it.title}</h3>}
              {it.description && <p className="mt-1 text-sm opacity-80">{it.description}</p>}
            </div>
          ))}
        </div>
        <Link to={sitePath(website.hostname, '/site/services')} className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--t1-primary)' }}>All services</Link>
      </section>
    ) : null,
    sales: (
      <section key="sales" aria-labelledby="t1-sales-heading">
        <div className="flex items-end justify-between mb-4">
          <h2 id="t1-sales-heading" className="text-2xl font-bold">Current &amp; Upcoming Sales</h2>
          <Link to={sitePath(website.hostname, '/site/sales')} className="text-sm font-medium hover:underline" style={{ color: 'var(--t1-primary)' }}>All sales</Link>
        </div>
        {sales.length === 0 ? (
          <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--t1-primary)' }}>
            <p className="font-semibold text-lg">No Upcoming Sales Right Now</p>
            <p className="text-sm opacity-80 mt-1">Join our sale alerts to hear about the next one.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to={sitePath(website.hostname, '/site/contact') + '#buyer-alerts'}
                className="px-4 py-2 rounded-md font-semibold text-white hover:opacity-90 text-sm" style={{ background: 'var(--t1-primary)' }}>
                Get Sale Alerts
              </Link>
              <Link to={sitePath(website.hostname, '/site/contact')}
                className="px-4 py-2 rounded-md font-semibold border hover:opacity-90 text-sm"
                style={{ borderColor: 'var(--t1-primary)', color: 'var(--t1-primary)' }}>
                Planning an estate sale? Contact us.
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sales.slice(0, 3).map(s => <SaleCard key={s.public_id} sale={s} hostname={website.hostname} />)}
          </div>
        )}
      </section>
    ),
    why_choose_us: (why.items || []).length > 0 ? (
      <section key="why_choose_us" aria-labelledby="t1-why-heading">
        <h2 id="t1-why-heading" className="text-2xl font-bold mb-4">{why.headline || 'Why Choose Us'}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {why.items.map((it, i) => (
            <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
              {it.icon && <span className="inline-flex mb-2" style={{ color: 'var(--t1-primary)' }}><IconBadge icon={it.icon} /></span>}
              <h3 className="font-semibold">{it.title}</h3>
              {it.description && <p className="mt-1 text-sm opacity-80">{it.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    how_it_works: (how.steps || []).length > 0 ? (
      <section key="how_it_works" aria-labelledby="t1-how-heading">
        <h2 id="t1-how-heading" className="text-2xl font-bold mb-4">{how.headline || 'How It Works'}</h2>
        {how.intro && <p className="opacity-80 mb-4 max-w-2xl">{how.intro}</p>}
        <ol className="space-y-3">
          {how.steps.map((st, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--t1-primary)' }}>{i + 1}</span>
              <div>
                <div className="font-semibold">{st.title}</div>
                {st.description && <p className="text-sm opacity-80">{st.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    ) : null,
    testimonials: <TestimonialsSection key="testimonials" settings={settings} />,
    service_area: ((biz.primary_city || biz.primary_county || (biz.cities_served || []).length || (biz.counties_served || []).length || biz.service_area_notes)) ? (
      <section key="service_area" aria-labelledby="t1-area-heading" className="rounded-xl p-6" style={{ background: 'var(--t1-bg)' }}>
        <h2 id="t1-area-heading" className="text-xl font-bold mb-2">Service Area</h2>
        <p className="text-sm opacity-85">
          {[
            biz.primary_city && `Based in ${biz.primary_city}${biz.primary_county ? `, ${biz.primary_county}` : ''}`,
            (biz.cities_served || []).length > 0 && `Serving ${biz.cities_served.slice(0, 8).join(', ')}${biz.cities_served.length > 8 ? ' and nearby communities' : ''}`,
            biz.service_area_notes
          ].filter(Boolean).join(' · ')}
        </p>
      </section>
    ) : null,
    cta: cta.label ? (
      <section key="cta" className="rounded-xl p-8 text-center" style={{ background: 'var(--t1-primary)', color: '#fff' }}>
        <h2 className="text-xl font-bold">{cta.label}</h2>
        {cta.sublabel && <p className="mt-1 opacity-90">{cta.sublabel}</p>}
        <Link to={sitePath(website.hostname, cta.link || '/site/contact')}
          className="inline-block mt-4 px-5 py-2.5 rounded-md font-semibold hover:opacity-90"
          style={{ background: 'var(--t1-accent)', color: '#fff' }}>
          {contact.contact_cta_label || 'Get in touch'}
        </Link>
      </section>
    ) : null
  };

  return (
    <div className="space-y-10">
      <Hero settings={settings} website={website} />
      {(trust.items || []).length > 0 && (
        <section key="trust_strip" aria-label="Credentials" className="flex flex-wrap gap-3">
          {trust.items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-sm rounded-full border px-3 py-1.5" style={{ borderColor: 'var(--t1-primary)' }}>
              <Check className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--t1-primary)' }} />{it.label}
            </span>
          ))}
        </section>
      )}
      {orderedSections(h).map(s => sections[s.key] || null)}
    </div>
  );
}