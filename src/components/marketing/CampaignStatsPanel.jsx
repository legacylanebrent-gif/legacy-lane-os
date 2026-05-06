import React, { useState } from 'react';
import { Eye, Heart, MessageCircle, Share2, MousePointerClick, Bookmark, RefreshCw, TrendingUp, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const STAT_FIELDS = [
  { key: 'reach',       label: 'Reach',       icon: Eye,               color: 'text-blue-600',   bg: 'bg-blue-50' },
  { key: 'impressions', label: 'Impressions',  icon: TrendingUp,        color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'likes',       label: 'Likes',        icon: Heart,             color: 'text-pink-500',   bg: 'bg-pink-50' },
  { key: 'comments',    label: 'Comments',     icon: MessageCircle,     color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'shares',      label: 'Shares',       icon: Share2,            color: 'text-green-600',  bg: 'bg-green-50' },
  { key: 'clicks',      label: 'Link Clicks',  icon: MousePointerClick, color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'saves',       label: 'Saves',        icon: Bookmark,          color: 'text-teal-600',   bg: 'bg-teal-50' },
];

function formatNumber(n) {
  if (!n) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

export default function CampaignStatsPanel({ campaign, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  const stats = campaign?.stats || {};
  const log = stats.snapshot_log || [];
  const hasAnyStats = STAT_FIELDS.some(f => stats[f.key] > 0);
  const lastRefreshed = stats.last_refreshed
    ? new Date(stats.last_refreshed).toLocaleString()
    : null;

  // Calculate trend vs previous day snapshot
  const prev = log.length >= 2 ? log[log.length - 2] : null;

  function trend(key) {
    if (!prev || !stats[key] || !prev[key]) return null;
    const delta = stats[key] - prev[key];
    if (delta === 0) return null;
    return { delta, up: delta > 0 };
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('refreshCampaignStats', {});
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 3000);
      if (onRefresh) onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!campaign?.launched_at) return null;

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" /> Engagement Stats
        </p>
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <p className="text-[9px] text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              Updated {lastRefreshed}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-6 text-[10px] px-2 border-slate-200 text-slate-600 hover:bg-white"
          >
            {refreshing
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : refreshed
                ? <span className="text-green-600">✓ Refreshed</span>
                : <><RefreshCw className="w-3 h-3 mr-1" />Refresh Stats</>
            }
          </Button>
        </div>
      </div>

      {!hasAnyStats ? (
        <div className="text-center py-3">
          <p className="text-xs text-slate-400">Stats will auto-refresh nightly once the campaign is live.</p>
          <p className="text-[10px] text-slate-300 mt-0.5">You can also manually update stats using the edit button.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {STAT_FIELDS.filter(f => f.key !== 'impressions').map(field => {
            const val = stats[field.key];
            const t = trend(field.key);
            const Icon = field.icon;
            return (
              <div key={field.key} className={`${field.bg} rounded-lg p-2 text-center`}>
                <Icon className={`w-3.5 h-3.5 ${field.color} mx-auto mb-1`} />
                <p className={`text-sm font-bold ${field.color}`}>{formatNumber(val)}</p>
                <p className="text-[9px] text-slate-500">{field.label}</p>
                {t && (
                  <p className={`text-[9px] font-medium ${t.up ? 'text-green-500' : 'text-red-400'}`}>
                    {t.up ? '▲' : '▼'} {Math.abs(t.delta)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Impressions full-width if present */}
      {stats.impressions > 0 && (
        <div className="bg-indigo-50 rounded-lg px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs text-indigo-700 font-medium">Total Impressions</span>
          </div>
          <span className="text-sm font-bold text-indigo-700">{formatNumber(stats.impressions)}</span>
        </div>
      )}

      {/* Snapshot log mini chart (last 5 days) */}
      {log.length >= 2 && (
        <div className="space-y-1">
          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Reach trend (last {Math.min(log.length, 5)} days)</p>
          <div className="flex items-end gap-1 h-10">
            {log.slice(-5).map((snap, i) => {
              const maxReach = Math.max(...log.slice(-5).map(s => s.reach || 0), 1);
              const h = Math.round(((snap.reach || 0) / maxReach) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${snap.date}: ${snap.reach} reach`}>
                  <div
                    className="w-full rounded-sm bg-blue-400"
                    style={{ height: `${Math.max(h, 4)}%`, minHeight: 2 }}
                  />
                  <p className="text-[8px] text-slate-400">{snap.date?.slice(5)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}