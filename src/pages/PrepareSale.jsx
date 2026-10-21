import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { asList } from '@/components/equipment/equipmentModel';
import { analyzePreparation, prepFactsString, STATUS_STYLES } from '@/components/saleops/prepareModel';
import PrepChecklistSection from '@/components/saleops/PrepChecklistSection';
import PrepCoachPanel from '@/components/saleops/PrepCoachPanel';
import AiStagingCoachPanel from '@/components/saleops/AiStagingCoachPanel';
import AiChecklistPanel from '@/components/equipment/AiChecklistPanel';

// Chapter 8 P2 — PREPARE THIS SALE. An ORCHESTRATION layer over existing
// canonical systems (NOT a new lifecycle): it reads what already exists,
// computes deterministic readiness, surfaces actionable findings, and lets the
// operator review the security walkthrough / checkout setup, ask the
// Operations Coach, and get staging considerations — all on one screen.
export default function PrepareSale() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get('saleId');
    if (!saleId) { navigate('/MySales'); return; }
    try {
      const saleData = asList(await base44.entities.EstateSale.filter({ id: saleId }));
      if (saleData.length === 0) { navigate('/MySales'); return; }
      const s = saleData[0];
      const [scopeRes, tasksRes, researchRes, attentionRes, countRes, assignRes, kitRes, mkRes, decisionsRes, authRes] = await Promise.all([
        base44.entities.SaleScope.filter({ sale_id: s.id, status: 'ACTIVE' }),
        base44.entities.SaleTask.filter({ sale_id: s.id }),
        base44.entities.Item.filter({ estate_sale_id: s.id, research_status: { $ne: 'CLEAR' } }),
        base44.entities.Item.filter({ estate_sale_id: s.id, display_attention: { $ne: 'NONE' } }),
        base44.entities.Item.count({ estate_sale_id: s.id }),
        base44.entities.SaleEquipmentAssignment.filter({ sale_id: s.id }),
        base44.entities.SaleKitTemplate.filter({ operator_id: s.operator_id, enabled: true }),
        base44.entities.MarketingKit.filter({ sale_id: s.id }),
        base44.entities.SaleClientDecision.filter({ sale_id: s.id, status: 'open' }),
        base44.entities.SaleAuthority.filter({ sale_id: s.id }),
      ]);
      const d = {
        scope: asList(scopeRes)[0] || null,
        tasks: asList(tasksRes),
        researchItems: asList(researchRes),
        attentionItems: asList(attentionRes),
        itemCount: typeof countRes === 'number' ? countRes : (asList(countRes).length),
        assignments: asList(assignRes),
        kit: asList(kitRes)[0] || null,
        marketingKit: asList(mkRes)[0] || null,
        openDecisions: asList(decisionsRes),
        authorities: asList(authRes),
      };
      setSale(s);
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-slate-200 rounded"></div></div>;
  }
  if (!sale || !data) return <div className="p-8 text-slate-500">Sale not found.</div>;

  const analysis = analyzePreparation({
    sale, scope: data.scope, tasks: data.tasks, itemCount: data.itemCount,
    researchItems: data.researchItems, attentionItems: data.attentionItems,
    assignments: data.assignments, kit: data.kit, marketingKit: data.marketingKit,
    openDecisions: data.openDecisions, authorities: data.authorities,
  });
  const prepFacts = prepFactsString({
    sale, analysis, researchItems: data.researchItems, attentionItems: data.attentionItems,
    assignments: data.assignments, openDecisions: data.openDecisions, tasks: data.tasks,
  });
  const { summary, timing } = analysis;

  const timingBadge = {
    'EARLY PREP': 'bg-sky-50 text-sky-700 border-sky-200',
    'ACTIVE PREP': 'bg-amber-50 text-amber-700 border-amber-200',
    'FINAL PRE-OPEN REVIEW': 'bg-red-50 text-red-700 border-red-200',
    'SALE DAYS': 'bg-orange-50 text-orange-700 border-orange-200',
    'POST-SALE': 'bg-slate-50 text-slate-600 border-slate-200',
    UNKNOWN: 'bg-slate-50 text-slate-500 border-slate-200',
  }[timing.phase] || 'bg-slate-50 text-slate-600 border-slate-200';

  const areaLink = (a) => {
    if (!a.link) return null;
    if (a.link.startsWith('#')) return <a href={a.link} className="text-xs text-orange-700 hover:underline">{a.linkLabel || 'Review'}</a>;
    return <Link to={a.link} className="text-xs text-orange-700 hover:underline inline-flex items-center gap-0.5">{a.linkLabel || 'Open'}<ExternalLink className="w-3 h-3" /></Link>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" onClick={() => navigate('/MySales')} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 break-words">{sale.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${timingBadge}`}>
              {timing.phase}{timing.daysUntilFirst !== null && timing.phase !== 'POST-SALE' && timing.phase !== 'SALE DAYS' ? ` · ${timing.daysUntilFirst} day${timing.daysUntilFirst === 1 ? '' : 's'} to first date` : ''}
            </span>
            <span className="text-xs text-slate-500">Preparation orchestration — reads your records; it does not change sale status.</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />Refresh analysis
        </Button>
      </div>

      {/* Readiness summary — counts, never a vanity percentage */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-600">{summary.ready} AREAS READY</Badge>
        {summary.attention > 0 && <Badge className="bg-red-600">{summary.attention} NEED ATTENTION</Badge>}
        {summary.review > 0 && <Badge className="bg-amber-600">{summary.review} NEED REVIEW</Badge>}
        {summary.na > 0 && <Badge variant="outline" className="text-slate-500">{summary.na} NOT APPLICABLE</Badge>}
        <span className="text-xs text-slate-400 self-center">Computed from records only — AI never sets a readiness status.</span>
      </div>

      {/* Actionable findings first */}
      {analysis.findings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-2"><CardTitle className="text-base text-amber-900">Needs your attention</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analysis.findings.map((f, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <Badge variant="outline" className={f.status === 'NEEDS ATTENTION' ? 'border-red-300 text-red-700 w-fit' : 'border-amber-300 text-amber-700 w-fit'}>{f.status}</Badge>
                <div className="flex-1 min-w-0 text-sm text-slate-800">
                  <span className="font-medium">{f.areaLabel}:</span> {f.detail}
                </div>
                {areaLink(f)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Deterministic area cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {analysis.areas.map(a => (
          <Card key={a.id} className="flex flex-col">
            <CardContent className="p-4 flex flex-col gap-2 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 whitespace-nowrap ${STATUS_STYLES[a.status]}`}>{a.status}</span>
              </div>
              <p className="text-xs text-slate-600 flex-1">{a.detail}</p>
              {a.link && areaLink(a)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security walkthrough + checkout setup reviews (existing SaleTask system) */}
      <PrepChecklistSection
        sale={sale}
        templateKey="SECURITY_WALKTHROUGH"
        checklist={analysis.security}
        onChanged={refresh}
        tone="text-slate-800"
      />
      <PrepChecklistSection
        sale={sale}
        templateKey="CHECKOUT_SETUP"
        checklist={analysis.checkout}
        onChanged={refresh}
        tone="text-slate-800"
      />

      {/* AI: Operations Coach + Prep Brief (grounded, advisory only) */}
      <PrepCoachPanel sale={sale} prepFacts={prepFacts} />

      {/* AI Staging Coach (advisory, photo/description, no canonical writes) */}
      <AiStagingCoachPanel sale={sale} />

      {/* Certified AI Checklist Builder — operator approves before tasks exist */}
      <AiChecklistPanel sale={sale} onTasksAdded={refresh} />
    </div>
  );
}