import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign, FileText, CheckCircle, Clock, Package, TrendingUp, ReceiptText,
  Plus, Printer, ArrowLeft, AlertCircle, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { companyFee, authorizedServiceCharges, serviceChargesTotal, authorizedReimbursables, money } from '@/components/saleops/saleEconomicsModel';
import AuthorizeExpenseDialog from '@/components/expenses/AuthorizeExpenseDialog';

const PHASE_COLORS = {
  pre_sale: 'bg-blue-100 text-blue-700',
  during_sale: 'bg-green-100 text-green-700',
  post_sale: 'bg-purple-100 text-purple-700',
};
const PHASE_LABELS = { pre_sale: 'Pre-Sale', during_sale: 'During Sale', post_sale: 'Post-Sale' };

export default function SettlementStatement() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('dealId');
  const saleId = urlParams.get('saleId');

  const [user, setUser] = useState(null);
  const [deal, setDeal] = useState(null);
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [financialDecisions, setFinancialDecisions] = useState([]);
  // Chapter 6 P2 — sale expenses + the reimbursable expense being authorized right now
  const [expenses, setExpenses] = useState([]);
  const [authExpense, setAuthExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState(dealId || '');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showItemsExpanded, setShowItemsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [newPayout, setNewPayout] = useState({ amount: '', paid_date: format(new Date(), 'yyyy-MM-dd'), method: 'check', notes: '' });
  const [savingPayout, setSavingPayout] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedDealId) loadDealData(selectedDealId);
  }, [selectedDealId]);

  const loadInitial = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const allDeals = await base44.entities.SaleConversionPipeline.filter({ operator_id: me.id });
      setDeals(allDeals || []);
      if (selectedDealId) await loadDealData(selectedDealId);
    } catch (e) {
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadDealData = async (dId) => {
    setLoading(true);
    try {
      const dealList = await base44.entities.SaleConversionPipeline.filter({ id: dId });
      const d = dealList[0];
      if (!d) return;
      setDeal(d);

      let linkedSale = null;
      if (d.estate_sale_id) {
        const sales = await base44.entities.EstateSale.filter({ id: d.estate_sale_id });
        linkedSale = sales[0] || null;
      }
      setSale(linkedSale);

      // Load sold items for this sale
      const filterObj = d.estate_sale_id ? { estate_sale_id: d.estate_sale_id, status: 'sold' } : {};
      const soldItems = d.estate_sale_id
        ? await base44.entities.Item.filter({ estate_sale_id: d.estate_sale_id, status: 'sold' })
        : [];
      setItems(soldItems || []);

      // Chapter 4 P1 — client-authorized additional service charges for this sale
      let charges = [];
      if (d.estate_sale_id) {
        try {
          const decRes = await base44.entities.SaleClientDecision.filter({ sale_id: d.estate_sale_id });
          charges = (decRes || []).filter(x => x.decision_type === 'financial');
        } catch (e) { console.error('Service charge load failed', e); }
      }
      setFinancialDecisions(charges);

      // Chapter 6 P2 — sale expenses for the client-reimbursable settlement lines
      let saleExpenses = [];
      if (d.estate_sale_id) {
        try {
          const expRes = await base44.entities.Expense.filter({ sale_id: d.estate_sale_id });
          saleExpenses = Array.isArray(expRes) ? expRes : (expRes?.items || []);
        } catch (e) { console.error('Expense load failed', e); }
      }
      setExpenses(saleExpenses);
    } catch (e) {
      toast.error('Error loading deal');
    } finally {
      setLoading(false);
    }
  };

  // Chapter 4 P1 — canonical settlement math: gross ≠ company revenue; fee = MAX(commission, minimum);
  // company revenue adds ONLY client-authorized service charges; client proceeds = gross − company revenue.
  const commissionRate = deal?.commission_rate || 35;
  const totalRevenue = items.reduce((s, i) => s + (i.sold_price || i.price || 0), 0);
  const fee = companyFee({ gross: totalRevenue, commissionRate, minimumFee: deal?.minimum_fee });
  const commissionAmount = fee.commission;
  const companyFeeApplied = fee.applied;
  const serviceCharges = authorizedServiceCharges(financialDecisions);
  const chargesTotal = serviceChargesTotal(financialDecisions);
  // Chapter 6 P2 — a reimbursable expense reduces client proceeds ONLY when the client
  // authorized it (SaleClientDecision with related_expense_id). Unauthorized ones
  // never reduce proceeds; they surface below as AUTHORIZATION NEEDED.
  const reimbursables = authorizedReimbursables(expenses, financialDecisions);
  const reimbursableTotal = reimbursables.total;
  const unauthorizedReimbursables = reimbursables.unauthorized;
  const companyRevenue = companyFeeApplied + chargesTotal;
  const netDueToClient = totalRevenue - companyRevenue - reimbursableTotal;
  const totalPaid = deal?.total_paid_to_client || 0;
  const remainingBalance = netDueToClient - totalPaid;

  const preSaleRevenue = items.filter(i => i.sale_phase === 'pre_sale').reduce((s, i) => s + (i.sold_price || i.price || 0), 0);
  const duringSaleRevenue = items.filter(i => i.sale_phase === 'during_sale' || !i.sale_phase).reduce((s, i) => s + (i.sold_price || i.price || 0), 0);
  const postSaleRevenue = items.filter(i => i.sale_phase === 'post_sale').reduce((s, i) => s + (i.sold_price || i.price || 0), 0);

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || item.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = phaseFilter === 'all' || (item.sale_phase || 'during_sale') === phaseFilter;
    return matchesSearch && matchesPhase;
  });

  const handleAddPayout = async () => {
    if (!newPayout.amount || isNaN(parseFloat(newPayout.amount))) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingPayout(true);
    try {
      const amount = parseFloat(newPayout.amount);
      const payoutRecord = {
        payout_id: `PAY-${Date.now()}`,
        amount,
        paid_date: newPayout.paid_date,
        method: newPayout.method,
        notes: newPayout.notes,
        statement_generated: false,
      };
      const existing = deal.payout_records || [];
      const newTotal = (deal.total_paid_to_client || 0) + amount;
      await base44.entities.SaleConversionPipeline.update(deal.id, {
        payout_records: [...existing, payoutRecord],
        total_paid_to_client: newTotal,
      });
      toast.success(`Payout of $${amount.toLocaleString()} recorded`);
      setShowPayoutModal(false);
      setNewPayout({ amount: '', paid_date: format(new Date(), 'yyyy-MM-dd'), method: 'check', notes: '' });
      await loadDealData(deal.id);
    } catch (e) {
      toast.error('Error recording payout');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleFinalizeSettlement = async () => {
    if (!confirm('Mark this settlement as finalized? This cannot be undone.')) return;
    await base44.entities.SaleConversionPipeline.update(deal.id, {
      settlement_finalized: true,
      settlement_finalized_date: format(new Date(), 'yyyy-MM-dd'),
      stage: 'completed',
      actual_revenue: totalRevenue,
    });
    // Chapter 4 P1 — SINGLE canonical writer: persist finalized sale financial truth.
    // actual_revenue = canonical gross merchandise sales; commission_earned = company revenue
    // (fee applied + authorized service charges). Nothing else writes these fields.
    const saleId = sale?.id || deal.estate_sale_id;
    if (saleId) {
      try {
        await base44.entities.EstateSale.update(saleId, {
          actual_revenue: totalRevenue,
          commission_earned: companyRevenue,
        });
      } catch (e) {
        console.error('Canonical revenue persistence failed', e);
        toast.error('Settlement finalized, but recording the sale financials failed — reopen and re-finalize to retry.');
      }
    }
    toast.success('Settlement finalized');
    await loadDealData(deal.id);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/SaleConversionPipeline">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-600" /> Settlement Statement
              </h1>
              <p className="text-sm text-slate-500">Financial reconciliation & client payout tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {deal && !deal.settlement_finalized && (
              <Button onClick={() => setShowPayoutModal(true)} className="bg-green-600 hover:bg-green-700 gap-2">
                <Plus className="w-4 h-4" /> Record Payout
              </Button>
            )}
            {deal && (
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" /> Print / PDF
              </Button>
            )}
            {deal && !deal.settlement_finalized && remainingBalance <= 0 && (
              <Button onClick={handleFinalizeSettlement} className="bg-slate-800 hover:bg-slate-900 gap-2">
                <CheckCircle className="w-4 h-4" /> Finalize Settlement
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Deal selector */}
        <Card className="print:hidden">
          <CardContent className="p-4">
            <Label className="mb-2 block text-sm font-semibold">Select a Deal</Label>
            <Select value={selectedDealId} onValueChange={setSelectedDealId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a pipeline deal..." />
              </SelectTrigger>
              <SelectContent>
                {deals.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.client_name} — {d.property_city}, {d.property_state} ({d.stage?.replace(/_/g, ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!deal && (
          <div className="text-center py-20 text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Select a deal above to view its settlement statement.</p>
          </div>
        )}

        {deal && (
          <div ref={printRef} className="space-y-6">
            {/* Print Header */}
            <div className="hidden print:block text-center mb-8">
              <h1 className="text-3xl font-bold">Estate Sale Settlement Statement</h1>
              <p className="text-slate-600 mt-1">Generated: {format(new Date(), 'MMMM d, yyyy')}</p>
            </div>

            {/* Client & Deal Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Deal Summary</CardTitle>
                  <div className="flex gap-2">
                    {deal.settlement_finalized && (
                      <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle className="w-3 h-3" /> Settlement Finalized</Badge>
                    )}
                    {deal.pre_sale_selling_enabled && <Badge className="bg-blue-100 text-blue-700">Pre-Sale Enabled</Badge>}
                    {deal.post_sale_selling_enabled && <Badge className="bg-purple-100 text-purple-700">Post-Sale Enabled</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-slate-500">Client</p><p className="font-semibold">{deal.client_name}</p></div>
                  <div><p className="text-slate-500">Property</p><p className="font-semibold">{deal.property_city}, {deal.property_state}</p></div>
                  <div><p className="text-slate-500">Commission Rate</p><p className="font-semibold text-orange-600">{commissionRate}%</p></div>
                  <div><p className="text-slate-500">Sale Stage</p><p className="font-semibold capitalize">{deal.stage?.replace(/_/g, ' ')}</p></div>
                  {deal.contract_signed_date && <div><p className="text-slate-500">Contract Signed</p><p className="font-semibold">{deal.contract_signed_date}</p></div>}
                  {deal.estimated_sale_start_date && <div><p className="text-slate-500">Sale Dates</p><p className="font-semibold">{deal.estimated_sale_start_date} – {deal.estimated_sale_end_date || '...'}</p></div>}
                  {deal.client_email && <div><p className="text-slate-500">Client Email</p><p className="font-semibold">{deal.client_email}</p></div>}
                  {deal.client_phone && <div><p className="text-slate-500">Client Phone</p><p className="font-semibold">{deal.client_phone}</p></div>}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-2 border-slate-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500 mt-1">Gross Revenue</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-orange-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-orange-600">${companyFeeApplied.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500 mt-1">Company Fee {fee.minimumApplied ? '(Contract Minimum)' : `(${commissionRate}%)`}</p>
                </CardContent>
              </Card>
              {chargesTotal > 0 && (
                <Card className="border-2 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-600">${chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500 mt-1">Authorized Additional Services</p>
                  </CardContent>
                </Card>
              )}
              {reimbursableTotal > 0 && (
                <Card className="border-2 border-cyan-200">
                  <CardContent className="p-4 text-center">
                    <ReceiptText className="w-6 h-6 text-cyan-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-cyan-700">${reimbursableTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500 mt-1">Authorized Reimbursable Expenses</p>
                  </CardContent>
                </Card>
              )}
              <Card className="border-2 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600">${netDueToClient.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500 mt-1">Net Due to Client</p>
                </CardContent>
              </Card>
              <Card className={`border-2 ${remainingBalance > 0 ? 'border-red-200' : 'border-green-200'}`}>
                <CardContent className="p-4 text-center">
                  <Clock className={`w-6 h-6 mx-auto mb-1 ${remainingBalance > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  <p className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${Math.abs(remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{remainingBalance > 0 ? 'Balance Remaining' : 'Fully Paid'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chapter 4 P1 — minimum fee explanation (never hide the adjustment) */}
            {fee.minimum > 0 && (
              <Card className={fee.minimumApplied ? 'border-amber-300 bg-amber-50' : ''}>
                <CardHeader className="pb-2"><CardTitle className="text-base">Company Fee</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Gross merchandise sales</span><span className="font-semibold">{money(totalRevenue)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Commission at {commissionRate}%</span><span>{money(commissionAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Contract minimum fee</span><span>{money(fee.minimum)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold text-slate-700">Company fee applied</span><span className="font-semibold">{money(companyFeeApplied)}</span></div>
                  {fee.minimumApplied && (
                    <p className="text-xs text-amber-700 pt-1">
                      Your agreement includes a minimum company fee of {money(fee.minimum)}. Because the calculated commission ({money(commissionAmount)}) is lower, the contract minimum of {money(fee.minimum)} applies.
                    </p>
                  )}
                  {!fee.minimumApplied && (
                    <p className="text-xs text-slate-500 pt-1">The calculated commission exceeds the contract minimum, so the standard commission applies.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chapter 4 P1 — client-authorized additional service charges (distinct from merchandise gross) */}
            {serviceCharges.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Authorized Additional Services</span>
                    <span className="text-sm font-semibold text-purple-600">Total: ${chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {serviceCharges.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-purple-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-800">{c.subject}</p>
                        <p className="text-xs text-slate-500">
                          Authorized by {c.authorized_by_name || 'client'}{c.decided_at ? ` · ${format(new Date(c.decided_at), 'MMM d, yyyy')}` : ''}
                        </p>
                      </div>
                      <p className="font-semibold text-purple-700">{money(c.charge_amount)}</p>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">
                    These client-authorized services are billed in addition to the merchandise commission. Net due to client = gross merchandise sales − company fee − authorized services.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Chapter 6 P2 — client-authorized reimbursable expenses: separate financial */}
            {/* truth (company cost ≠ service charge ≠ reimbursable) shown as its own line */}
            {reimbursables.authorized.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Client-Authorized Reimbursable Expenses</span>
                    <span className="text-sm font-semibold text-cyan-700">Total: {money(reimbursableTotal)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reimbursables.authorized.map(({ expense, decision }) => (
                    <div key={expense.id} className="flex items-center justify-between bg-cyan-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-800">{expense.description || expense.vendor || 'Sale expense'}</p>
                        <p className="text-xs text-slate-500">
                          {expense.date ? `Dated ${expense.date} · ` : ''}Authorized by {decision.authorized_by_name || 'client'}
                          {decision.decided_at ? ` · ${format(new Date(decision.decided_at), 'MMM d, yyyy')}` : ''}
                          {expense.receipt_url ? ' · receipt on file' : ''}
                        </p>
                      </div>
                      <p className="font-semibold text-cyan-700">-{money(expense.amount)}</p>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">
                    These are costs the client authorized you to bill back. Net due to client = gross merchandise sales
                    − company fee − authorized services − authorized reimbursable expenses. Company-only costs never appear here.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Chapter 6 P2 — reimbursable expenses without client authorization NEVER */}
            {/* reduce client proceeds; they surface as AUTHORIZATION NEEDED instead. */}
            {unauthorizedReimbursables.length > 0 && (
              <Card className="border-amber-300 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Reimbursable Expenses — Authorization Needed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {unauthorizedReimbursables.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{exp.description || exp.vendor || 'Sale expense'}</p>
                        <p className="text-xs text-slate-500">
                          {money(exp.amount)} · marked client-reimbursable, but no client authorization is recorded —
                          it has NOT reduced the client's proceeds.
                        </p>
                      </div>
                      {sale && (
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8 flex-shrink-0" onClick={() => setAuthExpense(exp)}>
                          Record authorization
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Revenue by Phase */}
            {(deal.pre_sale_selling_enabled || deal.post_sale_selling_enabled) && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Sale Phase</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {deal.pre_sale_selling_enabled && (
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-blue-600 font-bold text-xl">${preSaleRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p className="text-blue-700 text-xs mt-1">Pre-Sale</p>
                        <p className="text-slate-500 text-xs">{items.filter(i => i.sale_phase === 'pre_sale').length} items</p>
                      </div>
                    )}
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-green-600 font-bold text-xl">${duringSaleRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      <p className="text-green-700 text-xs mt-1">During Sale</p>
                      <p className="text-slate-500 text-xs">{items.filter(i => !i.sale_phase || i.sale_phase === 'during_sale').length} items</p>
                    </div>
                    {deal.post_sale_selling_enabled && (
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-purple-600 font-bold text-xl">${postSaleRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p className="text-purple-700 text-xs mt-1">Post-Sale</p>
                        <p className="text-slate-500 text-xs">{items.filter(i => i.sale_phase === 'post_sale').length} items</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payout History */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" /> Payments Made to Client
                  </CardTitle>
                  <span className="text-sm font-semibold text-green-600">Total Paid: ${totalPaid.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </CardHeader>
              <CardContent>
                {(!deal.payout_records || deal.payout_records.length === 0) ? (
                  <div className="text-center py-6 text-slate-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deal.payout_records.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-800">${p.amount?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          <p className="text-xs text-slate-500">{p.paid_date} · {p.method} {p.notes ? `· ${p.notes}` : ''}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Paid</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {remainingBalance > 0 && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700 font-medium">
                      ${remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} still owed to client.
                    </p>
                  </div>
                )}
                {remainingBalance <= 0 && netDueToClient > 0 && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">Client has been fully paid.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sold Items Detail */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowItemsExpanded(v => !v)}>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-600" /> Sold Items ({items.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="print:hidden">
                    {showItemsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showItemsExpanded && (
                <CardContent>
                  <div className="flex gap-3 mb-4 print:hidden flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Phases</SelectItem>
                        <SelectItem value="pre_sale">Pre-Sale</SelectItem>
                        <SelectItem value="during_sale">During Sale</SelectItem>
                        <SelectItem value="post_sale">Post-Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredItems.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No items found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                            <th className="pb-2 pr-4">Item</th>
                            <th className="pb-2 pr-4">Phase</th>
                            <th className="pb-2 pr-4 text-right">List Price</th>
                            <th className="pb-2 pr-4 text-right">Sold Price</th>
                            <th className="pb-2 text-right">Client Share ({100 - commissionRate}%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredItems.map(item => {
                            const soldAmt = item.sold_price || item.price || 0;
                            const clientShare = soldAmt * ((100 - commissionRate) / 100);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="py-2 pr-4 font-medium text-slate-800">{item.title}</td>
                                <td className="py-2 pr-4">
                                  <Badge className={`text-xs ${PHASE_COLORS[item.sale_phase || 'during_sale']}`}>
                                    {PHASE_LABELS[item.sale_phase || 'during_sale']}
                                  </Badge>
                                </td>
                                <td className="py-2 pr-4 text-right text-slate-500">${(item.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="py-2 pr-4 text-right font-semibold text-green-700">${soldAmt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="py-2 text-right text-slate-700">${clientShare.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-300 font-bold">
                            <td colSpan={3} className="pt-3 pr-4">Totals ({filteredItems.length} items)</td>
                            <td className="pt-3 pr-4 text-right text-green-700">
                              ${filteredItems.reduce((s, i) => s + (i.sold_price || i.price || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            <td className="pt-3 text-right">
                              ${filteredItems.reduce((s, i) => s + (i.sold_price || i.price || 0) * ((100 - commissionRate) / 100), 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                          </tr>
                        </tfoot>
                        </table>
                        {fee.minimumApplied && (
                        <p className="text-xs text-amber-700 mt-2">
                          Per-item client shares are shown at the {commissionRate}% commission rate for reference. Because the contract minimum fee applies, the final amounts due derive from the totals above, not the per-item reference figures.
                        </p>
                        )}
                        </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Print Footer */}
            <div className="hidden print:block mt-8 pt-6 border-t border-slate-300 text-xs text-slate-500 text-center">
              <p>This settlement statement was generated by Legacy Lane OS on {format(new Date(), 'MMMM d, yyyy')}</p>
              <p className="mt-1">Commission Rate: {commissionRate}% · operator: {user?.company_name || user?.full_name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Record Payout Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Client Payout</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Amount Paid ($)</Label>
              <Input type="number" placeholder="0.00" value={newPayout.amount} onChange={e => setNewPayout(p => ({...p, amount: e.target.value}))} className="mt-1" />
              {remainingBalance > 0 && (
                <p className="text-xs text-slate-500 mt-1">Balance remaining: ${remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              )}
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={newPayout.paid_date} onChange={e => setNewPayout(p => ({...p, paid_date: e.target.value}))} className="mt-1" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={newPayout.method} onValueChange={v => setNewPayout(p => ({...p, method: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach_transfer">ACH Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea placeholder="e.g. Check #1042, partial payment..." value={newPayout.notes} onChange={e => setNewPayout(p => ({...p, notes: e.target.value}))} className="mt-1" rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayoutModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleAddPayout} disabled={savingPayout}>
                {savingPayout ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chapter 6 P2 — client authorization for a reimbursable expense */}
      {authExpense && sale && (
        <AuthorizeExpenseDialog
          open={!!authExpense}
          onClose={() => setAuthExpense(null)}
          expense={authExpense}
          sale={sale}
          onAuthorized={() => loadDealData(deal.id)}
        />
      )}
    </div>
  );
}