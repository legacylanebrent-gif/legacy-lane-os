import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ChevronRight, TrendingUp, Users, Repeat, BarChart3, Megaphone, Star, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STUCK_PROBLEMS = [
  'The owner is involved in every small decision',
  'Setup feels different every sale',
  'Pricing relies too heavily on memory or guesswork',
  'Helpers need constant direction',
  'Marketing gets rushed or inconsistent',
  'High-value items are not always highlighted properly',
  'There is no repeatable system from intake to sale day',
];

const SCALE_HABITS = [
  'They follow repeatable workflows',
  'They use systems instead of memory',
  'They create consistent pricing and marketing habits',
  'They reduce unnecessary manual setup work',
  'They give helpers clear tasks',
  'They capture buyer interest before sale day',
  'They use technology to make every sale easier than the last',
];

const QUESTIONS = [
  {
    id: 'ownerDependency',
    question: 'How dependent is each sale on you personally?',
    options: [
      { text: 'Everything depends on me', score: 1 },
      { text: 'Most decisions still come through me', score: 2 },
      { text: 'My team handles some things independently', score: 3 },
      { text: 'My team follows clear systems without me managing every step', score: 4 },
    ],
  },
  {
    id: 'repeatability',
    question: 'How repeatable is your setup process?',
    options: [
      { text: 'Every sale feels different', score: 1 },
      { text: 'We have habits but not a clear system', score: 2 },
      { text: 'We follow some checklists', score: 3 },
      { text: 'We have a clear, repeatable setup workflow', score: 4 },
    ],
  },
  {
    id: 'teamClarity',
    question: 'How clearly does your team know what to do?',
    options: [
      { text: 'I have to constantly direct them', score: 1 },
      { text: 'They usually know, but still need a lot of guidance', score: 2 },
      { text: 'They follow basic roles or task lists', score: 3 },
      { text: 'They follow defined workflows and responsibilities', score: 4 },
    ],
  },
  {
    id: 'pricingSystem',
    question: 'How consistent is your pricing process?',
    options: [
      { text: 'Mostly gut instinct or experience', score: 1 },
      { text: 'Some online lookups and judgment', score: 2 },
      { text: 'Some structured pricing habits', score: 3 },
      { text: 'AI-assisted or systemized pricing support', score: 4 },
    ],
  },
  {
    id: 'marketingSystem',
    question: 'How consistent is your marketing before each sale?',
    options: [
      { text: 'Rushed or last-minute', score: 1 },
      { text: 'Basic posts and photos', score: 2 },
      { text: 'Some planned marketing for each sale', score: 3 },
      { text: 'Structured marketing workflow with item highlights', score: 4 },
    ],
  },
  {
    id: 'highValueItems',
    question: 'How well do you expose higher-value items before sale day?',
    options: [
      { text: 'We probably miss opportunities', score: 1 },
      { text: 'We highlight some obvious items', score: 2 },
      { text: 'We usually identify and promote better items', score: 3 },
      { text: 'We have a system for identifying, describing, and promoting key items', score: 4 },
    ],
  },
  {
    id: 'setupTime',
    question: 'How much time could your team realistically save with better systems?',
    options: [
      { text: 'Less than 1 hour per sale', score: 4 },
      { text: '1–3 hours per sale', score: 3 },
      { text: '3–6 hours per sale', score: 2 },
      { text: '6–10+ hours per sale', score: 1 },
    ],
  },
  {
    id: 'growthCapacity',
    question: 'If you booked more sales next month, what would happen?',
    options: [
      { text: 'We would probably become overwhelmed', score: 1 },
      { text: 'We could handle it, but it would be stressful', score: 2 },
      { text: 'We could handle some growth', score: 3 },
      { text: 'We have the systems to scale cleanly', score: 4 },
    ],
  },
];

function getResult(score) {
  if (score <= 14) return {
    scaleLevel: 'Owner-Dependent Operation',
    levelColor: 'text-red-600',
    levelBg: 'bg-red-50 border-red-200',
    scaleRisk: 'Your business may be relying too heavily on you, memory, manual decisions, and sale-by-sale problem solving.',
    primaryBottleneck: 'Your biggest bottleneck is likely the lack of a repeatable operating system.',
    recommendation: 'Legacy Lane OS can help create structure around setup, pricing, team tasks, inventory, and marketing so your business is not dependent on starting over every sale.',
    nextStep: 'Start by systemizing your next sale from intake through sale day.',
  };
  if (score <= 24) return {
    scaleLevel: 'Partially Systemized Company',
    levelColor: 'text-orange-600',
    levelBg: 'bg-orange-50 border-orange-200',
    scaleRisk: 'You have some structure in place, but your growth may still be slowed by inconsistent workflows, manual setup, and owner involvement.',
    primaryBottleneck: 'Your biggest bottleneck is likely inconsistency across pricing, setup, team coordination, or marketing.',
    recommendation: 'Legacy Lane OS can help connect your current process into a more repeatable, AI-assisted operating system.',
    nextStep: 'Identify which part of your sale process is still causing the most drag.',
  };
  return {
    scaleLevel: 'Scale-Ready Operator',
    levelColor: 'text-green-600',
    levelBg: 'bg-green-50 border-green-200',
    scaleRisk: 'You are already operating with more structure than many estate sale companies, but optimization may still increase profitability and reduce workload.',
    primaryBottleneck: 'Your opportunity is likely in optimization, automation, better item exposure, and reducing remaining manual tasks.',
    recommendation: 'Legacy Lane OS can help you tighten your systems, improve consistency, and support higher sale volume without adding chaos.',
    nextStep: 'Look for the remaining 3–10 hours per sale that can be reduced through AI-assisted workflows.',
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
        <h2 className="text-2xl font-serif font-bold text-slate-900">Estate Sale Scaling Readiness Quiz</h2>
        <p className="text-slate-500 mt-1 text-sm">Answer a few questions to find out whether your company is built to scale or still too dependent on manual work.</p>
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
          : 'See My Results'}
      </Button>
    </div>
  );
}

