// Template #1 homepage (Part 25) — tenant settings + Company context +
// publication-visible canonical sales. Zero operator-identity hardcoding.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';
import SaleCard from './SaleCard.jsx';

export default function Template1Home({ website }) {
  const settings = website.settings || {};
  const h = settings.homepage || {};
  const services = (settings.services && settings.services.items) || [];
  const sales = website.published_sales || [];
  const businessName = settings.display_business_name || website.company.display_name || website.site_name;
  const headline = h.hero_headline || `Estate sales by ${businessName}`;
  const subheadline = h.hero_subheadline || (settings.tagline || 'Trusted local estate sale services');
  const ctaLink = h.cta_link || '/site/sales';
  const ctaLabel = h.cta_label || 'View Our Sales';

  return (
    <div className="space-y-10">
      <section className="rounded-xl overflow-hidden" style={{ background: 'var(--t1-secondary)' }}>
        <div className="relative min-h-[280px] flex items-center" style={h.hero_image_url ? {
          backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${h.hero_image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        } : {}}>
          <div className="p-8 sm:p-12 text-white">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: (settings.branding || {}).heading_font_family || 'Georgia, serif' }}>{headline}</h1>
            <p className="mt-3 text-base sm:text-lg opacity-90">{subheadline}</p>
            <Link to={sitePath(website.hostname, ctaLink)}
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-md font-semibold text-white hover:opacity-90"
              style={{ background: 'var(--t1-primary)' }}>
              {ctaLabel} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {h.intro_copy && (
        <section>
          <p className="text-base sm:text-lg leading-relaxed opacity-90 max-w-3xl">{h.intro_copy}</p>
        </section>
      )}

      <section aria-labelledby="t1-sales-heading">
        <div className="flex items-end justify-between mb-4">
          <h2 id="t1-sales-heading" className="text-2xl font-bold">Current &amp; Upcoming Sales</h2>
          <Link to={sitePath(website.hostname, '/site/sales')} className="text-sm font-medium hover:underline" style={{ color: 'var(--t1-primary)' }}>All sales</Link>
        </div>
        {sales.length === 0 ? (
          <p className="opacity-70 text-sm">No upcoming sales right now — check back soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sales.slice(0, 3).map(s => <SaleCard key={s.public_id} sale={s} hostname={website.hostname} />)}
          </div>
        )}
      </section>

      {services.length > 0 && (
        <section aria-labelledby="t1-services-heading">
          <h2 id="t1-services-heading" className="text-2xl font-bold mb-4">Our Services</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 3).map((it, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
                <h3 className="font-semibold">{it.title}</h3>
                {it.description && <p className="mt-1 text-sm opacity-80">{it.description}</p>}
              </div>
            ))}
          </div>
          <Link to={sitePath(website.hostname, '/site/services')} className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--t1-primary)' }}>All services</Link>
        </section>
      )}

      {settings.cta && settings.cta.label && (
        <section className="rounded-xl p-8 text-center" style={{ background: 'var(--t1-primary)', color: '#fff' }}>
          <h2 className="text-xl font-bold">{settings.cta.label}</h2>
          {settings.cta.sublabel && <p className="mt-1 opacity-90">{settings.cta.sublabel}</p>}
          <Link to={sitePath(website.hostname, settings.cta.link || '/site/contact')}
            className="inline-block mt-4 px-5 py-2.5 rounded-md font-semibold hover:opacity-90"
            style={{ background: 'var(--t1-accent)', color: '#fff' }}>
            Get in touch
          </Link>
        </section>
      )}
    </div>
  );
}