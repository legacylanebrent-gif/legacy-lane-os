import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Settings, Radio } from 'lucide-react';

const money = (value) => `$${Math.round(Number(value) || 0).toLocaleString()}`;

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">{label}</p>
      <p className={`mt-1 text-xl sm:text-2xl font-bold font-serif ${accent || 'text-white'}`}>{value}</p>
    </div>
  );
}

export default function OperatorHero({ user, stats, onRefresh, onCreateSale, onOpenSales, loading }) {
  const firstName = String(user?.full_name || '').trim().split(/\s+/)[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const live = (stats?.activeSales || 0) > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950" />
      <div className="absolute -top-20 -right-10 h-56 w-56 rounded-full bg-cyan-500/25 blur-3xl" />
      <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />

      <div className="relative p-5 sm:p-8">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-cyan-300 font-semibold">
          <span>Operator command center</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 normal-case tracking-normal">{today}</span>
        </div>

        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-xl">
              {live ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {stats.activeSales} sale{stats.activeSales === 1 ? '' : 's'} live now ·{' '}
                  {stats.upcomingSales} upcoming
                </span>
              ) : (
                <span>
                  {stats.upcomingSales > 0
                    ? `${stats.upcomingSales} upcoming sale${stats.upcomingSales === 1 ? '' : 's'} on the calendar`
                    : 'Nothing live right now — build your next sale'}
                  {stats.totalSales > 0 ? ` · ${stats.totalSales} total` : ''}
                </span>
              )}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={onCreateSale}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Estate Sale
            </Button>
            <Button
              onClick={onOpenSales}
              variant="outline"
              className="w-full sm:w-auto border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              My Sales
            </Button>
            <Button
              onClick={onRefresh}
              disabled={loading}
              variant="ghost"
              className="w-full sm:w-auto text-slate-300 hover:bg-white/10 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="ml-2 sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Revenue earned" value={money(stats.totalRevenue)} accent="text-emerald-300" />
          <Stat label="Live sales" value={stats.activeSales} accent="text-cyan-300" />
          <Stat label="Upcoming" value={stats.upcomingSales} accent="text-orange-300" />
        </div>

        {live && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Radio className="w-3.5 h-3.5" />
            Sale day is running — open My Sale Day for the live view
          </div>
        )}
      </div>
    </div>
  );
}