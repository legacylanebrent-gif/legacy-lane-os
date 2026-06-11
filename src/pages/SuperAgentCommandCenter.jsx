import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isAdminUser } from '@/lib/isAdminUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Brain, Cpu, Activity, Shield, RefreshCw, Play, Pause, Eye, Settings, BarChart3, Clock, CheckCircle2, AlertCircle, Zap, Users, MessageSquare, DollarSign, TrendingUp, Loader2, Info, Globe, FileText } from 'lucide-react';

const STATUS_COLORS = {
  awaiting_approval: 'bg-amber-100 text-amber-700 border-amber-300',
  approved: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  failed: 'bg-red-100 text-red-700 border-red-300',
  running: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
};

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

const AGENT_SUGGESTIONS = {
  onboarding_agent: [
    { 
      title: 'Analyze new user registrations', 
      description: 'Review recent signups and generate personalized onboarding tasks',
      action: 'Generate Onboarding Plans',
      icon: Users
    },
    { 
      title: 'Identify inactive users', 
      description: 'Find users who haven\'t completed onboarding and trigger re-engagement',
      action: 'Run Re-engagement Campaign',
      icon: RefreshCw
    }
  ],
  admin_ops_agent: [
    { 
      title: 'Generate weekly operations report', 
      description: 'Compile platform metrics, agent performance, and automation opportunities',
      action: 'Generate Report',
      icon: BarChart3
    },
    { 
      title: 'Review admin task queue', 
      description: 'Prioritize pending admin tasks and suggest automation workflows',
      action: 'Optimize Task Queue',
      icon: CheckCircle2
    }
  ],
  relationship_coach: [
    { 
      title: 'Analyze partnership health', 
      description: 'Score all active partnerships and identify at-risk relationships',
      action: 'Calculate Health Scores',
      icon: TrendingUp
    },
    { 
      title: 'Generate outreach recommendations', 
      description: 'Create personalized follow-up suggestions for dormant partnerships',
      action: 'Generate Outreach Plan',
      icon: MessageSquare
    }
  ],
  marketing_autopilot_agent: [
    { 
      title: 'Create weekly social calendar', 
      description: 'Generate 7 days of territory-specific social media posts',
      action: 'Generate Content Calendar',
      icon: BarChart3
    },
    { 
      title: 'Launch Facebook ad campaign', 
      description: 'Create and schedule targeted ads for estate sale promotions',
      action: 'Build Ad Campaign',
      icon: Zap
    }
  ],
  lead_conversion_agent: [
    { 
      title: 'Score incoming leads', 
      description: 'Evaluate lead quality and route to optimal operators',
      action: 'Score & Route Leads',
      icon: TrendingUp
    },
    { 
      title: 'Generate outreach sequences', 
      description: 'Create personalized email sequences for high-value leads',
      action: 'Build Sequences',
      icon: MessageSquare
    }
  ],
  inventory_pricing_agent: [
    { 
      title: 'Research comparable sales', 
      description: 'Analyze marketplace data for items needing pricing',
      action: 'Run Price Research',
      icon: DollarSign
    },
    { 
      title: 'Update sale pricing', 
      description: 'Apply data-driven price recommendations to active listings',
      action: 'Update Prices',
      icon: RefreshCw
    }
  ],
  customer_success_agent: [
    { 
      title: 'Monitor user activity', 
      description: 'Identify users experiencing issues or needing support',
      action: 'Run Health Check',
      icon: Eye
    },
    { 
      title: 'Send proactive check-ins', 
      description: 'Generate personalized check-in messages for at-risk users',
      action: 'Send Check-ins',
      icon: MessageSquare
    }
  ],
  content_seo_agent: [
    { 
      title: 'Generate SEO content', 
      description: 'Create optimized estate sale pages and location hubs',
      action: 'Generate Content',
      icon: BarChart3
    },
    { 
      title: 'Submit pages to Google', 
      description: 'Index new content via Search Console API',
      action: 'Submit to Index',
      icon: Globe
    }
  ],
  financial_ops_agent: [
    { 
      title: 'Process commission calculations', 
      description: 'Calculate operator commissions and referral fees',
      action: 'Calculate Commissions',
      icon: DollarSign
    },
    { 
      title: 'Generate financial report', 
      description: 'Compile revenue, expenses, and wallet transactions',
      action: 'Build Report',
      icon: FileText
    }
  ],
  quality_assurance_agent: [
    { 
      title: 'Audit auto-generated content', 
      description: 'Review AI-generated pages for accuracy and quality',
      action: 'Run Content Audit',
      icon: CheckCircle2
    },
    { 
      title: 'Validate data integrity', 
      description: 'Check entity relationships and flag inconsistencies',
      action: 'Validate Data',
      icon: Shield
    }
  ]
};

