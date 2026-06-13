import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isAdminUser } from '@/lib/isAdminUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Plus, Pencil, Check, X, ExternalLink, BarChart3, Zap, Brain,
  Globe, Mail, Search, MapPin, Server, Activity, Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const SERVICE_ICONS = {
  serpapi: Search,
  google_maps: MapPin,
  base44_platform: Server,
  openai: Brain,
  meta_ads: Globe,
  email_service: Mail,
  other: Zap,
};

const SERVICE_COLORS = {
  serpapi: 'bg-blue-100 text-blue-700',
  google_maps: 'bg-green-100 text-green-700',
  base44_platform: 'bg-purple-100 text-purple-700',
  openai: 'bg-orange-100 text-orange-700',
  meta_ads: 'bg-cyan-100 text-cyan-700',
  email_service: 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-700',
};

const DEFAULT_CONFIGS = [
  { service_name: 'Google Lens API', service_key: 'serpapi', billing_model: 'per_call', cost_per_unit: 0.001, free_tier_units_per_month: 100, estimated_daily_units: 50, billing_url: 'https://serpapi.com/manage-api-key', is_active: true },
  { service_name: 'Google Maps API', service_key: 'google_maps', billing_model: 'per_call', cost_per_unit: 0.005, free_tier_units_per_month: 200, estimated_daily_units: 100, billing_url: 'https://console.cloud.google.com/billing', is_active: true },
  { service_name: 'Base44 Platform', service_key: 'base44_platform', billing_model: 'monthly_flat', monthly_flat_cost: 99, billing_url: 'https://base44.com/billing', is_active: true },
  { service_name: 'OpenAI / AI Services', service_key: 'openai', billing_model: 'per_token', cost_per_unit: 0.000002, estimated_daily_units: 50000, billing_url: 'https://platform.openai.com/usage', is_active: true },
  { service_name: 'Meta Ads', service_key: 'meta_ads', billing_model: 'manual', last_actual_monthly_cost: 0, billing_url: 'https://business.facebook.com/billing', is_active: true },
  { service_name: 'Email Service (Gmail/Resend)', service_key: 'email_service', billing_model: 'monthly_flat', monthly_flat_cost: 0, billing_url: '', is_active: true },
];

const fmt = (n) => `$${(n ?? 0).toFixed(2)}`;
const fmtK = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : fmt(n);

