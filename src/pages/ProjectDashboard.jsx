// Chapter 13 P1 — PROJECT DASHBOARD (P1-45..P1-48): ONE assembled control view
// over the active project. It owns NOTHING (no DashboardData entity) — every
// section reads canonical systems: SaleTask, SaleClientDecision, SaleIssue,
// SaleAuthority, SaleScope, Activity, MarketingKit, SaleEquipmentAssignment,
// the linked SaleConversionPipeline deal, and the certified deterministic
// preparation analysis (Chapter 8). Vertical-first layout on mobile.
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowLeft, Building2, ExternalLink, LayoutDashboard, Loader2, MessageSquare, PackageSearch, RefreshCw, Users, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { analyzePreparation } from '@/components/saleops/prepareModel';
import { computeMilestones, attentionItems, timelineEntries } from '@/components/saleops/projectModel';
import AttentionPanel from '@/components/project/AttentionPanel';
import MilestoneList from '@/components/project/MilestoneList';
import ProjectTimeline from '@/components/project/ProjectTimeline';
import AuthoritySummaryCard from '@/components/project/AuthoritySummaryCard';
import CommunicationPlanCard from '@/components/project/CommunicationPlanCard';
import DecisionsCard from '@/components/project/DecisionsCard';
import SaleIssuesPanel from '@/components/project/SaleIssuesPanel';
import RetainedRegister from '@/components/project/RetainedRegister';
import ExcludedAreasCard from '@/components/project/ExcludedAreasCard';
import PrepZonesPanel from '@/components/project/PrepZonesPanel';
import DiscoveryPanel from '@/components/project/DiscoveryPanel';
import EndOfDayPanel from '@/components/project/EndOfDayPanel';
import ZoneStagingPanel from '@/components/staging/ZoneStagingPanel';
import StagingReadinessCard from '@/components/staging/StagingReadinessCard';

