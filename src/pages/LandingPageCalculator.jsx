import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, ChevronRight, Clock, DollarSign, BarChart3, Megaphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LEAK_CATEGORIES = [
  {
    icon: Clock,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    title: 'Setup Time',
    description: 'How many hours are spent organizing, staging, pricing, tagging, photographing, and preparing the sale?',
  },
  {
    icon: DollarSign,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    title: 'Helper Labor',
    description: 'How much are you paying people to price, sort, organize, tag, or complete work that could be reduced with better systems?',
  },
  {
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    title: 'Pricing Inefficiency',
    description: 'How much value may be missed when pricing is based on guesswork, rushed lookups, or inconsistent team judgment?',
  },
  {
    icon: Megaphone,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-200',
    title: 'Marketing Exposure',
    description: 'How many better items could sell for more if they had stronger descriptions, better promotion, and more buyer attention before sale day?',
  },
];

const QUESTIONS = [
  {
    id: 'salesPerMonth',
    question: 'How many estate sales do you typically run per month?',
    options: [
      { text: '1 sale', value: 1, score: 1 },
      { text: '2–3 sales', value: 2.5, score: 2 },
      { text: '4–6 sales', value: 5, score: 3 },
      { text: '7+ sales', value: 7, score: 4 },
    ],
  },
  {
    id: 'setupHours',
    question: 'How many hours does setup usually take per sale?',
    options: [
      { text: '1–3 hours', estimatedHours: 2, score: 1 },
      { text: '4–6 hours', estimatedHours: 5, score: 2 },
      { text: '7–10 hours', estimatedHours: 8.5, score: 3 },
      { text: '10+ hours', estimatedHours: 11, score: 4 },
    ],
  },
  {
    id: 'ownerHourlyValue',
    question: 'What is your time worth as the owner/operator?',
    options: [
      { text: '$50/hour', value: 50, score: 1 },
      { text: '$75/hour', value: 75, score: 2 },
      { text: '$100/hour', value: 100, score: 3 },
      { text: '$150/hour', value: 150, score: 4 },
    ],
  },
  {
    id: 'helperUse',
    question: 'Do you pay helpers for setup, pricing, tagging, staging, or organizing?',
    options: [
      { text: 'No helpers', helperCost: 0, score: 1 },
      { text: 'Occasionally', helperCost: 150, score: 2 },
      { text: 'Every sale', helperCost: 350, score: 3 },
      { text: 'Multiple helpers every sale', helperCost: 600, score: 4 },
    ],
  },
  {
    id: 'pricingMethod',
    question: 'How are most items priced?',
    options: [
      { text: 'Structured or AI-assisted pricing', pricingLeak: 100, score: 1 },
      { text: 'Online lookups and experience', pricingLeak: 250, score: 2 },
      { text: 'Team judgment / best guess', pricingLeak: 500, score: 3 },
      { text: 'Rushed pricing under time pressure', pricingLeak: 750, score: 4 },
    ],
  },
  {
    id: 'marketingExposure',
    question: 'How much effort goes into promoting higher-value items before the sale?',
    options: [
      { text: 'Strong item-level marketing', exposureLeak: 100, score: 1 },
      { text: 'Some featured items', exposureLeak: 250, score: 2 },
      { text: 'Basic photos/listing only', exposureLeak: 500, score: 3 },
      { text: 'Usually rushed or limited', exposureLeak: 750, score: 4 },
    ],
  },
  {
    id: 'repeatableSystem',
    question: 'Do you have a repeatable system for each sale?',
    options: [
      { text: 'Yes, clear system', systemMultiplier: 0.75, score: 1 },
      { text: 'Somewhat', systemMultiplier: 1.0, score: 2 },
      { text: 'Mostly manual', systemMultiplier: 1.15, score: 3 },
      { text: 'Every sale feels like starting over', systemMultiplier: 1.25, score: 4 },
    ],
  },
];

