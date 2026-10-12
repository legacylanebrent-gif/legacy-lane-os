// Template #1 sale detail (Parts 27/28) — canonical sale + optional
// WebsiteSalePresentation + canonical inventory, all via the runtime view
// model. Canonical data wins for every operational fact (Part 19).
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Car, Info, Star, CheckCircle2, ArrowLeft, AlertCircle, BellRing, ScrollText } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';
import TemplateErrorState from './TemplateErrorState.jsx';
import LeadForm from './LeadForm.jsx';
import SaleActions from './SaleActions.jsx';
import { formatSaleDates } from './SaleCard.jsx';

export default function Template1SaleDetail({ website, detail }) {
  const settings = website.settings || {};
  const saleDisplay = settings.sale_display || {};
  const invDisplay = settings.inventory_display || {};
  const { sale, presentation, inventory } = detail;
  const p = presentation || {};
  const [formOpen, setFormOpen] = useState(false);
  const ctaLabel = p.presentation_cta_label || 'Ask a Question';

  if (!sale) return <TemplateErrorState kind="sale_not_found" />;

  const captions = {};
  (p.photo_captions || []).forEach(c => { if (typeof c.image_index === 'number') captions[c.image_index] = c.caption; });
  const imgs = (Array.isArray(sale.images) ? sale.images : []);
  const hero = p.hero_image_url || (imgs[0] && imgs[0].url) || null;
  const addr = sale.address || {};
  const dates = formatSaleDates(sale.sale_dates);
  const visibleInventory = (inventory || []).filter(it =>
    saleDisplay.show_sold_items === false ? it.sold_status !== 'sold' : true);

  return (
    <article>
      <Link to={sitePath(website.hostname, '/site/sales')} className="inline-flex items-center gap-1 text-sm font-medium mb-4 hover:underline" style={{ color: 'var(--t1-primary)' }}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All sales
      </Link>

      {sale.status === 'completed' && (
        <div className="rounded-lg px-4 py-3 mb-5 text-sm font-semibold flex items-center gap-2" style={{ background: 'var(--t1-bg)', color: 'var(--t1-text)' }} role="status">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> This sale has concluded — thank you to everyone who came out.
        </div>
      )}

      {hero && (
        <figure className="rounded-xl overflow-hidden mb-6">
          <img src={hero} alt={p.seo_title || sale.title} className="w-full max-h-[420px] object-cover" />
          {captions[0] && <figcaption className="text-xs opacity-70 mt-1">{captions[0]}</figcaption>}
        </figure>
      )}

      <h1 className="text-3xl font-bold" style={{ fontFamily: (settings.branding || {}).heading_font_family || 'Georgia, serif' }}>{sale.title}</h1>
      {p.featured && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--t1-accent)', color: '#fff' }}>
          <Star className="w-3 h-3" aria-hidden="true" /> Featured Sale
        </span>
      )}
      {p.marketing_intro && <p className="mt-3 text-base leading-relaxed opacity-90">{p.marketing_intro}</p>}

      <div className="mt-4 grid gap-2 text-sm">
        {dates && <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4 opacity-70" aria-hidden="true" />{dates}</p>}
        {(addr.city || addr.state) && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-70" aria-hidden="true" />{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>}
        {sale.parking_info && <p className="flex items-center gap-2"><Car className="w-4 h-4 opacity-70" aria-hidden="true" />{sale.parking_info}</p>}
        {sale.special_notes && <p className="flex items-center gap-2"><Info className="w-4 h-4 opacity-70" aria-hidden="true" />{sale.special_notes}</p>}
      </div>

      {(p.display_highlights || []).length > 0 && (
        <ul className="mt-4 space-y-1">
          {p.display_highlights.map((hl, i) => (
            <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: 'var(--t1-primary)' }} aria-hidden="true" />{hl}</li>
          ))}
        </ul>
      )}

      {sale.description && <p className="mt-5 text-sm sm:text-base leading-relaxed opacity-90 whitespace-pre-line">{sale.description}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setFormOpen(o => !o)} aria-expanded={formOpen}
          className="px-5 py-2.5 rounded-md font-semibold text-white hover:opacity-90" style={{ background: 'var(--t1-primary)' }}>
          {ctaLabel}
        </button>
        {p.presentation_cta_link && (
          <a href={sitePath(website.hostname, p.presentation_cta_link)} className="px-5 py-2.5 rounded-md font-semibold border hover:opacity-90" style={{ borderColor: 'var(--t1-primary)', color: 'var(--t1-primary)' }}>
            {p.presentation_cta_label || 'Learn more'}
          </a>
        )}
      </div>

      {formOpen && (
        <div className="mt-6 max-w-lg">
          <LeadForm leadType="sale_question" sales={[]} fixedSale={sale} hostname={website.hostname} />
        </div>
      )}

      <SaleActions sale={sale} hostname={website.hostname} />

      <Link to={sitePath(website.hostname, '/site/contact') + '#buyer-alerts'}
        className="mt-6 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90"
        style={{ background: 'var(--t1-bg)', color: 'var(--t1-text)' }}>
        <BellRing className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t1-primary)' }} aria-hidden="true" />
        Never miss a sale like this — get alerts about upcoming sales.
      </Link>

      {(((settings.policies || {}).items) || []).filter(p => p && p.visible !== false && p.body).length > 0 && (
        <section className="mt-8" aria-labelledby="t1-sale-policies">
          <h2 id="t1-sale-policies" className="text-xl font-bold mb-3 flex items-center gap-2"><ScrollText className="w-4 h-4" style={{ color: 'var(--t1-primary)' }} aria-hidden="true" /> Sale Policies</h2>
          <div className="divide-y rounded-lg border" style={{ borderColor: 'var(--t1-primary)' }}>
            {settings.policies.items.filter(p => p && p.visible !== false && p.body).map((p, i) => (
              <details key={i} className="px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">{p.title || 'Policy'}</summary>
                <p className="mt-2 text-sm opacity-80 whitespace-pre-line">{p.body}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="t1-inventory-heading">
        <h2 id="t1-inventory-heading" className="text-2xl font-bold mb-4">Items in this Sale</h2>
        {visibleInventory.length === 0 ? <TemplateErrorState kind="no_inventory" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleInventory.map(it => (
              <div key={it.public_id} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--t1-primary)' }}>
                <div className="aspect-square w-full relative" style={{ background: '#e2e8f0' }}>
                  {Array.isArray(it.images) && it.images[0] && it.images[0].url ? (
                    <img src={it.images[0].url} alt={it.title || 'Item photo'} className="w-full h-full object-cover" />
                  ) : null}
                  {it.sold_status === 'sold' && (
                    <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">SOLD</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm leading-snug">{it.title}</h3>
                  {invDisplay.show_condition && it.condition && <p className="text-xs opacity-70 mt-0.5 capitalize">{String(it.condition).replace(/_/g, ' ')}</p>}
                  {invDisplay.show_prices && typeof it.price === 'number' && (
                    <p className="text-sm font-semibold mt-1" style={{ color: 'var(--t1-primary)' }}>${it.price.toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}