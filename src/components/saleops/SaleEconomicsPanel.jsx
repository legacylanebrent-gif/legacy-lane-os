import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, AlertTriangle, Clock, Info } from 'lucide-react';
import { actualSaleEconomics, projectedDealEconomics, money, variance } from './saleEconomicsModel';
import { fmtDate } from './saleDecisionModel';

// Chapter 4 P1 — INTERNAL sale economics for the closeout surface.
// Company money only. NEVER rendered on the client settlement statement:
// no internal labor cost, no owner time, no acceptance score, no margins.

const asNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);
const signedMoney = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${money(Math.abs(n))}`;

function Line({ label, value, strong, muted, hint }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      <span className={muted ? 'text-slate-500' : ''}>{label}{hint && <span className="block text-[10px] text-slate-400">{hint}</span>}</span>
      <span className={strong ? 'text-base' : ''}>{value}</span>
    </div>
  );
}

export default function SaleEconomicsPanel({ sale, items, expenses, deal, laborEntries, financialDecisions }) {
  const econ = actualSaleEconomics({
    items,
    deal,
    financialDecisions,
    expenses,
    laborEntries,
  });
  const projected = deal ? projectedDealEconomics(deal) : null;
  const hasProjection = !!(deal && (asNum(deal.estimated_value) || (deal.labor_estimates || []).length || asNum(deal.estimated_advertising)));

  const rows = [
    { label: 'Gross merchandise sales', p: asNum(deal?.estimated_value), a: econ.gross, kind: 'money' },
    { label: 'Company revenue (fee + authorized services)', p: projected ? projected.companyRevenue : null, a: econ.companyRevenue, kind: 'money' },
    { label: 'Labor hours', p: projected ? projected.estHours : null, a: econ.totalHours, kind: 'hours' },
    { label: 'Cash labor cost', p: projected ? projected.estLaborCost : null, a: econ.cashHoursLabor, kind: 'money' },
    { label: 'Advertising', p: asNum(deal?.estimated_advertising), a: econ.expenses.advertising, kind: 'money' },
    { label: 'Supplies', p: asNum(deal?.estimated_supplies), a: econ.expenses.supplies, kind: 'money' },
    { label: 'Travel / transportation', p: asNum(deal?.estimated_transportation), a: econ.expenses.transportation, kind: 'money' },
    { label: 'Processing fees', p: asNum(deal?.estimated_processing), a: econ.expenses.processing, kind: 'money' },
    { label: 'Other direct costs', p: asNum(deal?.estimated_other_costs), a: econ.expenses.other, kind: 'money' },
    { label: 'Sale contribution', p: projected ? projected.contribution : null, a: econ.contribution, kind: 'money' },
  ];
  const fmt = (v, kind) => {
    if (v == null) return '—';
    return kind === 'hours' ? `${(Number(v) || 0).toFixed(1)} hrs` : money(v);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-cyan-600" /> Internal Sale Economics
        </h2>
        <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">Company money — never shown to the client</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Company revenue side */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Company Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Gross merchandise sales" value={money(econ.gross)} />
            <Line label={`Commission at ${deal?.commission_rate ?? 35}%`} value={money(econ.fee.commission)} muted />
            {econ.fee.minimum > 0 && (
              <Line label="Contractual minimum fee" value={money(econ.fee.minimum)} muted />
            )}
            {econ.fee.minimumApplied && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Contract minimum applies: {money(econ.fee.minimum)} exceeds the calculated commission of {money(econ.fee.commission)}.</span>
              </div>
            )}
            <Line label="Company fee applied" value={money(econ.fee.applied)} />
            {econ.charges.length > 0 && (
              <div className="pt-1 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Authorized additional services</p>
                {econ.charges.map(c => (
                  <Line key={c.id} label={`${c.subject}${c.authorized_by_name ? ` · authorized by ${c.authorized_by_name}` : ''}${c.decided_at ? ` · ${fmtDate(c.decided_at)}` : ''}`} value={money(c.charge_amount)} muted />
                ))}
              </div>
            )}
            {econ.serviceRevenue > 0 && <Line label="Service revenue (authorized)" value={money(econ.serviceRevenue)} muted />}
            <div className="border-t border-slate-200 pt-2">
              <Line label="Company revenue" value={money(econ.companyRevenue)} strong />
            </div>
            <Line label="Net due to client" value={money(econ.netDueToClient)} muted />
            {deal && (
              <Link to={`/SettlementStatement?dealId=${deal.id}`} className="text-xs text-cyan-700 underline inline-block pt-1">
                Open client settlement statement →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Cost side */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Direct Sale Costs</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Cash labor — known cost (hours × rate)" value={money(econ.cashHoursLabor)} hint={econ.totalHours > 0 ? `${econ.totalHours.toFixed(1)} hours recorded` : 'no labor hours recorded'} muted />
            {econ.laborIncomplete && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>INCOMPLETE LABOR COST</strong> — {econ.laborUnknownHours.toFixed(1)} hour(s) have no recorded rate.
                  Their labor cost is <strong>UNKNOWN, not $0</strong>. Labor totals and contribution below are built from KNOWN
                  components only and are <strong>PARTIAL</strong>. Record the missing rate(s) to complete project economics.
                </span>
              </div>
            )}
            {econ.wageDedupeApplied ? (
              <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Wage expense lines of {money(econ.wageExpenseExcluded)} are <strong>EXCLUDED from direct costs</strong> — recorded
                  labor hours already carry {money(econ.laborCostKnown)} of known wage cost, and the same wage cost may not enter
                  economics twice. The expense records are preserved; only their economic effect is deduplicated.
                </span>
              </div>
            ) : (econ.laborWages > 0 && <Line label="Wage expense lines (no hours tracked)" value={money(econ.laborWages)} muted />)}
            <Line label="Advertising" value={money(econ.expenses.advertising)} muted />
            <Line label="Supplies / materials" value={money(econ.expenses.supplies)} muted />
            <Line label="Travel / transportation" value={money(econ.expenses.transportation)} muted />
            <Line label="Processing fees" value={money(econ.expenses.processing)} muted />
            <Line label="Other direct costs" value={money(econ.expenses.other)} muted />
            <div className="border-t border-slate-200 pt-2">
              <Line label="Cash labor cost total" value={money(econ.cashLaborTotal)} />
              <Line label="Direct costs total" value={money(econ.directCosts)} strong />
            </div>
            <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-md p-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Owner time: <strong>{econ.ownerHours.toFixed(1)} hours</strong> — an economic resource, never included in cash cost or contribution.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contribution */}
      <Card className={econ.contribution >= 0 ? 'border-green-200' : 'border-red-200'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Actual sale contribution{econ.contributionIncomplete ? ' — INCOMPLETE (partial, from known components)' : ''}
              </p>
              <p className={`text-3xl font-bold ${econ.contribution >= 0 ? 'text-green-700' : 'text-red-600'} ${econ.contributionIncomplete ? 'opacity-70' : ''}`}>
                {money(econ.contribution)}{econ.contributionIncomplete ? ' +' : ''}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Company revenue − direct costs. This is <strong>not</strong> net company profit: overhead and owner time are deliberately excluded.
                {econ.contributionIncomplete && <> Labor cost for <strong>{econ.laborUnknownHours.toFixed(1)} hour(s)</strong> is <strong>UNKNOWN</strong> — this figure is <strong>PARTIAL</strong> and complete contribution cannot be determined until the missing rate(s) are recorded.</>}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2 max-w-xs">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Finalizing the settlement records this sale's canonical actual revenue and company revenue.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chapter 23 P1 — project economics metrics (unknown stays unknown, never 0-as-fact) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Margin (contribution / company revenue)', econ.margin != null ? `${(econ.margin * 100).toFixed(1)}%${econ.contributionIncomplete ? ' · partial' : ''}` : '—'],
          ['Revenue / labor hour', econ.revenuePerLaborHour != null ? money(econ.revenuePerLaborHour) : '— (no hours recorded)'],
          ['Contribution / labor hour', econ.contributionPerLaborHour != null ? `${money(econ.contributionPerLaborHour)}${econ.contributionIncomplete ? ' · partial' : ''}` : '— (no hours recorded)'],
          ['Owner share of labor', econ.ownerSharePct != null ? `${Math.round(econ.ownerSharePct * 100)}%` : '—'],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-sm font-semibold text-slate-900">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Owner time ({econ.ownerHours.toFixed(1)} hrs) is a real economic input and is never silently converted into payroll expense. Where apparent contribution depends heavily on unpaid owner time, that dependence is visible here — not hidden.
      </p>

      {/* Projected vs actual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" /> Projected vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasProjection ? (
            <p className="text-sm text-slate-500">
              No pre-sale estimates recorded on the linked pipeline deal yet — add them on the deal's Economics tab to compare projections against what actually happened.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 pr-3">Line</th>
                    <th className="pb-2 pr-3 text-right">Projected</th>
                    <th className="pb-2 pr-3 text-right">Actual</th>
                    <th className="pb-2 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r => {
                    const v = r.p == null ? null : variance(r.p, r.a);
                    return (
                      <tr key={r.label}>
                        <td className="py-1.5 pr-3 text-slate-700">{r.label}</td>
                        <td className="py-1.5 pr-3 text-right text-slate-500">{fmt(r.p, r.kind)}</td>
                        <td className="py-1.5 pr-3 text-right font-medium text-slate-800">{fmt(r.a, r.kind)}</td>
                        <td className={`py-1.5 text-right ${v == null ? 'text-slate-300' : v >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {v == null ? '—' : (r.kind === 'hours' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)} hrs` : signedMoney(v))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-2">
                Estimates are pre-sale projections from the opportunity record; actuals come from sold inventory, labor entries and sale-scoped expenses.
              </p>
              {(econ.laborIncomplete || (projected && projected.estLaborCostIncomplete)) && (
                <p className="text-xs text-amber-700 mt-1">
                  Labor cost is INCOMPLETE — {[
                    projected && projected.estLaborCostIncomplete ? `${projected.estLaborUnknownHours.toFixed(1)} projected hour(s) without a rate` : null,
                    econ.laborIncomplete ? `${econ.laborUnknownHours.toFixed(1)} actual hour(s) without a rate` : null,
                  ].filter(Boolean).join(', ')}. Hours without a rate have UNKNOWN cost (never $0); labor and contribution figures above are PARTIAL.
                </p>
              )}
              {econ.charges.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Scope-change context: {econ.charges.length} client-authorized additional service decision(s) totaling {money(econ.serviceRevenue)} were recorded on this project — variance may reflect authorized added scope, not an estimating miss.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}