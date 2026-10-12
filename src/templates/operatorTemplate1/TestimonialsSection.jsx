// Reusable tenant-configured testimonials surface (Phase 3D.3 + 4B Part 14).
// Purely presentational: renders ONLY what the tenant settings contain —
// visible items, featured first, optional location/photo. Renders nothing
// when empty (no hardcoded operator identity — Part 42). No star ratings.
import React from 'react';
import { Quote } from 'lucide-react';

export default function TestimonialsSection({ settings }) {
  const t = (settings && settings.testimonials) || {};
  const items = (t.items || [])
    .filter(it => it && it.visible !== false && (it.quote || it.name))
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="t1-testimonials-heading">
      {t.headline && <h2 id="t1-testimonials-heading" className="text-2xl font-bold mb-4">{t.headline}</h2>}
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((it, i) => (
          <figure key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
            <div className="flex items-center gap-2">
              {it.photo_url && <img src={it.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
              <Quote className="w-5 h-5 opacity-40" aria-hidden="true" />
            </div>
            {it.quote && <blockquote className="mt-2 text-sm leading-relaxed opacity-90">{it.quote}</blockquote>}
            {(it.name || it.context || it.location) && (
              <figcaption className="mt-3 text-xs font-semibold" style={{ color: 'var(--t1-primary)' }}>
                {it.name || ''}{it.location ? ` · ${it.location}` : ''}{it.context ? ` · ${it.context}` : ''}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}