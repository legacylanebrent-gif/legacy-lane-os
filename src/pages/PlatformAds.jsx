import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, DollarSign, MousePointer, Users, Eye, Megaphone, ExternalLink } from 'lucide-react';

const STATUS_COLORS = {
  ACTIVE:   'bg-green-100 text-green-700 border-green-300',
  PAUSED:   'bg-amber-100 text-amber-700 border-amber-300',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-300',
  DELETED:  'bg-red-100 text-red-500 border-red-300',
};

const DATE_PRESETS = [
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'last_7d',   label: 'Last 7 Days' },
  { value: 'last_30d',  label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
];

function fmt(n, prefix = '') {
  if (n === undefined || n === null) return '—';
  if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${typeof n === 'number' ? n.toLocaleString() : n}`;
}

export default function PlatformAds() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [datePreset, setDatePreset] = useState('this_month');

  const fetchCampaigns = async (preset = datePreset) => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('getPlatformAdCampaigns', { date_preset: preset });
      setCampaigns(res.data.campaigns || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handlePresetChange = (val) => {
    setDatePreset(val);
    fetchCampaigns(val);
  };

  // Aggregate totals
  const totals = campaigns.reduce((acc, c) => {
    const ins = c.insights || {};
    acc.spend += ins.spend || 0;
    acc.impressions += ins.impressions || 0;
    acc.clicks += ins.clicks || 0;
    acc.leads += ins.leads || 0;
    acc.reach += ins.reach || 0;
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, leads: 0, reach: 0 });

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">Platform Ads</h1>
            <p className="text-sm text-slate-500">Live campaigns from the platform Meta Ad Account</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-40 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchCampaigns()} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50">
              <ExternalLink className="w-4 h-4" />
              Open Ads Manager
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Spend', value: `$${totals.spend.toFixed(2)}`, icon: DollarSign, color: 'text-blue-600' },
          { label: 'Impressions', value: fmt(totals.impressions), icon: Eye, color: 'text-purple-600' },
          { label: 'Clicks', value: fmt(totals.clicks), icon: MousePointer, color: 'text-cyan-600' },
          { label: 'Leads', value: fmt(totals.leads), icon: Users, color: 'text-green-600' },
          { label: 'Active Campaigns', value: activeCampaigns.length, icon: TrendingUp, color: 'text-orange-600' },
        ].map((kpi, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-8 h-8 ${kpi.color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-lg font-bold text-slate-800">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">
            All Campaigns <span className="text-slate-400 font-normal text-sm ml-1">({campaigns.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-3 text-slate-500">Loading campaigns from Meta...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No campaigns found in the platform ad account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Campaign</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Spend</th>
                    <th className="text-right px-4 py-3 font-semibold">Impressions</th>
                    <th className="text-right px-4 py-3 font-semibold">Clicks</th>
                    <th className="text-right px-4 py-3 font-semibold">CTR</th>
                    <th className="text-right px-4 py-3 font-semibold">CPC</th>
                    <th className="text-right px-4 py-3 font-semibold">Leads</th>
                    <th className="text-right px-4 py-3 font-semibold">Budget/day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map(c => {
                    const ins = c.insights || {};
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[220px]">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.objective?.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border ${STATUS_COLORS[c.status] || STATUS_COLORS.ARCHIVED}`}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">${(ins.spend || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(ins.impressions)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(ins.clicks)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{ins.ctr ? `${ins.ctr.toFixed(2)}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{ins.cpc ? `$${ins.cpc.toFixed(2)}` : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{ins.leads || '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {c.daily_budget ? `$${(parseInt(c.daily_budget) / 100).toFixed(0)}/day` : c.lifetime_budget ? `$${(parseInt(c.lifetime_budget) / 100).toFixed(0)} lifetime` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}