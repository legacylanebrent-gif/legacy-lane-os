import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, ChevronRight, ArrowRight, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const OPPORTUNITIES = [
  'Probate situations',
  'Downsizing clients',
  'Families preparing to sell',
  'Inherited homes',
  'Clients relocating or transitioning life stages',
];

const TODAY_ITEMS = [
  'Clients ask for agent recommendations',
  'You give a name (or don\'t)',
  'The home sells',
  'You receive nothing',
];

const WITH_SYSTEM_ITEMS = [
  'You partner with an exclusive agent',
  'Every referral is tracked',
  'Clients are introduced professionally',
  'You receive a referral fee when deals close',
];

const BUILT_IN_ITEMS = [
  'Referral tracking dashboard',
  'Client tagging by life stage',
  'Agent partnership management',
  'Follow-up reminders',
  'Revenue tracking',
];

const QUESTIONS = [
  {
    id: 'clientVolume',
    question: 'How many clients do you serve per month?',
    options: [
      { text: '1–2', score: 1 },
      { text: '3–5', score: 2 },
      { text: '6–10', score: 3 },
      { text: '10+', score: 4 },
    ],
  },
  {
    id: 'clientType',
    question: 'What % of your clients are likely to sell a home?',
    options: [
      { text: 'Low', score: 1 },
      { text: 'Some', score: 2 },
      { text: 'Most', score: 3 },
      { text: 'Nearly all', score: 4 },
    ],
  },
  {
    id: 'currentReferrals',
    question: 'Do you currently refer clients to agents?',
    options: [
      { text: 'No', score: 1 },
      { text: 'Occasionally', score: 2 },
      { text: 'Regularly', score: 3 },
      { text: 'Very frequently', score: 4 },
    ],
  },
  {
    id: 'tracking',
    question: 'Do you track referrals today?',
    options: [
      { text: 'No', score: 1 },
      { text: 'Informally', score: 2 },
      { text: 'Some tracking', score: 3 },
      { text: 'Structured tracking', score: 4 },
    ],
  },
  {
    id: 'agentRelationship',
    question: 'Do you have a preferred agent partner?',
    options: [
      { text: 'No', score: 1 },
      { text: 'A few contacts', score: 2 },
      { text: 'One main agent', score: 3 },
      { text: 'Strong exclusive relationship', score: 4 },
    ],
  },
];

function getResult(total) {
  if (total <= 8) return {
    level: 'Low Opportunity',
    levelColor: 'text-yellow-600',
    levelBg: 'bg-yellow-50 border-yellow-200',
    insight: 'You may not yet be consistently in position to generate referral income, but improving client capture and tracking could change that.',
  };
  if (total <= 14) return {
    level: 'Moderate Opportunity',
    levelColor: 'text-orange-600',
    levelBg: 'bg-orange-50 border-orange-200',
    insight: 'You are likely already generating referral opportunities but not fully capturing or tracking them.',
  };
  return {
    level: 'High Opportunity',
    levelColor: 'text-green-600',
    levelBg: 'bg-green-50 border-green-200',
    insight: 'Your company is strongly positioned to generate consistent referral income through a structured agent partnership.',
  };
}

