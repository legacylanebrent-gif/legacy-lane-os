// Chapter 22 P1 — TRANSITION COMPLETION MODE: an assembled operational
// projection over canonical records. This page OWNS nothing and STORES
// nothing — every write runs through the sanctioned backend paths
// (setItemDisposition, setTransitionEventScope, completeTransitionEvent,
// approveTransitionCompletion, recordItemRelease) or the additive
// EstateSale.transition block.
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { asArray } from '@/components/saleops/saleDecisionModel';
import { actualSaleEconomics } from '@/components/saleops/saleEconomicsModel';
import ObjectiveCard from '@/components/transition/ObjectiveCard';
import RemainingMerchCard from '@/components/transition/RemainingMerchCard';
import EventsCard from '@/components/transition/EventsCard';
import WalkthroughCard from '@/components/transition/WalkthroughCard';
import ReadinessCard from '@/components/transition/ReadinessCard';
import SummaryCard from '@/components/transition/SummaryCard';
import { remainingBuckets, transitionBlockers, saleEventEnded, completionStatesSafe, deadlineRisk, additionalWork } from '@/components/transition/transitionModel';

export default function TransitionCompletion() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const saleId = params.get('saleId');

  const load = useCallback(async () => {
    if (!saleId) { navigate('/MySales'); return; }
    setRefreshing(true);
    try {
      const saleRows = await base44.entities.EstateSale.filter({ id: saleId });
      const sale = saleRows[0];
      if (!sale) { navigate('/MySales'); return; }
      const [itemsRes, decisionsRes, issuesRes, tasksRes, equipmentRes, donationsRes, cleanoutsRes, attemptsRes, expensesRes, laborRes, dealsRes, transactionsRes, user] = await Promise.all([
        base44.entities.Item.filter({ estate_sale_id: saleId }, { limit: 500 }),
        base44.entities.SaleClientDecision.filter({ sale_id: saleId }, { limit: 200 }),
        base44.entities.SaleIssue.filter({ sale_id: saleId }, { limit: 200 }),
        base44.entities.SaleTask.filter({ sale_id: saleId }, { limit: 300 }),
        base44.entities.SaleEquipmentAssignment.filter({ sale_id: saleId }, { limit: 200 }),
        base44.entities.Donation.filter({ sale_id: saleId }, { limit: 100 }),
        base44.entities.Cleanout.filter({ sale_id: saleId }, { limit: 100 }),
        base44.entities.PaymentAttempt.filter({ sale_id: saleId }, { limit: 200 }),
        base44.entities.Expense.filter({ sale_id: saleId }, { limit: 200 }),
        base44.entities.LaborEntry.filter({ sale_id: saleId }, { limit: 200 }),
        base44.entities.SaleConversionPipeline.filter({ estate_sale_id: saleId }, { limit: 5 }),
        base44.entities.Transaction.filter({ sale_id: saleId }, { limit: 500 }),
        base44.auth.me(),
      ]);
      setState({
        sale,
        user,
        items: asArray(itemsRes),
        decisions: asArray(decisionsRes),
        issues: asArray(issuesRes),
        tasks: asArray(tasksRes),
        equipment: asArray(equipmentRes),
        donations: asArray(donationsRes),
        cleanouts: asArray(cleanoutsRes),
        attempts: asArray(attemptsRes),
        expenses: asArray(expensesRes),
        labor: asArray(laborRes),
        deal: asArray(dealsRes)[0] || null,
        transactions: asArray(transactionsRes),
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [saleId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !state) {
    return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Loading transition completion…</div>;
  }

  const { sale, items, decisions, issues, tasks, equipment, donations, cleanouts, attempts, expenses, labor, deal, transactions, user } = state;
  const financialDecisions = decisions.filter((d) => d.decision_type === 'financial');
  const econ = actualSaleEconomics({ items, deal, financialDecisions, expenses, laborEntries: labor });
  const buckets = remainingBuckets(items);
  const blockers = transitionBlockers({ sale, items, decisions, issues, equipment, donations, cleanouts, attempts, deal, expenses });
  const states = completionStatesSafe(sale, deal);
  const saleEndedAt = (sale.sale_dates || []).map((d) => d.date).filter(Boolean).sort().pop();
  const addlWork = additionalWork({ tasks, saleEndedAt });
  const riskNote = deadlineRisk({ sale, blockers, calendar: tasks.map((t) => ({ label: t.name, date: t.due_date, kind: 'task' })) });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <Link to={'/SaleCloseout?saleId=' + sale.id} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back to closeout</Link>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">{sale.title} — Transition Completion</h1>
          <p className="text-xs text-slate-500">Assembled from canonical records — this view owns nothing. Every write runs through the sanctioned backend paths.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={refreshing}>{refreshing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}Refresh</Button>
      </div>

      <ReadinessCard sale={sale} blockers={blockers} states={states} deadlineRiskNote={riskNote} additionalWork={addlWork} onChanged={load} />
      <ObjectiveCard sale={sale} onChanged={load} />
      <RemainingMerchCard sale={sale} items={items} decisions={decisions} donations={donations} cleanouts={cleanouts} onChanged={load} />
      <EventsCard sale={sale} saleId={sale.id} donations={donations} cleanouts={cleanouts} items={items} decisions={decisions} onChanged={load} />
      <WalkthroughCard sale={sale} user={user} onChanged={load} />
      <SummaryCard sale={sale} items={items} transactions={transactions} expenses={expenses} buckets={buckets} deal={deal} econ={econ} blockers={blockers} tasks={tasks} />
    </div>
  );
}