// ==========================================
// LEAD CAPTURE SCREEN
// ==========================================
function LeadCaptureScreen({ onSubmit }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', salesPerMonth: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP3_ScaleReady',
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Sales/month: ${form.salesPerMonth}`,
      });
    } catch (_) {
      // continue even if lead save fails
    }
    setSubmitting(false);
    onSubmit(form);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Get Your Scaling Readiness Report</h2>
        <p className="text-slate-500 mt-1 text-sm">Enter your information to see whether your estate sale company is owner-dependent, partially systemized, or ready to scale.</p>
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

        <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base mt-2">
          {submitting ? 'Saving…' : 'Show My Results'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// RESULT SCREEN
// ==========================================
function ResultScreen({ scaleScore, onRetake }) {
  const result = getResult(scaleScore);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Estate Sale Scaling Readiness Report</p>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Here's Where You Stand</h2>
      </div>

      <div className={`rounded-2xl border-2 p-5 ${result.levelBg} space-y-1`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Scale Level</p>
        <p className={`text-2xl font-bold ${result.levelColor}`}>{result.scaleLevel}</p>
        <p className="text-sm text-slate-600">Score: {scaleScore} / 32</p>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Scale Risk', text: result.scaleRisk },
          { label: 'Primary Bottleneck', text: result.primaryBottleneck },
          { label: 'Recommendation', text: result.recommendation },
          { label: 'Next Step', text: result.nextStep },
        ].map(({ label, text }) => (
          <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
          Book a Legacy Lane OS Demo
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-300 text-slate-700 font-semibold py-5 rounded-xl"
          onClick={() => window.location.href = '/LandingPageSaleLeak'}
        >
          Take the Time & Profit Leak Quiz
        </Button>
        <button onClick={onRetake} className="w-full text-sm text-slate-400 hover:text-slate-600 text-center">
          Retake the Quiz
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function LandingPageScaleReady() {
  const [step, setStep] = useState('landing'); // landing → quiz → leadCapture → result
  const [scaleScore, setScaleScore] = useState(0);

  const handleQuizComplete = (total) => {
    setScaleScore(total);
    setStep('leadCapture');
  };

  const handleLeadSubmit = () => {
    setStep('result');
  };

  const handleRetake = () => {
    setScaleScore(0);
    setStep('landing');
  };

  // Non-landing steps → centered card
  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'quiz' && <QuizScreen onComplete={handleQuizComplete} />}
          {step === 'leadCapture' && <LeadCaptureScreen onSubmit={handleLeadSubmit} />}
          {step === 'result' && <ResultScreen scaleScore={scaleScore} onRetake={handleRetake} />}
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
            Free Scaling Readiness Assessment
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            The Difference Between a Busy Estate Sale Company and a Scalable One
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Most estate sale companies are not stuck because they lack experience. They are stuck because every sale still depends too much on the owner, memory, manual work, and last-minute decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('quiz')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Take the Scaling Readiness Quiz
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              See Why Companies Get Stuck
            </Button>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Being Busy Is Not the Same as Being Scalable</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Many estate sale owners are working hard, booking sales, managing clients, coordinating helpers, pricing items, marketing events, and handling sale-day chaos. But if every sale requires the owner to personally push everything forward, the company has a growth ceiling.
          </p>
        </div>
      </section>

      {/* Stuck vs Scale */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> Companies That Stay Stuck
            </h3>
            <div className="space-y-2">
              {STUCK_PROBLEMS.map(item => (
                <div key={item} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <span className="text-red-400 font-bold mt-0.5">✕</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> Companies That Scale
            </h3>
            <div className="space-y-2">
              {SCALE_HABITS.map(item => (
                <div key={item} className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Scaling Gap */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-xl font-bold text-slate-900">The Scaling Gap</h3>
            <p className="text-slate-600 leading-relaxed">
              Two companies can run the same number of sales and still be completely different businesses. One is owner-dependent, chaotic, and hard to grow. The other is structured, repeatable, and built to handle more volume.
            </p>
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-xl font-bold">Legacy Lane OS Helps Close That Gap</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Legacy Lane OS gives estate sale companies a done-for-you, AI-assisted operating system designed to reduce setup time, improve pricing support, create better marketing exposure, organize teams, and help owners stop rebuilding every sale from scratch.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-orange-50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Is Your Estate Sale Company Built to Scale?</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">
            Take the quick quiz to see whether your company is owner-dependent, partially systemized, or ready to scale.
          </p>
          <Button
            onClick={() => setStep('quiz')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/20"
          >
            Take the Scaling Readiness Quiz
          </Button>
        </div>
      </section>

      {/* Closing */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">Stop Rebuilding Every Sale from Scratch</h2>
          <p className="text-slate-300 text-lg">Find out where your biggest growth bottleneck is — and what to do about it.</p>
          <Button
            onClick={() => setStep('quiz')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            Start the Scaling Quiz Now
          </Button>
        </div>
      </section>

    </div>
  );
}