const AGENT_DESCRIPTIONS = {
  onboarding_agent: {
    purpose: 'Guides new users through platform onboarding',
    responsibilities: [
      'Analyzes new user registration and account setup',
      'Generates personalized onboarding recommendations',
      'Creates targeted tasks to help users discover key features',
      'Tracks onboarding progress and engagement metrics',
      'Triggers follow-up sequences for inactive users'
    ],
    impact: 'Improves user activation rates and time-to-first-value'
  },
  admin_ops_agent: {
    purpose: 'Automates platform operations and administrative workflows',
    responsibilities: [
      'Monitors system health and performance metrics',
      'Generates operational reports and insights',
      'Identifies automation opportunities',
      'Manages admin task queues and priorities',
      'Coordinates multi-agent execution chains'
    ],
    impact: 'Reduces manual admin workload and improves operational efficiency'
  },
  relationship_coach: {
    purpose: 'Manages and strengthens business partnerships',
    responsibilities: [
      'Analyzes relationship health scores across connections',
      'Identifies at-risk partnerships needing attention',
      'Generates personalized outreach recommendations',
      'Tracks engagement patterns and response rates',
      'Suggests strategic partnership growth opportunities'
    ],
    impact: 'Increases partnership retention and referral quality'
  },
  marketing_autopilot_agent: {
    purpose: 'Autonomous social media and content marketing',
    responsibilities: [
      'Generates and schedules social media content calendars',
      'Creates targeted Facebook and Instagram ad campaigns',
      'Analyzes campaign performance and optimizes spend',
      'Produces territory-specific promotional posts',
      'Manages A/B testing for ad creatives and copy'
    ],
    impact: 'Drives consistent lead flow with minimal manual intervention'
  },
  lead_conversion_agent: {
    purpose: 'Optimizes lead routing and conversion workflows',
    responsibilities: [
      'Scores incoming leads based on fit and intent signals',
      'Routes leads to optimal operators or agents',
      'Generates personalized outreach sequences',
      'Tracks conversion funnel performance',
      'Identifies bottlenecks in lead handling'
    ],
    impact: 'Maximizes lead-to-deal conversion rates'
  },
  inventory_pricing_agent: {
    purpose: 'Intelligent item pricing and valuation',
    responsibilities: [
      'Researches comparable sales across marketplaces',
      'Generates data-driven pricing recommendations',
      'Monitors market trends and demand signals',
      'Updates pricing based on sale performance',
      'Identifies high-value items needing expert review'
    ],
    impact: 'Optimizes sale revenue through strategic pricing'
  },
  customer_success_agent: {
    purpose: 'Proactive user support and satisfaction',
    responsibilities: [
      'Monitors user activity for potential issues',
      'Generates proactive check-in messages',
      'Routes support tickets to appropriate teams',
      'Tracks customer satisfaction metrics',
      'Identifies users needing additional training or resources'
    ],
    impact: 'Improves customer retention and reduces churn'
  },
  content_seo_agent: {
    purpose: 'Automated SEO content generation and optimization',
    responsibilities: [
      'Generates SEO-optimized estate sale pages',
      'Creates location-based content hubs (state/county/city)',
      'Produces educational articles for life transition topics',
      'Builds item knowledge authority pages',
      'Manages sitemap and search console submissions'
    ],
    impact: 'Drives organic traffic growth through search visibility'
  },
  financial_ops_agent: {
    purpose: 'Financial tracking and commission management',
    responsibilities: [
      'Tracks operator wallet balances and transactions',
      'Processes commission calculations and payouts',
      'Monitors referral fee agreements',
      'Generates financial performance reports',
      'Identifies revenue optimization opportunities'
    ],
    impact: 'Ensures accurate financial operations and timely payouts'
  },
  quality_assurance_agent: {
    purpose: 'Platform compliance and content quality',
    responsibilities: [
      'Reviews auto-generated content for accuracy',
      'Validates data integrity across entities',
      'Flags potential policy violations',
      'Audits agent performance and outputs',
      'Maintains content quality standards'
    ],
    impact: 'Maintains platform trust and data reliability'
  }
};