function ServiceRow({ config, onSave, onDelete, onSyncMeta }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...config });
  const Icon = SERVICE_ICONS[config.service_key] || Zap;

  const dailyCost = (() => {
    if (form.billing_model === 'monthly_flat') return (form.monthly_flat_cost || 0) / 30;
    if (form.billing_model === 'per_call' || form.billing_model === 'per_token' || form.billing_model === 'per_gb') {
      const freePerDay = (form.free_tier_units_per_month || 0) / 30;
      const billable = Math.max(0, (form.estimated_daily_units || 0) - freePerDay);
      return billable * (form.cost_per_unit || 0);
    }
    if (form.billing_model === 'manual') return (form.last_actual_monthly_cost || 0) / 30;
    return 0;
  })();

  const colorClass = SERVICE_COLORS[config.service_key] || SERVICE_COLORS.other;

  const save = () => { onSave(form); setEditing(false); };
  const cancel = () => { setForm({ ...config }); setEditing(false); };

  if (editing) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">{config.service_name}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} className="bg-green-600 hover:bg-green-700 text-white gap-1"><Check className="w-3.5 h-3.5" />Save</Button>
            <Button size="sm" variant="outline" onClick={cancel} className="gap-1"><X className="w-3.5 h-3.5" />Cancel</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Billing Model</Label>
            <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-white mt-1" value={form.billing_model} onChange={e => setForm(f => ({ ...f, billing_model: e.target.value }))}>
              <option value="monthly_flat">Monthly Flat</option>
              <option value="per_call">Per Call</option>
              <option value="per_token">Per Token</option>
              <option value="per_gb">Per GB</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          {form.billing_model === 'monthly_flat' && (
            <div>
              <Label className="text-xs">Monthly Cost ($)</Label>
              <Input type="number" className="mt-1 text-sm" value={form.monthly_flat_cost || 0} onChange={e => setForm(f => ({ ...f, monthly_flat_cost: parseFloat(e.target.value) || 0 }))} />
            </div>
          )}
          {(form.billing_model === 'per_call' || form.billing_model === 'per_token' || form.billing_model === 'per_gb') && (
            <>
              <div>
                <Label className="text-xs">Cost Per Unit ($)</Label>
                <Input type="number" step="0.000001" className="mt-1 text-sm" value={form.cost_per_unit || 0} onChange={e => setForm(f => ({ ...f, cost_per_unit: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Free Tier / Month</Label>
                <Input type="number" className="mt-1 text-sm" value={form.free_tier_units_per_month || 0} onChange={e => setForm(f => ({ ...f, free_tier_units_per_month: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Est. Daily Units</Label>
                <Input type="number" className="mt-1 text-sm" value={form.estimated_daily_units || 0} onChange={e => setForm(f => ({ ...f, estimated_daily_units: parseInt(e.target.value) || 0 }))} />
              </div>
            </>
          )}
          {form.billing_model === 'manual' && (
            <div>
              <Label className="text-xs">Last Monthly Bill ($)</Label>
              <Input type="number" className="mt-1 text-sm" value={form.last_actual_monthly_cost || 0} onChange={e => setForm(f => ({ ...f, last_actual_monthly_cost: parseFloat(e.target.value) || 0 }))} />
            </div>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="mt-1 text-sm" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">{config.service_name}</div>
          <div className="text-xs text-slate-400 capitalize">{config.billing_model.replace(/_/g, ' ')}
            {config.billing_model === 'monthly_flat' && ` — $${config.monthly_flat_cost}/mo`}
            {(config.billing_model === 'per_call' || config.billing_model === 'per_token') && ` — $${config.cost_per_unit}/unit · ${config.estimated_daily_units}/day est.`}
            {config.billing_model === 'manual' && ` — $${config.last_actual_monthly_cost}/mo actual`}
          </div>
          {config.notes && <div className="text-xs text-slate-400 italic mt-0.5">{config.notes}</div>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-bold text-slate-800">{fmt(dailyCost)}<span className="text-xs font-normal text-slate-400">/day</span></div>
          <div className="text-xs text-slate-400">{fmtK(dailyCost * 30)}/mo est.</div>
        </div>
        {config.billing_url && (
          <a href={config.billing_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        {config.service_key === 'meta_ads' && onSyncMeta && (
          <Button size="sm" variant="outline" onClick={onSyncMeta} className="gap-1 text-xs border-cyan-400 text-cyan-700 hover:bg-cyan-50">
            <Download className="w-3 h-3" />Sync
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="w-8 h-8 text-slate-400 hover:text-slate-600">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(config.id)} className="w-8 h-8 text-red-400 hover:text-red-600">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function PlatformExpenses() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [running, setRunning] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [tab, setTab] = useState('overview');
  const [addingNew, setAddingNew] = useState(false);
  const [newConfig, setNewConfig] = useState({ service_name: '', service_key: '', billing_model: 'monthly_flat', monthly_flat_cost: 0, cost_per_unit: 0, estimated_daily_units: 0, free_tier_units_per_month: 0, is_active: true });

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) {
          await loadData();
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadData = async () => {
    const [cfgs, snaps] = await Promise.all([
      base44.entities.PlatformExpenseConfig.list('-created_date', 100).catch(() => []),
      base44.entities.PlatformDailySnapshot.list('-snapshot_date', 30).catch(() => []),
    ]);

    // If no configs exist yet, seed defaults
    if (cfgs.length === 0) {
      const created = await Promise.all(DEFAULT_CONFIGS.map(c => base44.entities.PlatformExpenseConfig.create(c)));
      setConfigs(created);
    } else {
      setConfigs(cfgs);
    }
    setSnapshots(snaps);
  };

  const saveConfig = async (cfg) => {
    if (cfg.id) {
      const updated = await base44.entities.PlatformExpenseConfig.update(cfg.id, cfg);
      setConfigs(prev => prev.map(c => c.id === cfg.id ? updated : c));
    } else {
      const created = await base44.entities.PlatformExpenseConfig.create(cfg);
      setConfigs(prev => [...prev, created]);
    }
  };

  const deleteConfig = async (id) => {
    await base44.entities.PlatformExpenseConfig.delete(id);
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const syncMetaSpend = async () => {
    setSyncingMeta(true);
    try {
      const res = await base44.functions.invoke('syncMetaAdSpend', {});
      const { spend_this_month, projected_monthly } = res.data;
      // Update the meta_ads config with the projected monthly cost
      const metaCfg = configs.find(c => c.service_key === 'meta_ads');
      if (metaCfg) {
        await saveConfig({ ...metaCfg, last_actual_monthly_cost: projected_monthly, notes: `Month-to-date: $${spend_this_month} · Projected: $${projected_monthly}/mo (auto-synced)` });
      }
    } catch (e) {
      alert('Meta sync failed: ' + e.message);
    }
    setSyncingMeta(false);
  };

  const runAnalysis = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke('dailyCostRevenueAnalysis', {});
      await loadData();
    } catch (_) {}
    setRunning(false);
  };

  const addConfig = async () => {
    const created = await base44.entities.PlatformExpenseConfig.create({ ...newConfig, is_active: true });
    setConfigs(prev => [...prev, created]);
    setAddingNew(false);
    setNewConfig({ service_name: '', service_key: '', billing_model: 'monthly_flat', monthly_flat_cost: 0, cost_per_unit: 0, estimated_daily_units: 0, free_tier_units_per_month: 0, is_active: true });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user || !isAdminUser(user)) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center"><AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" /><h2 className="text-xl font-bold text-slate-800">Admin Only</h2></div>
    </div>
  );

  // Compute totals from configs
  const getDailyCost = (cfg) => {
    if (cfg.billing_model === 'monthly_flat') return (cfg.monthly_flat_cost || 0) / 30;
    if (['per_call', 'per_token', 'per_gb'].includes(cfg.billing_model)) {
      const freePerDay = (cfg.free_tier_units_per_month || 0) / 30;
      const billable = Math.max(0, (cfg.estimated_daily_units || 0) - freePerDay);
      return billable * (cfg.cost_per_unit || 0);
    }
    if (cfg.billing_model === 'manual') return (cfg.last_actual_monthly_cost || 0) / 30;
    return 0;
  };

  const totalDailyCost = configs.filter(c => c.is_active).reduce((sum, c) => sum + getDailyCost(c), 0);
  const totalMonthlyCost = totalDailyCost * 30;

  const latestSnapshot = snapshots[0];
  const chartData = [...snapshots].reverse().slice(-14).map(s => ({
    date: s.snapshot_date?.slice(5),
    Expenses: parseFloat(s.total_expenses?.toFixed(2) || 0),
    Revenue: parseFloat(s.total_revenue?.toFixed(2) || 0),
    Net: parseFloat(s.net?.toFixed(2) || 0),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Admin — Finance</p>
            <h1 className="text-3xl font-black tracking-tight">Platform Expense Tracker</h1>
            <p className="text-slate-400 mt-1 text-sm">Track daily API costs vs revenue · Google Lens · Google Maps · Base44 · OpenAI · Meta</p>
          </div>
          <Button onClick={runAnalysis} disabled={running} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Running Analysis...' : 'Run Today\'s Analysis'}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4 text-red-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Daily Est. Cost</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{fmt(totalDailyCost)}</div>
            <div className="text-xs text-slate-400 mt-1">{fmt(totalMonthlyCost)}/month</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Last Revenue (est.)</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{latestSnapshot ? fmt(latestSnapshot.total_revenue) : '—'}</div>
            <div className="text-xs text-slate-400 mt-1">{latestSnapshot?.snapshot_date || 'No snapshots yet'}</div>
          </div>

          <div className={`bg-white border rounded-2xl p-5 shadow-sm ${latestSnapshot?.net >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${latestSnapshot?.net >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {latestSnapshot?.net >= 0
                  ? <TrendingUp className="w-4 h-4 text-green-600" />
                  : <TrendingDown className="w-4 h-4 text-red-600" />}
              </div>
              <span className="text-xs text-slate-500 font-medium">Last Net</span>
            </div>
            <div className={`text-2xl font-black ${latestSnapshot?.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {latestSnapshot ? fmt(latestSnapshot.net) : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1">revenue minus expenses</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Activity className="w-4 h-4 text-indigo-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Snapshots (30d)</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{snapshots.length}</div>
            <div className="text-xs text-slate-400 mt-1">Auto-runs nightly at 2am</div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {chartData.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Last 14 Days — Cost vs Revenue</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => `$${v}`} />
                    <Legend />
                    <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No snapshot data yet.</p>
                <p className="text-slate-400 text-sm mt-1">Click "Run Today's Analysis" to generate your first daily snapshot, or it will auto-run tonight at 2am.</p>
                <Button onClick={runAnalysis} disabled={running} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                  Run Now
                </Button>
              </div>
            )}

            {latestSnapshot && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Latest Expense Breakdown</h3>
                  <div className="space-y-2">
                    {latestSnapshot.expense_breakdown && Object.entries(latestSnapshot.expense_breakdown).map(([key, val]) => {
                      if (!val) return null;
                      const Icon = SERVICE_ICONS[key] || Zap;
                      const colorClass = SERVICE_COLORS[key] || SERVICE_COLORS.other;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${colorClass}`}><Icon className="w-3 h-3" /></div>
                            <span className="text-sm text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{fmt(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Latest Revenue Breakdown</h3>
                  <div className="space-y-2">
                    {latestSnapshot.revenue_breakdown && Object.entries(latestSnapshot.revenue_breakdown).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-semibold text-green-700">{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                  {latestSnapshot.notes && (
                    <p className="text-xs text-slate-400 mt-4 italic border-t pt-3">{latestSnapshot.notes}</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Services Config Tab */}
          <TabsContent value="services" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Configure billing rates for each service. These are used to calculate daily cost estimates.</p>
              <Button size="sm" onClick={() => setAddingNew(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-3.5 h-3.5" />Add Service
              </Button>
            </div>

            {addingNew && (
              <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Service Name</Label>
                    <Input className="mt-1 text-sm" value={newConfig.service_name} onChange={e => setNewConfig(p => ({ ...p, service_name: e.target.value }))} placeholder="e.g. Twilio SMS" />
                  </div>
                  <div>
                    <Label className="text-xs">Key (no spaces)</Label>
                    <Input className="mt-1 text-sm" value={newConfig.service_key} onChange={e => setNewConfig(p => ({ ...p, service_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))} placeholder="e.g. twilio_sms" />
                  </div>
                  <div>
                    <Label className="text-xs">Billing Model</Label>
                    <select className="w-full border rounded-md px-2 py-1.5 text-sm bg-white mt-1" value={newConfig.billing_model} onChange={e => setNewConfig(p => ({ ...p, billing_model: e.target.value }))}>
                      <option value="monthly_flat">Monthly Flat</option>
                      <option value="per_call">Per Call</option>
                      <option value="per_token">Per Token</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">{newConfig.billing_model === 'monthly_flat' ? 'Monthly Cost ($)' : newConfig.billing_model === 'manual' ? 'Last Monthly Bill ($)' : 'Cost Per Unit ($)'}</Label>
                    <Input type="number" step="0.000001" className="mt-1 text-sm"
                      value={newConfig.billing_model === 'monthly_flat' ? newConfig.monthly_flat_cost : newConfig.billing_model === 'manual' ? (newConfig.last_actual_monthly_cost || 0) : newConfig.cost_per_unit}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        if (newConfig.billing_model === 'monthly_flat') setNewConfig(p => ({ ...p, monthly_flat_cost: v }));
                        else if (newConfig.billing_model === 'manual') setNewConfig(p => ({ ...p, last_actual_monthly_cost: v }));
                        else setNewConfig(p => ({ ...p, cost_per_unit: v }));
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" onClick={addConfig} className="bg-green-600 hover:bg-green-700 text-white gap-1"><Check className="w-3.5 h-3.5" />Add</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingNew(false)} className="gap-1"><X className="w-3.5 h-3.5" />Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {configs.map(cfg => (
                <ServiceRow key={cfg.id} config={cfg} onSave={saveConfig} onDelete={deleteConfig} onSyncMeta={cfg.service_key === 'meta_ads' ? syncMetaSpend : null} />
              ))}
            </div>

            <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl p-4">
              <span className="text-sm font-semibold">Total Estimated Daily Cost</span>
              <div className="text-right">
                <div className="text-xl font-black">{fmt(totalDailyCost)}/day</div>
                <div className="text-xs text-slate-400">{fmt(totalMonthlyCost)}/month</div>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Expenses</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Net</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshots.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No snapshots yet. Run your first analysis above.</td></tr>
                  )}
                  {snapshots.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.snapshot_date}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">{fmt(s.total_expenses)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">{fmt(s.total_revenue)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${s.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(s.net)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${s.generated_by === 'automation' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{s.generated_by || 'automation'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}