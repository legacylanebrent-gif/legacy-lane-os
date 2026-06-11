import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Database, Clock, BarChart3, Search, RefreshCw, Eye, Settings, CheckCircle, AlertCircle, XCircle, BookOpen, Tag, Image, DollarSign, TrendingUp, Zap, Shield, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import RepositoryItemDrawer from '@/components/repository/RepositoryItemDrawer';

const PAGE_SIZE = 50;

const STATUS_COLORS = {
  private: 'bg-slate-100 text-slate-700',
  review_needed: 'bg-amber-100 text-amber-700',
  approved_public: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function LaunchCountdown({ settings, snapshot, onSaveSettings }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    public_repository_launch_date: settings.public_repository_launch_date || '',
    minimum_item_count_goal: settings.minimum_item_count_goal || 10000,
    minimum_public_approved_goal: settings.minimum_public_approved_goal || 5000,
    minimum_avg_confidence_required: settings.minimum_avg_confidence_required || 70,
    public_launch_enabled: settings.public_launch_enabled || false,
  });

  const launchDate = form.public_repository_launch_date
    ? new Date(form.public_repository_launch_date)
    : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  const daysLeft = Math.max(0, Math.ceil((launchDate - new Date()) / (1000 * 60 * 60 * 24)));
  const readiness = snapshot?.launch_readiness_score || 0;
  const currentCount = snapshot?.total_item_count || 0;
  const approvedCount = snapshot?.approved_public_count || 0;

  const readinessColor = readiness >= 80 ? 'text-emerald-600' : readiness >= 50 ? 'text-amber-600' : 'text-red-500';

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-slate-600" />
            Launch Countdown
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            <Settings className="w-4 h-4 mr-1" /> Configure
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <div className="text-4xl font-bold text-slate-800">{daysLeft}</div>
            <div className="text-xs text-slate-500 mt-1">Days Until Target</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <div className={`text-4xl font-bold ${readinessColor}`}>{readiness}%</div>
            <div className="text-xs text-slate-500 mt-1">Launch Readiness</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <div className="text-4xl font-bold text-slate-800">{currentCount.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Total Items</div>
            <div className="text-xs text-slate-400">of {(form.minimum_item_count_goal || 10000).toLocaleString()} goal</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <div className="text-4xl font-bold text-emerald-600">{approvedCount.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Approved Public</div>
            <div className="text-xs text-slate-400">of {(form.minimum_public_approved_goal || 5000).toLocaleString()} goal</div>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Launch Readiness</span><span>{readiness}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${readiness >= 80 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${readiness}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Item Goal Progress</span><span>{Math.min(100, Math.round((currentCount / (form.minimum_item_count_goal || 10000)) * 100))}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, Math.round((currentCount / (form.minimum_item_count_goal || 10000)) * 100))}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div>
            <div className="text-sm font-medium text-amber-800">Public Launch Gate</div>
            <div className="text-xs text-amber-600">Repository will NOT go public until manually enabled</div>
          </div>
          <Badge className={form.public_launch_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
            {form.public_launch_enabled ? '🟢 Enabled' : '🔒 Gated'}
          </Badge>
        </div>

        {editing && (
          <div className="border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Target Launch Date</Label>
                <Input type="date" value={form.public_repository_launch_date} onChange={e => setForm(f => ({ ...f, public_repository_launch_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Min Item Count Goal</Label>
                <Input type="number" value={form.minimum_item_count_goal} onChange={e => setForm(f => ({ ...f, minimum_item_count_goal: parseInt(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Min Approved Public Goal</Label>
                <Input type="number" value={form.minimum_public_approved_goal} onChange={e => setForm(f => ({ ...f, minimum_public_approved_goal: parseInt(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Min Avg Confidence Required</Label>
                <Input type="number" value={form.minimum_avg_confidence_required} onChange={e => setForm(f => ({ ...f, minimum_avg_confidence_required: parseInt(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.public_launch_enabled} onCheckedChange={v => setForm(f => ({ ...f, public_launch_enabled: v }))} id="launch-enabled" />
              <Label htmlFor="launch-enabled" className="text-sm font-medium text-red-600">Enable Public Launch (CAUTION)</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { onSaveSettings(form); setEditing(false); }}>Save Settings</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'slate' }) {
  const colors = { slate: 'text-slate-600', emerald: 'text-emerald-600', amber: 'text-amber-600', blue: 'text-blue-600', red: 'text-red-500', purple: 'text-purple-600' };
  return (
    <Card className="border border-slate-200">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-slate-50 ${colors[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-slate-400">{sub}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCentralRepository() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [settings, setSettings] = useState({});
  const [settingsId, setSettingsId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterHasBarcode, setFilterHasBarcode] = useState('all');
  const [filterHasImage, setFilterHasImage] = useState('all');
  const [filterHasPrice, setFilterHasPrice] = useState('all');

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadItems(); }, [page, filterStatus, filterCategory, filterHasBarcode, filterHasImage, filterHasPrice]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadItems(), loadSnapshot(), loadSettings()]);
    setLoading(false);
  };

  const loadSnapshot = async () => {
    try {
      const snaps = await base44.entities.CentralRepositoryDailySnapshot.list('-snapshot_date', 1);
      setSnapshot(snaps[0] || null);
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const s = await base44.entities.AdminRepositorySettings.filter({ setting_key: 'global' });
      if (s.length > 0) { setSettings(s[0]); setSettingsId(s[0].id); }
    } catch {}
  };

  const loadItems = useCallback(async () => {
    try {
      const filter = {};
      if (filterStatus !== 'all') filter.public_status = filterStatus;
      if (filterCategory !== 'all') filter.category = filterCategory;
      if (filterHasBarcode === 'yes') filter.has_barcode = true;
      if (filterHasBarcode === 'no') filter.has_barcode = false;
      if (filterHasImage === 'yes') filter.has_verified_image = true;
      if (filterHasImage === 'no') filter.has_verified_image = false;

      const data = await base44.entities.ItemKnowledge.filter(filter, '-created_date', PAGE_SIZE + 1, page * PAGE_SIZE);
      setHasMore(data.length > PAGE_SIZE);
      setItems(data.slice(0, PAGE_SIZE));
      if (page === 0) setTotalCount(data.length < PAGE_SIZE + 1 ? data.length : '50+');
    } catch {}
  }, [page, filterStatus, filterCategory, filterHasBarcode, filterHasImage, filterHasPrice]);

  const handleSearch = async () => {
    if (!search.trim()) { loadItems(); return; }
    setLoading(true);
    try {
      const all = await base44.entities.ItemKnowledge.list('-created_date', 200);
      const q = search.toLowerCase();
      const filtered = all.filter(i =>
        (i.canonical_name || '').toLowerCase().includes(q) ||
        (i.brand || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q) ||
        (i.slug || '').toLowerCase().includes(q)
      );
      setItems(filtered.slice(0, PAGE_SIZE));
      setHasMore(filtered.length > PAGE_SIZE);
    } catch {}
    setLoading(false);
  };

  const handleSaveSettings = async (form) => {
    try {
      if (settingsId) {
        await base44.entities.AdminRepositorySettings.update(settingsId, form);
      } else {
        const created = await base44.entities.AdminRepositorySettings.create({ ...form, setting_key: 'global' });
        setSettingsId(created.id);
      }
      setSettings(form);
    } catch (e) { console.error(e); }
  };

  const handleRunSnapshot = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('calculateRepositorySnapshot', {});
      await loadSnapshot();
    } catch {}
    setRefreshing(false);
  };

  const handleItemUpdate = () => { loadItems(); loadSnapshot(); };

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  const stats = snapshot || {};

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-7 h-7 text-slate-700" />
                Central Item Intelligence Repository
              </h1>
              <Badge className="bg-slate-800 text-white text-xs">🔒 Private Build Mode</Badge>
              <Badge className="bg-amber-100 text-amber-700 text-xs">⏳ Public Launch Pending</Badge>
            </div>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              A private growing database of item intelligence created from sale uploads, reseller lookups, barcode scans, AI vision, SERPAPI results, marketplace items, and SEO item profiles.
            </p>
          </div>
          <Button onClick={handleRunSnapshot} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Running...' : 'Run Snapshot Now'}
          </Button>
        </div>

        {/* Launch Countdown */}
        <LaunchCountdown settings={settings} snapshot={snapshot} onSaveSettings={handleSaveSettings} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Database} label="Total Items" value={(stats.total_item_count || 0).toLocaleString()} color="slate" />
          <StatCard icon={CheckCircle} label="Approved Public" value={(stats.approved_public_count || 0).toLocaleString()} color="emerald" />
          <StatCard icon={AlertCircle} label="Review Needed" value={(stats.review_needed_count || 0).toLocaleString()} color="amber" />
          <StatCard icon={XCircle} label="Rejected" value={(stats.rejected_count || 0).toLocaleString()} color="red" />
          <StatCard icon={Shield} label="Private" value={(stats.private_count || 0).toLocaleString()} color="slate" />
          <StatCard icon={Image} label="Image References" value={(stats.total_image_references || 0).toLocaleString()} color="blue" />
          <StatCard icon={Tag} label="Barcode Records" value={(stats.total_barcode_records || 0).toLocaleString()} color="purple" />
          <StatCard icon={DollarSign} label="Price History" value={(stats.total_price_history_records || 0).toLocaleString()} color="emerald" />
          <StatCard icon={TrendingUp} label="Demand Metrics" value={(stats.total_demand_metric_records || 0).toLocaleString()} color="blue" />
          <StatCard icon={BarChart3} label="Duplicate Match Rate" value={`${stats.duplicate_match_rate || 0}%`} color="slate" sub="Higher = better dedup" />
          <StatCard icon={Zap} label="SERPAPI Avoided" value={(stats.serpapi_lookup_avoided_count || 0).toLocaleString()} color="emerald" sub="Matches saved lookups" />
          <StatCard icon={DollarSign} label="Est. SERPAPI Savings" value={`$${(stats.estimated_serpapi_savings || 0).toFixed(2)}`} color="emerald" />
          <StatCard icon={BookOpen} label="Avg Identity Confidence" value={`${stats.avg_identity_confidence || 0}%`} color="blue" />
          <StatCard icon={DollarSign} label="Avg Pricing Confidence" value={`${stats.avg_pricing_confidence || 0}%`} color="slate" />
          <StatCard icon={Search} label="Avg SEO Confidence" value={`${stats.avg_seo_confidence || 0}%`} color="purple" />
        </div>

        {/* Raw Data Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Raw Item Records</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Page {page + 1} · {items.length} shown
              </div>
            </div>
            {/* Search + Filters */}
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex gap-2 flex-1 min-w-48">
                <Input placeholder="Search name, brand, category, slug…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="text-sm" />
                <Button size="sm" onClick={handleSearch} variant="outline"><Search className="w-4 h-4" /></Button>
              </div>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
                <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="review_needed">Review Needed</SelectItem>
                  <SelectItem value="approved_public">Approved Public</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterHasBarcode} onValueChange={v => { setFilterHasBarcode(v); setPage(0); }}>
                <SelectTrigger className="w-32 text-sm"><SelectValue placeholder="Barcode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Barcode</SelectItem>
                  <SelectItem value="yes">Has Barcode</SelectItem>
                  <SelectItem value="no">No Barcode</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterHasImage} onValueChange={v => { setFilterHasImage(v); setPage(0); }}>
                <SelectTrigger className="w-32 text-sm"><SelectValue placeholder="Image" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Image</SelectItem>
                  <SelectItem value="yes">Has Image</SelectItem>
                  <SelectItem value="no">No Image</SelectItem>
                </SelectContent>
              </Select>
              {search && (
                <Button size="sm" variant="ghost" onClick={() => { setSearch(''); loadItems(); }}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {['Canonical Name', 'Brand', 'Category', 'Times Seen', 'Confidence', 'Public Status', 'Match Method', 'Has Barcode', 'Has Image', 'First Seen', 'Updated'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} className="text-center py-12 text-slate-400">Loading…</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-12 text-slate-400">No records found</td></tr>
                  ) : items.map(item => (
                    <tr key={item.id} className="border-b hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedItem(item)}>
                      <td className="px-3 py-2 max-w-48">
                        <div className="font-medium text-slate-800 truncate">{item.canonical_name || '—'}</div>
                        <div className="text-slate-400 truncate">{item.slug}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{item.brand || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{item.category || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className="text-xs">{item.times_seen || 0}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <div className="w-12 bg-slate-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${item.confidence_score || 0}%` }} />
                          </div>
                          <span className="text-slate-600">{item.confidence_score || 0}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`${STATUS_COLORS[item.public_status] || STATUS_COLORS.private} text-xs`}>
                          {item.public_status || 'private'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{item.match_method_first || '—'}</td>
                      <td className="px-3 py-2 text-center">{item.has_barcode ? '✅' : '—'}</td>
                      <td className="px-3 py-2 text-center">{item.has_verified_image ? '✅' : '—'}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.first_seen_at ? new Date(item.first_seen_at).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{item.updated_date ? new Date(item.updated_date).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <span className="text-xs text-slate-500">Page {page + 1}</span>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Detail Drawer */}
      {selectedItem && (
        <RepositoryItemDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={() => { handleItemUpdate(); setSelectedItem(null); }}
        />
      )}
    </div>
  );
}