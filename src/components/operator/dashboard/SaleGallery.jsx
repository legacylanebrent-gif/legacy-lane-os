import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, MapPin, ArrowRight } from 'lucide-react';
import { saleTiming } from './saleDayMetrics';

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-cyan-100 text-cyan-700',
  draft: 'bg-slate-100 text-slate-600',
  completed: 'bg-slate-100 text-slate-500',
  archived: 'bg-slate-100 text-slate-500',
};

const GROUPS = [
  { key: 'draft', label: 'Draft', match: (s) => (s.status || 'draft') === 'draft' },
  {
    key: 'open',
    label: 'Upcoming & Active',
    match: (s) => s.status === 'upcoming' || s.status === 'active',
  },
  {
    key: 'past',
    label: 'Past Sales',
    match: (s) => s.status === 'completed' || s.status === 'archived',
  },
];

function timingChip(sale) {
  const t = saleTiming(sale);
  if (t.state === 'live') return `Live · day ${t.dayNo}/${t.total}`;
  if (t.state === 'upcoming') return `${t.days}d to open`;
  if (t.state === 'undated') return 'No dates';
  return 'Ended';
}

export default function SaleGallery({ sales, limit = 6 }) {
  const [group, setGroup] = useState('open');

  const all = (sales || []).slice();

  // No sales at all — let the page show its own empty state.
  if (!all.length) return null;

  const counts = {};
  GROUPS.forEach((g) => {
    counts[g.key] = all.filter(g.match).length;
  });

  const activeGroup = GROUPS.find((g) => g.key === group) || GROUPS[0];
  const items = all.filter(activeGroup.match).slice(0, limit);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
          Your sales at a glance
        </p>
        <Link to="/MySales" className="text-xs font-semibold text-cyan-700 hover:text-cyan-800">
          All sales
        </Link>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {GROUPS.map((g) => {
          const isActive = g.key === activeGroup.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-slate-900 bg-white text-slate-900'
                  : 'border-slate-200 bg-white/60 text-slate-500 hover:text-slate-800'
              }`}
            >
              {g.label}
              <span className={`ml-1.5 tabular-nums ${isActive ? 'text-cyan-700' : 'text-slate-400'}`}>
                {counts[g.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 py-8 text-center text-sm text-slate-500">
          No {activeGroup.label.toLowerCase()} right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((sale) => {
            const cover = sale.images?.[0]?.url;
            const sold = sale.total_items
              ? Math.round(((sale.items_sold || 0) / sale.total_items) * 100)
              : null;
            return (
              <Link
                key={sale.id}
                to={`/SaleEditor?saleId=${sale.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-32 bg-slate-900">
                  {cover ? (
                    <img
                      src={cover}
                      alt={sale.title || 'Estate sale'}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-800 to-cyan-900 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      STATUS_STYLES[sale.status] || STATUS_STYLES.draft
                    }`}
                  >
                    {sale.status || 'draft'}
                  </span>
                  <span className="absolute top-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {timingChip(sale)}
                  </span>
                </div>

                <div className="p-3">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {sale.title || 'Untitled sale'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {[sale.property_address?.city, sale.property_address?.state]
                      .filter(Boolean)
                      .join(', ') || 'Location not set'}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 tabular-nums">
                        ${Math.round(Number(sale.actual_revenue) || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {sold === null ? `${sale.total_items || 0} items` : `${sold}% sold`}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700">
                      Open
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}