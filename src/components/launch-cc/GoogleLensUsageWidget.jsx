import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, AlertTriangle, Zap, TrendingUp, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

function UsageBar({ used, limit, label, tier }) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const isWarning = pct >= 80 && pct < 100;
  const isExhausted = pct >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className={`font-mono ${isExhausted ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-400'}`}>
          {used}/{limit} ({pct}%)
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${isExhausted ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-amber-500' : '[&>div]:bg-cyan-500'}`}
      />
      {isExhausted && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Needs upgrade — credits exhausted
        </p>
      )}
      {isWarning && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> 80%+ used — prompt upgrade
        </p>
      )}
    </div>
  );
}

export default function GoogleLensUsageWidget() {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const all = await base44.entities.OperatorAICreditAccount.list();
      const active = all.filter(a => {
        const limit = a.google_lens_searches_limit || 0;
        const purchased = a.google_lens_purchased_searches || 0;
        return limit > 0 || purchased > 0;
      });

      // Build stats
      const totalLimit = active.reduce((s, a) => s + (a.google_lens_searches_limit || 0), 0);
      const totalUsed = active.reduce((s, a) => s + (a.google_lens_searches_used || 0), 0);
      const totalPurchased = active.reduce((s, a) => s + (a.google_lens_purchased_searches || 0), 0);
      const totalPurchasedUsed = active.reduce((s, a) => s + (a.google_lens_purchased_used || 0), 0);
      const overLimit = active.filter(a => {
        const r = Math.max(0, (a.google_lens_searches_limit || 0) - (a.google_lens_searches_used || 0))
          + Math.max(0, (a.google_lens_purchased_searches || 0) - (a.google_lens_purchased_used || 0));
        return r <= 0;
      });
      const warn80 = active.filter(a => {
        const lim = (a.google_lens_searches_limit || 0) + (a.google_lens_purchased_searches || 0);
        const used = (a.google_lens_searches_used || 0) + (a.google_lens_purchased_used || 0);
        return lim > 0 && used / lim >= 0.8 && used / lim < 1;
      });

      // Enrich with operator names
      const enriched = await Promise.all(active.map(async (a) => {
        let name = a.operator_id;
        try {
          const users = await base44.entities.User.filter({ id: a.operator_id });
          if (users.length > 0) {
            name = users[0].company_name || users[0].full_name || a.operator_id;
          }
        } catch (e) { /* skip */ }
        return { ...a, operator_name: name };
      }));

      setAccounts(enriched);
      setStats({
        totalOperators: active.length,
        totalLimit,
        totalUsed,
        totalPurchased,
        totalPurchasedUsed,
        overLimit: overLimit.length,
        warn80: warn80.length,
        overallPct: totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0,
      });
    } catch (e) {
      console.error('Failed to load credit accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3" />
          <div className="h-8 bg-slate-700 rounded" />
          <div className="h-8 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Google Lens Credit Usage</h3>
            <p className="text-xs text-slate-400">Live across all operators</p>
          </div>
        </div>
        <button onClick={loadData} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/80 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Operators</span>
          </div>
          <p className="text-lg font-bold text-white">{stats?.totalOperators || 0}</p>
        </div>
        <div className="bg-slate-900/80 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Used</span>
          </div>
          <p className="text-lg font-bold text-cyan-400">{stats?.totalUsed || 0}</p>
        </div>
        <div className={`bg-slate-900/80 rounded-lg p-3 ${stats?.overLimit > 0 ? 'border border-red-500/30' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-3.5 h-3.5 ${stats?.overLimit > 0 ? 'text-red-400' : 'text-slate-400'}`} />
            <span className="text-xs text-slate-400">Exhausted</span>
          </div>
          <p className={`text-lg font-bold ${stats?.overLimit > 0 ? 'text-red-400' : 'text-white'}`}>{stats?.overLimit || 0}</p>
        </div>
      </div>

      {/* Platform-wide usage */}
      {stats?.totalLimit > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Platform Total</span>
            <span className="font-mono text-slate-300">
              {stats.totalUsed}/{stats.totalLimit} ({stats.overallPct}%)
            </span>
          </div>
          <Progress
            value={stats.overallPct}
            className="h-2.5"
          />
        </div>
      )}

      {/* Individual operator breakdown */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Per Operator</h4>
          {accounts
            .sort((a, b) => {
              const pa = ((a.google_lens_searches_used || 0) + (a.google_lens_purchased_used || 0)) /
                ((a.google_lens_searches_limit || 0) + (a.google_lens_purchased_searches || 0) || 1);
              const pb = ((b.google_lens_searches_used || 0) + (b.google_lens_purchased_used || 0)) /
                ((b.google_lens_searches_limit || 0) + (b.google_lens_purchased_searches || 0) || 1);
              return pb - pa;
            })
            .slice(0, 10)
            .map((a) => {
              const lim = (a.google_lens_searches_limit || 0) + (a.google_lens_purchased_searches || 0);
              const used = (a.google_lens_searches_used || 0) + (a.google_lens_purchased_used || 0);
              return (
                <UsageBar
                  key={a.id}
                  used={used}
                  limit={lim}
                  label={`${a.operator_name} (${a.subscription_tier || 'starter'})`}
                  tier={a.subscription_tier}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}