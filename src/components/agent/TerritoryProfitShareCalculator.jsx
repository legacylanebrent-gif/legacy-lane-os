import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp } from 'lucide-react';

// Real subscription prices from the database
const OPERATOR_PLANS = [
  { name: 'Growth', price: 49 },
  { name: 'Professional', price: 129 },
  { name: 'Enterprise', price: 197 },
];
const RESELLER_PLAN_PRICE = 47; // Reseller Pro
const EXPENSE_MARGIN = 0.35; // 35% expenses against subscription
const PROFIT_SHARE_PCT = 0.20; // 20% of net profit (after 35% expenses)

export default function TerritoryProfitShareCalculator() {
  const [totalOperators, setTotalOperators] = useState(7723);
  const [numOperators, setNumOperators] = useState(5);
  const [operatorPlanIdx, setOperatorPlanIdx] = useState(1); // default Professional $129
  const [numResellers, setNumResellers] = useState(3);

  useEffect(() => {
    base44.functions.invoke('getFutureOperatorCount', {})
      .then(res => { if (res?.data?.total) setTotalOperators(res.data.total); })
      .catch(() => {});
  }, []);

  const operatorPlan = OPERATOR_PLANS[operatorPlanIdx];
  const operatorMonthly = numOperators * operatorPlan.price;
  const resellerMonthly = numResellers * RESELLER_PLAN_PRICE;
  const totalMonthly = operatorMonthly + resellerMonthly;
  const netProfit = totalMonthly * (1 - EXPENSE_MARGIN); // 65% after 35% expenses
  const yourShare = netProfit * PROFIT_SHARE_PCT;
  const yourAnnual = yourShare * 12;

  const rows = [
    {
      label: `${numOperators} Estate Sale ${numOperators === 1 ? 'Company' : 'Companies'} (${operatorPlan.name})`,
      fee: `$${operatorMonthly.toLocaleString()}/mo`,
      share: `$${Math.round(operatorMonthly * (1 - EXPENSE_MARGIN) * PROFIT_SHARE_PCT)}/mo`,
    },
    {
      label: `${numResellers} Reseller${numResellers === 1 ? '' : 's'} (Pro)`,
      fee: `$${resellerMonthly.toLocaleString()}/mo`,
      share: `$${Math.round(resellerMonthly * (1 - EXPENSE_MARGIN) * PROFIT_SHARE_PCT)}/mo`,
    },
    {
      label: `Total (${numOperators + numResellers} active members)`,
      fee: `$${totalMonthly.toLocaleString()}/mo`,
      share: `$${Math.round(yourShare)}/mo`,
      highlight: true,
    },
  ];

  return (
    <div className="bg-white border-2 border-blue-200 rounded-2xl p-8">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-slate-900 text-lg">Territory Profit Share Calculator</h4>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {totalOperators.toLocaleString()} potential operators in database
        </span>
      </div>
      <p className="text-slate-500 text-sm mb-6">Adjust the sliders to estimate your monthly profit share. Each operator's subscription has a 35% expense margin — you earn 20% of the remaining net profit.</p>

      {/* Sliders */}
      <div className="space-y-5 mb-8">
        {/* Operator count */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">Estate Sale Companies Recruited</label>
            <span className="text-sm font-bold text-blue-700">{numOperators}</span>
          </div>
          <input
            type="range" min={1} max={20} value={numOperators}
            onChange={e => setNumOperators(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        {/* Operator plan */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Operator Plan (avg)</label>
          <div className="flex gap-2">
            {OPERATOR_PLANS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setOperatorPlanIdx(i)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  operatorPlanIdx === i
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                {p.name}<br />
                <span className="text-xs font-normal">${p.price}/mo</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reseller count */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">Resellers Recruited</label>
            <span className="text-sm font-bold text-blue-700">{numResellers}</span>
          </div>
          <input
            type="range" min={0} max={20} value={numResellers}
            onChange={e => setNumResellers(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-slate-500 font-medium pb-3">What You Recruit</th>
              <th className="text-right text-slate-500 font-medium pb-3">Their Monthly Fees</th>
              <th className="text-right text-slate-500 font-medium pb-3">Your 20% of Net Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, i) => (
              <tr key={i} className={row.highlight ? 'bg-blue-50 font-semibold' : ''}>
                <td className="py-3 text-slate-700">{row.label}</td>
                <td className="py-3 text-right text-slate-600">{row.fee}</td>
                <td className="py-3 text-right text-blue-700 font-bold">{row.share}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Annual summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm">Estimated Annual Profit Share</p>
          <p className="text-white font-bold text-3xl">${Math.round(yourAnnual).toLocaleString()}</p>
          <p className="text-blue-200 text-xs mt-1">from {numOperators + numResellers} recruited members</p>
        </div>
        <TrendingUp className="w-12 h-12 text-blue-300 opacity-60" />
      </div>

      <p className="text-slate-400 text-xs mt-4 text-center">
        Based on real platform subscription prices: Operator Growth $49/mo · Professional $129/mo · Enterprise $197/mo · Reseller Pro $47/mo.
        Calculation: 35% operator expense margin deducted from gross subscription → 20% profit share applied to the remaining 65% net profit.
        Example: $129/mo operator × 65% × 20% = ~$16.77/mo to you.
        Actual amounts subject to final agreement terms.
      </p>
    </div>
  );
}