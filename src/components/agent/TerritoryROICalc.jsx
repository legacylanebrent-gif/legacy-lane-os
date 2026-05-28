import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, Loader2, ChevronDown } from 'lucide-react';

const AVG_SALES_PER_OPERATOR = 12;
const LEAD_TO_LISTING_PCT = 0.20;
const DEFAULT_COMMISSION_PCT = 3;
const REFERRAL_FEE_PCT = 0.25;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

export default function TerritoryROICalc() {
  const [state, setState] = useState('');
  const [counties, setCounties] = useState([]);
  const [countiesLoading, setCountiesLoading] = useState(false);
  const [county, setCounty] = useState('');
  const [operatorCount, setOperatorCount] = useState(null);
  const [avgSalePrice, setAvgSalePrice] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [result, setResult] = useState(null);

  // When state changes, load available counties from our operator DB
  useEffect(() => {
    if (!state) { setCounties([]); setCounty(''); setOperatorCount(null); setAvgSalePrice(''); setResult(null); return; }

    const load = async () => {
      setCountiesLoading(true);
      setCounty('');
      setOperatorCount(null);
      setAvgSalePrice('');
      setResult(null);
      try {
        const ops = await base44.entities.FutureEstateOperator.filter({ state });
        // Collect unique geocoded_county values
        const countyMap = {};
        ops.forEach(op => {
          const c = op.geocoded_county || op.county;
          if (c) {
            const key = c.trim();
            countyMap[key] = (countyMap[key] || 0) + 1;
          }
        });
        const sorted = Object.entries(countyMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));
        setCounties(sorted);
      } catch {
        setCounties([]);
      } finally {
        setCountiesLoading(false);
      }
    };
    load();
  }, [state]);

  // When county changes, set operator count and auto-lookup avg home price
  useEffect(() => {
    if (!county || !state) { setOperatorCount(null); setAvgSalePrice(''); setResult(null); return; }

    const selected = counties.find(c => c.name === county);
    setOperatorCount(selected?.count || 0);
    setResult(null);

    // AI lookup for avg home sale price
    const lookupPrice = async () => {
      setPriceLoading(true);
      setAvgSalePrice('');
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `What is the current median home sale price in ${county}, ${state}? Use recent real estate data. Return only a single integer representing the median price in US dollars, no commas, no text, no symbols.`,
          response_json_schema: { type: 'object', properties: { median_price: { type: 'number' } } },
          add_context_from_internet: true,
          model: 'gemini_3_flash'
        });
        if (res?.median_price) setAvgSalePrice(String(Math.round(res.median_price)));
      } catch {
        // leave blank for manual entry
      } finally {
        setPriceLoading(false);
      }
    };
    lookupPrice();
  }, [county]);

  const canCalc = county && avgSalePrice && !priceLoading && operatorCount !== null;

  const calculate = () => {
    const annualEstateSales = operatorCount * AVG_SALES_PER_OPERATOR;
    const estimatedListings = Math.round(annualEstateSales * LEAD_TO_LISTING_PCT);
    const price = parseInt(avgSalePrice) || 350000;
    const grossGCI = Math.round(estimatedListings * price * (DEFAULT_COMMISSION_PCT / 100));
    const referralFee = Math.round(grossGCI * REFERRAL_FEE_PCT);
    const netGCI = grossGCI - referralFee;
    setResult({ annualEstateSales, estimatedListings, grossGCI, referralFee, netGCI });
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-orange-600 shrink-0" />
        <p className="text-orange-800 text-sm font-bold">Territory Opportunity Calculator</p>
      </div>

      <div className="space-y-2 mb-3">

        {/* State selector */}
        <div>
          <label className="text-orange-700 text-xs font-medium block mb-1">Select State</label>
          <div className="relative">
            <select
              className="w-full border border-orange-200 bg-white rounded-lg px-2.5 py-1.5 text-sm text-slate-800 appearance-none focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={state}
              onChange={e => setState(e.target.value)}
            >
              <option value="">— Choose a state —</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* County selector */}
        {state && (
          <div>
            <label className="text-orange-700 text-xs font-medium block mb-1">
              Select Territory (County)
              {countiesLoading && <span className="ml-1 text-orange-400 font-normal">loading...</span>}
            </label>
            <div className="relative">
              <select
                className="w-full border border-orange-200 bg-white rounded-lg px-2.5 py-1.5 text-sm text-slate-800 appearance-none focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                value={county}
                onChange={e => setCounty(e.target.value)}
                disabled={countiesLoading || counties.length === 0}
              >
                <option value="">
                  {countiesLoading ? 'Loading territories...' : counties.length === 0 ? 'No territories found' : '— Choose a territory —'}
                </option>
                {counties.map(c => (
                  <option key={c.name} value={c.name}>{c.name} ({c.count} companies)</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Avg home price - auto-populated */}
        {county && (
          <div>
            <label className="text-orange-700 text-xs font-medium block mb-1">
              Avg. Home Sale Price
              {priceLoading && <span className="ml-1 text-orange-400 font-normal italic">looking up...</span>}
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                className="w-full border border-orange-200 bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder={priceLoading ? 'Fetching...' : 'e.g. 425000'}
                value={avgSalePrice}
                onChange={e => { setAvgSalePrice(e.target.value); setResult(null); }}
                disabled={priceLoading}
              />
              {priceLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400 animate-spin" />}
            </div>
            {avgSalePrice && !priceLoading && (
              <p className="text-orange-500 text-xs mt-0.5">AI-estimated — adjust if needed.</p>
            )}
          </div>
        )}

        {/* Operator count pill */}
        {operatorCount !== null && county && (
          <div className="bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 text-xs text-orange-800 flex justify-between">
            <span>Estate sale companies in territory:</span>
            <span className="font-bold">{operatorCount}</span>
          </div>
        )}

        <button
          onClick={calculate}
          disabled={!canCalc}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
        >
          Calculate Territory Potential
        </button>
      </div>

      {result && (
        <div className="border-t border-orange-200 pt-3 space-y-2">
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Est. Estate Sales / Year</span>
            <span className="font-bold text-slate-900 text-sm">{result.annualEstateSales.toLocaleString()}</span>
          </div>
          <div className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-orange-800 text-xs font-medium">Est. Listings (20% conversion)</span>
            <span className="font-bold text-orange-900 text-sm">{result.estimatedListings} / yr</span>
          </div>
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Gross GCI @ 3% commission</span>
            <span className="font-bold text-green-700 text-sm">${result.grossGCI.toLocaleString()}</span>
          </div>
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">25% Referral Fee (platform deals)</span>
            <span className="font-bold text-orange-600 text-sm">-${result.referralFee.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2.5 flex justify-between items-center">
            <span className="text-emerald-800 text-xs font-bold">Est. Net GCI</span>
            <span className="font-bold text-emerald-700 text-base">${result.netGCI.toLocaleString()}/yr</span>
          </div>
          <p className="text-orange-500 text-xs leading-relaxed pt-1">
            Based on {operatorCount} operators × {AVG_SALES_PER_OPERATOR} sales/yr × 20% listing conversion. Estimates only.
          </p>
        </div>
      )}

      {!result && !county && (
        <p className="text-orange-600 text-xs leading-relaxed">
          <strong>$3,800</strong> one-time buy-in, or <strong>$5,320</strong> over 12 months. Full balance due on your first referral closing.
        </p>
      )}
    </div>
  );
}