export default function SuperAgentCommandCenter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentStats, setAgentStats] = useState({});
  const [recentRuns, setRecentRuns] = useState([]);
  const [recentAgentRuns, setRecentAgentRuns] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [configuringAgent, setConfiguringAgent] = useState(null);

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

  const handleInfoClick = (agent) => {
    setSelectedAgent(agent);
    setInfoModalOpen(true);
  };

  const handleConfigureClick = (agent) => {
    setConfiguringAgent(agent);
    setConfigureModalOpen(true);
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
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {isActive ? 'Active' : 'Idle'}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-amber-600"
                            onClick={() => handleInfoClick(agent)}
                          >
                            <Info className="w-3 h-3" />
                          </Button>
                        </div>
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
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleConfigureClick(agent)}>
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

        {/* Agent Configuration Modal */}
        <Dialog open={configureModalOpen} onOpenChange={setConfigureModalOpen}>
          <DialogContent className="max-w-2xl">
            {configuringAgent && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-lg ${configuringAgent.bg} border border-slate-200 flex items-center justify-center`}>
                      <configuringAgent.icon className={`w-6 h-6 ${configuringAgent.color}`} />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-800">
                        Configure {configuringAgent.name}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        Manage settings and automation rules
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Agent Configuration
                    </h4>
                    <p className="text-sm text-amber-700">
                      Configure automation rules, triggers, and execution parameters for {configuringAgent.name}.
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-amber-100">
                        <span className="text-sm text-amber-900">Status</span>
                        <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-amber-100">
                        <span className="text-sm text-amber-900">Execution Mode</span>
                        <span className="text-sm font-medium text-amber-900">Autonomous (Approval Required)</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-amber-100">
                        <span className="text-sm text-amber-900">Last Configured</span>
                        <span className="text-sm text-amber-700">System Default</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600" />
                      Recommended Actions
                    </h4>
                    <div className="space-y-3">
                      {AGENT_SUGGESTIONS[configuringAgent.id]?.map((suggestion, idx) => {
                        const SuggestionIcon = suggestion.icon;
                        return (
                          <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:border-amber-300 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <SuggestionIcon className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-semibold text-slate-800 mb-1">{suggestion.title}</h5>
                                <p className="text-xs text-slate-600 mb-2">{suggestion.description}</p>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                                  onClick={() => {
                                    // TODO: Implement agent-specific action
                                    console.log(`Running: ${suggestion.action} for ${configuringAgent.id}`);
                                    setConfigureModalOpen(false);
                                  }}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  {suggestion.action}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Configuration
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      This agent uses AI to make autonomous decisions. Configure approval thresholds and execution parameters.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-900">Auto-approve low-impact actions</span>
                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-900">Execution frequency</span>
                        <span className="text-sm font-medium text-blue-900">On-demand</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfigureModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setConfigureModalOpen(false)}>
                    Save Configuration
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Agent Info Modal */}
        <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
          <DialogContent className="max-w-2xl">
            {selectedAgent && AGENT_DESCRIPTIONS[selectedAgent.id] && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-lg ${selectedAgent.bg} border border-slate-200 flex items-center justify-center`}>
                      <selectedAgent.icon className={`w-6 h-6 ${selectedAgent.color}`} />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-800">
                        {selectedAgent.name}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        {selectedAgent.domain}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-amber-600" />
                      Purpose
                    </h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {AGENT_DESCRIPTIONS[selectedAgent.id].purpose}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      Key Responsibilities
                    </h4>
                    <ul className="space-y-2">
                      {AGENT_DESCRIPTIONS[selectedAgent.id].responsibilities.map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Business Impact
                    </h4>
                    <p className="text-sm text-slate-600 bg-green-50 p-3 rounded-lg border border-green-100">
                      {AGENT_DESCRIPTIONS[selectedAgent.id].impact}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setInfoModalOpen(false)} className="bg-amber-600 hover:bg-amber-700">
                    Got it
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}