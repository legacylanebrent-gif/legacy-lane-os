// Template #1 gallery page (Phase 4B — Part 15).
// Renders the tenant presentation gallery (NOT canonical inventory) — visible
// items only, grouped by category when multiple categories exist. Renders
// nothing when empty (the route is not published without content).
import React from 'react';
import { Link } from 'react-router-dom';
import { sitePath } from '@/templates/siteLinks';
import TemplateErrorState from './TemplateErrorState.jsx';

const CATEGORY_LABELS = {
  past_sales: 'Past Sales', interesting_finds: 'Interesting Finds', before_after: 'Before & After',
  homes: 'Homes', team_at_work: 'Team at Work', success_stories: 'Success Stories', other: 'Gallery'
};

export default function Template1Gallery({ website }) {
  const settings = website.settings || {};
  const g = settings.gallery || {};
  const items = (g.items || []).filter(it => it && it.visible !== false && it.image_url);
  if (items.length === 0) return <TemplateErrorState kind="page_not_available" />;

  const groups = {};
  for (const it of items) {
    const key = it.category || 'other';
    (groups[key] = groups[key] || []).push(it);
  }
  const keys = Object.keys(groups);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{g.headline || 'Gallery'}</h1>
      {g.intro && <p className="opacity-80 mb-6 max-w-2xl">{g.intro}</p>}
      {keys.map(k => (
        <section key={k} aria-label={CATEGORY_LABELS[k] || 'Gallery'} className="mb-8">
          {keys.length > 1 && <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[k] || 'Gallery'}</h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups[k].map((it, i) => (
              <figure key={i} className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--t1-primary)' }}>
                <img src={it.image_url} alt={it.alt_text || it.caption || 'Gallery image'} className="w-full h-48 object-cover" loading="lazy" />
                {(it.caption) && <figcaption className="p-3 text-sm opacity-85">{it.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm mt-4">
        <Link to={sitePath(website.hostname, '/site/contact')} className="hover:underline" style={{ color: 'var(--t1-primary)' }}>Have something like these to sell? Get in touch →</Link>
      </p>
    </div>
  );
}