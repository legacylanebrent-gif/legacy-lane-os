import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, DollarSign, MapPin } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

export default function TerritoryCalculator() {
  const [form, setForm] = useState({
    state: '',
    county: '',
    cities: '',
    numCities: 1,
    estPopulation: '',
    avgSalePrice: '',
    annualVolume: '',
    accessLevel: 'preferred',
    leadTier: 'medium',
  });
  const [result, setResult] = useState(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const calculate = () => {
    const cities = parseInt(form.numCities) || 1;
    const pop = parseInt(form.estPopulation) || 50000;
    const avgPrice = parseInt(form.avgSalePrice) || 350000;
    const volume = parseInt(form.annualVolume) || 20;
    const leadMultiplier = { low: 0.5, medium: 1, high: 1.8 }[form.leadTier];
    const isExclusive = form.accessLevel === 'exclusive';

    const basePerCity = pop < 50000 ? 500 : pop < 150000 ? 1200 : 2500;
    const buyIn = isExclusive ? Math.round(basePerCity * cities * 1.5 / 100) * 100 : 0;
    const monthlyFee = isExclusive ? 0 : Math.round(basePerCity * cities * 0.12 / 10) * 10;
    const annualLeads = Math.round(volume * leadMultiplier * cities);
    const conversionRate = 0.18;
    const closedDeals = Math.round(annualLeads * conversionRate);
    const gci = Math.round(closedDeals * avgPrice * 0.03);
    const referralObligation = Math.round(gci * 0.20);
    const netGCI = gci - referralObligation;
    const annualCost = isExclusive ? Math.round(buyIn * 0.25) : monthlyFee * 12;
    const roi = annualCost > 0 ? Math.round(((netGCI - annualCost) / annualCost) * 100) : null;

    setResult({ buyIn, monthlyFee, annualLeads, closedDeals, gci, referralObligation, netGCI, roi, isExclusive, annualCost });
  };

  return (
    <section className="py-20 px-4 bg-slate-900">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Calculator className="w-4 h-4" /> Territory Planning Tool
          </div>
          <h2 className="text-4xl font-serif font-bold text-white mb-4">Estimate Your Territory Buy-In</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Use this calculator to get a rough picture of territory costs, potential lead volume, and estimated GCI impact. All outputs are illustrative estimates only.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-400" /> Territory Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">State</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    value={form.state} onChange={e => set('state', e.target.value)}
                  >
                    <option value="">Select state</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">County</label>
                  <input
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. Orange County"
                    value={form.county} onChange={e => set('county', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Cities Requested</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                  placeholder="e.g. Orlando, Kissimmee, Ocoee"
                  value={form.cities} onChange={e => set('cities', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Number of Cities</label>
                  <input
                    type="number" min="1" max="20"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    value={form.numCities} onChange={e => set('numCities', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Est. Population</label>
                  <input
                    type="number"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. 80000"
                    value={form.estPopulation} onChange={e => set('estPopulation', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Avg. Home Sale Price ($)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. 375000"
                    value={form.avgSalePrice} onChange={e => set('avgSalePrice', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Est. Annual Estate Sales</label>
                  <input
                    type="number"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. 25"
                    value={form.annualVolume} onChange={e => set('annualVolume', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Desired Access Level</label>
                <div className="flex gap-2">
                  {['preferred', 'exclusive'].map(l => (
                    <button
                      key={l}
                      onClick={() => set('accessLevel', l)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${form.accessLevel === l ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    >
                      {l === 'preferred' ? 'Preferred Agent' : 'Territory Owner'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Expected Lead Volume</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(t => (
                    <button
                      key={t}
                      onClick={() => set('leadTier', t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${form.leadTier === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={calculate} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3">
                Calculate My Territory Estimate
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {!result ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Fill in your territory details and click Calculate to see your estimates.</p>
                </div>
              </div>
            ) : (
              <>
                {result.isExclusive ? (
                  <Card className="bg-orange-500/10 border-orange-500/40">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">Territory Buy-In Range</span>
                        <Badge className="bg-orange-500 text-white">One-Time</Badge>
                      </div>
                      <div className="text-3xl font-bold text-white">${result.buyIn.toLocaleString()} – ${(result.buyIn * 1.4).toLocaleString()}</div>
                      <p className="text-slate-400 text-xs mt-1">No monthly participation fee required</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-blue-500/10 border-blue-500/40">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">Suggested Monthly Fee</span>
                        <Badge className="bg-blue-500 text-white">Preferred</Badge>
                      </div>
                      <div className="text-3xl font-bold text-white">${result.monthlyFee}/mo</div>
                      <p className="text-slate-400 text-xs mt-1">Territory participation fee only</p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-xs mb-1">Est. Annual Lead Opps</p>
                      <p className="text-2xl font-bold text-white">{result.annualLeads}</p>
                      <p className="text-slate-500 text-xs">~{result.closedDeals} potential closings</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-xs mb-1">Est. Gross GCI</p>
                      <p className="text-2xl font-bold text-green-400">${result.gci.toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">at 3% agent commission</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-xs mb-1">20% Referral Obligation</p>
                      <p className="text-2xl font-bold text-orange-400">${result.referralObligation.toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">on platform-generated deals</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-xs mb-1">Est. Net GCI</p>
                      <p className="text-2xl font-bold text-white">${result.netGCI.toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">after referral fees</p>
                    </CardContent>
                  </Card>
                </div>

                {result.roi !== null && (
                  <Card className={`border-2 ${result.roi > 0 ? 'bg-green-500/10 border-green-500/40' : 'bg-slate-800 border-slate-700'}`}>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm">Estimated ROI Scenario</p>
                        <p className="text-slate-400 text-xs mt-1">Net GCI vs. annual platform cost</p>
                      </div>
                      <div className={`text-4xl font-bold ${result.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {result.roi > 0 ? '+' : ''}{result.roi}%
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-slate-500 text-xs leading-relaxed">
                  This calculator is for planning purposes only. Final territory pricing depends on availability, market size, expected lead volume, estate sale company coverage, home values, and platform growth. All numbers are illustrative estimates.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}