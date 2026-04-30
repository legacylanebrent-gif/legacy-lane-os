import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Search, Zap, PauseCircle, PlayCircle, RefreshCw, Plus, Settings, Pencil, Check, X
} from 'lucide-react';

const TIERS = ['starter', 'professional', 'enterprise', 'unlimited'];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 border-green-300',
  pending_setup: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  over_limit: 'bg-red-100 text-red-700 border-red-300',
  paused: 'bg-slate-100 text-slate-600 border-slate-300',
  suspended: 'bg-red-200 text-red-800 border-red-400',
};

function getAvailable(account) {
  return (account.monthly_credit_limit || 0)
    + (account.bonus_credits || 0)
    + (account.rollover_credits || 0)
    - (account.monthly_credits_used || 0);
}

function UsageBar({ account }) {
  const limit = (account.monthly_credit_limit || 0) + (account.bonus_credits || 0) + (account.rollover_credits || 0);
  const used = account.monthly_credits_used || 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-orange-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdminAICredits() {
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [bonusModal, setBonusModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [bonusAmount, setBonusAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Pricing config state
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      setAuthChecked(true);
      if (u?.role === 'admin') {
        loadData();
        loadPricingConfigs();
      }
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [accts, userList] = await Promise.all([
      base44.entities.OperatorAICreditAccount.list('-updated_date', 200),
      base44.entities.User.list(),
    ]);
    const userMap = {};
    userList.forEach(u => { userMap[u.id] = u; });
    setUsers(userMap);
    setAccounts(accts);
    setLoading(false);
  };

  const loadPricingConfigs = async () => {
    const configs = await base44.entities.AIRequestPricingConfig.list('request_type', 50);
    setPricingConfigs(configs);
  };

  const startEditPrice = (config) => {
    setEditingPriceId(config.id);
    setEditingPriceValue(String(config.credits));
  };

  const savePrice = async (config) => {
    const credits = parseInt(editingPriceValue);
    if (isNaN(credits) || credits < 0) return;
    await base44.entities.AIRequestPricingConfig.update(config.id, { credits });
    setEditingPriceId(null);
    loadPricingConfigs();
  };

  const filtered = accounts.filter(a => {
    if (!search) return true;
    const u = users[a.operator_id];
    const name = u?.full_name?.toLowerCase() || '';
    const email = u?.email?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const openEdit = (account) => {
    setSelected(account);
    setEditForm({
      monthly_credit_limit: account.monthly_credit_limit || 0,
      subscription_tier: account.subscription_tier || 'starter',
    });
    setEditModal(true);
  };

  const openBonus = (account) => {
    setSelected(account);
    setBonusAmount('');
    setBonusModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.OperatorAICreditAccount.update(selected.id, {
      monthly_credit_limit: parseInt(editForm.monthly_credit_limit) || 0,
      subscription_tier: editForm.subscription_tier,
    });
    await loadData();
    setSaving(false);
    setEditModal(false);
  };

  const addBonus = async () => {
    const amount = parseInt(bonusAmount);
    if (!amount || amount <= 0) return;
    setSaving(true);
    await base44.entities.OperatorAICreditAccount.update(selected.id, {
      bonus_credits: (selected.bonus_credits || 0) + amount,
    });
    await loadData();
    setSaving(false);
    setBonusModal(false);
  };

  const resetUsage = async (account) => {
    if (!confirm(`Reset monthly usage for this operator? This cannot be undone.`)) return;
    await base44.entities.OperatorAICreditAccount.update(account.id, {
      monthly_credits_used: 0,
      status: 'active',
    });
    await loadData();
  };

  const togglePause = async (account) => {
    const newStatus = account.status === 'paused' ? 'active' : 'paused';
    await base44.entities.OperatorAICreditAccount.update(account.id, { status: newStatus });
    await loadData();
  };

  // ── Rule 5 & 6: Admin-only access guard ──
  if (!authChecked) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /></div>;
  }
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl mb-2">🚫</p>
          <p className="font-semibold text-slate-800">Access Denied</p>
          <p className="text-sm text-slate-500 mt-1">Admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Credit Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage operator AI access, credit limits, and usage</p>
        </div>
        <Button onClick={() => { loadData(); loadPricingConfigs(); }} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="operators">
        <TabsList>
          <TabsTrigger value="operators">Operator Accounts</TabsTrigger>
          <TabsTrigger value="pricing">Request Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI Request Credit Costs</CardTitle>
              <p className="text-sm text-slate-500">Credits charged per request type. Click the pencil icon to edit any value.</p>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Request Type</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Credits</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingConfigs.map(config => (
                    <tr key={config.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{config.label}</p>
                        <p className="text-xs text-slate-400 font-mono">{config.request_type}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{config.description}</td>
                      <td className="px-4 py-3 text-center">
                        {editingPriceId === config.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              value={editingPriceValue}
                              onChange={e => setEditingPriceValue(e.target.value)}
                              className="w-20 h-7 text-center text-sm"
                              min="0"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') savePrice(config); if (e.key === 'Escape') setEditingPriceId(null); }}
                            />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => savePrice(config)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setEditingPriceId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-mono text-sm px-3">
                            {config.credits}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => startEditPrice(config)} className="text-slate-400 hover:text-slate-700">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operators" className="mt-4">

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: accounts.length },
          { label: 'Active', value: accounts.filter(a => a.status === 'active').length },
          { label: 'Over Limit', value: accounts.filter(a => a.status === 'over_limit').length },
          { label: 'Paused', value: accounts.filter(a => a.status === 'paused').length },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search operators by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Operator</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Limit</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Used</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Bonus</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Available</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Usage</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-10 text-slate-400">No accounts found.</td></tr>
                  )}
                  {filtered.map(account => {
                    const u = users[account.operator_id];
                    const available = getAvailable(account);
                    return (
                      <tr key={account.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{u?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{u?.email || account.operator_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-slate-700">{account.subscription_tier || 'starter'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border ${STATUS_COLORS[account.status] || STATUS_COLORS.active}`}>
                            {account.status?.replace('_', ' ') || 'active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {(account.monthly_credit_limit || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {(account.monthly_credits_used || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {(account.bonus_credits || 0).toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${available <= 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {available.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 w-32">
                          <UsageBar account={account} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(account)} title="Edit limits">
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openBonus(account)} title="Add bonus credits">
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => resetUsage(account)} title="Reset usage">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => togglePause(account)}
                              title={account.status === 'paused' ? 'Restore access' : 'Pause access'}
                              className={account.status === 'paused' ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-red-600 border-red-300 hover:bg-red-50'}
                            >
                              {account.status === 'paused'
                                ? <PlayCircle className="w-3.5 h-3.5" />
                                : <PauseCircle className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

        </TabsContent>
      </Tabs>

      {/* Edit Limit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Credit Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subscription Tier</Label>
              <Select value={editForm.subscription_tier} onValueChange={v => setEditForm(p => ({ ...p, subscription_tier: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Credit Limit (tokens)</Label>
              <Input
                type="number"
                className="mt-1"
                value={editForm.monthly_credit_limit}
                onChange={e => setEditForm(p => ({ ...p, monthly_credit_limit: e.target.value }))}
                placeholder="e.g. 100000"
              />
              <p className="text-xs text-slate-500 mt-1">1 credit = 1 token. Set to 0 to block access.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bonus Credits Modal */}
      <Dialog open={bonusModal} onOpenChange={setBonusModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Bonus Credits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Current bonus credits: <strong>{(selected?.bonus_credits || 0).toLocaleString()}</strong>
            </p>
            <div>
              <Label>Credits to Add</Label>
              <Input
                type="number"
                className="mt-1"
                value={bonusAmount}
                onChange={e => setBonusAmount(e.target.value)}
                placeholder="e.g. 50000"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusModal(false)}>Cancel</Button>
            <Button onClick={addBonus} disabled={saving || !bonusAmount} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Adding...' : 'Add Credits'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}