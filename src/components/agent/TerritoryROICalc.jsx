import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Loader2, Calculator } from 'lucide-react';

// Avg estate sales per operator per year (conservative)
const AVG_SALES_PER_OPERATOR = 12;
// % of estate sale leads that convert to a real estate listing referral
const LEAD_TO_LISTING_PCT = 0.20;
// Avg listing commission % (agent side)
const DEFAULT_COMMISSION_PCT = 3;
// Referral fee paid to platform on closed deal
const REFERRAL_FEE_PCT = 0.25;

export default function TerritoryROICalc() {
  const [county, setCounty] = useState('');
  const [state, setState] = useState('');
  const [avgSalePrice, setAvgSalePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const canCalc = county.trim() && avgSalePrice && !loading;

  const calculate = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Fetch operator count for this county/state from the database
      const query = {};
      if (county.trim()) query.geocoded_county = { $regex: county.trim(), $options: 'i' };
      if (state.trim()) query.state = state.trim().toUpperCase().slice(0, 2);

      const operators = await base44.entities.FutureEstateOperator.filter(query);
      const operatorCount = operators?.length || 0;

      const annualEstateSales = operatorCount * AVG_SALES_PER_OPERATOR;
      const estimatedListings = Math.round(annualEstateSales * LEAD_TO_LISTING_PCT);
      const price = parseInt(avgSalePrice) || 350000;
      const grossGCI = Math.round(estimatedListings * price * (DEFAULT_COMMISSION_PCT / 100));
      const referralFee = Math.round(grossGCI * REFERRAL_FEE_PCT);
      const netGCI = grossGCI - referralFee;

      setResult({ operatorCount, annualEstateSales, estimatedListings, grossGCI, referralFee, netGCI, price });
    } catch {
      setResult({ error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-orange-600 shrink-0" />
        <p className="text-orange-800 text-sm font-bold">Territory Opportunity Calculator</p>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-orange-700 text-xs font-medium block mb-1">County Name</label>
            <input
              className="w-full border border-orange-200 bg-white rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="e.g. Monmouth County"
              value={county}
              onChange={e => { setCounty(e.target.value); setResult(null); }}
            />
          </div>
          <div className="w-16">
            <label className="text-orange-700 text-xs font-medium block mb-1">State</label>
            <input
              className="w-full border border-orange-200 bg-white rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400 uppercase"
              placeholder="NJ"
              maxLength={2}
              value={state}
              onChange={e => { setState(e.target.value.toUpperCase()); setResult(null); }}
            />
          </div>
        </div>

        <div>
          <label className="text-orange-700 text-xs font-medium block mb-1">Avg. Home Sale Price in Territory ($)</label>
          <input
            type="number"
            className="w-full border border-orange-200 bg-white rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            placeholder="e.g. 425000"
            value={avgSalePrice}
            onChange={e => { setAvgSalePrice(e.target.value); setResult(null); }}
          />
        </div>

        <button
          onClick={calculate}
          disabled={!canCalc}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating...</> : 'Calculate Territory Potential'}
        </button>
      </div>

      {result && !result.error && (
        <div className="border-t border-orange-200 pt-3 space-y-2">
          {/* Operator count */}
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Estate Sale Companies Found</span>
            <span className="font-bold text-slate-900 text-sm">{result.operatorCount}</span>
          </div>
          {/* Annual estate sales */}
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Est. Estate Sales / Year</span>
            <span className="font-bold text-slate-900 text-sm">{result.annualEstateSales.toLocaleString()}</span>
          </div>
          {/* Listings (20%) */}
          <div className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-orange-800 text-xs font-medium">Est. Listings (20% conversion)</span>
            <span className="font-bold text-orange-900 text-sm">{result.estimatedListings} / yr</span>
          </div>
          {/* GCI */}
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Gross GCI @ 3% commission</span>
            <span className="font-bold text-green-700 text-sm">${result.grossGCI.toLocaleString()}</span>
          </div>
          {/* Referral fee */}
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">25% Referral Fee (platform deals)</span>
            <span className="font-bold text-orange-600 text-sm">-${result.referralFee.toLocaleString()}</span>
          </div>
          {/* Net GCI */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2.5 flex justify-between items-center">
            <span className="text-emerald-800 text-xs font-bold">Est. Net GCI</span>
            <span className="font-bold text-emerald-700 text-base">${result.netGCI.toLocaleString()}/yr</span>
          </div>

          <p className="text-orange-500 text-xs leading-relaxed pt-1">
            Based on {result.operatorCount} operators × {AVG_SALES_PER_OPERATOR} sales/yr × 20% listing conversion. Estimates only — actual results vary.
          </p>
        </div>
      )}

      {result?.error && (
        <p className="text-red-500 text-xs mt-2">Could not load operator data. Try a different county name.</p>
      )}

      {!result && (
        <p className="text-orange-600 text-xs leading-relaxed">
          <strong>$3,800</strong> one-time buy-in, or <strong>$5,320</strong> over 12 months. Full balance due on your first referral closing.
        </p>
      )}
    </div>
  );
}