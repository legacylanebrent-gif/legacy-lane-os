import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ConsultationStepper from '@/components/consultation/ConsultationStepper';
import BeforeArriveSection from '@/components/consultation/BeforeArriveSection';
import ClientAuthoritySection from '@/components/consultation/ClientAuthoritySection';
import PropertySection from '@/components/consultation/PropertySection';
import RoomsSection from '@/components/consultation/RoomsSection';
import ConditionsSection from '@/components/consultation/ConditionsSection';
import PrepAccessSection from '@/components/consultation/PrepAccessSection';
import GoalsExpectationsSection from '@/components/consultation/GoalsExpectationsSection';
import ResearchHandlingSection from '@/components/consultation/ResearchHandlingSection';
import LaborCapacitySection from '@/components/consultation/LaborCapacitySection';
import EconomicsSection from '@/components/consultation/EconomicsSection';
import RiskSummarySection from '@/components/consultation/RiskSummarySection';
import AcceptanceReviewSection from '@/components/consultation/AcceptanceReviewSection';
import RecommendationSection from '@/components/consultation/RecommendationSection';
import SummarySection from '@/components/consultation/SummarySection';
import { CONSULTATION_SECTIONS, riskUnknownSummary, consultationState } from '@/components/consultation/consultationModel';
import { projectedDealEconomics } from '@/components/saleops/saleEconomicsModel';
import { calendarOverlap, advisoryInputs, conservativeScenario, DEFAULT_SCENARIO, acceptanceReview, consultationAdvisory } from '@/components/saleops/acceptanceReviewModel';

