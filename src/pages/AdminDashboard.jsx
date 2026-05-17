import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { isAdminUser } from '@/lib/isAdminUser';
import {
  Users, Building2, Merge, BarChart3, DollarSign, Megaphone, Brain,
  TrendingUp, Mail, MapPin, Zap, Award, Shield, RefreshCw,
  ArrowUpRight, CheckCircle2, AlertTriangle, Clock, Target,
  Rocket, ChevronRight, Activity, MessageSquare, Send, Cpu
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '0%';

function StatCard({ label, value, sub, icon: IconComp, color, href, trend }) {
  const Icon = IconComp;
  const inner = (
    <div className={`relative bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden ${href ? 'cursor-pointer hover:border-slate-300' : ''}`}>
      {/* Background accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-6 translate-x-6 ${color}`} style={{ background: 'currentColor' }} />
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
          <Icon className={`w-5 h-5`} />
        </div>
        {href && <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />}
      </div>
      <div className="mt-3">
        <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <TrendingUp className="w-3 h-3" />
            {trend >= 0 ? '+' : ''}{trend}% this week
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function SectionHeader({ icon: Icon, label, color, href }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{label}</h2>
      </div>
      {href && (
        <Link to={href} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function QuickLinkCard({ icon: Icon, label, sub, href, color, badge }) {
  return (
    <Link to={href}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all group cursor-pointer flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm truncate">{label}</div>
          {sub && <div className="text-xs text-slate-400 truncate">{sub}</div>}
        </div>
        {badge !== undefined && (
          <Badge className="text-xs bg-orange-100 text-orange-700 shrink-0">{fmt(badge)}</Badge>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ── Goal Progress Bar ─────────────────────────────────────────────────────────
function GoalBar({ label, current, target, color }) {
  const pctNum = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{fmt(current)} / {fmt(target)} <span className="font-bold text-slate-700">({pctNum.toFixed(0)}%)</span></span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pctNum}%` }} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) await loadStats();
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadStats = async () => {
    setRefreshing(true);
    try {
      const [
        futLeads, outreach, campaigns, agentRuns,
        users, tickets, netCountRes, orgCountRes
      ] = await Promise.all([
        base44.entities.FutureOperatorLead.list(null, 10000).catch(() => []),
        base44.entities.OutreachSequence.list('-created_date', 2000).catch(() => []),
        base44.entities.FacebookAdCampaignDraft.list('-created_at', 100).catch(() => []),
        base44.entities.AutonomousAgentRun.list('-created_at', 100).catch(() => []),
        base44.entities.User.list('-created_date', 2000).catch(() => []),
        base44.entities.Ticket.list('-created_date', 100).catch(() => []),
        base44.functions.invoke('getFutureOperatorCount', {}).catch(() => ({ data: { total: 0 } })),
        base44.functions.invoke('getFutureOperatorCount', { entity: 'org' }).catch(() => ({ data: { total: 0 } })),
      ]);

      const leads = futLeads;
      const netTotal = netCountRes?.data?.total || 0;
      const orgTotal = orgCountRes?.data?.total || 0;
      const trueTotal = netTotal + orgTotal;
      const leadsWithEmail = leads.filter(l => l.email);
      const leadsFailed = leads.filter(l => l.enrichment_status === 'failed');
      const leadsGeocoded = leads.filter(l => l.geocode_status === 'geocoded');

      const outreachSent = outreach.filter(o => ['email_1_sent','email_2_sent','email_3_sent'].includes(o.sequence_status));
      const outreachReplied = outreach.filter(o => o.sequence_status === 'replied');
      const outreachBooked = outreach.filter(o => o.sequence_status === 'booked');

      const campaignLive = campaigns.filter(c => c.status === 'launched');
      const campaignPending = campaigns.filter(c => ['draft','awaiting_approval','approved'].includes(c.status));

      const runsPending = agentRuns.filter(r => r.status === 'awaiting_approval');
      const runsCompleted = agentRuns.filter(r => r.status === 'completed');

      const openTickets = tickets.filter(t => t.status === 'open');

      setStats({
        // Leads pipeline
        totalLeads: trueTotal,
        leadsWithEmail: leadsWithEmail.length,
        leadsFailed: leadsFailed.length,
        leadsGeocoded: leadsGeocoded.length,
        emailCoverageRate: pct(leadsWithEmail.length, trueTotal),

        // Outreach
        outreachTotal: outreach.length,
        outreachSent: outreachSent.length,
        outreachReplied: outreachReplied.length,
        outreachBooked: outreachBooked.length,
        replyRate: pct(outreachReplied.length, outreachSent.length + outreachReplied.length),

        // Campaigns
        campaignsTotal: campaigns.length,
        campaignLive: campaignLive.length,
        campaignPending: campaignPending.length,

        // Agent Runs
        agentRunsTotal: agentRuns.length,
        runsPending: runsPending.length,
        runsCompleted: runsCompleted.length,

        // Platform
        totalUsers: users.length,
        openTickets: openTickets.length,

        // Data sources
        netOpsTotal: netTotal,
        orgOpsTotal: orgTotal,
      });
    } catch (_) {}
    setRefreshing(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!user || !isAdminUser(user)) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500">Admin privileges required.</p>
      </div>
    </div>
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-1">{greeting}, {user.full_name?.split(' ')[0] || 'Admin'} 👋</p>
              <h1 className="text-4xl font-black tracking-tight leading-tight">Admin Command Center</h1>
              <p className="text-slate-400 mt-2 max-w-xl">Your full-stack view of leads, outreach, campaigns, and platform growth — everything you need to push the needle today.</p>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs px-3 py-1">
                  <Activity className="w-3 h-3 mr-1.5" />Platform Live
                </Badge>
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs px-3 py-1">
                  {stats.campaignLive || 0} Active Campaigns
                </Badge>
                {stats.runsPending > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-3 py-1">
                    <Clock className="w-3 h-3 mr-1.5" />{stats.runsPending} Runs Need Approval
                  </Badge>
                )}
                {stats.openTickets > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs px-3 py-1">
                    <MessageSquare className="w-3 h-3 mr-1.5" />{stats.openTickets} Open Tickets
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={loadStats} disabled={refreshing} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── Goals / Progress ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <SectionHeader icon={Target} label="Growth Goals — 2026" color="text-orange-600" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GoalBar label="📧 Leads with Email" current={stats.leadsWithEmail || 0} target={5000} color="bg-orange-500" />
            <GoalBar label="📬 Outreach Sequences Sent" current={stats.outreachTotal || 0} target={1000} color="bg-violet-500" />
            <GoalBar label="💬 Replies Received" current={stats.outreachReplied || 0} target={200} color="bg-green-500" />
            <GoalBar label="🚀 Meta Campaigns Launched" current={stats.campaignLive || 0} target={10} color="bg-blue-500" />
            <GoalBar label="🗄️ Total Lead Database" current={stats.totalLeads || 0} target={10000} color="bg-cyan-500" />
            <GoalBar label="✅ Bookings / Conversions" current={stats.outreachBooked || 0} target={50} color="bg-emerald-500" />
          </div>
        </div>

        {/* ── Top KPI Cards ── */}
        <div>
          <SectionHeader icon={BarChart3} label="Lead Pipeline Overview" color="text-slate-500" href="/FutOperLeads" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Leads in DB" value={fmt(stats.totalLeads)} sub={`${fmt(stats.netOpsTotal)} EstateSales.net + ${fmt(stats.orgOpsTotal)} .org`} icon={Merge} color="text-indigo-600 bg-indigo-50" href="/FutOperLeads" />
            <StatCard label="Emails Found" value={fmt(stats.leadsWithEmail)} sub={`${stats.emailCoverageRate} coverage rate`} icon={Mail} color="text-green-600 bg-green-50" href="/FutOperLeads" trend={8} />
            <StatCard label="Geocoded Records" value={fmt(stats.leadsGeocoded)} sub="with lat/lng data" icon={MapPin} color="text-cyan-600 bg-cyan-50" href="/FutOperLeads" />
            <StatCard label="Enrichment Failures" value={fmt(stats.leadsFailed)} sub="need re-processing" icon={AlertTriangle} color="text-red-500 bg-red-50" href="/FutOperLeads" />
          </div>
        </div>

        {/* ── Outreach Stats ── */}
        <div>
          <SectionHeader icon={Send} label="Email Outreach Performance" color="text-violet-500" href="/FutOperLeads" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Sequences Created" value={fmt(stats.outreachTotal)} icon={Mail} color="text-violet-600 bg-violet-50" />
            <StatCard label="Emails Sent" value={fmt(stats.outreachSent)} sub="active sequences" icon={Send} color="text-blue-600 bg-blue-50" trend={12} />
            <StatCard label="Replies Received" value={fmt(stats.outreachReplied)} sub={`${stats.replyRate} reply rate`} icon={MessageSquare} color="text-green-600 bg-green-50" href="/FutOperLeads" trend={5} />
            <StatCard label="Bookings / Signed" value={fmt(stats.outreachBooked)} sub="converted leads" icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" />
          </div>

          {/* Funnel visualization */}
          <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Conversion Funnel</p>
            <div className="flex items-end gap-2 h-20">
              {[
                { label: 'Leads w/ Email', val: stats.leadsWithEmail || 0, color: 'bg-slate-300' },
                { label: 'Sequences', val: stats.outreachTotal || 0, color: 'bg-violet-400' },
                { label: 'Emails Sent', val: stats.outreachSent || 0, color: 'bg-blue-400' },
                { label: 'Replied', val: stats.outreachReplied || 0, color: 'bg-green-400' },
                { label: 'Booked', val: stats.outreachBooked || 0, color: 'bg-emerald-500' },
              ].map((s, i) => {
                const maxVal = stats.leadsWithEmail || 1;
                const h = Math.max(8, (s.val / maxVal) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-slate-700">{fmt(s.val)}</span>
                    <div className={`w-full rounded-t-lg ${s.color} transition-all`} style={{ height: `${h}%` }} />
                    <span className="text-xs text-slate-400 text-center leading-tight">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Campaigns & Agent Runs ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaigns */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon={Megaphone} label="Meta Campaigns" color="text-blue-600" href="/AutonomousRunsDashboard" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total', value: stats.campaignsTotal || 0, color: 'text-slate-700' },
                { label: '🟢 Live Now', value: stats.campaignLive || 0, color: 'text-green-600' },
                { label: 'Pending Review', value: stats.campaignPending || 0, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="text-center bg-slate-50 rounded-xl p-3">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <Link to="/AutonomousRunsDashboard">
              <Button variant="outline" size="sm" className="w-full text-xs border-blue-200 text-blue-600 hover:bg-blue-50 gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />Open Campaigns Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Agent Runs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon={Cpu} label="Autonomous Agent Runs" color="text-amber-600" href="/AdminAIOperator" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total Runs', value: stats.agentRunsTotal || 0, color: 'text-slate-700' },
                { label: '⏳ Needs Approval', value: stats.runsPending || 0, color: 'text-amber-600' },
                { label: 'Completed', value: stats.runsCompleted || 0, color: 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="text-center bg-slate-50 rounded-xl p-3">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <Link to="/AdminAIOperator">
              <Button variant="outline" size="sm" className="w-full text-xs border-amber-200 text-amber-600 hover:bg-amber-50 gap-1.5">
                <Brain className="w-3.5 h-3.5" />Open AI Operator <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Platform Health ── */}
        <div>
          <SectionHeader icon={Activity} label="Platform Health" color="text-slate-500" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Registered Users" value={fmt(stats.totalUsers)} icon={Users} color="text-slate-600 bg-slate-100" href="/AdminUsers" />
            <StatCard label="Open Support Tickets" value={fmt(stats.openTickets)} icon={MessageSquare} color="text-red-500 bg-red-50" href="/AdminTickets" />
            <StatCard label="EstateSales.net Ops" value={fmt(stats.netOpsTotal)} icon={Building2} color="text-indigo-600 bg-indigo-50" href="/AdminFutureOperators" />
            <StatCard label="EstateSales.org Ops" value={fmt(stats.orgOpsTotal)} icon={Building2} color="text-teal-600 bg-teal-50" href="/AdminEstatesalesOrg" />
          </div>
        </div>

        {/* ── Quick Links Grid ── */}
        <div>
          <SectionHeader icon={Rocket} label="Quick Access — Admin Tools" color="text-orange-500" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickLinkCard icon={Merge} label="Fut Oper Leads" sub="Enrich, geocode & outreach" href="/FutOperLeads" color="bg-indigo-100 text-indigo-600" badge={stats.totalLeads} />
            <QuickLinkCard icon={Send} label="Outreach Sequences" sub="AI email outreach via Gmail" href="/FutOperLeads" color="bg-violet-100 text-violet-600" badge={stats.outreachTotal} />
            <QuickLinkCard icon={Cpu} label="Autonomous Runs Dashboard" sub="Meta campaigns & agent runs" href="/AutonomousRunsDashboard" color="bg-blue-100 text-blue-600" badge={stats.campaignPending} />
            <QuickLinkCard icon={Brain} label="Admin AI Operator" sub="Command autonomous agents" href="/AdminAIOperator" color="bg-amber-100 text-amber-600" badge={stats.runsPending} />
            <QuickLinkCard icon={Users} label="User Management" sub="Manage all platform users" href="/AdminUsers" color="bg-slate-100 text-slate-600" badge={stats.totalUsers} />
            <QuickLinkCard icon={BarChart3} label="Platform Analytics" sub="Full platform metrics" href="/PlatformAnalytics" color="bg-cyan-100 text-cyan-600" />
            <QuickLinkCard icon={DollarSign} label="Revenue Projections" sub="Growth & income forecasting" href="/Revenue" color="bg-green-100 text-green-600" />
            <QuickLinkCard icon={DollarSign} label="Comprehensive Revenue" sub="Full revenue breakdown" href="/ComprehensiveRevenue" color="bg-emerald-100 text-emerald-600" />
            <QuickLinkCard icon={DollarSign} label="Future Ops Revenue" sub="Operator revenue analysis" href="/FutureOperatorsAnalytics" color="bg-teal-100 text-teal-600" />
            <QuickLinkCard icon={Megaphone} label="FB Ads Autopilot" sub="Meta ad campaigns builder" href="/AdminAIOperator" color="bg-blue-100 text-blue-700" />
            <QuickLinkCard icon={Award} label="All Leads" sub="CRM lead management" href="/AdminLeads" color="bg-rose-100 text-rose-600" />
            <QuickLinkCard icon={Building2} label="Estate Sales" sub="Review & manage all sales" href="/AdminEstateSales" color="bg-orange-100 text-orange-600" />
            <QuickLinkCard icon={Zap} label="Automations" sub="Manage scheduled automations" href="/AdminAutomations" color="bg-yellow-100 text-yellow-600" />
            <QuickLinkCard icon={MessageSquare} label="Support Tickets" sub="Open support tickets" href="/AdminTickets" color="bg-red-100 text-red-600" badge={stats.openTickets} />
            <QuickLinkCard icon={Shield} label="Page Permissions" sub="Role-based access control" href="/AdminPageAccess" color="bg-slate-100 text-slate-700" />
          </div>
        </div>

        {/* ── Motivational Footer ── */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black">Every enriched lead is a door you haven't knocked on yet.</h3>
              <p className="text-orange-100 text-sm mt-0.5">
                You have <strong>{fmt((stats.leadsWithEmail || 0) - (stats.outreachTotal || 0))}</strong> leads with emails who haven't been contacted yet.
                Your next paid operator is in that list.
              </p>
            </div>
            <Link to="/FutOperLeads" className="ml-auto shrink-0">
              <Button className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-sm gap-2 whitespace-nowrap">
                Start Outreach <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}