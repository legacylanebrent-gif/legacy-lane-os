import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Calendar, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const FIXES = [
  {
    title: 'Setup Drag',
    description: 'Reduce repetitive setup work with structured workflows, task lists, and sale preparation systems.',
  },
  {
    title: 'Pricing Pressure',
    description: 'Use AI-assisted pricing support to help your team make faster, more consistent pricing decisions.',
  },
  {
    title: 'Helper Confusion',
    description: 'Give helpers clearer responsibilities instead of relying on constant owner direction.',
  },
  {
    title: 'Rushed Marketing',
    description: 'Create better item descriptions, sale content, and exposure for higher-value items before sale day.',
  },
  {
    title: 'Owner Dependency',
    description: 'Stop making every sale depend on your memory, energy, and last-minute problem solving.',
  },
];

const SAME_WAY = [
  'Manual setup',
  'Rushed pricing',
  'Helpers asking what to do',
  'Marketing done late',
  'Owner managing every detail',
  'No clear post-sale insight',
];

const SYSTEM_WAY = [
  'Structured setup workflow',
  'AI-assisted pricing support',
  'Clear team task assignments',
  'Better item descriptions and exposure',
  'Less owner-dependent execution',
  'More repeatable sale process',
];

const OBJECTIONS = [
  {
    title: "I'm too busy right now.",
    description: 'That is exactly why the system matters. The goal is to reduce the busywork that keeps repeating every sale.',
  },
  {
    title: 'My team may not adopt it.',
    description: 'Legacy Lane OS is designed around simple workflows, task clarity, and guided support—not complicated software.',
  },
  {
    title: 'I already have a process.',
    description: 'A process is not the same as a system. The question is whether your current process saves time, improves consistency, and reduces owner dependency.',
  },
  {
    title: "I'm not sure it will pay for itself.",
    description: 'Between time saved, helper efficiency, pricing support, better marketing exposure, and referral revenue potential, Legacy Lane OS is designed to create value beyond software alone.',
  },
];

const NEXT_SALE_TIMING = ['This week', 'Next 2 weeks', 'This month', 'Not scheduled yet'];
const BIGGEST_FIX = ['Setup time', 'Pricing support', 'Team coordination', 'Inventory organization', 'Marketing exposure', 'Referral revenue', 'All of the above'];
const SALES_PER_MONTH = ['1', '2–3', '4–6', '7+'];