function calculateResults(answers) {
  const salesPerMonth = answers.salesPerMonth?.value || 1;
  const setupHours = answers.setupHours?.estimatedHours || 3;
  const hourlyValue = answers.ownerHourlyValue?.value || 75;
  const helperCost = answers.helperUse?.helperCost || 0;
  const pricingLeak = answers.pricingMethod?.pricingLeak || 250;
  const exposureLeak = answers.marketingExposure?.exposureLeak || 250;
  const multiplier = answers.repeatableSystem?.systemMultiplier || 1;

  const timeCost = setupHours * hourlyValue;
  const rawLeak = (timeCost + helperCost + pricingLeak + exposureLeak) * multiplier;
  const cappedLeak = Math.max(250, Math.min(rawLeak, 2000));
  const monthlyLeak = cappedLeak * salesPerMonth;

  let estimatedTimeSaved = '1–3 hours';
  if (setupHours >= 4 && setupHours <= 6) estimatedTimeSaved = '3–6 hours';
  if (setupHours > 6) estimatedTimeSaved = '6–10 hours';

  let leakCategory = 'Low Leak';
  let recommendation = 'You have some systems working, but Legacy Lane OS may still help reduce repetitive work and improve sale preparation.';
  if (cappedLeak >= 500 && cappedLeak < 1250) {
    leakCategory = 'Moderate Leak';
    recommendation = 'Your process is likely costing you through a mix of setup time, helper labor, pricing inefficiency, and missed item exposure. Legacy Lane OS can help streamline these areas.';
  }
  if (cappedLeak >= 1250) {
    leakCategory = 'High Leak';
    recommendation = 'Your current process may be creating significant time and profit loss each sale. Legacy Lane OS can help reduce manual setup, improve pricing support, and strengthen item-level marketing exposure.';
  }

  const leakSources = [
    { label: 'Setup Time', value: timeCost },
    { label: 'Helper Labor', value: helperCost },
    { label: 'Pricing Inefficiency', value: pricingLeak },
    { label: 'Marketing Exposure', value: exposureLeak },
  ].sort((a, b) => b.value - a.value);

  return {
    estimatedLeakPerSale: '$' + Math.round(cappedLeak).toLocaleString(),
    estimatedMonthlyLeak: '$' + Math.round(monthlyLeak).toLocaleString(),
    estimatedTimeSaved,
    leakCategory,
    primaryLeak: leakSources[0].label,
    recommendation,
    leakSources,
  };
}