const asArr = (r) => (Array.isArray(r) ? r : (r && r.items) || []);
const money = (n) => (typeof n === 'number' ? `$${n.toLocaleString()}` : '—');

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const saleId = params.get('saleId');
  const zoneId = params.get('zoneId'); // Chapter 14 — work-zone QR target highlight
  const [sale, setSale] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (sid) => {
    const saleRows = asArr(await base44.entities.EstateSale.filter({ id: sid }));
    if (saleRows.length === 0) { navigate('/MySales'); return; }
    const s = saleRows[0];
    const [scopeRes, taskRes, decRes, issRes, authRes, itemRes, researchRes, attentionRes, mkRes, assignRes, kitRes, dealRes, actRes, equipRes, discRes, laborRes] = await Promise.all([
      base44.entities.SaleScope.filter({ sale_id: s.id, status: 'ACTIVE' }),
      base44.entities.SaleTask.filter({ sale_id: s.id }),
      base44.entities.SaleClientDecision.filter({ sale_id: s.id }),
      base44.entities.SaleIssue.filter({ sale_id: s.id }),
      base44.entities.SaleAuthority.filter({ sale_id: s.id }),
      base44.entities.Item.filter({ estate_sale_id: s.id }, { limit: 200 }),
      base44.entities.Item.filter({ estate_sale_id: s.id, research_status: { $ne: 'CLEAR' } }, { limit: 50 }),
      base44.entities.Item.filter({ estate_sale_id: s.id, display_attention: { $ne: 'NONE' } }, { limit: 50 }),
      base44.entities.MarketingKit.filter({ sale_id: s.id }),
      base44.entities.SaleEquipmentAssignment.filter({ sale_id: s.id }),
      base44.entities.SaleKitTemplate.filter({ operator_id: s.operator_id, enabled: true }),
      s.source_deal_id
        ? base44.entities.SaleConversionPipeline.filter({ id: s.source_deal_id })
        : base44.entities.SaleConversionPipeline.filter({ estate_sale_id: s.id }),
      base44.entities.Activity.filter({ sale_id: s.id }, '-created_date', 6),
      base44.entities.EquipmentAsset.filter({ operator_id: s.operator_id }, { limit: 1 }),
      base44.entities.SaleDiscovery.filter({ sale_id: s.id }),
      base44.entities.LaborEntry.filter({ sale_id: s.id }),
    ]);
    const d = {
      scope: asArr(scopeRes)[0] || null,
      tasks: asArr(taskRes),
      decisions: asArr(decRes),
      issues: asArr(issRes),
      authorities: asArr(authRes),
      items: asArr(itemRes),
      researchItems: asArr(researchRes),
      attentionItems: asArr(attentionRes),
      marketingKit: asArr(mkRes)[0] || null,
      assignments: asArr(assignRes),
      kit: asArr(kitRes)[0] || null,
      linkedDeal: asArr(dealRes)[0] || null,
      activities: asArr(actRes),
      discoveries: asArr(discRes),
      laborEntries: asArr(laborRes),
    };
    setSale(s);
    setData(d);
    setLoading(false);
    setRefreshing(false);
  }, [navigate]);

  useEffect(() => {
    if (saleId) load(saleId).catch((e) => { console.error(e); setLoading(false); });
    else setLoading(false);
  }, [saleId, load]);

  const refresh = () => { setRefreshing(true); load(sale.id); };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-64 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (!saleId || !sale) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-serif font-bold text-slate-900">Project Dashboard</h1>
        <p className="text-slate-600 text-sm">Open a sale from <Link to="/MySales" className="text-cyan-600 underline">My Sales</Link>, or activate an accepted opportunity from the <Link to="/SaleConversionPipeline" className="text-cyan-600 underline">Pipeline</Link>.</p>
      </div>
    );
  }

  const { scope, tasks, decisions, issues, authorities, items, researchItems, attentionItems: attentionInventory, marketingKit, assignments, kit, linkedDeal, activities, discoveries, laborEntries } = data || {};
  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const prepAnalysis = analyzePreparation({
    sale, scope, tasks, itemCount: items.length, researchItems, attentionItems: attentionInventory,
    assignments, kit, marketingKit,
    openDecisions: decisions.filter((d) => d.status === 'open'),
    authorities,
  });
  const milestones = computeMilestones({ sale, scope, authorities, tasks, items, prepSummary: prepAnalysis.summary, linkedDeal });
  const timeline = timelineEntries({ sale, linkedDeal, tasks, issues, excludedAreas: sale.excluded_areas || [] });
  const attention = attentionItems({ sale, tasks, issues, decisions, authorities, timeline });
  const pendingPackout = assignments.filter((a) => a.packed && a.entry_type === 'REUSABLE_EQUIPMENT' && (a.packout_state || 'PENDING') === 'PENDING');
  const plan = (scope && scope.post_sale_plan) || null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/MySales')} className="text-slate-600 -ml-2 mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" />Back to Sales
          </Button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 break-words flex items-center gap-2 flex-wrap">
            <LayoutDashboard className="w-6 h-6 text-cyan-700 flex-shrink-0" />{sale.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
            <span className="capitalize">{sale.status}</span>
            {sale.property_address?.city && <span>{sale.property_address.city}{sale.property_address?.state ? `, ${sale.property_address.state}` : ''}</span>}
            {(sale.sale_dates || []).length > 0 && <span>{format(new Date(sale.sale_dates[0].date + 'T00:00:00'), 'MMM d, yyyy')}{sale.sale_dates.length > 1 ? ` +${sale.sale_dates.length - 1} more` : ''}</span>}
            {sale.activation?.activated_at && <span className="text-xs text-slate-400">Activated {format(new Date(sale.activation.activated_at), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}Refresh
          </Button>
          <Link to={`/SaleEditor?saleId=${sale.id}`}><Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1" />Sale Editor</Button></Link>
          <Link to={`/PrepareSale?saleId=${sale.id}`}><Button size="sm" variant="outline"><Wrench className="w-3.5 h-3.5 mr-1" />Prepare</Button></Link>
          <Link to={`/SellerOnboarding?saleId=${sale.id}`}><Button size="sm" variant="outline">Seller Onboarding</Button></Link>
          <Link to={`/OperatorWorkload`}><Button size="sm" variant="outline"><Users className="w-3.5 h-3.5 mr-1" />Workload</Button></Link>
        </div>
      </div>

      {/* WHAT IS HAPPENING / NEEDS MY ATTENTION */}
      <div className="grid lg:grid-cols-2 gap-4">
        <AttentionPanel attention={attention} />
        <MilestoneList milestones={milestones} />
      </div>

      {/* DATES */}
      <ProjectTimeline sale={sale} linkedDeal={linkedDeal} tasks={tasks} issues={issues} />

      {/* AUTHORITY + COMMUNICATION */}
      <div className="grid lg:grid-cols-2 gap-4">
        <AuthoritySummaryCard authorities={authorities} sale={sale} />
        <CommunicationPlanCard sale={sale} onChanged={refresh} />
      </div>

      {/* TASKS */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{openTasks.length} open</Badge>
            <Badge variant="outline" className="text-red-700">{openTasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length} overdue</Badge>
            <Badge variant="outline" className="text-red-700">{openTasks.filter((t) => t.blocked).length} blocked</Badge>
            <Badge variant="outline">{openTasks.filter((t) => !t.assignee_user_id).length} unassigned</Badge>
            <Badge variant="outline">{tasks.length - openTasks.length} completed</Badge>
          </div>
          {openTasks.filter((t) => t.blocked).slice(0, 4).map((t) => (
            <p key={t.id} className="text-xs text-red-700">Blocked: {t.name}{t.blocked_reason ? ` — ${t.blocked_reason}` : ''}</p>
          ))}
          <Link to={`/SaleTasks?saleId=${sale.id}`}><Button size="sm" variant="outline">View All Tasks</Button></Link>
        </CardContent>
      </Card>

      {/* DECISIONS + ISSUES */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DecisionsCard sale={sale} decisions={decisions} authorities={authorities} items={items}
          linkedDeal={linkedDeal} onChanged={refresh} />
        <SaleIssuesPanel sale={sale} issues={issues} onChanged={refresh} />
      </div>

      {/* RETAINED / EXCLUDED */}
      <div className="grid lg:grid-cols-2 gap-4">
        <RetainedRegister sale={sale} decisions={decisions} items={items} />
        <ExcludedAreasCard sale={sale} onChanged={refresh} />
      </div>

      {/* PREPARATION (Chapter 14): team-readable prep zones + discoveries + end-of-day review */}
      <PrepZonesPanel sale={sale} discoveries={discoveries} linkedDeal={linkedDeal} highlightZoneId={zoneId} onChanged={refresh} />
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <DiscoveryPanel sale={sale} zones={sale.prep_zones || []} discoveries={discoveries} onChanged={refresh} />
        <EndOfDayPanel sale={sale} zones={sale.prep_zones || []} discoveries={discoveries} tasks={tasks} issues={issues} decisions={decisions} laborEntries={laborEntries} />
      </div>

      {/* SALE-FLOOR STAGING (Chapter 17 P1): customer path, deterministic opening
          readiness, zone staging layer — assembled from canonical records only. */}
      <StagingReadinessCard sale={sale} zones={sale.prep_zones || []} items={data.items} issues={data.issues} tasks={data.tasks} laborEntries={data.laborEntries} linkedDeal={data.linkedDeal} onChanged={refresh} />
      <ZoneStagingPanel sale={sale} items={data.items} tasks={data.tasks} onChanged={refresh} />

      {/* PREPARATION READINESS (deterministic, Chapter 8 reuse) + POST-SALE PLAN */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-cyan-700" /> Preparation Readiness
            </CardTitle>
            <p className="text-xs text-slate-500">Deterministic analysis from records — not AI.</p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {prepAnalysis.areas.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-500 truncate">{a.detail}</p>
                </div>
                <Badge variant="outline" className={`flex-shrink-0 ${a.status === 'READY' ? 'text-green-700 border-green-300' : a.status === 'NEEDS_ATTENTION' ? 'text-red-700 border-red-300' : 'text-amber-700 border-amber-300'}`}>
                  {a.status}
                </Badge>
              </div>
            ))}
            {researchItems.length > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1 pt-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {researchItems.length} item(s) flagged for research — <Link to={`/SaleInventory?id=${sale.id}`} className="underline">inventory</Link>
              </p>
            )}
            {pendingPackout.length > 0 && (
              <p className="text-xs text-slate-600">{pendingPackout.length} packed equipment item(s) awaiting pack-out (Chapter 8).</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" /> Post-Sale Plan &amp; Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {plan ? (
              <p><span className="text-slate-500">Agreed default outcome:</span>{' '}
                <span className="font-medium">{(plan.default_outcome || 'DECISION_REQUIRED').replace(/_/g, ' ').toLowerCase()}</span>
                {plan.notes ? <span className="text-slate-500"> — {plan.notes}</span> : null}</p>
            ) : (
              <p className="text-slate-500">No post-sale plan on the agreed scope yet — record one before the sale (it is not decided at closeout).</p>
            )}
            <p><span className="text-slate-500">Team:</span>{' '}
              <span className="font-medium">{(sale.sale_team || []).length + 1} member(s)</span>
              {' '}(operator + assigned team)</p>
            {(sale.pickup_plan && (sale.pickup_plan.pickup_window || sale.pickup_plan.pickup_location)) ? (
              <p className="text-xs text-slate-500">Pickup plan: {sale.pickup_plan.pickup_window}{sale.pickup_plan.pickup_location ? ` · ${sale.pickup_plan.pickup_location}` : ''}</p>
            ) : (
              <p className="text-xs text-slate-400">No project-level pickup plan recorded.</p>
            )}
            <Link to={`/PrepareSale?saleId=${sale.id}`}><Button size="sm" variant="outline">Open Prepare This Sale</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* RECENT COMMUNICATIONS (canonical Activity log) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-700" /> Recent Client Communications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(activities || []).length === 0 ? (
            <p className="text-sm text-slate-400">No communications logged yet (canonical Activity log).</p>
          ) : (
            <div className="space-y-1.5">
              {activities.map((a) => (
                <p key={a.id} className="text-sm text-slate-700 border-l-2 border-cyan-200 pl-3">
                  <span className="text-xs text-slate-400">{a.created_date ? format(new Date(a.created_date), 'MMM d, h:mm a') : ''}</span>{' '}
                  {a.subject || a.summary || a.note || 'Communication logged'}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}