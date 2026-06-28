import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { isAdminUser } from '@/lib/isAdminUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Megaphone, Cpu, RefreshCw, AlertTriangle, Shield, Play,
  CheckCircle2, XCircle, Clock, Eye, BarChart2, Filter, Loader2
} from 'lucide-react';
import CampaignReviewModal from '@/components/autonomous/CampaignReviewModal';
import CampaignPerformanceLog from '@/components/autonomous/CampaignPerformanceLog';
import { format } from 'date-fns';

const STATUS_COLORS = {
  draft:             'bg-slate-100 text-slate-500 border-slate-300',
  awaiting_approval: 'bg-amber-100 text-amber-700 border-amber-300',
  approved:          'bg-blue-100 text-blue-700 border-blue-300',
  paused_in_meta:    'bg-cyan-100 text-cyan-700 border-cyan-300',
  scheduled:         'bg-indigo-100 text-indigo-700 border-indigo-300',
  launched:          'bg-green-100 text-green-700 border-green-300',
  completed:         'bg-slate-100 text-slate-600 border-slate-300',
  rejected:          'bg-red-100 text-red-700 border-red-300',
  running:           'bg-cyan-100 text-cyan-700 border-cyan-300',
  failed:            'bg-red-100 text-red-700 border-red-300',
  cancelled:         'bg-slate-100 text-slate-400 border-slate-200',
};

const STATUS_LABELS = {
  draft: 'Draft', awaiting_approval: 'Awaiting Approval', approved: 'Approved',
  paused_in_meta: 'Paused in Meta', scheduled: 'Scheduled', launched: '🟢 Live',
  completed: 'Completed', rejected: 'Rejected', running: '⟳ Running',
  failed: 'Failed', cancelled: 'Cancelled',
};

function RunTypeBadge({ type }) {
  return type === 'campaign'
    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Megaphone className="w-3 h-3" />Meta Campaign</span>
    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200"><Cpu className="w-3 h-3" />Agent Run</span>;
}

export default function AutonomousRunsDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [agentRuns, setAgentRuns] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [settings, setSettings] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Review modal
  const [reviewCampaign, setReviewCampaign] = useState(null);
  // Performance panel
  const [perfCampaign, setPerfCampaign] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) loadAll();
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [cData, rData, crData, sData] = await Promise.all([
        base44.entities.FacebookAdCampaignDraft.list('-created_at', 100),
        base44.entities.AutonomousAgentRun.list('-created_at', 100),
        base44.entities.FacebookAdCreativeDraft.list('-created_at', 200),
        base44.entities.AdminAISettings.list('-created_date', 1),
      ]);
      setCampaigns(cData);
      setAgentRuns(rData);
      setCreatives(crData);
      setSettings(sData[0] || {});
    } catch (_) {}
    setRefreshing(false);
  };

  // Unified item list: tag each with a type
  const allItems = [
    ...campaigns.map(c => ({ ...c, _type: 'campaign' })),
    ...agentRuns.map(r => ({ ...r, _type: 'agent', status: r.status, title: r.title, created_at: r.created_at })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const filtered = allItems.filter(item => {
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchType = typeFilter === 'all' || item._type === typeFilter;
    return matchStatus && matchType;
  });

  // Stats
  const stats = {
    total: allItems.length,
    live: campaigns.filter(c => c.status === 'launched').length,
    pending: allItems.filter(i => ['awaiting_approval', 'approved', 'draft'].includes(i.status)).length,
    completed: allItems.filter(i => ['completed', 'cancelled'].includes(i.status)).length,
  };

  const handleApproveCampaign = async (id) => {
    await base44.entities.FacebookAdCampaignDraft.update(id, { status: 'approved', updated_at: new Date().toISOString() });
    await loadAll();
    if (reviewCampaign?.id === id) setReviewCampaign(prev => ({ ...prev, status: 'approved' }));
  };

  const handleRejectCampaign = async (id) => {
    await base44.entities.FacebookAdCampaignDraft.update(id, { status: 'rejected', updated_at: new Date().toISOString() });
    await loadAll();
    setReviewCampaign(null);
  };

  const handleApproveCreative = async (creativeId) => {
    await base44.entities.FacebookAdCreativeDraft.update(creativeId, { approval_status: 'approved' });
    setCreatives(prev => prev.map(c => c.id === creativeId ? { ...c, approval_status: 'approved' } : c));
  };

  const handleRejectCreative = async (creativeId) => {
    await base44.entities.FacebookAdCreativeDraft.update(creativeId, { approval_status: 'rejected' });
    setCreatives(prev => prev.map(c => c.id === creativeId ? { ...c, approval_status: 'rejected' } : c));
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
      <div className="border-b border-slate-200 bg-white px-4 md:px-6 py-4 md:py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg md:text-xl font-bold text-slate-800">Autonomous Runs Dashboard</h1>
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Admin Only</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Unified view of all scheduled, running, and completed meta-campaigns and agent runs.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              {user.full_name || user.email}
            </div>
            <Button size="sm" variant="outline" onClick={loadAll} disabled={refreshing} className="text-xs">
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Runs', value: stats.total, color: 'text-slate-800', bg: 'bg-white' },
            { label: '🟢 Live Now', value: stats.live, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
            { label: 'Pending Review', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Completed', value: stats.completed, color: 'text-slate-500', bg: 'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-xl p-4 text-center shadow-sm`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-400" />
          <div>
            <label className="text-xs text-slate-500 block mb-1">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="campaign">Meta Campaigns</SelectItem>
                <SelectItem value="agent">Agent Runs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="launched">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-xs text-slate-400">{filtered.length} records shown</div>
        </div>

        {/* Main table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-700">All Runs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Type</th>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Name / Title</th>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Status</th>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Budget / Actions</th>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Created</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="p-3"><RunTypeBadge type={item._type} /></td>
                    <td className="p-3">
                      <div className="font-medium text-slate-800 max-w-xs">
                        {item._type === 'campaign' ? item.campaign_name : item.title}
                      </div>
                      {item._type === 'campaign' && item.objective && (
                        <div className="text-xs text-slate-400 mt-0.5">{item.objective}</div>
                      )}
                      {item._type === 'agent' && item.summary && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.summary}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {item._type === 'campaign'
                        ? (item.daily_budget ? `$${item.daily_budget}/day` : '—')
                        : (item.proposed_actions_json?.actions?.length
                            ? `${item.proposed_actions_json.actions.length} actions`
                            : '—')}
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {item._type === 'campaign' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewCampaign(item)}>
                              <Eye className="w-3 h-3 mr-1" />Review
                            </Button>
                            {['completed', 'launched'].includes(item.status) && (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-600" onClick={() => setPerfCampaign(item)}>
                                <BarChart2 className="w-3 h-3 mr-1" />Stats
                              </Button>
                            )}
                          </>
                        )}
                        {item._type === 'agent' && item.status === 'awaiting_approval' && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300">Needs Review</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Cpu className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      No runs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewCampaign && (
        <CampaignReviewModal
          campaign={reviewCampaign}
          creatives={creatives.filter(c => c.campaign_draft_id === reviewCampaign.id)}
          settings={settings}
          onClose={() => setReviewCampaign(null)}
          onApprove={handleApproveCampaign}
          onReject={handleRejectCampaign}
          onApproveCreative={handleApproveCreative}
          onRejectCreative={handleRejectCreative}
          onRefresh={loadAll}
        />
      )}

      {/* Performance Log */}
      {perfCampaign && (
        <CampaignPerformanceLog
          campaign={perfCampaign}
          onClose={() => setPerfCampaign(null)}
        />
      )}
    </div>
  );
}