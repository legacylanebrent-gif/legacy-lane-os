import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isAdminUser } from '@/lib/isAdminUser';
import {
  TrendingUp, Search, MousePointerClick, Eye, Target, AlertTriangle,
  RefreshCw, Globe, BarChart3, ArrowUpRight, Zap, ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (n) => `${(n ?? 0).toFixed(1)}%`;

function StatCard({ label, value, sub, icon, color }) {
  const Icon = icon;
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function QueryRow({ query, clicks, impressions, ctr, position }) {
  const ctrColor = ctr >= 5 ? 'text-green-600' : ctr >= 2 ? 'text-amber-600' : 'text-red-500';
  const posColor = position <= 10 ? 'text-green-600' : position <= 20 ? 'text-amber-600' : 'text-slate-500';
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-2.5 px-4 text-sm text-slate-800 font-medium">{query}</td>
      <td className="py-2.5 px-4 text-sm text-slate-700 text-center">{fmt(impressions)}</td>
      <td className="py-2.5 px-4 text-sm text-slate-700 text-center">{fmt(clicks)}</td>
      <td className={`py-2.5 px-4 text-sm font-semibold text-center ${ctrColor}`}>{pct(ctr)}</td>
      <td className={`py-2.5 px-4 text-sm font-semibold text-center ${posColor}`}>#{position}</td>
    </tr>
  );
}

export default function PlatformSEODashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [showAllQueries, setShowAllQueries] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) await loadData();
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadData = async () => {
    try {
      const snapshots = await base44.entities.KPISnapshot.filter(
        { source: 'search_console' },
        '-created_date',
        1
      );
      if (snapshots.length > 0) {
        try { setSnapshot(JSON.parse(snapshots[0].notes)); } catch (_) {}
      }
    } catch (_) {}
  };

  const runFetch = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('fetchSearchConsoleData', {});
      await loadData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setRefreshing(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!user || !isAdminUser(user)) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
      </div>
    </div>
  );

  const queries = snapshot?.top_queries || [];
  const devices = snapshot?.device_breakdown || [];
  const opportunities = snapshot?.low_ctr_opportunities || [];
  const displayedQueries = showAllQueries ? queries : queries.slice(0, 10);
  const deviceData = devices.map(d => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    clicks: d.clicks,
    impressions: d.impressions
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">Google Search Console</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Platform SEO Dashboard</h1>
              <p className="text-slate-400 mt-1 text-sm">Search impressions, clicks, top queries &amp; CTR opportunities for estatesalen.com</p>
              {snapshot?.fetched_at && (
                <p className="text-slate-500 text-xs mt-2">Last updated: {new Date(snapshot.fetched_at).toLocaleString()} · {snapshot.period_days}-day window</p>
              )}
            </div>
            <Button onClick={runFetch} disabled={refreshing} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Fetching...' : 'Fetch Fresh Data'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {!snapshot ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Search Console Data Yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              Click "Fetch Fresh Data" to pull your latest Google Search Console metrics. Data is also fetched automatically every night at 1am.
            </p>
            <Button onClick={runFetch} disabled={refreshing} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
              <Zap className="w-4 h-4" /> Fetch Now
            </Button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Clicks (28d)" value={fmt(snapshot.site_total_clicks)} icon={MousePointerClick} color="bg-orange-100 text-orange-600" />
              <StatCard label="Total Impressions" value={fmt(snapshot.site_total_impressions)} icon={Eye} color="bg-cyan-100 text-cyan-600" />
              <StatCard label="Avg CTR" value={pct(snapshot.site_avg_ctr)} sub="Click-through rate" icon={TrendingUp} color="bg-green-100 text-green-600" />
              <StatCard label="Avg Position" value={`#${snapshot.site_avg_position}`} sub="Lower = better" icon={Target} color="bg-violet-100 text-violet-600" />
            </div>

            {/* Low CTR Opportunities */}
            {opportunities.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
                <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setShowOpportunities(!showOpportunities)}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-amber-900 text-sm">Low CTR Opportunities — {opportunities.length} pages</h3>
                      <p className="text-amber-700 text-xs">High impressions but low click-through — rewrite titles/descriptions for quick wins</p>
                    </div>
                  </div>
                  {showOpportunities ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
                </button>
                {showOpportunities && (
                  <div className="border-t border-amber-200">
                    <table className="w-full">
                      <thead className="bg-amber-100">
                        <tr>
                          <th className="py-2 px-4 text-xs text-amber-800 font-bold text-left uppercase">Page</th>
                          <th className="py-2 px-4 text-xs text-amber-800 font-bold text-center uppercase">Impressions</th>
                          <th className="py-2 px-4 text-xs text-amber-800 font-bold text-center uppercase">CTR</th>
                          <th className="py-2 px-4 text-xs text-amber-800 font-bold text-center uppercase">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((opp, i) => (
                          <tr key={i} className="border-t border-amber-100 hover:bg-amber-50">
                            <td className="py-2 px-4 text-xs text-slate-700 max-w-xs truncate">{opp.page}</td>
                            <td className="py-2 px-4 text-xs text-center font-semibold">{fmt(opp.impressions)}</td>
                            <td className="py-2 px-4 text-xs text-center text-red-600 font-bold">{pct(opp.ctr)}</td>
                            <td className="py-2 px-4 text-xs text-center">#{opp.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Queries */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Top Search Queries</h3>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 text-xs">{queries.length} queries</Badge>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-left uppercase">Query</th>
                      <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Impressions</th>
                      <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Clicks</th>
                      <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">CTR</th>
                      <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedQueries.map((q, i) => <QueryRow key={i} {...q} />)}
                  </tbody>
                </table>
                {queries.length > 10 && (
                  <div className="p-4 border-t border-slate-100 text-center">
                    <button onClick={() => setShowAllQueries(!showAllQueries)} className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1 mx-auto">
                      {showAllQueries ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />Show all {queries.length} queries</>}
                    </button>
                  </div>
                )}
              </div>

              {/* Device breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Device Breakdown</h3>
                </div>
                {deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={deviceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={65} />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="#f97316" radius={[0, 4, 4, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No device data</div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Sale pages indexed</span>
                    <span className="font-bold text-slate-900">{fmt(snapshot.sale_pages?.length || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total impressions</span>
                    <span className="font-bold text-slate-900">{fmt(snapshot.site_total_impressions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sale pages table */}
            {(snapshot.sale_pages || []).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Sale Pages in Google</h3>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 text-xs">{snapshot.sale_pages.length} ranked</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-left uppercase">Sale URL</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Impressions</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Clicks</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">CTR</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Position</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.sale_pages.slice(0, 20).map((sp, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-xs text-slate-700 max-w-xs truncate">{sp.page_url}</td>
                          <td className="py-2.5 px-4 text-xs text-center font-semibold">{fmt(sp.impressions)}</td>
                          <td className="py-2.5 px-4 text-xs text-center">{fmt(sp.clicks)}</td>
                          <td className={`py-2.5 px-4 text-xs font-bold text-center ${sp.ctr >= 5 ? 'text-green-600' : sp.ctr >= 2 ? 'text-amber-600' : 'text-red-500'}`}>{pct(sp.ctr)}</td>
                          <td className={`py-2.5 px-4 text-xs font-semibold text-center ${sp.position <= 10 ? 'text-green-600' : sp.position <= 20 ? 'text-amber-600' : 'text-slate-500'}`}>#{sp.position}</td>
                          <td className="py-2.5 px-4 text-center">
                            <a href={sp.page_url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700">
                              <ArrowUpRight className="w-3.5 h-3.5 inline" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}