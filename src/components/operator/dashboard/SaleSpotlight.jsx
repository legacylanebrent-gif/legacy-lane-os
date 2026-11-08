import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Plus, ArrowRight, ImageIcon } from 'lucide-react';

const DAY = 86400000;

function saleWindow(sale) {
  const dates = (sale?.sale_dates || []).map((d) => d?.date).filter(Boolean).sort();
  if (!dates.length) return null;
  return { start: dates[0], end: dates[dates.length - 1] };
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function windowLabel(win) {
  if (!win) return 'Dates not set';
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const start = parseDate(win.start);
  const end = parseDate(win.end);
  return win.start === win.end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

function timing(sale, win) {
  if (!win) return { label: 'Add sale dates', tone: 'bg-slate-100 text-slate-600' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDate(win.start);
  const end = parseDate(win.end);
  const total = Math.round((end - start) / DAY) + 1;

  if (sale?.status === 'active' || (today >= start && today <= end)) {
    const dayNo = Math.min(Math.round((today - start) / DAY) + 1, total);
    return { label: `Live now · day ${dayNo} of ${total}`, tone: 'bg-emerald-100 text-emerald-700' };
  }
  const days = Math.round((start - today) / DAY);
  if (days === 0) return { label: 'Opens today', tone: 'bg-orange-100 text-orange-700' };
  if (days > 0) return { label: `Opens in ${days} day${days === 1 ? '' : 's'}`, tone: 'bg-cyan-100 text-cyan-700' };
  return { label: 'Sale ended', tone: 'bg-slate-100 text-slate-600' };
}

function addressOf(sale) {
  const a = sale?.property_address || {};
  return [a.street, a.city, a.state].filter(Boolean).join(', ') || 'Address not set';
}

export default function SaleSpotlight({ sale, onCreateSale }) {
  if (!sale) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
        <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <h3 className="font-serif text-xl font-bold text-slate-900">Your next sale starts here</h3>
        <p className="mt-1 text-sm text-slate-600">Create a sale to start prepping, pricing, and publishing.</p>
        <Button onClick={onCreateSale} className="mt-4 bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Estate Sale
        </Button>
      </div>
    );
  }

  const win = saleWindow(sale);
  const when = timing(sale, win);
  const cover = sale.images?.[0]?.url;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative h-40 md:h-full bg-slate-900">
          {cover ? (
            <img src={cover} alt={sale.title || 'Estate sale'} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-800 to-cyan-900 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent md:bg-gradient-to-r" />
          <span
            className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${when.tone}`}
          >
            {when.label}
          </span>
        </div>

        <div className="p-5 sm:p-6 flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-cyan-600">
            Next up on your calendar
          </p>
          <h3 className="mt-1 font-serif text-2xl font-bold text-slate-900 leading-snug">
            {sale.title || 'Untitled estate sale'}
          </h3>

          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
              {windowLabel(win)}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
              <span className="truncate">{addressOf(sale)}</span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/PrepareSale?saleId=${sale.id}`}>
              <Button className="bg-orange-600 hover:bg-orange-700">
                Prepare This Sale
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/MySaleDay">
              <Button variant="outline">My Sale Day</Button>
            </Link>
            <Link to={`/SaleEditor?saleId=${sale.id}`}>
              <Button variant="ghost" className="text-slate-600">Edit details</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}