// ==========================================
// CALCULATOR QUIZ
// ==========================================
function CalculatorQuiz({ onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const question = QUESTIONS[currentQ];
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const handleNext = () => {
    if (selected === null) return;
    const opt = question.options[selected];
    const newAnswers = { ...answers, [question.id]: opt };
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      onComplete(newAnswers);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Estate Sale Time & Profit Calculator</h2>
        <p className="text-slate-500 mt-1 text-sm">Estimate how much time and profit may be lost through setup, helper labor, pricing inefficiency, and missed item exposure.</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="text-lg font-semibold text-slate-900">{question.question}</p>

      <div className="space-y-3">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(idx)}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
              selected === idx
                ? 'border-orange-500 bg-orange-50 text-orange-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === idx ? 'border-orange-500' : 'border-slate-300'
              }`}>
                {selected === idx && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
              </div>
              {opt.text}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleNext}
        disabled={selected === null}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl"
      >
        {currentQ < QUESTIONS.length - 1
          ? <span className="flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></span>
          : 'Calculate My Leak'}
      </Button>
    </div>
  );
}

// ==========================================
// LEAD CAPTURE
// ==========================================
function LeadCaptureScreen({ onSubmit, results }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP4_Calculator',
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Leak: ${results.estimatedLeakPerSale}/sale | Category: ${results.leakCategory}`,
      });
    } catch (_) {
      // continue even if lead save fails
    }
    setSubmitting(false);
    onSubmit(form);
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 font-medium">
        ✓ Calculator complete — enter your info to see your full estimate.
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Get Your Sale Leak Estimate</h2>
        <p className="text-slate-500 mt-1 text-sm">Enter your information to view your estimated time savings, profit leak range, and recommended next step.</p>
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
        <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base mt-2">
          {submitting ? 'Saving…' : 'Show My Estimate'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// RESULT SCREEN
// ==========================================
function ResultScreen({ results, onRetake }) {
  const categoryColor = results.leakCategory === 'High Leak'
    ? 'text-red-600' : results.leakCategory === 'Moderate Leak'
    ? 'text-orange-500' : 'text-yellow-600';
  const categoryBg = results.leakCategory === 'High Leak'
    ? 'bg-red-50 border-red-200' : results.leakCategory === 'Moderate Leak'
    ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200';

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Estate Sale Time & Profit Estimate</p>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Here's Your Estimated Leak</h2>
      </div>

      <div className={`rounded-2xl border-2 p-5 ${categoryBg} space-y-1`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leak Category</p>
        <p className={`text-2xl font-bold ${categoryColor}`}>{results.leakCategory}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Per Sale</p>
          <p className="text-xl font-bold text-red-600">{results.estimatedLeakPerSale}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Per Month</p>
          <p className="text-xl font-bold text-red-600">{results.estimatedMonthlyLeak}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Time Saved</p>
          <p className="text-xl font-bold text-green-600">{results.estimatedTimeSaved}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Biggest Leak Source</p>
        <p className="text-base font-semibold text-slate-900">{results.primaryLeak}</p>
        <div className="space-y-1 pt-1">
          {results.leakSources.map((s, i) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{s.label}</span>
              <span className={`font-semibold ${i === 0 ? 'text-red-600' : 'text-slate-700'}`}>${Math.round(s.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Recommendation</p>
        <p className="text-sm text-slate-700 leading-relaxed">{results.recommendation}</p>
      </div>

      <div className="space-y-3 pt-2">
        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
          Book a Legacy Lane OS Demo
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-300 text-slate-700 font-semibold py-5 rounded-xl"
          onClick={() => window.location.href = '/LandingPageProfitLevers'}
        >
          See the 5 Profit Levers
        </Button>
        <button onClick={onRetake} className="w-full text-sm text-slate-400 hover:text-slate-600 text-center">
          Retake the Calculator
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function LandingPageCalculator() {
  const [step, setStep] = useState('landing');
  const [calcResults, setCalcResults] = useState(null);

  const handleCalcComplete = (answers) => {
    setCalcResults(calculateResults(answers));
    setStep('leadCapture');
  };

  const handleLeadSubmit = () => setStep('result');

  const handleRetake = () => {
    setCalcResults(null);
    setStep('landing');
  };

  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'calculator' && <CalculatorQuiz onComplete={handleCalcComplete} />}
          {step === 'leadCapture' && <LeadCaptureScreen onSubmit={handleLeadSubmit} results={calcResults} />}
          {step === 'result' && <ResultScreen results={calcResults} onRetake={handleRetake} />}
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
            Free Time & Profit Calculator
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            How Much Time and Money Is Your Next Estate Sale Really Costing You?
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Most estate sale companies lose profit in small, hidden ways: setup time, helper labor, pricing guesswork, rushed marketing, and missed exposure on better items. Take the quick calculator to estimate your potential leak.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('calculator')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Calculate My Sale Leak
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('leaks')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              See What Gets Calculated
            </Button>
          </div>
        </div>
      </section>

      {/* 4 Hidden Costs */}
      <section id="leaks" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">The 4 Hidden Costs This Calculator Measures</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {LEAK_CATEGORIES.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-2xl border p-6 space-y-3 ${item.bg}`}>
                  <Icon className={`w-7 h-7 ${item.color}`} />
                  <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Not one big mistake */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-slate-900">This Is Not About One Big Mistake</h2>
            <p className="text-slate-600 leading-relaxed">
              Most estate sale companies are not losing money in one obvious place. They are leaking profit through a series of small inefficiencies that repeat every single sale.
            </p>
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <h3 className="text-xl font-bold">Legacy Lane OS Helps Reduce the Leak</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Legacy Lane OS is a done-for-you, AI-assisted operating system designed to help estate sale companies save 3–10 hours per sale, reduce manual setup work, improve pricing support, create stronger item descriptions, and increase marketing exposure.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-orange-50 text-center space-y-6">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Want to See Your Estimated Sale Leak?</h2>
        <p className="text-slate-600 text-lg max-w-xl mx-auto">
          Answer a few quick questions and get a practical estimate of where your sale process may be costing you time and profit.
        </p>
        <Button
          onClick={() => setStep('calculator')}
          className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/20"
        >
          Start the Calculator
        </Button>
      </section>

      {/* Closing */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">Small Leaks Add Up Fast</h2>
          <p className="text-slate-300 text-lg">Find out exactly where your time and profit is going — and what you can do about it.</p>
          <Button
            onClick={() => setStep('calculator')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            Calculate My Sale Leak Now
          </Button>
        </div>
      </section>

    </div>
  );
}