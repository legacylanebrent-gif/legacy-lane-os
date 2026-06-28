import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, TrendingUp, Users, Zap, ArrowUpRight, Shield, BarChart3, Pencil, Save, X } from 'lucide-react';

export default function ScalabilityManager() {
  const [user, setUser] = useState(null);
  const [capacityRecords, setCapacityRecords] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [creditAccounts, setCreditAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectingNewSub, setProjectingNewSub] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [editingUsageId, setEditingUsageId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    if (u?.role !== 'admin') { window.location.href = '/'; return; }
    setUser(u);

    const [caps, subs, creditAccounts, users] = await Promise.all([
      base44.entities.InfrastructureCapacity.list(),
      base44.entities.SubscriptionPackage.filter({ is_active: true }),
      base44.entities.OperatorAICreditAccount.filter({ status: 'active' }),
      base44.entities.User.list()
    ]);
    setCapacityRecords(caps);
    setSubscriptions(subs);
    setCreditAccounts(creditAccounts);
    setAllUsers(users);
    setLoading(false);
  };

  const subscriptionCounts = useMemo(() => {
    const counts = { consumer: 0, starter: 0, growth: 0, professional: 0, elite: 0 };
    creditAccounts.forEach(acct => {
      const tier = acct.subscription_tier;
      if (tier && counts[tier] !== undefined) counts[tier]++;
    });
    // Count consumers: all users minus those with active OperatorAICreditAccount
    const paidOperatorIds = new Set(creditAccounts.map(a => a.operator_id));
    counts.consumer = allUsers.filter(u => !paidOperatorIds.has(u.id)).length;
    return counts;
  }, [creditAccounts, allUsers]);

  const totalSubscribers = Object.values(subscriptionCounts).reduce((s, c) => s + c, 0);

  const projectedUsage = useMemo(() => {
    return capacityRecords.map(cap => {
      const est = cap.estimated_usage_per_subscriber || {};
      let total = 0;
      Object.entries(subscriptionCounts).forEach(([tier, count]) => {
        total += (est[tier] || 0) * count;
      });
      return { ...cap, projectedTotal: total, projectedPct: cap.monthly_call_limit > 0 ? Math.round((total / cap.monthly_call_limit) * 100) : 0 };
    });
  }, [capacityRecords, subscriptionCounts]);

  const simulateNewSubscriber = (tier) => {
    const existingCounts = { ...subscriptionCounts };
    existingCounts[tier] = (existingCounts[tier] || 0) + 1;

    return capacityRecords.map(cap => {
      const est = cap.estimated_usage_per_subscriber || {};
      let total = 0;
      Object.entries(existingCounts).forEach(([t, count]) => {
        total += (est[t] || 0) * count;
      });
      const newPct = cap.monthly_call_limit > 0 ? Math.round((total / cap.monthly_call_limit) * 100) : 0;

      let existingTotal = 0;
      Object.entries(subscriptionCounts).forEach(([t, count]) => {
        existingTotal += (est[t] || 0) * count;
      });
      const existingPct = cap.monthly_call_limit > 0 ? Math.round((existingTotal / cap.monthly_call_limit) * 100) : 0;

      return { ...cap, projectedTotal: total, projectedPct: newPct, existingPct };
    });
  };

  const simulatedData = projectingNewSub ? simulateNewSubscriber(projectingNewSub) : projectedUsage;

  const getStatusInfo = (pct) => {
    if (pct >= 85) return { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300', barBg: 'bg-red-500' };
    if (pct >= 70) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', barBg: 'bg-yellow-500' };
    return { label: 'Healthy', color: 'bg-green-100 text-green-800 border-green-300', barBg: 'bg-green-500' };
  };

  const criticalCount = simulatedData.filter(d => d.projectedPct >= 70).length;

  const formatNumber = (n) => n?.toLocaleString() || '0';

  const startEditUsage = (cap) => {
    setEditingUsageId(cap.id);
    setEditingValue(String(cap.current_month_usage || 0));
  };

  const saveUsage = async (cap) => {
    const val = parseInt(editingValue, 10);
    if (isNaN(val) || val < 0) return;
    await base44.entities.InfrastructureCapacity.update(cap.id, { current_month_usage: val });
    setCapacityRecords(prev => prev.map(c => c.id === cap.id ? { ...c, current_month_usage: val } : c));
    setEditingUsageId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Scalability Manager</h1>
            <p className="text-slate-500 text-sm mt-1">Monitor infrastructure capacity and plan for growth</p>
          </div>
          <Button
            onClick={() => { setProjectingNewSub(null); setShowSimulator(!showSimulator); }}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
          >
            <TrendingUp className="w-4 h-4" />
            {showSimulator ? 'Hide Simulator' : 'Simulate New Subscriber'}
          </Button>
        </div>

        {/* Health Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Subscribers</p>
                <p className="text-2xl font-bold text-slate-900">{totalSubscribers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Services Monitored</p>
                <p className="text-2xl font-bold text-slate-900">{capacityRecords.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className={`w-8 h-8 ${criticalCount > 0 ? 'text-red-400' : 'text-green-400'}`} />
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Capacity Risks</p>
                <p className="text-2xl font-bold text-slate-900">{criticalCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Safety Buffer</p>
                <p className="text-2xl font-bold text-slate-900">20%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriber Simulator */}
        {showSimulator && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                Subscription Growth Simulator
              </CardTitle>
              <p className="text-sm text-slate-600">Select a tier to see how a new subscription would impact infrastructure capacity</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['consumer', 'starter', 'growth', 'professional', 'elite'].map(tier => (
                  <Button
                    key={tier}
                    variant={projectingNewSub === tier ? 'default' : 'outline'}
                    className={`capitalize ${projectingNewSub === tier ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                    onClick={() => setProjectingNewSub(projectingNewSub === tier ? null : tier)}
                  >
                    {tier}
                    {projectingNewSub === tier && <CheckCircle className="w-3 h-3 ml-1" />}
                  </Button>
                ))}
              </div>
              {projectingNewSub && (
                <p className="text-sm text-slate-600 mt-3">
                  Showing projected impact of +1 <span className="font-semibold capitalize">{projectingNewSub}</span> subscriber on all services
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscription Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-700" />
              Subscriber Breakdown by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(subscriptionCounts).map(([tier, count]) => (
                <div key={tier} className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-500 capitalize">{tier}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Per-Service Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-slate-700" />
              Infrastructure Capacity Dashboard
            </CardTitle>
            <p className="text-sm text-slate-500">
              {projectingNewSub
                ? `Projected impact after +1 ${projectingNewSub} subscriber`
                : 'Current projected usage based on active subscribers'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {simulatedData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No capacity records found. Seed InfrastructureCapacity data first.</p>
            ) : (
              simulatedData.map((cap) => {
                const actualUsage = cap.current_month_usage || 0;
                const actualPct = cap.monthly_call_limit > 0 ? Math.round((actualUsage / cap.monthly_call_limit) * 100) : 0;
                const projectedPct = cap.projectedPct;
                // Use max of actual vs projected for status coloring
                const displayPct = Math.max(actualPct, projectedPct);
                const status = getStatusInfo(displayPct);
                const StatusIcon = status.label === 'Healthy' ? CheckCircle : AlertTriangle;
                const diff = projectingNewSub ? projectedPct - cap.existingPct : 0;
                const isEditing = editingUsageId === cap.id;

                return (
                  <div key={cap.id} className={`p-4 rounded-xl border ${displayPct >= 85 ? 'border-red-300 bg-red-50/50' : displayPct >= 70 ? 'border-yellow-300 bg-yellow-50/50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{cap.service_name}</span>
                        <Badge variant="outline" className="text-xs">{cap.plan_name}</Badge>
                        {projectingNewSub && diff > 0 && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                            +{diff}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge className={`${status.color} border`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Actual Usage (editable) */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-slate-500 uppercase w-16">Actual:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            className="w-28 px-2 py-0.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveUsage(cap); if (e.key === 'Escape') setEditingUsageId(null); }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveUsage(cap)}>
                            <Save className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingUsageId(null)}>
                            <X className="w-3 h-3 text-slate-400" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {formatNumber(actualUsage)}
                          </span>
                          <span className="text-xs text-slate-400">/ {formatNumber(cap.monthly_call_limit)} ({actualPct}%)</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditUsage(cap)}>
                            <Pencil className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Projected bar */}
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-medium text-slate-400 uppercase w-16">Projected:</span>
                      <span className="text-xs text-slate-400">{formatNumber(cap.projectedTotal)} ({projectedPct}%)</span>
                    </div>
                    <div className="relative h-4 w-full rounded-full overflow-hidden bg-slate-100">
                      {/* Actual bar (bottom layer, darker) */}
                      <div
                        className="absolute inset-y-0 left-0 h-full rounded-full transition-all opacity-50"
                        style={{ width: `${Math.min(actualPct, 100)}%`, backgroundColor: '#94a3b8' }}
                      />
                      {/* Projected bar (top layer) */}
                      <div
                        className={`absolute inset-y-0 left-0 h-full rounded-full transition-all ${status.barBg}`}
                        style={{ width: `${Math.min(projectedPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Actual
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${status.barBg} inline-block`} /> Projected
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>${cap.monthly_cost}/mo</span>
                        {cap.overage_cost_per_unit > 0 && (
                          <span>${cap.overage_cost_per_unit}/unit overage</span>
                        )}
                      </div>
                      {displayPct >= 70 && cap.upgrade_option && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7 border-slate-300">
                          <ArrowUpRight className="w-3 h-3" />
                          Upgrade to {cap.upgrade_option} (${cap.upgrade_cost}/mo)
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-slate-400 mr-1">Required by:</span>
                      {(cap.required_by_tiers || []).map(t => (
                        <Badge key={t} variant="secondary" className="text-xs capitalize">{t}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}