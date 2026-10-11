// Reusable tenant-configured testimonials surface (Phase 3D.3). Purely
// presentational: renders ONLY what the tenant settings contain; renders
// nothing when empty (no hardcoded operator identity — Part 42).
import React from 'react';
import { Quote } from 'lucide-react';

export default function TestimonialsSection({ settings }) {
  const t = (settings && settings.testimonials) || {};
  const items = (t.items || []).filter(it => it && (it.quote || it.name));
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="t1-testimonials-heading">
      {t.headline && <h2 id="t1-testimonials-heading" className="text-2xl font-bold mb-4">{t.headline}</h2>}
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((it, i) => (
          <figure key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
            <Quote className="w-5 h-5 opacity-40" aria-hidden="true" />
            {it.quote && <blockquote className="mt-2 text-sm leading-relaxed opacity-90">{it.quote}</blockquote>}
            {(it.name || it.context) && (
              <figcaption className="mt-3 text-xs font-semibold" style={{ color: 'var(--t1-primary)' }}>
                {it.name || ''}{it.context ? ` · ${it.context}` : ''}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}