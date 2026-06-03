import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, ChevronDown } from 'lucide-react';

// Median home sale price by state (2024 estimates, US Census / NAR data)
const STATE_MEDIAN_PRICES = {
  AL: 220000, AK: 335000, AZ: 425000, AR: 195000, CA: 785000, CO: 545000,
  CT: 375000, DE: 355000, FL: 410000, GA: 325000, HI: 840000, ID: 415000,
  IL: 285000, IN: 255000, IA: 215000, KS: 235000, KY: 230000, LA: 215000,
  ME: 380000, MD: 440000, MA: 595000, MI: 255000, MN: 335000, MS: 185000,
  MO: 255000, MT: 440000, NE: 265000, NV: 430000, NH: 465000, NJ: 530000,
  NM: 305000, NY: 475000, NC: 335000, ND: 255000, OH: 235000, OK: 215000,
  OR: 480000, PA: 285000, RI: 445000, SC: 315000, SD: 295000, TN: 335000,
  TX: 335000, UT: 500000, VT: 390000, VA: 410000, WA: 590000, WV: 165000,
  WI: 295000, WY: 375000
};

// 1 platform-generated estate sale lead/month per operator = 12/yr
const PLATFORM_LEADS_PER_OPERATOR_PER_YEAR = 12;
// 10% of those estate sales result in a real estate listing
const LEAD_TO_LISTING_PCT = 0.10;
// 20% referral fee paid to EstateSalen on the agent's commission
const REFERRAL_FEE_PCT = 0.20;

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
  const [commissionPct, setCommissionPct] = useState('');
  const [result, setResult] = useState(null);

  // When state changes, load available counties from our operator DB
  useEffect(() => {
    if (!state) { setCounties([]); setCounty(''); setOperatorCount(null); setAvgSalePrice(''); setCommissionPct(''); setResult(null); return; }
    // Pre-fill state median immediately on state selection
    const stateMedian = STATE_MEDIAN_PRICES[state];
    if (stateMedian) setAvgSalePrice(String(stateMedian));

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
          .sort((a, b) => a[0].localeCompare(b[0]))
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

  // When county changes, set operator count and pre-fill state median price
  useEffect(() => {
    if (!county || !state) { setOperatorCount(null); setAvgSalePrice(''); setResult(null); return; }

    const selected = counties.find(c => c.name === county);
    setOperatorCount(selected?.count || 0);
    setResult(null);

    // Instant lookup from static state median table
    const stateMedian = STATE_MEDIAN_PRICES[state];
    if (stateMedian) setAvgSalePrice(String(stateMedian));
  }, [county, state]);

  const canCalc = county && avgSalePrice && commissionPct && operatorCount !== null;

  const calculate = () => {
    // Step 1: platform generates 1 lead/month per operator = 12 estate sales/yr per operator
    const platformLeadsPerYear = operatorCount * PLATFORM_LEADS_PER_OPERATOR_PER_YEAR;
    // Step 2: 20% of those estate sales result in a listing
    const estimatedListings = Math.round(platformLeadsPerYear * LEAD_TO_LISTING_PCT);
    // Step 3: GCI = listings × avg home price × agent commission %
    const price = parseInt(avgSalePrice) || 350000;
    const agentCommission = (parseFloat(commissionPct) || 3) / 100;
    const grossGCI = Math.round(estimatedListings * price * agentCommission);
    // Step 4: 20% referral fee paid to EstateSalen on that GCI
    const referralFee = Math.round(grossGCI * REFERRAL_FEE_PCT);
    const netGCI = grossGCI - referralFee;
    // Territory buy-in: 5% of Net GCI lump sum, or 7% spread over 12 months
    const buyInLumpSum = Math.round(netGCI * 0.05);
    const buyInMonthly = Math.round((netGCI * 0.07) / 12);
    // How many listings to recover the lump-sum investment
    const gciPerListing = price * agentCommission * (1 - REFERRAL_FEE_PCT);
    const listingsToRecover = gciPerListing > 0 ? Math.ceil(buyInLumpSum / gciPerListing) : 0;
    setResult({ platformLeadsPerYear, estimatedListings, grossGCI, referralFee, netGCI, commissionPct: parseFloat(commissionPct), buyInLumpSum, buyInMonthly, listingsToRecover });
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

        {/* Avg home price - pre-filled from state median table */}
        {county && (
          <div>
            <label className="text-orange-700 text-xs font-medium block mb-1">Avg. Home Sale Price</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                className="w-full border border-orange-200 bg-white rounded-lg pl-6 pr-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="e.g. 425000"
                value={avgSalePrice}
                onChange={e => { setAvgSalePrice(e.target.value); setResult(null); }}
              />
            </div>
            {avgSalePrice && (
              <p className="text-orange-500 text-xs mt-0.5">State median pre-filled — adjust for your local market.</p>
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

        {/* Agent commission % - manual input */}
        {county && (
          <div>
            <label className="text-orange-700 text-xs font-medium block mb-1">Your Local Avg. RE Commission %</label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.25"
                className="w-full border border-orange-200 bg-white rounded-lg px-2.5 pr-8 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                placeholder="e.g. 2.5"
                value={commissionPct}
                onChange={e => { setCommissionPct(e.target.value); setResult(null); }}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-orange-500 text-xs mt-0.5">Agent's side of the commission only.</p>
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
          {/* Funnel breakdown */}
          <p className="text-orange-700 text-xs font-semibold uppercase tracking-wide pb-1">Opportunity Funnel</p>
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Platform leads generated / yr <span className="text-slate-400">(1/mo per operator)</span></span>
            <span className="font-bold text-slate-900 text-sm">{result.platformLeadsPerYear}</span>
          </div>
          <div className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-orange-800 text-xs font-medium">Est. listing conversions <span className="text-orange-600 font-normal">(10%)</span></span>
            <span className="font-bold text-orange-900 text-sm">{result.estimatedListings} / yr</span>
          </div>

          {/* GCI breakdown */}
          <p className="text-orange-700 text-xs font-semibold uppercase tracking-wide pb-1 pt-2">Revenue Breakdown</p>
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Gross GCI <span className="text-slate-400">@ {result.commissionPct}% commission</span></span>
            <span className="font-bold text-green-700 text-sm">${result.grossGCI.toLocaleString()}</span>
          </div>
          <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">20% Referral Fee to EstateSalen</span>
            <span className="font-bold text-orange-600 text-sm">−${result.referralFee.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2.5 flex justify-between items-center">
            <span className="text-emerald-800 text-xs font-bold">Est. Net GCI / Year</span>
            <span className="font-bold text-emerald-700 text-base">${result.netGCI.toLocaleString()}</span>
          </div>
          <p className="text-orange-500 text-xs leading-relaxed pt-1">
            {operatorCount} operators × 1 platform lead/mo × 10% listing conversion × {result.commissionPct}% commission − 20% referral fee. Estimates only.
          </p>

          {/* Territory Buy-In */}
          <p className="text-orange-700 text-xs font-semibold uppercase tracking-wide pb-1 pt-2">Territory Buy-In</p>
          <p className="text-slate-500 text-xs leading-relaxed pb-1">
            Pay the one-time investment fee in full, or split it into 12 equal monthly payments — your choice.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Closings needed to recover investment</span>
            <span className="font-bold text-orange-700 text-sm">{result.listingsToRecover} closing{result.listingsToRecover !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-white border border-orange-200 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">One-time investment <span className="text-slate-400">(5% of Net GCI)</span></span>
            <span className="font-bold text-slate-900 text-sm">${result.buyInLumpSum.toLocaleString()}</span>
          </div>
          <div className="bg-white border border-orange-200 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-slate-600 text-xs">Split into 12 equal monthly payments <span className="text-slate-400">(7% over 12 mo.)</span></span>
            <span className="font-bold text-slate-900 text-sm">${result.buyInMonthly.toLocaleString()}/mo</span>
          </div>
          <p className="text-slate-700 text-xs leading-relaxed pt-2">
            <strong>Owning a territory is an equity investment that can be sold at a later date. ROI will be based on a combination of revenue earned + future projected income.</strong>
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-2">
            <p className="text-amber-800 text-xs leading-relaxed">
              <strong>Important:</strong> This program generates leads and appointments — not guaranteed listings. Whether a homeowner chooses to list their home, and with whom, is entirely up to the seller and agent. No listing outcomes are guaranteed.
            </p>
          </div>
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