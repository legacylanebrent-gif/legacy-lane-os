// Template #1 dedicated service page (Phase 4B — Part 13).
// Structured content only: service hero, overview, what's included, process,
// related FAQ, CTA. No free-form page builder. Data comes from the tenant's
// services settings — resolved by seo_slug; unknown slugs render the
// platform's friendly page-not-available state.
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';
import IconBadge from './IconBadge.jsx';
import TemplateErrorState from './TemplateErrorState.jsx';

function Paragraphs({ text }) {
  if (!text) return null;
  return text.split(/\n\s*\n/).map((para, i) => <p key={i} className="text-sm sm:text-base leading-relaxed opacity-90 mb-3">{para}</p>);
}

export default function Template1ServiceDetail({ website, serviceSlug }) {
  const settings = website.settings || {};
  const contact = settings.contact || {};
  const items = (((settings.services || {}).items) || []).filter(it => it.enabled !== false);
  const service = items.find(it => it.seo_slug && it.seo_slug === String(serviceSlug || '').toLowerCase()) || null;

  if (!service || !service.dedicated_page) return <TemplateErrorState kind="page_not_available" />;

  const faqItems = (((settings.faq || {}).items) || []).filter(qa => qa && qa.visible !== false).slice(0, 3);
  const ctaLabel = service.cta_label || contact.contact_cta_label || 'Request a Consultation';
  const ctaLink = service.cta_link || '/site/contact';

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm opacity-70">
        <Link to={sitePath(website.hostname, '/site/services')} className="hover:underline">Services</Link>
        <span aria-hidden="true"> / </span>
        <span>{service.title}</span>
      </nav>

      <section className="rounded-xl overflow-hidden" style={{ background: 'var(--t1-secondary)' }}>
        <div className="relative min-h-[200px] flex items-center" style={service.image_url ? {
          backgroundImage: `linear-gradient(rgba(15,23,42,0.6), rgba(15,23,42,0.6)), url(${service.image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center'
        } : {}}>
          <div className="p-8 sm:p-10 text-white">
            {service.icon && <span className="inline-flex mb-2"><IconBadge icon={service.icon} className="w-8 h-8" /></span>}
            <h1 className="text-3xl font-bold" style={{ fontFamily: (settings.branding || {}).heading_font_family || 'Georgia, serif' }}>{service.title}</h1>
            {service.description && <p className="mt-2 opacity-90 max-w-2xl">{service.description}</p>}
          </div>
        </div>
      </section>

      {service.long_description && (
        <section aria-labelledby="t1-svc-overview">
          <h2 id="t1-svc-overview" className="text-xl font-bold mb-3">Overview</h2>
          <Paragraphs text={service.long_description} />
        </section>
      )}

      {service.description && !service.long_description && (
        <section><p className="text-base opacity-90">{service.description}</p></section>
      )}

      <section className="rounded-xl p-6" style={{ background: 'var(--t1-bg)' }}>
        <h2 className="text-lg font-semibold mb-2">What's Included</h2>
        {service.long_description ? (
          <p className="text-sm opacity-80">Every engagement is tailored to your property and goals — request a consultation for a detailed plan and pricing.</p>
        ) : (
          <ul className="text-sm opacity-85 space-y-1">
            <li className="flex items-center gap-2"><Check className="w-4 h-4" aria-hidden="true" style={{ color: 'var(--t1-primary)' }} />Personalized planning for your situation</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4" aria-hidden="true" style={{ color: 'var(--t1-primary)' }} />Professional, local execution</li>
          </ul>
        )}
      </section>

      {faqItems.length > 0 && (
        <section aria-labelledby="t1-svc-faq">
          <h2 id="t1-svc-faq" className="text-lg font-semibold mb-2">Related Questions</h2>
          <div className="divide-y">
            {faqItems.map((qa, i) => (
              <details key={i} className="py-3">
                <summary className="cursor-pointer font-medium text-sm">{qa.question}</summary>
                <p className="mt-2 text-sm opacity-80">{qa.answer}</p>
              </details>
            ))}
          </div>
          <Link to={sitePath(website.hostname, '/site/faq')} className="inline-block mt-2 text-sm hover:underline" style={{ color: 'var(--t1-primary)' }}>All FAQs →</Link>
        </section>
      )}

      <section className="rounded-xl p-6 text-center" style={{ background: 'var(--t1-primary)', color: '#fff' }}>
        <h2 className="text-lg font-bold">{ctaLabel}</h2>
        <Link to={sitePath(website.hostname, ctaLink)}
          className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-md font-semibold hover:opacity-90"
          style={{ background: 'var(--t1-accent)', color: '#fff' }}>
          {ctaLabel} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}