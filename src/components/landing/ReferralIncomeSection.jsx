import React, { useState } from 'react';
import { CheckCircle, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

const SITUATIONS = [
  { label: 'Probate / Estate', pct: 90 },
  { label: 'Downsizing / Senior Transition', pct: 85 },
  { label: 'Divorce', pct: 70 },
  { label: 'Relocation', pct: 80 },
  { label: 'Inheritance', pct: 75 },
];

export default function ReferralIncomeSection() {
  const [salesPerYear, setSalesPerYear] = useState(40);
  const [avgHomePrice, setAvgHomePrice] = useState(350000);
    const [conversionPct, setConversionPct] = useState(30);

  const agentCommission = avgHomePrice * 0.025; // ~2.5% buyer/seller side
  const referralFee = agentCommission * 0.25 * 0.30; // 25% referral fee, operator gets 30%
  const leadsPerYear = Math.round(salesPerYear * (conversionPct / 100));
  const annualIncome = Math.round(referralFee * leadsPerYear);
  const fiveYearIncome = annualIncome * 5;

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <section className="relative overflow-hidden">
      {/* Top attention banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-4 px-6 text-center">
        <p className="text-white font-bold text-lg tracking-wide">💰 BONUS INCOME OPPORTUNITY — Put $1,000's more in your pocket per year without increasing your effort</p>
      </div>

      {/* Hero intro */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-block bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold px-4 py-2 rounded-full">
            Real Estate Referral Income
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
            You're Already Sitting<br />On a Gold Mine.
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Every estate sale you run is tied to a real life transition — and most of those transitions lead to a home sale. You're already in the room. EstateSalen helps make sure you get paid for the introductions you're already making.
          </p>
        </div>
      </div>

      {/* Situation cards */}
      <div className="bg-slate-900 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <h3 className="text-white font-serif font-bold text-2xl text-center">How Often Does An Estate Sale Lead To A Home Sale?</h3>
          <p className="text-slate-400 text-center text-sm">The vast majority of estate sales involve one of these life situations — almost all of which lead to a real estate transaction.</p>
          <div className="grid sm:grid-cols-5 gap-3">
            {SITUATIONS.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
                <div className="text-3xl font-bold text-emerald-400">{s.pct}%</div>
                <p className="text-slate-300 text-xs font-medium leading-tight">{s.label}</p>
                <p className="text-slate-500 text-xs">lead to a home sale</p>
              </div>
            ))}
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-5 text-center space-y-2">
            <p className="text-emerald-300 font-bold text-lg">The family you're helping with a sale is often the same family that will list the home next month.</p>
            <p className="text-slate-400 text-sm">EstateSalen connects you with trusted real estate professionals so when that moment comes, you're the one who made the introduction — and you participate in the income.</p>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/30">
              🧮 Referral Income Calculator
            </div>
            <h3 className="text-3xl md:text-4xl font-serif font-bold text-white">How Much Could You Earn?</h3>
            <p className="text-emerald-100 text-lg">Adjust the sliders to match your business and see your potential referral income.</p>
          </div>

          {/* Sliders */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-white font-semibold text-sm">Estate Sales Per Year</label>
                  <span className="text-emerald-200 font-bold text-lg">{salesPerYear}</span>
                </div>
                <input type="range" min={5} max={150} step={5} value={salesPerYear}
                  onChange={e => setSalesPerYear(+e.target.value)}
                  className="w-full accent-white h-2 rounded-full cursor-pointer" />
                <div className="flex justify-between text-xs text-emerald-200">
                  <span>5</span><span>150</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-white font-semibold text-sm">Average Home Price In Your Area</label>
                  <span className="text-emerald-200 font-bold text-lg">{fmt(avgHomePrice)}</span>
                </div>
                <input type="range" min={100000} max={1500000} step={25000} value={avgHomePrice}
                  onChange={e => setAvgHomePrice(+e.target.value)}
                  className="w-full accent-white h-2 rounded-full cursor-pointer" />
                <div className="flex justify-between text-xs text-emerald-200">
                  <span>$100K</span><span>$1.5M</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-white font-semibold text-sm">% of Clients Without a Realtor When You Meet</label>
                  <span className="text-emerald-200 font-bold text-lg">{conversionPct}%</span>
                </div>
                <input type="range" min={10} max={80} step={5} value={conversionPct}
                  onChange={e => setConversionPct(+e.target.value)}
                  className="w-full accent-white h-2 rounded-full cursor-pointer" />
                <div className="flex justify-between text-xs text-emerald-200">
                  <span>10%</span><span>80%</span>
                </div>
              </div>

            </div>

            {/* Results */}
            <div className="border-t border-white/20 pt-6 grid sm:grid-cols-3 gap-4">
              <div className="bg-white/10 border border-white/20 rounded-xl p-5 text-center space-y-1">
                <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">Referrals Per Year</p>
                <p className="text-4xl font-bold text-white">{leadsPerYear}</p>
                <p className="text-emerald-300 text-xs">clients who go on to sell</p>
              </div>
              <div className="bg-white/15 border border-white/30 rounded-xl p-5 text-center space-y-1 ring-2 ring-white/30">
                <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">Est. Annual Income</p>
                <p className="text-4xl font-bold text-white">{fmt(annualIncome)}</p>
                <p className="text-emerald-300 text-xs">in referral fees per year</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-5 text-center space-y-1">
                <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">5-Year Potential</p>
                <p className="text-4xl font-bold text-white">{fmt(fiveYearIncome)}</p>
                <p className="text-emerald-300 text-xs">from relationships you already have</p>
              </div>
            </div>

            <p className="text-center text-emerald-200 text-xs opacity-70">* Estimates only. Based on ~2.5% agent commission side. Actual results vary by market, relationships, and referral agreements.</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-900 px-6 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          <h3 className="text-white font-serif font-bold text-2xl text-center">How EstateSalen Makes This Happen</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '01', icon: '🤝', title: 'You Run The Sale', desc: 'You help the family through their estate sale as you normally would. You build trust and relationship throughout the process.' },
              { step: '02', icon: '🔗', title: 'EstateSalen Connects You', desc: 'The platform matches you with a trusted, vetted real estate professional in your area who specializes in these exact transitions.' },
              { step: '03', icon: '💵', title: 'You Earn A Commission Portion', desc: 'When the home sells, you receive a portion of the commission via EstateSalen — Money is either direct deposited to you or you can use it to offset your subscriptions and services.' },
            ].map((item) => (
              <div key={item.step} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                <div className="absolute -top-3 left-5 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full">Step {item.step}</div>
                <div className="text-3xl pt-2">{item.icon}</div>
                <h4 className="text-white font-bold">{item.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <TrendingUp className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="text-white font-bold text-lg">You're Already In The Room. You Might As Well Get Paid For It.</p>
                <p className="text-slate-300 text-sm leading-relaxed">Most estate sale company owners refer families to real estate agents as a courtesy — and receive nothing in return. EstateSalen formalizes this relationship so that your trust, your introductions, and your referrals are appropriately compensated. This is income you're leaving on the table right now — without even realizing it.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              {[
                'No cold calling required',
                'No extra work involved',
                'No new skills needed',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-300 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}