import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Calculator, CalendarDays, Users, Info, TriangleAlert } from 'lucide-react';
import { LABOR_CATEGORIES, projectedDealEconomics, money } from './saleEconomicsModel';
import { calendarOverlap, advisoryInputs, conservativeScenario, acceptanceReview } from './acceptanceReviewModel';

// Chapter 4 P1 — Pre-Sale Economics Calculator + Sale Acceptance Scorecard.
// Deterministic calculation only. Scenario and comparison modeling are local (never persisted;
// signed contract terms and actual records are never overwritten by analysis).
// Advisory: the operator makes the accept/reject decision. The score is not a guarantee.

const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);

function Field({ label, value, onChange, prefix, hint }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <Input type="number" step="0.01" min="0" className={prefix ? 'pl-6' : ''} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder="0" />
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function ResultRow({ label, value, strong, tone, hint }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      <span>{label}{hint && <span className="block text-[10px] text-slate-400">{hint}</span>}</span>
      <span className={tone || ''}>{value}</span>
    </div>
  );
}

const normLabor = (rows) => (Array.isArray(rows) ? rows : []).map(r => ({ category: r.category, hours: r.hours ?? '', rate: r.rate ?? '', is_owner_time: !!r.is_owner_time }));

export default function DealEconomicsPanel({ deal, onPersist, allDeals, linkedSale }) {
  const [saving, setSaving] = useState(false);
  const [inputs, setInputs] = useState({
    estimated_value: deal?.estimated_value ?? '',
    estimated_value_low: deal?.estimated_value_low ?? '',
    estimated_value_high: deal?.estimated_value_high ?? '',
    commission_rate: deal?.commission_rate ?? 35,
    minimum_fee: deal?.minimum_fee ?? '',
    expected_service_revenue: deal?.expected_service_revenue ?? '',
    estimated_advertising: deal?.estimated_advertising ?? '',
    estimated_supplies: deal?.estimated_supplies ?? '',
    estimated_transportation: deal?.estimated_transportation ?? '',
    estimated_processing: deal?.estimated_processing ?? '',
    estimated_other_costs: deal?.estimated_other_costs ?? '',
    min_company_revenue_threshold: deal?.min_company_revenue_threshold ?? '',
    min_contribution_threshold: deal?.min_contribution_threshold ?? '',
  });
  const [laborRows, setLaborRows] = useState(() => {
    const rows = normLabor(deal?.labor_estimates);
    return rows.length ? rows : [{ category: 'preparation', hours: '', rate: '' }];
  });

  // Scenario modeling — LOCAL ONLY, never written back.
  const [scenario, setScenario] = useState({ grossPct: -20, extraHours: 16, extraRate: '', extraAdvertising: 250, extraSupplies: 0, extraOther: 0 });
  // Commission comparison — LOCAL ONLY, never touches the executed agreement.
  const [comparison, setComparison] = useState({ rate: '', minimum_fee: '' });

  const draftDeal = useMemo(() => ({ ...deal, ...inputs, labor_estimates: laborRows }), [deal, inputs, laborRows]);
  const base = useMemo(() => projectedDealEconomics(draftDeal), [draftDeal]);

  // Conservative scenario: lower gross, extra hours, higher costs (canonical shared engine).
  const scenarioResult = useMemo(() => conservativeScenario(draftDeal, base, scenario), [base, scenario, draftDeal]);

  const comparisonResult = useMemo(() => {
    const rate = toNum(comparison.rate) ?? base.rate;
    const minFee = toNum(comparison.minimum_fee) ?? base.minimumFee;
    return projectedDealEconomics(draftDeal, { commissionRate: rate, minimumFee: minFee });
  }, [base, comparison, draftDeal]);

  // Calendar overlap with other active deals (canonical shared engine).
  const overlap = useMemo(() => calendarOverlap(deal, allDeals), [deal, allDeals]);

  // Chapter 5 P1 — advisory inputs: client fit (deal), distance (deal snapshot or
  // the linked sale's snapshot), site complexity (canonical EstateSale site assessment).
  // These NEVER change the deterministic financial rating; they add explainable reasons.
  const advisory = useMemo(() => advisoryInputs(deal, linkedSale), [deal, linkedSale]);

  // Acceptance scorecard — deterministic, advisory only (canonical shared engine).
  const scorecard = useMemo(() => acceptanceReview({ base, scenarioResult, overlap, advisory }), [base, scenarioResult, overlap, advisory]);

  const save = async () => {
    setSaving(true);
    try {
      await onPersist({
        estimated_value: toNum(inputs.estimated_value),
        estimated_value_low: toNum(inputs.estimated_value_low) || null,
        estimated_value_high: toNum(inputs.estimated_value_high) || null,
        commission_rate: toNum(inputs.commission_rate) ?? 35,
        minimum_fee: toNum(inputs.minimum_fee),
        expected_service_revenue: toNum(inputs.expected_service_revenue),
        estimated_advertising: toNum(inputs.estimated_advertising),
        estimated_supplies: toNum(inputs.estimated_supplies),
        estimated_transportation: toNum(inputs.estimated_transportation),
        estimated_processing: toNum(inputs.estimated_processing),
        estimated_other_costs: toNum(inputs.estimated_other_costs),
        min_company_revenue_threshold: toNum(inputs.min_company_revenue_threshold),
        min_contribution_threshold: toNum(inputs.min_contribution_threshold),
        labor_estimates: laborRows
          .filter(r => Number(r.hours) > 0)
          .map(r => ({ category: r.category, hours: Number(r.hours) || 0, rate: Number(r.rate) || 0, is_owner_time: !!r.is_owner_time })),
      });
    } catch (e) {
      alert('Could not save economics');
    } finally {
      setSaving(false);
    }
  };

  const ratingTone = {
    'STRONG': 'bg-green-100 text-green-700 border-green-300',
    'ACCEPTABLE': 'bg-cyan-100 text-cyan-700 border-cyan-300',
    'MARGINAL': 'bg-amber-100 text-amber-700 border-amber-300',
    'HIGH RISK': 'bg-red-100 text-red-700 border-red-300',
    'NEEDS INPUTS': 'bg-slate-100 text-slate-600 border-slate-300',
  }[scorecard.rating];

  return (
    <div className="space-y-4">
      {deal?.commercial_terms_accepted_at && (
        <div className="text-xs bg-green-50 border border-green-200 text-green-800 rounded-md p-2">
          Commercial terms ACCEPTED {new Date(deal.commercial_terms_accepted_at).toLocaleDateString()}{deal.commercial_terms_accepted_by ? ` by ${deal.commercial_terms_accepted_by}` : ''} — recorded from an accepted proposal. Changing these fields no longer changes what the client accepted; that history is preserved on the deal.
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Calculator className="w-4 h-4 text-orange-500" /> Pre-Sale Economics</p>
          <p className="text-xs text-slate-500">Evaluate this opportunity before accepting it. Estimates are projections, not accounting profit.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Economics
        </Button>
      </div>

      {/* Contract & revenue inputs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Contract Terms & Projected Revenue</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Field label="Projected gross merchandise sales ($)" value={inputs.estimated_value} onChange={v => setInputs(p => ({ ...p, estimated_value: v }))} prefix="$" hint="Client merchandise proceeds, not company revenue" />
          <Field label="Estimated range — LOW ($)" value={inputs.estimated_value_low} onChange={v => setInputs(p => ({ ...p, estimated_value_low: v }))} prefix="$" hint="Optional client-facing range" />
          <Field label="Estimated range — HIGH ($)" value={inputs.estimated_value_high} onChange={v => setInputs(p => ({ ...p, estimated_value_high: v }))} prefix="$" hint="Operator-supplied only — never invented from a single estimate" />
          <Field label="Commission rate (%)" value={inputs.commission_rate} onChange={v => setInputs(p => ({ ...p, commission_rate: v }))} />
          <Field label="Contract minimum fee ($)" value={inputs.minimum_fee} onChange={v => setInputs(p => ({ ...p, minimum_fee: v }))} prefix="$" hint="Applied as MAX(commission, minimum)" />
          <Field label="Expected additional service revenue ($)" value={inputs.expected_service_revenue} onChange={v => setInputs(p => ({ ...p, expected_service_revenue: v }))} prefix="$" hint="Only client-authorized charges count at settlement" />
        </CardContent>
      </Card>

      {/* Estimated labor */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Estimated Labor (hours × rate by category)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {laborRows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                {i === 0 && <Label className="text-xs">Category</Label>}
                <select
                  value={row.category}
                  onChange={e => setLaborRows(rows => rows.map((r, idx) => idx === i ? { ...r, category: e.target.value } : r))}
                  className="w-full h-9 px-2 rounded-md border border-input bg-white text-sm"
                >
                  {LABOR_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                {i === 0 && <Label className="text-xs">Est. hours</Label>}
                <Input type="number" step="0.5" min="0" value={row.hours} onChange={e => setLaborRows(rows => rows.map((r, idx) => idx === i ? { ...r, hours: e.target.value } : r))} />
              </div>
              <div className="col-span-2">
                {i === 0 && <Label className="text-xs">Est. rate ($/hr)</Label>}
                <Input type="number" step="0.01" min="0" value={row.rate} onChange={e => setLaborRows(rows => rows.map((r, idx) => idx === i ? { ...r, rate: e.target.value } : r))} />
              </div>
              <div className="col-span-2">
                {i === 0 && <Label className="text-xs">Owner time</Label>}
                <label className="flex items-center gap-1.5 h-9 text-xs text-slate-600">
                  <input type="checkbox" checked={!!row.is_owner_time} onChange={e => setLaborRows(rows => rows.map((r, idx) => idx === i ? { ...r, is_owner_time: e.target.checked } : r))} />
                  not cash
                </label>
              </div>
              <div className="col-span-1">
                {i === 0 && <Label className="text-xs">&nbsp;</Label>}
                <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setLaborRows(rows => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows)}>×</Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setLaborRows(rows => [...rows, { category: 'sale_day', hours: '', rate: '', is_owner_time: false }])}>+ Add category</Button>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
            <span>Cash hours: <strong className="text-slate-700">{base.estHours.toFixed(1)}</strong></span>
            {base.estOwnerHours > 0 && <span>Owner time: <strong className="text-slate-700">{base.estOwnerHours.toFixed(1)} hrs</strong> (reported separately — never cash cost)</span>}
            <span>Estimated labor cost: <strong className="text-slate-700">{money(base.estLaborCost)}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Estimated direct costs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Estimated Direct Costs</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Field label="Advertising ($)" value={inputs.estimated_advertising} onChange={v => setInputs(p => ({ ...p, estimated_advertising: v }))} prefix="$" />
          <Field label="Supplies ($)" value={inputs.estimated_supplies} onChange={v => setInputs(p => ({ ...p, estimated_supplies: v }))} prefix="$" />
          <Field label="Transportation ($)" value={inputs.estimated_transportation} onChange={v => setInputs(p => ({ ...p, estimated_transportation: v }))} prefix="$" />
          <Field label="Processing ($)" value={inputs.estimated_processing} onChange={v => setInputs(p => ({ ...p, estimated_processing: v }))} prefix="$" />
          <Field label="Other direct costs ($)" value={inputs.estimated_other_costs} onChange={v => setInputs(p => ({ ...p, estimated_other_costs: v }))} prefix="$" />
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-cyan-200 bg-cyan-50/40">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Projected Result</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          <ResultRow label={`Commission at ${base.rate}%`} value={money(base.fee.commission)} />
          {base.minimumFee > 0 && <ResultRow label="Contract minimum fee" value={money(base.minimumFee)} />}
          {base.fee.minimumApplied && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Minimum applies: {money(base.minimumFee)} exceeds calculated commission of {money(base.fee.commission)}.</span>
            </div>
          )}
          <ResultRow label="Projected company revenue" value={money(base.companyRevenue)} strong hint="Fee applied + expected authorized services" />
          <ResultRow label="Projected cash labor cost" value={money(base.estLaborCost)} />
          {base.estOwnerHours > 0 && <ResultRow label="Projected owner time" value={`${base.estOwnerHours.toFixed(1)} hrs (not cash)`} />}
          <ResultRow label="Projected direct cost" value={money(base.directCosts)} />
          <div className="border-t border-cyan-200 pt-1.5">
            <ResultRow label="Projected sale contribution" value={money(base.contribution)} strong tone={base.contribution >= 0 ? 'text-green-700' : 'text-red-600'} hint="Company revenue − direct costs. Not accounting net profit (no overhead, no owner time)." />
          </div>
        </CardContent>
      </Card>

      {/* Minimum revenue test */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Minimum Revenue Test (your threshold, not the client contract minimum)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Minimum acceptable company revenue ($)" value={inputs.min_company_revenue_threshold} onChange={v => setInputs(p => ({ ...p, min_company_revenue_threshold: v }))} prefix="$" />
          <Field label="Minimum acceptable contribution ($)" value={inputs.min_contribution_threshold} onChange={v => setInputs(p => ({ ...p, min_contribution_threshold: v }))} prefix="$" />
          <div className="sm:col-span-2 flex flex-wrap gap-2 text-xs">
            {base.minRevenueTest == null ? (
              <Badge variant="outline">Revenue threshold not set</Badge>
            ) : (
              <Badge className={base.minRevenueTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                Company revenue {base.minRevenueTest ? 'meets' : 'is below'} threshold
              </Badge>
            )}
            {base.minContributionTest == null ? (
              <Badge variant="outline">Contribution threshold not set</Badge>
            ) : (
              <Badge className={base.minContributionTest ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                Contribution {base.minContributionTest ? 'meets' : 'is below'} threshold
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenario modeling */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Conservative Scenario (analysis only — never changes the deal or saved estimates)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Sales change (%)" value={scenario.grossPct} onChange={v => setScenario(p => ({ ...p, grossPct: v }))} hint="-20 means 20% lower gross" />
            <Field label="Additional labor hours" value={scenario.extraHours} onChange={v => setScenario(p => ({ ...p, extraHours: v }))} />
            <Field label="Scenario hourly rate ($, blank = blended)" value={scenario.extraRate} onChange={v => setScenario(p => ({ ...p, extraRate: v }))} prefix="$" />
            <Field label="Advertising increase ($)" value={scenario.extraAdvertising} onChange={v => setScenario(p => ({ ...p, extraAdvertising: v }))} prefix="$" />
            <Field label="Supplies increase ($)" value={scenario.extraSupplies} onChange={v => setScenario(p => ({ ...p, extraSupplies: v }))} prefix="$" />
            <Field label="Other cost increase ($)" value={scenario.extraOther} onChange={v => setScenario(p => ({ ...p, extraOther: v }))} prefix="$" />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
            <ResultRow label="Scenario company revenue" value={money(scenarioResult.companyRevenue)} />
            <ResultRow label="Scenario direct cost" value={money(scenarioResult.directCosts)} />
            <ResultRow label="Scenario contribution" value={money(scenarioResult.contribution)} strong tone={scenarioResult.contribution >= 0 ? 'text-green-700' : 'text-red-600'} />
            <ResultRow label="Drop vs projection" value={money(base.contribution - scenarioResult.contribution)} muted />
          </div>
        </CardContent>
      </Card>

      {/* Commission comparison */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Commission Comparison (pre-proposal analysis — does not change an executed agreement)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Alternative rate (%)" value={comparison.rate} onChange={v => setComparison(p => ({ ...p, rate: v }))} hint={base.rate ? `Current: ${base.rate}%` : undefined} />
            <Field label="Alternative minimum fee ($)" value={comparison.minimum_fee} onChange={v => setComparison(p => ({ ...p, minimum_fee: v }))} prefix="$" hint={base.minimumFee ? `Current: ${money(base.minimumFee)}` : 'No minimum set'} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <th className="pb-2 pr-3">Structure</th>
                  <th className="pb-2 pr-3 text-right">Fee applied</th>
                  <th className="pb-2 pr-3 text-right">Company revenue</th>
                  <th className="pb-2 text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 pr-3">Current</td>
                  <td className="py-1.5 pr-3 text-right">{money(base.fee.applied)}</td>
                  <td className="py-1.5 pr-3 text-right">{money(base.companyRevenue)}</td>
                  <td className="py-1.5 text-right font-medium">{money(base.contribution)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Alternative</td>
                  <td className="py-1.5 pr-3 text-right">{money(comparisonResult.fee.applied)}</td>
                  <td className="py-1.5 pr-3 text-right">{money(comparisonResult.companyRevenue)}</td>
                  <td className="py-1.5 text-right font-medium">{money(comparisonResult.contribution)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-1.5 pr-3 font-medium">Difference</td>
                  <td className="py-1.5 pr-3 text-right">{money(comparisonResult.fee.applied - base.fee.applied)}</td>
                  <td className="py-1.5 pr-3 text-right">{money(comparisonResult.companyRevenue - base.companyRevenue)}</td>
                  <td className="py-1.5 text-right font-medium">{money(comparisonResult.contribution - base.contribution)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance scorecard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /> Sale Acceptance Scorecard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${ratingTone} border text-sm px-3 py-1`}>{scorecard.rating}</Badge>
            {advisory.cfWorst !== 'NOT ASSESSED' && (
              <Badge className={`border text-sm px-3 py-1 ${
                advisory.cfWorst === 'CONCERN' ? 'bg-red-100 text-red-700 border-red-300'
                  : advisory.cfWorst === 'CAUTION' ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-green-100 text-green-700 border-green-300'
              }`}>CLIENT FIT — {advisory.cfWorst}</Badge>
            )}
            <span className="text-xs text-slate-500">Advisory only — you make the decision. This is not a guarantee of profitability.</span>
          </div>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-0.5">
            {scorecard.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
              <p className="flex items-center gap-1.5 font-medium text-slate-700"><CalendarDays className="w-3.5 h-3.5" /> Calendar overlap</p>
              <p className="text-slate-500 mt-0.5">
                {overlap.count == null
                  ? 'Set estimated sale dates on the Dates tab.'
                  : overlap.count === 0 ? 'No other active deal overlaps this window.'
                    : `${overlap.count} overlapping active deal(s): ${overlap.others.slice(0, 3).map(o => o.client_name).join(', ')}${overlap.others.length > 3 ? '…' : ''}`}
              </p>
              <Link to="/OperatorCalendar" className="text-cyan-700 underline">Open sale calendar →</Link>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
              <p className="flex items-center gap-1.5 font-medium text-slate-700"><Users className="w-3.5 h-3.5" /> Cross-sale workload</p>
              <p className="text-slate-500 mt-0.5">Estimated labor: {base.estHours.toFixed(1)} hours · distance from operating base: {advisory.distance != null ? `${advisory.distance} mi` : 'UNKNOWN'}.</p>
              <Link to="/OperatorWorkload" className="text-cyan-700 underline">Open workload planner →</Link>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Accepting or declining the seller is your call. EstateSalen never auto-accepts or auto-rejects a client, and this score must not be shown to the seller.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}