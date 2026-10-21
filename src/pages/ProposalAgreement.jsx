import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Plus, ArrowLeft, Loader2, RefreshCw, ShieldAlert, FileText, History, Info } from 'lucide-react';
import { asArray } from '@/components/saleops/saleDecisionModel';
import { analyzeAgreementReadiness } from '@/components/agreements/agreementModel';
import { nextProposalVersion } from '@/components/agreements/proposalModel';
import ProposalBuilder from '@/components/agreements/ProposalBuilder';
import ProposalCard from '@/components/agreements/ProposalCard';
import AgreementReadiness from '@/components/agreements/AgreementReadiness';
import AgreementBuilder from '@/components/agreements/AgreementBuilder';
import AgreementCard from '@/components/agreements/AgreementCard';

// Chapter 9 P0/P1 — PROPOSAL & AGREEMENT. The truth chain:
// CONSULTATION → PROJECTED ECONOMICS → PROPOSAL (snapshot) → CLIENT ACCEPTANCE
// → ACCEPTED COMMERCIAL TERMS (on the deal) → AGREED SCOPE → AGREEMENT SNAPSHOT
// → ACTIVE SALE → LATER AUTHORIZED CHANGES (client decisions) → SETTLEMENT.
// PROPOSED ≠ ACCEPTED ≠ CURRENT; a signed agreement is a historical snapshot.
const list = (r) => (Array.isArray(r) ? r : (r?.items || []));

