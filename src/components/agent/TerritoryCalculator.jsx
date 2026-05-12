import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, MapPin, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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
  const [state, setState] = useState('');
  const [county, setCounty] = useState('');
  const [cities, setCities] = useState([]); // [{ name, population, populationLoading, avgClosingPrice }]
  const [cityInput, setCityInput] = useState('');
  const [accessLevel, setAccessLevel] = useState('preferred');
  const [leadTier, setLeadTier] = useState('medium');
  const [result, setResult] = useState(null);

  const addCity = async () => {
    const name = cityInput.trim();
    if (!name) return;
    const newCity = { name, population: null, populationLoading: true, avgClosingPrice: '' };
    setCities(prev => [...prev, newCity]);
    setCityInput('');

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the approximate current population of ${name}${state ? ', ' + state : ''}? Reply with ONLY a single integer number, no commas, no text, no explanation. Just the number.`,
        response_json_schema: {
          type: 'object',
          properties: { population: { type: 'number' } }
        }
      });
      const pop = res?.population || null;
      setCities(prev => prev.map(c =>
        c.name === name && c.populationLoading
          ? { ...c, population: pop, populationLoading: false }
          : c
      ));
    } catch {
      setCities(prev => prev.map(c =>
        c.name === name && c.populationLoading
          ? { ...c, population: null, populationLoading: false }
          : c
      ));
    }
  };

  const removeCity = (index) => {
    setCities(prev => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const updateClosingPrice = (index, val) => {
    setCities(prev => prev.map((c, i) => i === index ? { ...c, avgClosingPrice: val } : c));
    setResult(null);
  };

  const canCalculate = cities.length > 0 && cities.every(c => !c.populationLoading && c.avgClosingPrice);

  const calculate = () => {
    const numCities = cities.length;
    const totalPop = cities.reduce((sum, c) => sum + (c.population || 50000), 0);
    const avgPop = totalPop / numCities;
    const avgPrice = cities.reduce((sum, c) => sum + (parseInt(c.avgClosingPrice) || 350000), 0) / numCities;

    const leadMultiplier = { low: 0.5, medium: 1, high: 1.8 }[leadTier];
    const isExclusive = accessLevel === 'exclusive';

    const basePerCity = avgPop < 50000 ? 500 : avgPop < 150000 ? 1200 : 2500;
    const buyIn = isExclusive ? Math.round(basePerCity * numCities * 1.5 / 100) * 100 : 0;
    const monthlyFee = isExclusive ? 0 : Math.round(basePerCity * numCities * 0.12 / 10) * 10;
    const baseLeads = avgPop < 50000 ? 8 : avgPop < 150000 ? 15 : 25;
    const annualLeads = Math.round(baseLeads * leadMultiplier * numCities);
    const conversionRate = 0.18;
    const closedDeals = Math.round(annualLeads * conversionRate);
    const gci = Math.round(closedDeals * avgPrice * 0.03);
    const referralObligation = Math.round(gci * 0.20);
    const netGCI = gci - referralObligation;
    const annualCost = isExclusive ? Math.round(buyIn * 0.25) : monthlyFee * 12;
    const roi = annualCost > 0 ? Math.round(((netGCI - annualCost) / annualCost) * 100) : null;

    setResult({ buyIn, monthlyFee, annualLeads, closedDeals, gci, referralObligation, netGCI, roi, isExclusive, annualCost, avgPop: Math.round(avgPop), avgPrice: Math.round(avgPrice), numCities });
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
            Add your target cities one at a time. We'll look up the population automatically — then you enter the average closing price for each market.
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
            <CardContent className="space-y-5">

              {/* State + County */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">State</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    value={state} onChange={e => setState(e.target.value)}
                  >
                    <option value="">Select state</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">County (optional)</label>
                  <input
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. Orange County"
                    value={county} onChange={e => setCounty(e.target.value)}
                  />
                </div>
              </div>

              {/* Add City */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Add a City</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. Orlando"
                    value={cityInput}
                    onChange={e => setCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCity()}
                  />
                  <Button
                    onClick={addCity}
                    disabled={!cityInput.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-slate-500 text-xs mt-1">AI will look up the approximate population automatically.</p>
              </div>

              {/* City List */}
              {cities.length > 0 && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Your Cities</p>
                  {cities.map((city, i) => (
                    <div key={i} className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-semibold">{city.name}</span>
                          {city.populationLoading ? (
                            <span className="flex items-center gap-1 text-slate-400 text-xs">
                              <Loader2 className="w-3 h-3 animate-spin" /> Looking up population...
                            </span>
                          ) : city.population ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs">
                              <CheckCircle2 className="w-3 h-3" /> ~{city.population.toLocaleString()} residents
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">Population unknown</span>
                          )}
                        </div>
                        <button onClick={() => removeCity(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Avg. Closing Price in {city.name} ($)</label>
                        <input
                          type="number"
                          className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                          placeholder="e.g. 375000"
                          value={city.avgClosingPrice}
                          onChange={e => updateClosingPrice(i, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Summary row */}
                  {cities.length > 1 && (
                    <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-slate-400">
                      {cities.length} cities · Avg pop: {cities.filter(c => c.population).length > 0
                        ? Math.round(cities.filter(c => c.population).reduce((s, c) => s + c.population, 0) / cities.filter(c => c.population).length).toLocaleString()
                        : '—'} · Avg price: {cities.filter(c => c.avgClosingPrice).length > 0
                        ? '$' + Math.round(cities.filter(c => c.avgClosingPrice).reduce((s, c) => s + parseInt(c.avgClosingPrice || 0), 0) / cities.filter(c => c.avgClosingPrice).length).toLocaleString()
                        : '—'}
                    </div>
                  )}
                </div>
              )}

              {/* Access Level */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Desired Access Level</label>
                <div className="flex gap-2">
                  {['preferred', 'exclusive'].map(l => (
                    <button
                      key={l}
                      onClick={() => setAccessLevel(l)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${accessLevel === l ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    >
                      {l === 'preferred' ? 'Preferred Agent' : 'Territory Owner'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Tier */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Expected Lead Volume</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map(t => (
                    <button
                      key={t}
                      onClick={() => setLeadTier(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${leadTier === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={calculate}
                disabled={!canCalculate}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Calculate My Territory Estimate
              </Button>
              {cities.length > 0 && !canCalculate && (
                <p className="text-slate-500 text-xs text-center -mt-2">
                  Enter an avg. closing price for each city to calculate.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {!result ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Add cities, enter closing prices, and click Calculate to see your estimates.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Territory summary */}
                <div className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-3 text-xs text-slate-400 flex gap-4 flex-wrap">
                  <span><span className="text-white font-semibold">{result.numCities}</span> cities</span>
                  <span>Avg pop: <span className="text-white font-semibold">{result.avgPop.toLocaleString()}</span></span>
                  <span>Avg closing: <span className="text-white font-semibold">${result.avgPrice.toLocaleString()}</span></span>
                </div>

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
                  This calculator is for planning purposes only. Population data is AI-estimated. Final territory pricing depends on availability, market size, estate sale company coverage, and platform growth. All numbers are illustrative estimates.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}