// ==========================================
// QUIZ SCREEN
// ==========================================
function QuizScreen({ onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const question = QUESTIONS[currentQ];
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = { ...answers, [question.id]: question.options[selected].score };
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      const total = Object.values(newAnswers).reduce((sum, s) => sum + s, 0);
      onComplete(total);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Referral Opportunity Assessment</h2>
        <p className="text-slate-500 mt-1 text-sm">Find out whether your estate sale company is positioned to generate referral income through agent partnerships.</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
                ? 'border-green-500 bg-green-50 text-green-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === idx ? 'border-green-500' : 'border-slate-300'
              }`}>
                {selected === idx && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
              </div>
              {opt.text}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleNext}
        disabled={selected === null}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-xl"
      >
        {currentQ < QUESTIONS.length - 1
          ? <span className="flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></span>
          : 'See My Referral Potential'}
      </Button>
    </div>
  );
}

// ==========================================
// LEAD CAPTURE SCREEN
// ==========================================
function LeadCaptureScreen({ score, onSubmit }) {
  const [form, setForm] = useState({ name: '', company: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const result = getResult(score);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP8_ReferralEngine',
        contact_name: form.name,
        contact_email: form.email,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Referral Score: ${score} | Level: ${result.level}`,
      });
    } catch (_) {}
    setSubmitting(false);
    onSubmit(result);
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium">
        ✓ Assessment complete — enter your info to see your referral potential.
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">See Your Referral Potential</h2>
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
        <Button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-xl text-base mt-2">
          {submitting ? 'Saving…' : 'Show My Result'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// RESULT SCREEN
// ==========================================
function ResultScreen({ result, onRetake }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Referral Revenue Potential</p>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Here Is Where You Stand</h2>
      </div>

      <div className={`rounded-2xl border-2 p-5 ${result.levelBg} space-y-1`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Opportunity Level</p>
        <p className={`text-2xl font-bold ${result.levelColor}`}>{result.level}</p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Insight</p>
          <p className="text-sm text-slate-700 leading-relaxed">{result.insight}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recommendation</p>
          <p className="text-sm text-slate-700 leading-relaxed">Legacy Lane OS can help structure, track, and scale this opportunity into a repeatable revenue stream.</p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-xl text-base"
          onClick={() => window.location.href = '/LandingPageOfferClose'}
        >
          Learn How Legacy Lane OS Enables This
        </Button>
        <button onClick={onRetake} className="w-full text-sm text-slate-400 hover:text-slate-600 text-center">
          Retake the Assessment
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function LandingPageReferralEngine() {
  const [step, setStep] = useState('landing');
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);

  const handleQuizComplete = (total) => {
    setScore(total);
    setStep('leadCapture');
  };

  const handleLeadSubmit = (res) => {
    setResult(res);
    setStep('result');
  };

  const handleRetake = () => {
    setScore(0);
    setResult(null);
    setStep('landing');
  };

  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'quiz' && <QuizScreen onComplete={handleQuizComplete} />}
          {step === 'leadCapture' && <LeadCaptureScreen score={score} onSubmit={handleLeadSubmit} />}
          {step === 'result' && <ResultScreen result={result} onRetake={handleRetake} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 text-green-300 text-sm font-semibold px-4 py-1.5 rounded-full">
            Estate Sale Referral Revenue System
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            Turn Your Estate Sales Into a Second Revenue Stream
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Every estate sale client is connected to a real estate transaction. Legacy Lane OS helps you structure, track, and monetize those referrals through an exclusive agent partnership.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('quiz')}
              className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-green-500/30"
            >
              See If You're a Good Fit
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('opportunities')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              See the Opportunity
            </Button>
          </div>
        </div>
      </section>

      {/* Already Sitting On */}
      <section id="opportunities" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">You're Already Sitting on These Opportunities</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {OPPORTUNITIES.map(item => (
              <div key={item} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700 font-medium">
                <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">What Happens Today</h3>
            <div className="space-y-2">
              {TODAY_ITEMS.map((item, idx) => (
                <div key={item} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${idx === TODAY_ITEMS.length - 1 ? 'bg-red-50 border border-red-100 font-semibold text-red-700' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 ${idx === TODAY_ITEMS.length - 1 ? 'text-red-400' : 'text-slate-400'}`} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">What Happens With a Referral System</h3>
            <div className="space-y-2">
              {WITH_SYSTEM_ITEMS.map((item, idx) => (
                <div key={item} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${idx === WITH_SYSTEM_ITEMS.length - 1 ? 'bg-green-50 border border-green-100 font-semibold text-green-700' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  <CheckCircle className={`w-4 h-4 flex-shrink-0 ${idx === WITH_SYSTEM_ITEMS.length - 1 ? 'text-green-500' : 'text-slate-400'}`} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why This Works */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <h3 className="text-xl font-bold">Why This Works</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Estate sale companies are often the first trusted professional inside the home during a major life transition. That trust carries directly into real estate decisions.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Built Into Legacy Lane OS</h3>
            <div className="space-y-2">
              {BUILT_IN_ITEMS.map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-green-50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Could This Add Meaningful Revenue to Your Business?</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">
            Take the quick assessment to see whether your company is positioned to benefit from a real estate referral system.
          </p>
          <Button
            onClick={() => setStep('quiz')}
            className="bg-green-600 hover:bg-green-700 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-green-500/20"
          >
            Take the Referral Fit Quiz
          </Button>
        </div>
      </section>

    </div>
  );
}