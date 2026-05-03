import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Calendar, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const VALUE_ITEMS = [
  'AI-assisted pricing support',
  'Inventory organization system',
  'Structured setup workflow',
  'Clear team task assignments',
  'Marketing support and item exposure tools',
  'Sale-day management tools',
  'Post-sale tracking and insights',
];

const TRANSFORMATION_ITEMS = [
  'Less time spent figuring things out',
  'More confidence in pricing decisions',
  'Clear direction for your team',
  'More organized inventory',
  'Better preparation before sale day',
  'A smoother, more controlled sale experience',
];

// ==========================================
// FORM
// ==========================================
function FormScreen({ offerType, onSubmit }) {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', salesPerMonth: '', biggestChallenge: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP6_OfferClose',
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Sales/mo: ${form.salesPerMonth} | Challenge: ${form.biggestChallenge} | Offer: ${offerType}`,
      });
    } catch (_) {}
    setSubmitting(false);
    onSubmit();
  };

  const isDemo = offerType === 'demo';

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${isDemo ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
        {isDemo ? <Calendar className="w-5 h-5 flex-shrink-0" /> : <Zap className="w-5 h-5 flex-shrink-0" />}
        <span className="text-sm font-semibold">
          {isDemo ? 'Booking a Demo — we\'ll send scheduling options shortly.' : 'Getting Started — we\'ll guide you through onboarding.'}
        </span>
      </div>

      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Let's Get You Set Up</h2>
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
        <div>
          <Label htmlFor="salesPerMonth">How many estate sales do you run per month? *</Label>
          <select
            id="salesPerMonth"
            required
            value={form.salesPerMonth}
            onChange={e => setForm({ ...form, salesPerMonth: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select…</option>
            {['1', '2–3', '4–6', '7+'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="biggestChallenge">Biggest challenge right now</Label>
          <select
            id="biggestChallenge"
            value={form.biggestChallenge}
            onChange={e => setForm({ ...form, biggestChallenge: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select…</option>
            {['Setup takes too long', 'Pricing is inconsistent', 'Team coordination', 'Marketing exposure', 'All of the above'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base mt-2">
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// CONFIRMATION
// ==========================================
function ConfirmationScreen({ offerType }) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">You're One Step Closer</h2>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-left">
        <p className="text-sm text-slate-700 leading-relaxed">
          We've received your information. Based on your responses, we'll help guide you through how Legacy Lane OS can improve your next estate sale.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          {offerType === 'demo'
          ? "You'll receive scheduling options shortly for your guided demo."
          : "We'll guide you through onboarding to get your first sale set up in Legacy Lane OS."}
        </p>
      </div>
      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base"
        onClick={() => window.location.href = '/LandingPageSaleLeak'}
      >
        Explore More Resources
      </Button>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function LandingPageOfferClose() {
  const [step, setStep] = useState('landing');
  const [offerType, setOfferType] = useState('');

  const goToForm = (type) => {
    setOfferType(type);
    setStep('form');
  };

  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'form' && <FormScreen offerType={offerType} onSubmit={() => setStep('confirmation')} />}
          {step === 'confirmation' && <ConfirmationScreen offerType={offerType} />}
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
            Legacy Lane OS
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            What If Your Next Estate Sale Was Faster, More Organized, and More Profitable?
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Instead of guessing, rushing, and rebuilding your process every time… what if you had a system guiding you step-by-step?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => goToForm('demo')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg"
            >
              <Calendar className="w-5 h-5 mr-2" /> Book a Demo
            </Button>
            <Button
              onClick={() => goToForm('start')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              <Zap className="w-5 h-5 mr-2" /> Get Started Now
            </Button>
          </div>
        </div>
      </section>

      {/* You've Seen the Problem */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { title: "You've Seen the Problem", body: "Most estate sale companies lose time through setup inefficiencies, pay more for helper labor than necessary, and miss value through rushed pricing and limited item exposure." },
            { title: "You've Seen What Better Looks Like", body: "A system-driven sale is faster, more organized, easier to manage, and produces more consistent results." },
            { title: "Now Here's the Next Step", body: "Run your next estate sale using Legacy Lane OS and experience the difference for yourself." },
          ].map(item => (
            <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value Stack */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">What You Get With Legacy Lane OS</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {VALUE_ITEMS.map(item => (
              <div key={item} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transformation */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">What Changes On Your Next Sale</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TRANSFORMATION_ITEMS.map(item => (
              <div key={item} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk Reversal */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto bg-slate-900 text-white rounded-3xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-serif font-bold">No Risk — Just a Better Way to Operate</h2>
          <p className="text-slate-300 leading-relaxed">
            If you don't feel more organized, more efficient, and more in control using Legacy Lane OS on your next sale, we'll continue working with you until you do.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-orange-50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Ready to Run Your Next Sale the Right Way?</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">
            Choose your next step below. Whether you want a guided demo or to get started immediately, we'll help you move forward.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => goToForm('demo')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white text-lg font-bold px-10 py-6 rounded-xl"
            >
              <Calendar className="w-5 h-5 mr-2" /> Book a Demo
            </Button>
            <Button
              onClick={() => goToForm('start')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/20"
            >
              <Zap className="w-5 h-5 mr-2" /> Get Started Now
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}