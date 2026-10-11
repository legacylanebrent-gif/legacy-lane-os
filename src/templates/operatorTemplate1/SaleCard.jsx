// Sale card + formatting helpers — presentational only (Part 23).
import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Star } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';
import { format } from 'date-fns';

export function formatSaleDates(saleDates) {
  if (!Array.isArray(saleDates) || saleDates.length === 0) return null;
  const first = saleDates[0];
  if (!first || !first.date) return null;
  try {
    const d = format(new Date(`${first.date}T12:00:00`), 'EEE, MMM d, yyyy');
    const times = first.start_time ? ` · ${first.start_time}${first.end_time ? `–${first.end_time}` : ''}` : '';
    const more = saleDates.length > 1 ? ` +${saleDates.length - 1} more day${saleDates.length > 2 ? 's' : ''}` : '';
    return `${d}${times}${more}`;
  } catch {
    return first.date;
  }
}

export default function SaleCard({ sale, hostname, showFeaturedBadge = true }) {
  const p = sale.presentation || {};
  const img = p.hero_image_url || (Array.isArray(sale.images) && sale.images[0] && sale.images[0].url) || null;
  const dates = formatSaleDates(sale.sale_dates);
  const addr = sale.address || {};
  const href = sitePath(hostname, `/site/sale/${sale.public_id}`);
  return (
    <Link to={href} className="block rounded-lg border overflow-hidden hover:shadow-md transition-shadow" style={{ borderColor: 'var(--t1-primary)' }}>
      <div className="aspect-video w-full" style={{ background: '#e2e8f0' }}>
        {img ? <img src={img} alt={sale.title || 'Sale photo'} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{sale.title}</h3>
          {showFeaturedBadge && p.featured && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'var(--t1-accent)', color: '#fff' }}>
              <Star className="w-3 h-3" aria-hidden="true" /> Featured
            </span>
          )}
        </div>
        {dates && <p className="mt-1 text-sm flex items-center gap-1 opacity-80"><CalendarDays className="w-3 h-3" aria-hidden="true" />{dates}</p>}
        {(addr.city || addr.state) && (
          <p className="mt-1 text-sm flex items-center gap-1 opacity-80"><MapPin className="w-3 h-3" aria-hidden="true" />{[addr.city, addr.state].filter(Boolean).join(', ')}</p>
        )}
        {p.marketing_intro && <p className="mt-2 text-sm opacity-90 line-clamp-2">{p.marketing_intro}</p>}
      </div>
    </Link>
  );
}