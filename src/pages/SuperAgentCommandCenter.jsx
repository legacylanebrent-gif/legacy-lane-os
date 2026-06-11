import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isAdminUser } from '@/lib/isAdminUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Brain, Cpu, Activity, Shield, RefreshCw, Play, Pause, Eye, Settings, BarChart3, Clock, CheckCircle2, AlertCircle, Zap, Users, MessageSquare, DollarSign, TrendingUp, Loader2 } from 'lucide-react';

const AGENT_CONFIGS = [
  { id: 'onboarding_agent', name: 'Onboarding Agent', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', domain: 'User Onboarding' },
  { id: 'admin_ops_agent', name: 'AdminOps Agent', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50', domain: 'Platform Operations' },
  { id: 'relationship_coach', name: 'Relationship Coach', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', domain: 'Partnerships' },
  { id: 'marketing_autopilot_agent', name: 'Marketing Autopilot', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', domain: 'Marketing' },
  { id: 'lead_conversion_agent', name: 'Lead Conversion Agent', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', domain: 'Lead Management' },
  { id: 'inventory_pricing_agent', name: 'Inventory Pricing Agent', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', domain: 'Pricing' },
  { id: 'customer_success_agent', name: 'Customer Success Agent', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50', domain: 'Support' },
  { id: 'content_seo_agent', name: 'Content SEO Agent', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50', domain: 'SEO & Content' },
  { id: 'financial_ops_agent', name: 'Financial Ops Agent', icon: DollarSign, color: 'text-green-700', bg: 'bg-green-50', domain: 'Finance' },
  { id: 'quality_assurance_agent', name: 'Quality Assurance Agent', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50', domain: 'QA & Compliance' },
];

export default function SuperAgentCommandCenter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentStats, setAgentStats] = useState({});
  const [recentRuns, setRecentRuns] = useState([]);
  const [recentAgentRuns, setRecentAgentRuns] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) {
          await loadAgentData();
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadAgentData = async () => {
    setRefreshing(true);
    try {
      // Fetch recent autonomous runs to see agent activity
      const runs = await base44.entities.AutonomousAgentRun.list('-created_at', 100);
      setRecentRuns(runs);
      setRecentAgentRuns(runs);

      // Calculate stats per agent
      const stats = {};
      AGENT_CONFIGS.forEach(agent => {
        const agentRuns = runs.filter(r => r.agent_name === agent.id);
        stats[agent.id] = {
          total_runs: agentRuns.length,
          completed: agentRuns.filter(r => r.status === 'completed').length,
          pending: agentRuns.filter(r => r.status === 'awaiting_approval').length,
          failed: agentRuns.filter(r => r.status === 'failed').length,
          last_run: agentRuns[0]?.created_at || null,
        };
      });
      setAgentStats(stats);
    } catch (_) {}
    setRefreshing(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
    </div>
  );

  if (!user || !isAdminUser(user)) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500">Admin privileges required.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Brain className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 font-serif">SuperAgent Command Center</h1>
                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Admin Only</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Monitor, manage, and direct your 10 autonomous SuperAgents</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={loadAgentData} disabled={refreshing} className="gap-2">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">10</div>
              <p className="text-xs text-slate-400 mt-1">All domains covered</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Total Runs (All Time)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">
                {recentRuns.length}
              </div>
              <p className="text-xs text-slate-400 mt-1">Across all agents</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {recentRuns.filter(r => r.status === 'awaiting_approval').length}
              </div>
              <p className="text-xs text-slate-400 mt-1">Awaiting your review</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {recentRuns.length > 0 
                  ? Math.round((recentRuns.filter(r => r.status === 'completed').length / recentRuns.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-slate-400 mt-1">Completed runs</p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Grid */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-white border border-slate-200 shadow-sm">
            <TabsTrigger value="all">All Agents</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AGENT_CONFIGS.map(agent => {
                const stats = agentStats[agent.id] || {};
                const Icon = agent.icon;
                const isActive = stats.total_runs > 0;
                
                return (
                  <Card key={agent.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${agent.bg} border border-slate-200 flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${agent.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-slate-800">{agent.name}</CardTitle>
                            <p className="text-xs text-slate-500">{agent.domain}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {isActive ? 'Active' : 'Idle'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-slate-800">{stats.total_runs || 0}</div>
                          <div className="text-xs text-slate-500">Total</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-green-600">{stats.completed || 0}</div>
                          <div className="text-xs text-green-600">Done</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-amber-600">{stats.pending || 0}</div>
                          <div className="text-xs text-amber-600">Pending</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8">
                          <Eye className="w-3 h-3 mr-1" />
                          View Logs
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8">
                          <Settings className="w-3 h-3 mr-1" />
                          Configure
                        </Button>
                      </div>
                      
                      {stats.last_run && (
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last run: {new Date(stats.last_run).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <div className="text-center py-12 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Active agents filter - shows agents with runs in last 7 days</p>
            </div>
          </TabsContent>

          <TabsContent value="operations">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AGENT_CONFIGS.filter(a => ['admin_ops_agent', 'financial_ops_agent', 'quality_assurance_agent'].includes(a.id)).map(agent => (
                <Card key={agent.id} className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500">{agent.domain}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="growth">
            <div className="text-center py-12 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Growth agents filter - marketing, lead conversion, SEO</p>
            </div>
          </TabsContent>

          <TabsContent value="support">
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Support agents filter - onboarding, customer success, relationships</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-slate-700">Recent Agent Activity</CardTitle>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-8">
                View All Runs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <Cpu className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No agent runs yet. Agents will appear here once they start executing.
              </div>
            ) : (
              <div className="space-y-2">
                {recentRuns.slice(0, 5).map(run => (
                  <div key={run.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{run.title}</div>
                        <div className="text-xs text-slate-500">
                          {run.agent_name} • {new Date(run.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[run.status] || 'bg-slate-100 text-slate-600'}`}>
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}