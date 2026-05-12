import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, MapPin, Plus, Trash2, Loader2, CheckCircle2, ShieldCheck, Building2, Home } from 'lucide-react';
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
  const [mode, setMode] = useState('city'); // 'city' | 'county'
  const [state, setState] = useState('');

  // City mode
  const [cities, setCities] = useState([]);
  const [cityInput, setCityInput] = useState('');

  // County mode
  const [countyInput, setCountyInput] = useState('');
  const [countyData, setCountyData] = useState(null); // { name, population, populationLoading }
  const [countyAvgPrice, setCountyAvgPrice] = useState('');

  const [leadTier, setLeadTier] = useState('medium');
  const [commissionPct, setCommissionPct] = useState('3');
  const [result, setResult] = useState(null);

  // ─── City mode helpers ─────────────────────────────────────────────────────
  const addCity = async () => {
    const name = cityInput.trim();
    if (!name) return;
    const newCity = { name, population: null, populationLoading: true, avgClosingPrice: '' };
    setCities(prev => [...prev, newCity]);
    setCityInput('');
    setResult(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the approximate current population of ${name}${state ? ', ' + state : ''}? Reply with ONLY a single integer number, no commas, no text.`,
        response_json_schema: { type: 'object', properties: { population: { type: 'number' } } }
      });
      const pop = res?.population || null;
      setCities(prev => prev.map(c =>
        c.name === name && c.populationLoading ? { ...c, population: pop, populationLoading: false } : c
      ));
    } catch {
      setCities(prev => prev.map(c =>
        c.name === name && c.populationLoading ? { ...c, population: null, populationLoading: false } : c
      ));
    }
  };

  const removeCity = (index) => { setCities(prev => prev.filter((_, i) => i !== index)); setResult(null); };
  const updateClosingPrice = (index, val) => { setCities(prev => prev.map((c, i) => i === index ? { ...c, avgClosingPrice: val } : c)); setResult(null); };

  // ─── County mode helpers ───────────────────────────────────────────────────
  const lookupCounty = async () => {
    const name = countyInput.trim();
    if (!name) return;
    setCountyData({ name, population: null, populationLoading: true });
    setCountyAvgPrice('');
    setResult(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the total POPULATION (number of people / residents) of ${name}${state ? ', ' + state : ''}? Use US Census Bureau data. Do NOT return housing units, households, or square miles — return only the total number of PEOPLE living in this county. For reference: Monmouth County NJ = 651,000 people, Orange County CA = 3,190,000 people, Napa County CA = 137,000 people, a small rural county = 20,000-60,000 people. Return a single integer representing total residents only.`,
        response_json_schema: { type: 'object', properties: { population: { type: 'number' } } },
        add_context_from_internet: true
      });
      setCountyData({ name, population: res?.population || null, populationLoading: false });
    } catch {
      setCountyData({ name, population: null, populationLoading: false });
    }
  };

  const clearCounty = () => { setCountyData(null); setCountyAvgPrice(''); setResult(null); };

  // ─── Switch mode ───────────────────────────────────────────────────────────
  const switchMode = (m) => {
    setMode(m);
    setResult(null);
    setCities([]);
    setCityInput('');
    setCountyData(null);
    setCountyInput('');
    setCountyAvgPrice('');
  };

  // ─── Can calculate? ────────────────────────────────────────────────────────
  const canCalculate = mode === 'city'
    ? cities.length > 0 && cities.every(c => !c.populationLoading && c.avgClosingPrice)
    : countyData && !countyData.populationLoading && countyAvgPrice;

  // ─── Calculate ─────────────────────────────────────────────────────────────
  const calculate = () => {
    const isExclusive = mode === 'county'; // county → Territory Owner, city → City-Based Agent
    const leadMultiplier = { low: 0.5, medium: 1, high: 1.8 }[leadTier];

    let totalPop, avgPrice, numCities;
    if (mode === 'city') {
      numCities = cities.length;
      totalPop = cities.reduce((s, c) => s + (c.population || 50000), 0);
      avgPrice = cities.reduce((s, c) => s + (parseInt(c.avgClosingPrice) || 350000), 0) / numCities;
    } else {
      numCities = 1;
      totalPop = countyData.population || 100000;
      avgPrice = parseInt(countyAvgPrice) || 350000;
    }

    const avgPop = totalPop / numCities;
    const basePerUnit = avgPop < 50000 ? 500 : avgPop < 150000 ? 1200 : 2500;
    const buyIn = isExclusive ? Math.round(basePerUnit * numCities * 1.5 / 100) * 100 : 0;
    const monthlyFee = isExclusive ? 0 : Math.round(basePerUnit * numCities * 0.12 / 10) * 10;
    // 1 lead opportunity per 12,000 residents — scales directly with real population
    const baseLeads = Math.round(totalPop / 12000);
    const annualLeads = Math.round(baseLeads * leadMultiplier);
    const closedDeals = Math.round(annualLeads * 0.18);
    const agentCommission = (parseFloat(commissionPct) || 3) / 100;
    const gci = Math.round(closedDeals * avgPrice * agentCommission);
    const referralObligation = Math.round(gci * 0.20);
    const netGCI = gci - referralObligation;
    const annualCost = isExclusive ? Math.round(buyIn * 0.25) : monthlyFee * 12;
    const roi = annualCost > 0 ? Math.round(((netGCI - annualCost) / annualCost) * 100) : null;

    setResult({ buyIn, monthlyFee, annualLeads, closedDeals, gci, referralObligation, netGCI, roi, isExclusive, annualCost, avgPop: Math.round(totalPop / numCities), avgPrice: Math.round(avgPrice), numCities, totalPop });
  };

  return (
    <section className="py-20 px-4 bg-slate-900">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Calculator className="w-4 h-4" /> Territory Planning Tool
          </div>
          <h2 className="text-4xl font-serif font-bold text-white mb-4">Estimate Your Territory Investment</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Choose your territory type below. County-based agents become Territory Owners; city-based agents are City-Based Partners.
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

              {/* Mode Selector */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Territory Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => switchMode('city')}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-all text-sm font-semibold ${mode === 'city' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                  >
                    <Home className="w-5 h-5" />
                    City-Based Agent
                    <span className="text-xs font-normal opacity-75">Select individual cities</span>
                  </button>
                  <button
                    onClick={() => switchMode('county')}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-all text-sm font-semibold ${mode === 'county' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                  >
                    <Building2 className="w-5 h-5" />
                    Territory Owner
                    <span className="text-xs font-normal opacity-75">Claim a full county</span>
                  </button>
                </div>
                <p className={`text-xs mt-2 px-1 ${mode === 'county' ? 'text-orange-400' : 'text-blue-400'}`}>
                  {mode === 'city'
                    ? 'City-Based Agents pay a monthly participation fee per city.'
                    : 'Territory Owners make a one-time buy-in for exclusive county rights.'}
                </p>
              </div>

              {/* State */}
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

              {/* ── CITY MODE ── */}
              {mode === 'city' && (
                <>
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
                      <Button onClick={addCity} disabled={!cityInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-slate-500 text-xs mt-1">AI will look up the approximate population automatically.</p>
                  </div>

                  {cities.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Your Cities</p>
                      {cities.map((city, i) => (
                        <div key={i} className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-semibold">{city.name}</span>
                              {city.populationLoading ? (
                                <span className="flex items-center gap-1 text-slate-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Looking up...</span>
                              ) : city.population ? (
                                <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> ~{city.population.toLocaleString()}</span>
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
                </>
              )}

              {/* ── COUNTY MODE ── */}
              {mode === 'county' && (
                <>
                  {!countyData ? (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">County Name</label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                          placeholder="e.g. Orange County"
                          value={countyInput}
                          onChange={e => setCountyInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && lookupCounty()}
                        />
                        <Button onClick={lookupCounty} disabled={!countyInput.trim()} className="bg-orange-500 hover:bg-orange-600 text-white px-3">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">AI will look up the county population automatically.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-700/50 border border-orange-500/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-orange-400" />
                          <span className="text-white font-semibold text-sm">{countyData.name}{state ? `, ${state}` : ''}</span>
                          {countyData.populationLoading ? (
                            <span className="flex items-center gap-1 text-slate-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Looking up...</span>
                          ) : countyData.population ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> ~{countyData.population.toLocaleString()} residents</span>
                          ) : (
                            <span className="text-slate-500 text-xs">Population unknown</span>
                          )}
                        </div>
                        <button onClick={clearCounty} className="text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Avg. Closing Price in this County ($)</label>
                        <input
                          type="number"
                          className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                          placeholder="e.g. 375000"
                          value={countyAvgPrice}
                          onChange={e => { setCountyAvgPrice(e.target.value); setResult(null); }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Territory Owner Guarantee */}
                  <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-4 py-3 flex gap-3 items-start">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-emerald-300 text-sm font-semibold">Territory Owner Guarantee</p>
                      <p className="text-emerald-400/80 text-xs mt-0.5 leading-relaxed">
                        Receive at least <span className="font-bold text-emerald-300">5× your annual investment</span> in GCI from platform leads — or your next year's fees are on us.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Commission % */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Your Listing Commission %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.25"
                    className="w-28 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    placeholder="e.g. 3"
                    value={commissionPct}
                    onChange={e => { setCommissionPct(e.target.value); setResult(null); }}
                  />
                  <span className="text-slate-400 text-sm">% of closing price</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Agent's side of the commission used to calculate GCI.</p>
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
              {!canCalculate && (cities.length > 0 || countyData) && (
                <p className="text-slate-500 text-xs text-center -mt-2">
                  {mode === 'city' ? 'Enter an avg. closing price for each city to calculate.' : 'Enter the avg. closing price for your county to calculate.'}
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
                  <p className="text-lg">{mode === 'city' ? 'Add cities, enter closing prices, and click Calculate.' : 'Enter your county, add a closing price, and click Calculate.'}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Territory summary */}
                <div className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-3 text-xs text-slate-400 flex gap-4 flex-wrap">
                  {result.isExclusive
                    ? <span>County: <span className="text-white font-semibold">{countyData?.name}</span></span>
                    : <span><span className="text-white font-semibold">{result.numCities}</span> {result.numCities === 1 ? 'city' : 'cities'}</span>
                  }
                  <span>Total pop: <span className="text-white font-semibold">{result.totalPop.toLocaleString()}</span></span>
                  <span>Avg closing: <span className="text-white font-semibold">${result.avgPrice.toLocaleString()}</span></span>
                  <Badge className={result.isExclusive ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}>
                    {result.isExclusive ? 'Territory Owner' : 'City-Based Agent'}
                  </Badge>
                </div>

                {result.isExclusive ? (
                  <>
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
                    <Card className="bg-emerald-500/10 border-2 border-emerald-500/50">
                      <CardContent className="p-5 flex gap-4 items-start">
                        <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-emerald-300 font-bold text-sm">Territory Owner Guarantee</p>
                            <Badge className="bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs">Included</Badge>
                          </div>
                          <p className="text-emerald-400/90 text-xs leading-relaxed">
                            We guarantee you'll earn at least <span className="font-bold text-emerald-200">5× your annual investment</span> ({result.annualCost > 0 ? '$' + (result.annualCost * 5).toLocaleString() : '—'} in GCI) from platform-referred leads. If we fall short, <span className="font-bold text-emerald-200">your following year's fees are free.</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="bg-blue-500/10 border-blue-500/40">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">Suggested Monthly Fee</span>
                        <Badge className="bg-blue-600 text-white">City-Based Agent</Badge>
                      </div>
                      <div className="text-3xl font-bold text-white">${result.monthlyFee}/mo</div>
                      <p className="text-slate-400 text-xs mt-1">Per-city participation fee</p>
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
                      <p className="text-slate-500 text-xs">at {commissionPct || 3}% agent commission</p>
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