import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = (n) =>
  `$${Math.round(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Delta({ pct }) {
  if (pct === null) return <span className="text-[11px] text-slate-400">No prior month</span>;
  if (pct === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
        <Minus className="w-3 h-3" /> Flat vs last month
      </span>
    );
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        up ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {pct}% vs last month
    </span>
  );
}

export default function MoneyPanel({ sales, money }) {
  const thisMonth = Number(money?.thisMonth) || 0;
  const lastMonth = Number(money?.lastMonth) || 0;
  const pct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const topSales = [...(sales || [])]
    .filter((s) => (Number(s.actual_revenue) || 0) > 0)
    .sort((a, b) => (Number(b.actual_revenue) || 0) - (Number(a.actual_revenue) || 0))
    .slice(0, 3);
  const topMax = topSales.length ? Number(topSales[0].actual_revenue) || 1 : 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">Money</h2>
          <p className="text-xs text-slate-500">Recorded sales this month</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-400">
          {money?.txCount || 0} ticket{(money?.txCount || 0) === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">
            This month
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 leading-none">{fmt(thisMonth)}</p>
          <div className="mt-1.5">
            <Delta pct={pct} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">
            Last month
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-700 leading-none">{fmt(lastMonth)}</p>
          <p className="mt-1.5 text-[11px] text-slate-400">Final totals</p>
        </div>
      </div>

      {topSales.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">
            Top sales by revenue
          </p>
          <div className="mt-2 space-y-2">
            {topSales.map((s) => {
              const value = Number(s.actual_revenue) || 0;
              return (
                <div key={s.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-medium text-slate-800 truncate">{s.title}</p>
                    <p className="text-xs font-bold text-slate-900 tabular-nums flex-shrink-0">
                      {fmt(value)}
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                      style={{ width: `${Math.max(6, Math.round((value / topMax) * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}