// Chapter 12 P1 — GUIDED MOBILE-FIRST CONSULTATION MODE. Starts from the existing
// Chapter 10 opportunity, walks the operator through a guided evaluation sequence,
// and ORCHESTRATES canonical systems — the consultation block on the deal is the only
// new data home; economics/authority/fit/research/labor/scope stay canonical.
// The consultation is an EVALUATION, not merely a sales appointment.
export default function ConsultationMode() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deal, setDeal] = useState(null);
  const [user, setUser] = useState(null);
  const [allDeals, setAllDeals] = useState([]);
  const [linkedSale, setLinkedSale] = useState(null);
  const [authority, setAuthority] = useState(null);
  const [researchItems, setResearchItems] = useState([]);
  const [section, setSection] = useState('before');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const dealId = new URLSearchParams(window.location.search).get('dealId');
    if (!dealId) { setError('No opportunity selected.'); setLoading(false); return; }
    try {
      const d = await base44.entities.SaleConversionPipeline.get(dealId);
      setDeal(d);
      try { setUser(await base44.auth.me()); } catch {}
      try {
        const res = await base44.entities.SaleConversionPipeline.filter({ operator_id: d.operator_id });
        setAllDeals(res.items || res || []);
      } catch {}
      if (d.estate_sale_id) {
        try { setLinkedSale(await base44.entities.EstateSale.get(d.estate_sale_id)); } catch {}
        try {
          const auth = await base44.entities.SaleAuthority.filter({ sale_id: d.estate_sale_id, is_active: true });
          const arr = auth.items || auth;
          setAuthority(arr.find(a => a.is_primary) || arr[0] || null);
        } catch {}
        try {
          const items = await base44.entities.Item.filter({
            estate_sale_id: d.estate_sale_id,
            research_status: { $in: ['RESEARCH_NEEDED', 'VERIFY', 'SPECIALIST_REVIEW'] },
          });
          setResearchItems(items.items || items || []);
        } catch {}
      }
      // P1-2/P1-1 — started_at marks the consultation as begun (CONTINUE thereafter).
      if (!d.consultation?.started_at) {
        const consultation = { ...(d.consultation || {}), started_at: new Date().toISOString() };
        await base44.entities.SaleConversionPipeline.update(d.id, { consultation });
        setDeal(prev => ({ ...(prev || d), consultation }));
      }
    } catch (e) {
      console.error(e);
      setError('Could not load this opportunity.');
    } finally { setLoading(false); }
  };

  // ONE write path for the consultation block (P1-2: guided navigation, no duplicate stores).
  // Patches merge onto the FRESHEST local state and saves run strictly in order,
  // so rapid consecutive actions can never overwrite each other.
  const consultRef = useRef(deal?.consultation || {});
  useEffect(() => { consultRef.current = deal?.consultation || {}; }, [deal]);
  const saveChain = useRef(Promise.resolve());
  const pendingSaves = useRef(0);
  const saveConsult = (patch) => {
    const merged = { ...(consultRef.current || {}), ...patch };
    consultRef.current = merged;
    setDeal(d => ({ ...d, consultation: merged }));
    pendingSaves.current += 1;
    setSaving(true);
    saveChain.current = saveChain.current.then(async () => {
      try {
        await base44.entities.SaleConversionPipeline.update(deal.id, { consultation: merged });
      } catch (e) {
        console.error(e);
      } finally {
        pendingSaves.current -= 1;
        if (pendingSaves.current === 0) setSaving(false);
      }
    });
    return saveChain.current;
  };

  // Canonical economics persist (same single write path the pipeline uses).
  const persistEconomics = async (fields) => {
    await base44.entities.SaleConversionPipeline.update(deal.id, fields);
    setDeal(d => ({ ...d, ...fields }));
  };

  const consult = deal?.consultation || {};
  const unresolvedResearchCount = researchItems.length;

  const review = useMemo(() => {
    if (!deal) return null;
    const base = projectedDealEconomics(deal);
    if (!base.estGross && !deal.labor_estimates?.length) {
      const r = acceptanceReview({ base, scenarioResult: base, overlap: { count: null, others: [] }, advisory: advisoryInputs(deal, linkedSale) });
      return { ...r, reasons: [...r.reasons, ...consultationAdvisory({ deal, authority, unresolvedResearchCount })] };
    }
    const scenarioResult = conservativeScenario(deal, base, DEFAULT_SCENARIO);
    const overlap = calendarOverlap(deal, allDeals);
    const advisory = advisoryInputs(deal, linkedSale);
    const r = acceptanceReview({ base, scenarioResult, overlap, advisory });
    return { ...r, reasons: [...r.reasons, ...consultationAdvisory({ deal, authority, unresolvedResearchCount })] };
  }, [deal, allDeals, linkedSale, authority, unresolvedResearchCount]);

  const riskItems = useMemo(
    () => deal ? riskUnknownSummary({ deal, linkedSale, authority, unresolvedResearchItems: unresolvedResearchCount }) : [],
    [deal, linkedSale, authority, unresolvedResearchCount]
  );

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-600" /><span className="ml-2 text-sm text-slate-500">Loading consultation…</span>
      </div>
    );
  }
  if (error || !deal) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <p className="text-sm text-slate-600">{error}</p>
        <Link to="/SaleConversionPipeline" className="text-sm text-cyan-600 hover:underline">Back to opportunities →</Link>
      </div>
    );
  }

  const state = consultationState(deal);
  const idx = CONSULTATION_SECTIONS.findIndex(s => s.key === section);
  const go = (dir) => setSection(CONSULTATION_SECTIONS[Math.min(Math.max(idx + dir, 0), CONSULTATION_SECTIONS.length - 1)].key);

  const props = { deal, consult, saveConsult };
  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      {/* Header */}
      <div className="py-3 space-y-2">
        <Link to="/SaleConversionPipeline" className="text-[11px] text-slate-400 hover:text-cyan-600 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> {deal.client_name}
        </Link>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Consultation Mode</h1>
            <p className="text-xs text-slate-500">{[deal.property_address, deal.property_city, deal.property_state].filter(Boolean).join(', ')}</p>
          </div>
          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] shrink-0">
            {state.status === 'completed' ? 'COMPLETED' : state.status === 'in_progress' ? 'IN PROGRESS' : 'STARTED'}
          </Badge>
        </div>
      </div>

      <ConsultationStepper section={section} onGo={setSection} />

      <div className="py-4">
        {section === 'before' && <BeforeArriveSection {...props} />}
        {section === 'client' && <ClientAuthoritySection deal={deal} authority={authority} linkedSaleId={deal.estate_sale_id} />}
        {section === 'property' && <PropertySection deal={deal} linkedSale={linkedSale} />}
        {section === 'rooms' && (
          <>
            <RoomsSection consult={consult} saveConsult={saveConsult} />
            <div className="border-t border-slate-200 mt-6 pt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Condition & safety observations</p>
              <ConditionsSection consult={consult} saveConsult={saveConsult} />
            </div>
          </>
        )}
        {section === 'prep' && <PrepAccessSection deal={deal} linkedSale={linkedSale} consult={consult} saveConsult={saveConsult} />}
        {section === 'goals' && <GoalsExpectationsSection deal={deal} consult={consult} saveConsult={saveConsult} />}
        {section === 'research' && <ResearchHandlingSection deal={deal} linkedSaleId={deal.estate_sale_id} consult={consult} researchItems={researchItems} />}
        {section === 'labor' && <LaborCapacitySection deal={deal} allDeals={allDeals} />}
        {section === 'economics' && <EconomicsSection deal={deal} onPersist={persistEconomics} allDeals={allDeals} linkedSale={linkedSale} />}
        {section === 'risks' && <RiskSummarySection items={riskItems} />}
        {section === 'acceptance' && (
          <AcceptanceReviewSection deal={deal} allDeals={allDeals} linkedSale={linkedSale} authority={authority}
            unresolvedResearchCount={unresolvedResearchCount} consult={consult} saveConsult={saveConsult} />
        )}
        {section === 'recommendation' && <RecommendationSection deal={deal} user={user} consult={consult} saveConsult={saveConsult} />}
        {section === 'summary' && (
          <SummarySection deal={deal} linkedSale={linkedSale} authority={authority} allDeals={allDeals}
            unresolvedResearchCount={unresolvedResearchCount} review={review} riskItems={riskItems}
            consult={consult} saveConsult={saveConsult} />
        )}
      </div>

      {/* Sticky nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => go(-1)} disabled={idx === 0} className="h-11 flex-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />}
          <Button onClick={() => go(1)} disabled={idx === CONSULTATION_SECTIONS.length - 1} className="h-11 flex-1 text-sm bg-cyan-600 hover:bg-cyan-700">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}