export default function ProposalAgreement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showProposalBuilder, setShowProposalBuilder] = useState(false);
  const [showAgreementBuilder, setShowAgreementBuilder] = useState(false);

  const load = useCallback(async () => {
    const saleId = new URLSearchParams(window.location.search).get('saleId');
    if (!saleId) { navigate('/MySales'); return; }
    try {
      const sales = list(await base44.entities.EstateSale.filter({ id: saleId }));
      if (!sales.length) { navigate('/MySales'); return; }
      const sale = sales[0];
      const [dealsRes, scopeRes, authRes, proposalsRes, agreementsRes, decisionsRes, templatesRes, itemCountRes] = await Promise.all([
        base44.entities.SaleConversionPipeline.filter({ estate_sale_id: sale.id }),
        base44.entities.SaleScope.filter({ sale_id: sale.id, status: 'ACTIVE' }),
        base44.entities.SaleAuthority.filter({ sale_id: sale.id }),
        base44.entities.SaleProposal.filter({ sale_id: sale.id }),
        base44.entities.SaleAgreement.filter({ sale_id: sale.id }),
        base44.entities.SaleClientDecision.filter({ sale_id: sale.id, status: 'open' }),
        base44.entities.BusinessDocument.filter({ operator_id: sale.operator_id, category: 'AGREEMENT', scope: 'business' }),
        base44.entities.Item.count({ estate_sale_id: sale.id }),
      ]);
      setData({
        sale,
        deal: list(dealsRes)[0] || null,
        scope: list(scopeRes)[0] || null,
        authorities: list(authRes),
        proposals: list(proposalsRes).sort((a, b) => (b.version || 0) - (a.version || 0)),
        agreements: list(agreementsRes).sort((a, b) => (b.version || 0) - (a.version || 0)),
        openDecisions: list(decisionsRes),
        templates: list(templatesRes),
        itemCount: typeof itemCountRes === 'number' ? itemCountRes : list(itemCountRes).length,
      });
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/4 mb-4" /><div className="h-64 bg-slate-200 rounded" /></div>;
  if (!data) return <div className="p-8 text-slate-500">Sale not found.</div>;

  const { sale, deal, scope, authorities, proposals, agreements, openDecisions, templates, itemCount } = data;
  const acceptedProposal = proposals.find(p => p.status === 'ACCEPTED');
  const readiness = analyzeAgreementReadiness({ sale, deal, scope, authorities, openDecisions, items: itemCount, proposals, agreements });

  // AUTHORITY HOLD — operational warning, never a legal conclusion.
  const activeAuth = authorities.filter(a => a.is_active);
  const primaryAuth = activeAuth.find(a => a.is_primary) || activeAuth[0];
  const authorityHold = !activeAuth.length
    ? 'No authorized decision-maker is recorded for this sale — AUTHORITY NEEDS REVIEW. Unknown authority is not authority.'
    : primaryAuth?.verification_status !== 'VERIFIED'
      ? `AUTHORITY NEEDS REVIEW — ${primaryAuth?.full_name || 'the recorded decision-maker'} is classified ${primaryAuth?.verification_status || 'UNRESOLVED'} by the operator.`
      : null;

  const executedExists = agreements.some(a => a.status === 'EXECUTED');
  const activationNotice = ['upcoming', 'active'].includes(sale.status) && !executedExists
    ? `This sale is ${sale.status.toUpperCase()} with no executed agreement on file. This is a truthful observation, not a block.`
    : null;

  const notify = (msg) => { setNotice(msg); load(); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" onClick={() => navigate('/MySales')} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{sale.title}</h1>
          <p className="text-xs text-slate-500">Proposal & Agreement — proposed ≠ accepted ≠ current. A signed agreement is a historical snapshot.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }}><RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
      </div>

      {notice && <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md p-2">{notice}</div>}

      {authorityHold && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-md p-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">{authorityHold} Record and classify the decision-maker in Client Decisions — operational protection, not a legal conclusion.</p>
        </div>
      )}
      {activationNotice && (
        <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-md p-3">
          <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-sky-800">{activationNotice}</p>
        </div>
      )}

      <AgreementReadiness readiness={readiness} />

      {/* ── PROPOSAL ── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" />Proposals (what we proposed, by date)</h2>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => setShowProposalBuilder(true)}><Plus className="w-3.5 h-3.5 mr-1" />Build Proposal</Button>
        </div>
        {proposals.length === 0 && (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
            No proposals yet — UNKNOWN, not "none needed". Build one from your records: the client, property, scope, dates, range and terms are populated automatically.
          </p>
        )}
        {proposals.map(p => <ProposalCard key={p.id} proposal={p} deal={deal} onChanged={notify} />)}
      </section>

      {/* ── AGREEMENT ── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-orange-500" />Agreements (versioned snapshots)</h2>
          <div className="flex items-center gap-2">
            {!acceptedProposal && <Badge variant="outline" className="text-xs">Requires an accepted proposal</Badge>}
            <Button size="sm" disabled={!acceptedProposal || !templates.length} onClick={() => setShowAgreementBuilder(true)} title={!acceptedProposal ? 'Record proposal acceptance first' : (!templates.length ? 'Store an AGREEMENT template in Business Documents first' : '')}>
              <Plus className="w-3.5 h-3.5 mr-1" />Build Agreement
            </Button>
          </div>
        </div>
        {readiness.counts.review > 0 && acceptedProposal && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            {readiness.counts.review} readiness item(s) still need review — you can still build, but resolve these before presenting the agreement.
          </p>
        )}
        {agreements.length === 0 && (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
            No agreements yet. Once a proposal is accepted, build the agreement from your own approved template — the surrounding legal text is yours; EstateSalen populates the facts.
          </p>
        )}
        {agreements.map(a => (
          <AgreementCard key={a.id} agreement={a} allAgreements={agreements} onChanged={notify} onNewVersion={() => setShowAgreementBuilder(true)} />
        ))}
      </section>

      <p className="text-[11px] text-slate-400">
        Later changes never rewrite a finalized proposal or an executed agreement: they flow through client decisions, scope history, or an intentional new version. Settlement reads the structured deal terms — never a PDF.
      </p>

      <Dialog open={showProposalBuilder} onOpenChange={setShowProposalBuilder}>
        {showProposalBuilder && (
          <ProposalBuilder
            sale={sale} deal={deal} scope={scope}
            nextVersion={nextProposalVersion(proposals)}
            onDone={(msg) => { setShowProposalBuilder(false); notify(msg); }}
            onClose={() => setShowProposalBuilder(false)}
          />
        )}
      </Dialog>

      <Dialog open={showAgreementBuilder} onOpenChange={setShowAgreementBuilder}>
        {showAgreementBuilder && (
          <AgreementBuilder
            sale={sale} deal={deal} scope={scope} acceptedProposal={acceptedProposal} templates={templates}
            nextVersion={(agreements.reduce((m, a) => Math.max(m, a.version || 0), 0)) + 1}
            onDone={(msg) => { setShowAgreementBuilder(false); notify(msg); }}
            onClose={() => setShowAgreementBuilder(false)}
          />
        )}
      </Dialog>
    </div>
  );
}