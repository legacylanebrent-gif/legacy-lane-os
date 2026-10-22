import React from 'react';
import { CheckCircle, Link2, ShieldCheck } from 'lucide-react';

// Referral Rebuild Phase 1 — factual introduction copy only.
// No income calculations, no compensation promises, no per-transaction
// estimates. EstateSalen records and attributes introductions; it does not
// pay real estate referral fees.
const SITUATIONS = [
  { label: 'Probate / Estate' },
  { label: 'Downsizing / Senior Transition' },
  { label: 'Divorce' },
  { label: 'Relocation' },
  { label: 'Inheritance' },
];

export default function ReferralIncomeSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Top attention banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-4 px-6 text-center">
        <p className="text-white font-bold text-lg tracking-wide">Every Real Estate Introduction You Make — Properly Connected and Recorded</p>
      </div>

      {/* Hero intro */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-block bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold px-4 py-2 rounded-full">
            Real Estate Introductions
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
            You're Already<br />Making The Introduction.
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Most estate sales are tied to a life transition — and many of those transitions eventually include a home sale. EstateSalen helps you connect those families with trusted local real estate professionals, and keeps a record of every introduction you make.
          </p>
        </div>
      </div>

      {/* Situation cards */}
      <div className="bg-slate-900 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <h3 className="text-white font-serif font-bold text-2xl text-center">Estate Sales and Life Transitions Go Together</h3>
          <p className="text-slate-400 text-center text-sm">The families you serve during an estate sale are often navigating one of these life situations — the same situations that frequently lead to a real estate decision.</p>
          <div className="grid sm:grid-cols-5 gap-3">
            {SITUATIONS.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-slate-300 text-sm font-medium leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-5 text-center space-y-2">
            <p className="text-emerald-300 font-bold text-lg">The family you're helping with a sale is often the same family that will need a real estate professional next.</p>
            <p className="text-slate-400 text-sm">EstateSalen connects you with vetted professionals so when that moment comes, the introduction you made is recorded and attributed.</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/30">
              🤝 How Introductions Work
            </div>
            <h3 className="text-3xl md:text-4xl font-serif font-bold text-white">Connect the Family. The Introduction Is Recorded.</h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '01', icon: '🏠', title: 'You Run The Sale', desc: 'You help the family through their estate sale as you normally would, building trust throughout the process.' },
              { step: '02', icon: '🔗', title: 'EstateSalen Connects The Family', desc: 'The platform can match the family with a vetted local real estate professional who specializes in these exact transitions.' },
              { step: '03', icon: '📝', title: 'The Introduction Is Recorded', desc: 'Every introduction is tracked and attributed, so the record of who helped the family is preserved.' },
            ].map((item) => (
              <div key={item.step} className="relative bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 space-y-3">
                <div className="absolute -top-3 left-5 bg-white text-emerald-700 text-xs font-black px-3 py-1 rounded-full">Step {item.step}</div>
                <div className="text-3xl pt-2">{item.icon}</div>
                <h4 className="text-white font-bold">{item.title}</h4>
                <p className="text-emerald-50 text-sm leading-relaxed opacity-90">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
            <div className="flex items-start justify-center gap-3">
              <ShieldCheck className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <p className="text-emerald-50 text-sm leading-relaxed text-left">
                EstateSalen records and attributes introductions. EstateSalen is not a real estate brokerage and does not pay real estate referral fees. Any referral compensation depends on individual state licensure, appropriate brokerage affiliation, and written agreements between the licensed parties involved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why it matters */}
      <div className="bg-slate-900 px-6 py-14">
        <div className="max-w-4xl mx-auto space-y-8">
          <h3 className="text-white font-serif font-bold text-2xl text-center">Why a Recorded Introduction Matters</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
              <Link2 className="w-6 h-6 text-emerald-400" />
              <h4 className="text-white font-bold">Trust, Preserved</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Most operators refer families to real estate agents as a courtesy. A recorded introduction keeps the family's next professional aware of who helped them — and keeps your relationship with that family visible.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <h4 className="text-white font-bold">No Extra Work</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Keep running your sales the way you always have. When a family needs a real estate professional, the connection and its record are handled by the platform.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}