// ==========================================
// FORM SCREEN
// ==========================================
function FormScreen({ selectedPath, onSubmit }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', nextSaleTiming: '', biggestFix: '', salesPerMonth: '' });
  const [submitting, setSubmitting] = useState(false);

  const isDemo = selectedPath === 'demo';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP10_Retarget',
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Path: ${selectedPath} | Next Sale: ${form.nextSaleTiming} | Fix: ${form.biggestFix} | Sales/mo: ${form.salesPerMonth}`,
      });
    } catch (_) {}
    setSubmitting(false);
    onSubmit();
  };

  const SelectField = ({ id, label, options, required }) => (
    <div>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <select
        id={id}
        required={required}
        value={form[id]}
        onChange={e => setForm({ ...form, [id]: e.target.value })}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${isDemo ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
        {isDemo ? <Calendar className="w-5 h-5 flex-shrink-0" /> : <Zap className="w-5 h-5 flex-shrink-0" />}
        <span className="text-sm font-semibold">
          {isDemo ? "Booking a Demo — we'll send scheduling options shortly." : "We'll map Legacy Lane OS to your next actual sale."}
        </span>
      </div>

      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Map Legacy Lane OS to My Next Sale</h2>
        <p className="text-slate-500 mt-1 text-sm">Tell us a little about your next sale and we'll show where Legacy Lane OS can help first.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="company">Company Name *</Label>
          <Input id="company" required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Your company name" />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
        </div>
        <SelectField id="nextSaleTiming" label="When is your next estate sale?" options={NEXT_SALE_TIMING} required />
        <SelectField id="biggestFix" label="What do you most want to improve first?" options={BIGGEST_FIX} required />
        <SelectField id="salesPerMonth" label="How many sales do you usually run per month?" options={SALES_PER_MONTH} required />
        <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base mt-2">
          {submitting ? 'Submitting…' : 'Request My Next Sale Map'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// CONFIRMATION SCREEN
// ==========================================
function ConfirmationScreen() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Your Next Sale Map Request Is In</h2>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-2">
        <p className="text-sm text-slate-700 leading-relaxed">
          We received your request. The next step is to review your current bottleneck and show how Legacy Lane OS can help your next sale run with more structure, less chaos, and better control.
        </p>
      </div>
      <div className="space-y-3 pt-2">
        <p className="text-sm font-semibold text-slate-700">Want to schedule now?</p>
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base"
          onClick={() => window.location.href = '/LandingPageOfferClose'}
        >
          Schedule Demo
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function LandingPageRetarget() {
  const [step, setStep] = useState('landing');
  const [selectedPath, setSelectedPath] = useState('general');

  const goToForm = (path = 'general') => {
    setSelectedPath(path);
    setStep('form');
  };

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <FormScreen selectedPath={selectedPath} onSubmit={() => setStep('confirmation')} />
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <ConfirmationScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold px-4 py-1.5 rounded-full">
            You Saw Your Results. Now Fix the Leak.
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            Your Estate Sale Process Already Showed You Where It's Leaking.
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Now the question is simple: will your next sale run the same way — or will you use a system built to reduce setup time, improve pricing, organize your team, and create better sale-day control?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => goToForm('general')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Map Legacy Lane OS to My Next Sale
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('fixes')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              Show Me What Gets Fixed
            </Button>
          </div>
        </div>
      </section>

      {/* Based on Results */}
      <section className="py-12 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-2xl font-serif font-bold text-slate-900">Based on Your Results</h2>
          <p className="text-slate-600 leading-relaxed">
            Based on your quiz results, your estate sale process may be losing time and profit through setup inefficiency, pricing inconsistency, team coordination, or missed marketing exposure.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'System Level', value: 'Partially Systemized' },
              { label: 'Est. Leak Per Sale', value: '$500–$1,250' },
              { label: 'Time Saveable', value: '3–6 hours' },
              { label: 'Primary Leak', value: 'Setup inefficiency' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                <p className="text-base font-bold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worst Move */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 space-y-2">
          <h3 className="text-xl font-bold text-red-700">The Worst Move Is Doing Nothing</h3>
          <p className="text-slate-600 leading-relaxed">
            If your next sale runs exactly like your last sale, the same leaks repeat: the same setup drag, the same pricing pressure, the same helper confusion, the same rushed marketing, and the same missed opportunities.
          </p>
        </div>
      </section>

      {/* What Gets Fixed */}
      <section id="fixes" className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">What Legacy Lane OS Helps Fix First</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIXES.map(fix => (
              <div key={fix.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <h3 className="font-bold text-slate-900">{fix.title}</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{fix.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best time to fix */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-3xl mx-auto bg-slate-900 text-white rounded-2xl p-6 space-y-2">
          <h3 className="text-xl font-bold">This Is the Best Time to Fix It</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            The best time to improve your estate sale process is before the next sale starts. Once setup begins, the same old habits take over. Legacy Lane OS helps you prepare with a system before the pressure hits.
          </p>
        </div>
      </section>

      {/* Same Way vs System Way */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Your Next Sale: Same Way vs. System Way</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="font-bold text-slate-700 text-lg mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" /> Same Way
              </p>
              {SAME_WAY.map(item => (
                <div key={item} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <span className="text-red-400 font-bold text-base">✕</span>
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-bold text-slate-700 text-lg mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Legacy Lane OS Way
              </p>
              {SYSTEM_WAY.map(item => (
                <div key={item} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Don't need to change everything */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-3">
          <h2 className="text-2xl font-serif font-bold text-slate-900">You Don't Need to Change Everything at Once</h2>
          <p className="text-slate-600 leading-relaxed">
            Start with your next sale. We'll help identify the highest-impact area first — setup, pricing, team workflow, marketing, or inventory — and show how Legacy Lane OS can support that process.
          </p>
        </div>
      </section>

      {/* Objections */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Common Reasons Operators Wait</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {OBJECTIONS.map(obj => (
              <div key={obj.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <h3 className="font-bold text-slate-900">"{obj.title}"</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{obj.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-center space-y-3">
            <p className="font-semibold text-slate-800">The Next Step Is Small</p>
            <p className="text-sm text-slate-600">You do not need to commit to changing your whole business. Just let us map the system to your next sale.</p>
            <Button
              onClick={() => goToForm('general')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl"
            >
              Map It to My Next Sale
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">Let's Map This to Your Next Actual Sale</h2>
          <p className="text-slate-300 text-lg">Book a short demo or request a setup call and we'll walk through where Legacy Lane OS fits into your current process.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              onClick={() => goToForm('demo')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white text-lg font-bold px-10 py-6 rounded-xl"
            >
              <Calendar className="w-5 h-5 mr-2" /> Book My Demo
            </Button>
            <Button
              onClick={() => goToForm('setup_help')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              <Zap className="w-5 h-5 mr-2" /> Request Setup Help
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}