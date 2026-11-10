import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Banknote,
  Package,
  AlertCircle,
  ListChecks,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { loadSaleDayMetrics, saleTiming } from './saleDayMetrics';

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

function Tile({ icon: Icon, label, value, tone, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${tone}`} />
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 leading-none">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function TodayStrip({ sale }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!sale?.id) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    loadSaleDayMetrics(sale.id)
      .then((m) => !cancelled && setMetrics(m))
      .catch((e) => console.error('Today strip:', e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sale?.id]);

  if (!sale) return null;

  const timing = saleTiming(sale);
  const live = timing.state === 'live' || sale.status === 'active';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-cyan-700">
            {live ? 'Today on the floor' : 'Preparation mode'}
          </p>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 truncate">
            {sale.title || 'Your next sale'}
          </h2>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {timing.state === 'live'
              ? `Day ${timing.dayNo} of ${timing.total}`
              : timing.state === 'upcoming'
              ? `Opens in ${timing.days} day${timing.days === 1 ? '' : 's'}`
              : timing.state === 'undated'
              ? 'Sale dates not set yet'
              : 'Sale ended'}
          </p>
        </div>
        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white" asChild>
          <Link to="/MySaleDay">
            {live ? 'Open My Sale Day' : 'Prep this sale'}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {loading || !metrics ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-[86px] rounded-xl bg-slate-200/70 animate-pulse" />
          ))
        ) : live ? (
          <>
            <Tile
              icon={Banknote}
              label="Cash today"
              value={money(metrics.cashToday)}
              tone="text-emerald-600"
              hint={`${metrics.ticketsToday} ticket${metrics.ticketsToday === 1 ? '' : 's'}`}
            />
            <Tile
              icon={Package}
              label="Items sold"
              value={metrics.itemsSoldToday}
              tone="text-cyan-600"
              hint="Marked sold today"
            />
            <Tile
              icon={AlertCircle}
              label="Open issues"
              value={metrics.openIssues}
              tone="text-orange-600"
              hint={metrics.urgentIssues ? `${metrics.urgentIssues} urgent` : 'Nothing urgent'}
            />
            <Tile
              icon={ListChecks}
              label="Open tasks"
              value={metrics.openTasks}
              tone="text-violet-600"
              hint={metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'All on schedule'}
            />
          </>
        ) : (
          <>
            <Tile
              icon={ListChecks}
              label="Open prep tasks"
              value={metrics.openTasks}
              tone="text-violet-600"
              hint={metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'All on schedule'}
            />
            <Tile
              icon={AlertCircle}
              label="Open issues"
              value={metrics.openIssues}
              tone="text-orange-600"
              hint={metrics.urgentIssues ? `${metrics.urgentIssues} urgent` : 'Nothing urgent'}
            />
            <Tile
              icon={CalendarDays}
              label="Days to open"
              value={timing.state === 'upcoming' ? timing.days : '—'}
              tone="text-cyan-600"
              hint={timing.total ? `${timing.total} sale day${timing.total === 1 ? '' : 's'}` : 'Add dates'}
            />
            <Tile
              icon={Package}
              label="Items sold"
              value={metrics.itemsSoldToday}
              tone="text-emerald-600"
              hint="Pre-sale today"
            />
          </>
        )}
      </div>
    </div>
  );
}