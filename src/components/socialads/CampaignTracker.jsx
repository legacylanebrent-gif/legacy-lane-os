import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, DollarSign, Eye, MousePointer, Users, TrendingUp, Loader2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CampaignTracker({ adsCredentials }) {
  const [campaigns, setCampaigns] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('last_7d');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getFacebookCampaigns', {
        credentials: adsCredentials,
        date_range: dateRange,
      });
      setCampaigns(res.data.campaigns || []);
      setInsights(res.data.insights || {});
    } catch (err) {
      setError('Unable to load campaigns. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, [dateRange]);

  const totalSpend = campaigns.reduce((s, c) => s + parseFloat(insights[c.id]?.spend || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + parseInt(insights[c.id]?.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + parseInt(insights[c.id]?.clicks || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + parseInt(insights[c.id]?.leads || 0), 0);

  const statusColor = {
    ACTIVE: 'bg-green-100 text-green-700 border-green-300',
    PAUSED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-300',
    DELETED: 'bg-red-100 text-red-700 border-red-300',
  };

  const chartData = campaigns.map(c => ({
    name: c.name.length > 20 ? c.name.substring(0, 20) + '…' : c.name,
    spend: parseFloat(insights[c.id]?.spend || 0),
    clicks: parseInt(insights[c.id]?.clicks || 0),
    leads: parseInt(insights[c.id]?.leads || 0),
    impressions: parseInt(insights[c.id]?.impressions || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7d">Last 7 Days</SelectItem>
              <SelectItem value="last_14d">Last 14 Days</SelectItem>
              <SelectItem value="last_30d">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadCampaigns} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-sm text-slate-500">{campaigns.length} campaigns found</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend', value: `$${totalSpend.toFixed(2)}`, icon: DollarSign, color: 'text-blue-700 bg-blue-50' },
          { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-purple-700 bg-purple-50' },
          { label: 'Clicks', value: totalClicks.toLocaleString(), icon: MousePointer, color: 'text-orange-700 bg-orange-50' },
          { label: 'Leads', value: totalLeads.toLocaleString(), icon: Users, color: 'text-green-700 bg-green-50' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900">{loading ? '—' : kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-700" /> Spend vs Clicks by Campaign</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" fill="#1d4ed8" name="Spend ($)" />
                <Bar yAxisId="right" dataKey="clicks" fill="#f97316" name="Clicks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Campaign table */}
      <Card>
        <CardHeader><CardTitle>Campaign Performance</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No campaigns found for this period. Create your first campaign in the Campaign Builder tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-600">
                    <th className="text-left p-3">Campaign</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-right p-3">Spend</th>
                    <th className="text-right p-3">Impressions</th>
                    <th className="text-right p-3">Clicks</th>
                    <th className="text-right p-3">CTR</th>
                    <th className="text-right p-3">Leads</th>
                    <th className="text-right p-3">CPL</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const ins = insights[c.id] || {};
                    const spend = parseFloat(ins.spend || 0);
                    const clicks = parseInt(ins.clicks || 0);
                    const impressions = parseInt(ins.impressions || 0);
                    const leads = parseInt(ins.leads || 0);
                    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
                    const cpl = leads > 0 ? (spend / leads).toFixed(2) : '—';
                    return (
                      <tr key={c.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(selected === c.id ? null : c.id)}>
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{c.name}</div>
                          <div className="text-xs text-slate-400">{c.objective?.replace('OUTCOME_', '')}</div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-xs ${statusColor[c.status] || 'bg-slate-100 text-slate-600'}`}>{c.status}</Badge>
                        </td>
                        <td className="p-3 text-right font-medium">${spend.toFixed(2)}</td>
                        <td className="p-3 text-right">{impressions.toLocaleString()}</td>
                        <td className="p-3 text-right">{clicks.toLocaleString()}</td>
                        <td className="p-3 text-right">{ctr}%</td>
                        <td className="p-3 text-right text-green-700 font-medium">{leads}</td>
                        <td className="p-3 text-right">{cpl === '—' ? '—' : `$${cpl}`}</td>
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