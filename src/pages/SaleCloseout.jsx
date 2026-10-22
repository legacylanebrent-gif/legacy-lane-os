import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Package, CheckCircle2, AlertTriangle, Info, PackageCheck,
  Users, DollarSign, Landmark, ClipboardCheck, ListChecks, Loader2, KeyRound
} from 'lucide-react';
import { asArray, fmtDateTime } from '@/components/saleops/saleDecisionModel';
import { toast } from 'sonner';
import { actualSaleEconomics, settlementReadiness, money } from '@/components/saleops/saleEconomicsModel';
import { postSaleAuthorizationWarning } from '@/components/agreements/agreementModel';
import SaleEconomicsPanel from '@/components/saleops/SaleEconomicsPanel';
import TenMoreReflection from '@/components/saleops/TenMoreReflection';
import ReconciliationPanel from '@/components/saleops/ReconciliationPanel';
import PostSaleReviewCard from '@/components/saleops/PostSaleReviewCard';
import RecapPublishCard from '@/components/saleops/RecapPublishCard';
import ClosingFileCard from '@/components/saleops/ClosingFileCard';
import ReleasePickupDialog from '@/components/pickup/ReleasePickupDialog';

// Chapter 1 P1 / Chapter 23 — Guided Closeout: an ORCHESTRATION surface over the
// existing canonical closeout systems (Item, Donation, Cleanout, buyout, Expense,
// SaleConversionPipeline/SettlementStatement, SaleTask, SaleClientDecision,
// SaleRecap, TransitionCompletion). It creates no duplicate records and replaces
// no lifecycle: EstateSale.status remains the single project lifecycle.
//
// Chapter 23 P0-3 PROJECT CLOSE GATE: FINANCIALLY COMPLETE + TRANSITION COMPLETE
// + ACCESS CLOSEOUT CONFIRMED + required endings = READY FOR HUMAN PROJECT CLOSE.
// CLIENT PAID ≠ PROJECT CLOSED; FINANCIAL COMPLETE ≠ TRANSITION COMPLETE.

function StepIcon({ state }) {
  if (state === 'done') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  if (state === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  if (state === 'blocker') return <AlertTriangle className="w-5 h-5 text-red-600" />;
  return <Info className="w-5 h-5 text-slate-400" />;
}

const ACCESS_STATUSES = [
  ['NOT_APPLICABLE', 'Not applicable — no company-held devices'],
  ['UNRESOLVED', 'Unresolved — a device is still outstanding'],
  ['RETURNED', 'Returned to client/agent'],
  ['TRANSFERRED', 'Transferred to the new owner'],
  ['DISABLED', 'Disabled / codes deactivated'],
];

export default function SaleCloseout() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [releaseItem, setReleaseItem] = useState(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessDraft, setAccessDraft] = useState({ status: '', note: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      if (!saleId) { navigate(createPageUrl('MySales')); return; }
      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (!saleData.length) { alert('Sale not found'); navigate(createPageUrl('MySales')); return; }
      const sale = saleData[0];
      setSale(sale);
      setAccessDraft({ status: sale.access_closeout?.status || '', note: sale.access_closeout?.note || '' });

      const [itemsRes, decisionsRes, tasksRes, expensesRes, dealsRes, donationsRes, cleanoutsRes, laborRes, equipRes, scopeRes, ordersRes, refundsRes, attemptsRes, issuesRes, cashRes] = await Promise.all([
        base44.entities.Item.filter({ estate_sale_id: sale.id }),
        base44.entities.SaleClientDecision.filter({ sale_id: sale.id }),
        base44.entities.SaleTask.filter({ sale_id: sale.id }),
        base44.entities.Expense.filter({ sale_id: sale.id }),
        base44.entities.SaleConversionPipeline.filter({ estate_sale_id: sale.id }),
        base44.entities.Donation.filter({ operator_id: sale.operator_id }),
        base44.entities.Cleanout.filter({ operator_id: sale.operator_id }),
        base44.entities.LaborEntry.filter({ sale_id: sale.id }),
        base44.entities.SaleEquipmentAssignment.filter({ sale_id: sale.id }),
        base44.entities.SaleScope.filter({ sale_id: sale.id, status: 'ACTIVE' }).catch(() => []),
        base44.entities.Order.filter({ sale_id: sale.id }).catch(() => []),
        base44.entities.SaleRefund.filter({ sale_id: sale.id }).catch(() => []),
        base44.entities.PaymentAttempt.filter({ sale_id: sale.id }).catch(() => []),
        base44.entities.SaleIssue.filter({ sale_id: sale.id }).catch(() => []),
        base44.entities.CashSession.filter({ sale_id: sale.id }).catch(() => []),
      ]);
      const items = asArray(itemsRes);
      const decisions = asArray(decisionsRes);
      const tasks = asArray(tasksRes);
      const expenses = asArray(expensesRes);
      const deals = asArray(dealsRes);
      const donations = asArray(donationsRes);
      const cleanouts = asArray(cleanoutsRes);
      const laborEntries = asArray(laborRes);
      const equipmentAssignments = asArray(equipRes);
      const orders = asArray(ordersRes);
      const refunds = asArray(refundsRes);
      const attempts = asArray(attemptsRes);
      const issues = asArray(issuesRes);
      const cashSessions = asArray(cashRes);

      // Chapter 22 P0-2 — match donation/cleanout records by the CANONICAL sale link.
      const saleDonations = donations.filter((d) => d.sale_id === sale.id);
      const saleCleanouts = cleanouts.filter((c) => c.sale_id === sale.id);
      const legacyUnlinked = donations.filter((d) => !d.sale_id).length + cleanouts.filter((c) => !c.sale_id).length;
      const scope = asArray(scopeRes)[0] || null;

      setData({ items, decisions, tasks, expenses, deals, saleDonations, saleCleanouts, legacyUnlinked, laborEntries, equipmentAssignments, orders, refunds, attempts, issues, cashSessions, sale, scope });
    } catch (e) {
      console.error('Error loading closeout data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }
  if (!sale || !data) return <div className="p-8 text-slate-500">Could not load closeout data.</div>;

  const { items, decisions, tasks, expenses, deals, saleDonations, saleCleanouts, legacyUnlinked, laborEntries, equipmentAssignments, orders, refunds, attempts, issues, cashSessions, scope } = data;
  const isPickedUp = (i) => !!i.pickup_completed_at;

  // 1 — Sold merchandise
  const soldItems = items.filter(i => i.status === 'sold');
  const awaitingPickup = soldItems.filter(i => (i.fulfillment_options || ['pickup']).includes('pickup') && !isPickedUp(i));
  const missingPaymentMethod = soldItems.filter(i => !i.payment_method_used);

  // 2 — Unsold merchandise / disposition
  const unsoldItems = items.filter(i => ['available', 'pending'].includes(i.status));
  const buyout = sale.buyout_config ? true : false;
  const dispositionScheduled = saleDonations.length > 0 || saleCleanouts.length > 0 || buyout;

  // 3 — Client decisions
  const merchDecisions = decisions.filter(d => d.decision_type === 'merchandise');
  const reviewOpen = merchDecisions.filter(d => d.current_decision === 'review' && d.status === 'open');
  const openGeneral = decisions.filter(d => d.decision_type !== 'merchandise' && d.status === 'open');

  // 4 — Financials (Chapter 23 canonical waterfall incl. refunds + reimbursables)
  const financialDecisions = decisions.filter(d => d.decision_type === 'financial');
  const deal = deals[0];
  const econ = actualSaleEconomics({ items, deal, financialDecisions, expenses, laborEntries, refunds });

  // 5 — Settlement
  const netDueToClient = econ.netDueToClient;
  const paid = deal?.total_paid_to_client || 0;
  const remaining = netDueToClient - paid;
  let settlementState = 'No settlement deal record';
  if (deal) {
    if (deal.settlement_finalized) settlementState = 'Finalized';
    else if (remaining > 0.005) settlementState = `${money(remaining)} due to client`;
    else if (paid > 0) settlementState = 'Paid in full — finalize record';
    else settlementState = 'Draft (no payouts recorded)';
  }

  // 6 — Final check
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const blockedTasks = tasks.filter(t => t.blocked && t.status !== 'completed');
  const unresolvedEquipment = (equipmentAssignments || []).filter(
    a => a.packed && a.entry_type === 'REUSABLE_EQUIPMENT' && (a.packout_state || 'PENDING') === 'PENDING'
  );

  // Chapter 23 — payment-truth readiness (P0-2 reused for financial completion)
  const paymentIssues = issues.filter(i => i.category === 'payment');
  const finReady = settlementReadiness({ attempts, issues: paymentIssues, cashSessions, refunds });

  // Chapter 23 P0-3 — completion states kept distinct:
  const financialComplete = deal ? (!!deal.settlement_finalized && remaining <= 0.005 && finReady.ready) : null;
  const transitionComplete = !!sale.transition?.transition_completed_at;
  const access = sale.access_closeout || {};
  const accessConfirmed = ['RETURNED', 'TRANSFERRED', 'DISABLED', 'NOT_APPLICABLE'].includes(access.status);

  // Step states: done | warning | blocker | info
  const step1 = awaitingPickup.length > 0 ? 'blocker' : (missingPaymentMethod.length > 0 ? 'warning' : 'done');
  const step2 = unsoldItems.length === 0 ? 'done' : (dispositionScheduled ? 'done' : 'warning');
  const step3 = reviewOpen.length > 0 ? 'blocker' : (openGeneral.length > 0 ? 'warning' : 'done');
  const step4 = 'done';
  const step5 = !deal ? 'info' : (financialComplete ? 'done' : 'blocker');
  const step6 = (openTasks.length > 0 || blockedTasks.length > 0) ? 'warning' : 'done';
  const step7 = transitionComplete ? 'done' : 'blocker';
  const step8 = accessConfirmed ? 'done' : 'blocker';

  const stepScore = (s) => (s === 'done' ? 1 : s === 'warning' ? 0.5 : 0);
  const scored = [step1, step2, step3, step4, step5, step6, step7, step8];
  const readiness = Math.round((scored.reduce((a, s) => a + stepScore(s), 0) / scored.length) * 100);

  const blockers = [];
  if (awaitingPickup.length > 0) blockers.push(`${awaitingPickup.length} sold item(s) awaiting pickup — paid merchandise still under company custody`);
  if (reviewOpen.length > 0) blockers.push(`${reviewOpen.length} unresolved merchandise client decision(s) (REVIEW)`);
  if (deal && !deal.settlement_finalized) blockers.push('Settlement not finalized — the settlement statement must be finalized before project close');
  if (deal && remaining > 0.005) blockers.push(`Client settlement incomplete — ${money(remaining)} still due to client`);
  finReady.blockers.forEach(b => blockers.push(b));
  if (!transitionComplete) blockers.push('TRANSITION COMPLETE = NO — complete the Chapter 22 Transition Completion before closing the project');
  if (!accessConfirmed) blockers.push('Access closeout not confirmed — record what happened to keys / lockbox / access devices (or mark NOT APPLICABLE)');
  const warnings = [];
  if (missingPaymentMethod.length > 0) warnings.push(`${missingPaymentMethod.length} sold item(s) with no payment method recorded`);
  if (step2 === 'warning') warnings.push(`${unsoldItems.length} unsold item(s) with no disposition scheduled (donation / cleanout / buyout)`);
  if (openGeneral.length > 0) warnings.push(`${openGeneral.length} open client decision(s)`);
  if (openTasks.length > 0) warnings.push(`Open task(s): ${openTasks.length}${blockedTasks.length ? `, ${blockedTasks.length} blocked` : ''}`);
  if (unresolvedEquipment.length > 0) warnings.push(`EQUIPMENT STILL UNRESOLVED: ${unresolvedEquipment.length} company asset(s) with no pack-out ending — open Sale Equipment (My Sales) to record returns`);
  const psaWarning = postSaleAuthorizationWarning(scope, { donations: saleDonations, cleanouts: saleCleanouts });
  if (psaWarning) warnings.push(psaWarning);
  if (!deal) warnings.push('No settlement deal record linked to this sale — financial completion cannot be verified');

  const saveAccess = async () => {
    if (!accessDraft.status) { alert('Choose an access closeout status first.'); return; }
    setAccessBusy(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.EstateSale.update(sale.id, {
        access_closeout: {
          status: accessDraft.status,
          note: accessDraft.note.trim(),
          closed_at: new Date().toISOString(),
          closed_by_name: me?.full_name || '',
        },
      });
      toast.success('Access closeout recorded');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Could not save the access closeout');
    } finally {
      setAccessBusy(false);
    }
  };

  const completeProject = async () => {
    setClosing(true);
    try {
      await base44.entities.EstateSale.update(sale.id, { status: 'completed' });
      setShowCloseConfirm(false);
      alert('Project marked complete. A private recap draft is generated for your review on the closeout page — nothing is published until you approve it.');
      navigate(createPageUrl('MySales'));
    } catch (e) {
      console.error(e);
      alert('Could not complete the project');
    } finally {
      setClosing(false);
    }
  };

  const steps = [
    {
      n: 1, title: 'Resolve Sold Merchandise', icon: Package, state: step1,
      lines: [
        `Sold items awaiting pickup: ${awaitingPickup.length}`,
        `Sold items with no payment method recorded: ${missingPaymentMethod.length}`,
      ],
    },
    {
      n: 2, title: 'Resolve Unsold Merchandise', icon: PackageCheck, state: step2,
      lines: [
        `Unsold items: ${unsoldItems.length}`,
        ...(legacyUnlinked > 0 ? [`${legacyUnlinked} legacy donation/cleanout record(s) not linked to a sale — review and link`] : []),
        `Donation: ${saleDonations.length ? saleDonations.map(d => d.status || 'Scheduled').join(', ') : 'Not scheduled'}`,
        `Cleanout: ${saleCleanouts.length ? saleCleanouts.map(c => c.status || 'Scheduled').join(', ') : (buyout ? 'Not required' : 'Not scheduled')}`,
        `Buyout: ${buyout ? 'Configured for this sale' : 'Not applicable'}`,
      ],
    },
    {
      n: 3, title: 'Confirm Client Decisions', icon: Users, state: step3,
      lines: [
        `Unresolved merchandise decisions (REVIEW): ${reviewOpen.length}`,
        `Open general client decisions: ${openGeneral.length}`,
      ],
    },
    {
      n: 4, title: 'Reconcile Financials', icon: DollarSign, state: step4,
      lines: [
        `Gross merchandise sales: ${money(econ.gross)}`,
        ...(econ.refundsTotal > 0 ? [`Completed refunds: −${money(econ.refundsTotal)}`, `Net merchandise proceeds: ${money(econ.netMerchandiseProceeds)}`] : []),
        `Company fee applied: ${money(econ.fee.applied)}${econ.fee.minimumApplied ? ' (contract minimum)' : ` (${econ.terms.commissionRate}%)`}`,
        `Authorized service charges: ${econ.charges.length} (${money(econ.serviceRevenue)})`,
        `Direct expenses recorded: ${expenses.length} (${money(econ.expenses.total)})`,
        `Cash labor cost: ${money(econ.cashLaborTotal)}${econ.laborIncomplete ? ` (INCOMPLETE — ${econ.laborUnknownHours.toFixed(1)} hrs without a recorded rate; their cost is UNKNOWN, not $0)` : ''}${econ.wageDedupeApplied ? ` (${money(econ.wageExpenseExcluded)} wage expense excluded — already carried by recorded labor hours)` : ''} · Owner time: ${econ.ownerHours.toFixed(1)} hrs (not cash)`,
        `Sale contribution: ${money(econ.contribution)} (not net profit${econ.contributionIncomplete ? `; INCOMPLETE — PARTIAL, labor cost unknown for ${econ.laborUnknownHours.toFixed(1)} hrs` : ''})`,
      ],
    },
    {
      n: 5, title: 'Client Settlement', icon: Landmark, state: step5,
      lines: deal ? [
        `Gross: ${money(econ.gross)} · Net due to client: ${money(netDueToClient)}`,
        `Paid to client: ${money(paid)} · Remaining: ${money(remaining)}`,
        `Status: ${settlementState}`,
        `Financially complete: ${financialComplete ? 'YES' : 'NO'}${!finReady.ready ? ` — ${finReady.blockers.length} payment blocker(s)` : ''}`,
      ] : ['No settlement deal record linked to this sale.'],
    },
    {
      n: 6, title: 'Final Property / Project Check', icon: ClipboardCheck, state: step6,
      lines: [
        `Open tasks: ${openTasks.length}${blockedTasks.length ? ` (${blockedTasks.length} blocked)` : ''}`,
        `Company equipment with no pack-out ending: ${unresolvedEquipment.length}`,
        `Paid merchandise still under custody: ${awaitingPickup.length}`,
        `Unresolved client decisions: ${reviewOpen.length + openGeneral.length}`,
      ],
    },
    {
      n: 7, title: 'Transition Completion (Chapter 22)', icon: ListChecks, state: step7,
      lines: [
        `Transition complete: ${transitionComplete ? 'YES' : 'NO'}`,
        transitionComplete
          ? `Approved ${sale.transition.completed_by_name ? `by ${sale.transition.completed_by_name}` : ''}${sale.transition.transition_completed_at ? ` · ${new Date(sale.transition.transition_completed_at).toLocaleDateString()}` : ''}`
          : 'Sale complete ≠ transition complete — the property transition must conclude before project close.',
      ],
    },
    {
      n: 8, title: 'Access Closeout (Keys / Devices)', icon: KeyRound, state: step8,
      lines: [
        access.status
          ? `Status: ${access.status.replace('_', ' ')}${access.note ? ` — ${access.note}` : ''}`
          : 'Not yet confirmed — record what happened to keys, lockbox, and access devices.',
        access.closed_at ? `Confirmed ${fmtDateTime(access.closed_at)}${access.closed_by_name ? ` by ${access.closed_by_name}` : ''}` : '',
      ].filter(Boolean),
    },
    {
      n: 9, title: 'Project Close', icon: ListChecks,
      state: sale.status === 'completed' ? 'done' : (blockers.length ? 'blocker' : 'done'),
      lines: [
        sale.status === 'completed' ? 'Project already completed.' : 'All endings recorded → ready for human project close.',
        'Marking the project complete sets the existing EstateSale status to "completed".',
      ],
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col items-start gap-1 min-w-0">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 break-words">{sale.title}</h1>
            <p className="text-slate-600">Guided Closeout</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs uppercase tracking-wide text-slate-400">Project Close Readiness</p>
          <p className={`text-4xl font-bold ${blockers.length ? 'text-red-600' : readiness === 100 ? 'text-green-600' : 'text-amber-500'}`}>{readiness}%</p>
        </div>
      </div>

      {/* Dashboard summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Awaiting pickup', awaitingPickup.length, 'text-red-600'],
          ['Unsold items', unsoldItems.length, 'text-slate-700'],
          ['Decisions needed', reviewOpen.length, 'text-amber-600'],
          ['Open tasks', openTasks.length, 'text-slate-700'],
          ['Expenses recorded', expenses.length, 'text-slate-700'],
          ['Settlement', settlementState, 'text-slate-700'],
          ['Transition', transitionComplete ? 'Complete' : 'Open', transitionComplete ? 'text-emerald-600' : 'text-red-600'],
          ['Financially complete', financialComplete == null ? 'No deal' : (financialComplete ? 'YES' : 'NO'), financialComplete ? 'text-emerald-600' : 'text-red-600'],
        ].map(([label, value, cls]) => (
          <Card key={String(label)}>
            <CardContent className="p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className={`text-sm font-semibold truncate ${cls}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Blockers / warnings */}
      {blockers.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <p className="font-semibold text-red-800 mb-1">Project close blockers</p>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
              {blockers.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-semibold text-amber-800 mb-1">Warnings (surfaced, not blocking)</p>
            <ul className="list-disc list-inside text-sm text-amber-700 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation (Chapter 23 P1) */}
      <ReconciliationPanel
        sale={sale}
        items={items}
        orders={orders}
        refunds={refunds}
        attempts={attempts}
        issues={issues}
        cashSessions={cashSessions}
        onChanged={loadData}
      />

      {/* Guided steps */}
      <div className="space-y-3">
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <Card key={step.n} className={step.state === 'blocker' ? 'border-red-300' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <h3 className="font-semibold text-slate-900">{step.title}</h3>
                      {step.state === 'blocker' && <Badge className="bg-red-100 text-red-700">BLOCKER</Badge>}
                      {step.state === 'warning' && <Badge className="bg-amber-100 text-amber-700">WARNING</Badge>}
                      {step.state === 'done' && <Badge className="bg-green-100 text-green-700">CLEAR</Badge>}
                      {step.state === 'info' && <Badge variant="outline">INFO</Badge>}
                    </div>
                    <ul className="mt-1.5 text-sm text-slate-600 space-y-0.5">
                      {step.lines.map((l, i) => <li key={i}>· {l}</li>)}
                    </ul>

                    {step.n === 1 && awaitingPickup.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {awaitingPickup.map(i => (
                          <div key={i.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                            <span className="text-sm text-slate-700 truncate">{i.title}{i.buyer_name ? ` — ${i.buyer_name}` : ''}</span>
                            <Button size="sm" variant="outline" className="text-xs flex-shrink-0" onClick={() => setReleaseItem(i)}>Record pickup / release</Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {step.n === 3 && (
                      <Button size="sm" variant="outline" className="mt-2 text-xs" asChild>
                        <Link to={'/SaleClientDecisions?saleId=' + sale.id}>Open Client Decisions</Link>
                      </Button>
                    )}
                    {step.n === 5 && deal && (
                      <Button size="sm" variant="outline" className="mt-2 text-xs" asChild>
                        <Link to={'/SettlementStatement?dealId=' + deal.id}>Open Settlement Statement</Link>
                      </Button>
                    )}
                    {step.n === 6 && (
                      <Button size="sm" variant="outline" className="mt-2 text-xs" asChild>
                        <Link to={createPageUrl('SaleTasks') + '?saleId=' + sale.id}>Open Tasks</Link>
                      </Button>
                    )}
                    {step.n === 7 && !transitionComplete && (
                      <Button size="sm" variant="outline" className="mt-2 text-xs" asChild>
                        <Link to={'/TransitionCompletion?saleId=' + sale.id}>Open Transition Completion</Link>
                      </Button>
                    )}
                    {step.n === 8 && (
                      <div className="mt-3 space-y-2 border border-slate-200 rounded-md p-2.5">
                        <select
                          className="text-xs border rounded p-1.5 w-full sm:w-auto"
                          value={accessDraft.status}
                          onChange={e => setAccessDraft(d => ({ ...d, status: e.target.value }))}
                        >
                          <option value="">Choose status…</option>
                          {ACCESS_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <Textarea
                          rows={2}
                          className="text-xs"
                          placeholder="What was returned/transferred, to whom — never codes or credentials"
                          value={accessDraft.note}
                          onChange={e => setAccessDraft(d => ({ ...d, note: e.target.value }))}
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={saveAccess} disabled={accessBusy}>
                          {accessBusy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save access closeout
                        </Button>
                        <p className="text-[10px] text-slate-400">Human confirmation only — the system never claims a device was physically returned.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 pt-0.5"><StepIcon state={step.state} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Closing file index (Chapter 23 P1) */}
      <ClosingFileCard sale={sale} deal={deal} econ={econ} readiness={finReady} accessCloseout={sale.access_closeout} />

      {/* Internal sale economics (company money only; never client-facing) */}
      <SaleEconomicsPanel
        sale={sale}
        items={items}
        expenses={expenses}
        deal={deal}
        laborEntries={laborEntries}
        financialDecisions={financialDecisions}
      />

      {/* Chapter 5 P1 — "Would you want ten more?" owner reflection (canonical home: SaleRecap) */}
      <TenMoreReflection sale={sale} />

      {/* Chapter 23 P1 — five-minute review + near miss (canonical home: SaleRecap / SaleIssue) */}
      <PostSaleReviewCard sale={sale} />

      {/* Chapter 24 P0-2A — recap review & publication gate (draft → human approval → public) */}
      <RecapPublishCard sale={sale} />

      {/* Project close */}
      <Card className={blockers.length ? 'border-red-300' : 'border-green-300'}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Project Close</h3>
            <p className="text-sm text-slate-600">
              {sale.status === 'completed' ? 'This project is already completed.'
                : blockers.length ? 'Resolve the blockers above before closing this project.'
                : 'Financially complete + transition complete + access closed — ready for human project close.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to={'/TransitionCompletion?saleId=' + sale.id}>
              <Button variant="outline"><ListChecks className="w-4 h-4 mr-2" />Transition Completion</Button>
            </Link>
            <Button
              disabled={blockers.length > 0 || sale.status === 'completed'}
              onClick={() => setShowCloseConfirm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <ListChecks className="w-4 h-4 mr-2" />Mark Project Complete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mark this project complete?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            This sets the existing EstateSale status to <strong>completed</strong> (the same lifecycle state used by the platform's auto-completion). A private recap <strong>draft</strong> is generated for your review — publishing it is your explicit approval, and private financial figures are never published.
          </p>
          {warnings.length > 0 && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5 mt-2">
              <p className="font-medium">Closing with {warnings.length} warning(s):</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>Cancel</Button>
            <Button onClick={completeProject} disabled={closing} className="bg-green-600 hover:bg-green-700">
              {closing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Complete Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {releaseItem && (
        <ReleasePickupDialog item={releaseItem} open={!!releaseItem}
          onClose={() => setReleaseItem(null)} onChanged={() => loadData()} />
      )}
    </div>
  );
}