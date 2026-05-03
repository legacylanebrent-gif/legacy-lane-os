import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const FOR_ITEMS = [
  'Cut 3–10 hours off sale setup',
  'Reduce manual pricing and organizing work',
  'Give helpers clearer direction',
  'Create better item descriptions and sale marketing',
  'Stop rebuilding every sale from scratch',
  'Operate with more consistency from intake to sale day',
];

const NOT_FOR_ITEMS = [
  'You are happy doing everything manually',
  'You do not want to use AI-assisted tools',
  'You are not interested in improving setup speed',
  'You do not want a more structured team workflow',
  'You are not actively trying to grow or improve your estate sale business',
];

const QUESTIONS = [
  {
    id: 'salesVolume',
    question: 'How many estate sales do you run per month?',
    options: [
      { text: 'Less than 1', score: 1 },
      { text: '1', score: 2 },
      { text: '2–3', score: 3 },
      { text: '4+', score: 4 },
    ],
  },
  {
    id: 'setupPain',
    question: 'How much of a problem is sale setup time?',
    options: [
      { text: 'Not a problem', score: 1 },
      { text: 'Minor issue', score: 2 },
      { text: 'Definitely slows us down', score: 3 },
      { text: 'One of our biggest problems', score: 4 },
    ],
  },
  {
    id: 'pricingPain',
    question: 'How much help would you want with pricing support?',
    options: [
      { text: 'None', score: 1 },
      { text: 'A little', score: 2 },
      { text: 'Some AI-assisted support would help', score: 3 },
      { text: 'Pricing support would be very valuable', score: 4 },
    ],
  },
  {
    id: 'teamPain',
    question: 'How much do you need better team organization?',
    options: [
      { text: 'We are already fully organized', score: 1 },
      { text: 'Some improvement would help', score: 2 },
      { text: 'We need clearer task flow', score: 3 },
      { text: 'This is a major need', score: 4 },
    ],
  },
  {
    id: 'marketingNeed',
    question: 'How important is better marketing exposure for your sales?',
    options: [
      { text: 'Not important', score: 1 },
      { text: 'Somewhat important', score: 2 },
      { text: 'Important', score: 3 },
      { text: 'Very important', score: 4 },
    ],
  },
  {
    id: 'growthIntent',
    question: 'Are you trying to grow or improve your estate sale business?',
    options: [
      { text: 'No, staying the same', score: 1 },
      { text: 'Maybe later', score: 2 },
      { text: 'Yes, we want to improve', score: 3 },
      { text: 'Yes, we want to scale', score: 4 },
    ],
  },
];

function getFitResult(total) {
  if (total <= 10) return {
    fitLevel: 'Not Quite Ready Yet',
    levelColor: 'text-yellow-600',
    levelBg: 'bg-yellow-50 border-yellow-200',
    fitReason: 'Your responses suggest Legacy Lane OS may not be urgent for your company right now, unless you are preparing for growth or want to reduce manual work.',
    bestNextStep: 'Start with the Time & Profit Calculator to see whether hidden setup or pricing leaks exist.',
    recommendation: 'You may benefit from education first before moving into a full operating system.',
  };
  if (total <= 18) return {
    fitLevel: 'Possible Fit',
    levelColor: 'text-orange-600',
    levelBg: 'bg-orange-50 border-orange-200',
    fitReason: 'You have signs of setup, pricing, marketing, or team workflow friction that Legacy Lane OS may help improve.',
    bestNextStep: 'Book a short demo to see whether the system matches your current workflow.',
    recommendation: 'Legacy Lane OS may help you reduce manual work and bring more structure to each sale.',
  };
  return {
    fitLevel: 'Strong Fit',
    levelColor: 'text-green-600',
    levelBg: 'bg-green-50 border-green-200',
    fitReason: 'Your company appears to have the exact needs Legacy Lane OS was built for: saving time, improving pricing support, organizing teams, strengthening marketing, and preparing for growth.',
    bestNextStep: 'Book a demo and map Legacy Lane OS to your next actual estate sale.',
    recommendation: 'You are likely a strong candidate for the guided onboarding path.',
  };
}

// ==========================================
// QUIZ SCREEN
// ==========================================
function FitQuizScreen({ onComplete }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const question = QUESTIONS[currentQ];
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const handleNext = () => {
    if (selected === null) return;
    const opt = question.options[selected];
    const newAnswers = { ...answers, [question.id]: opt.score };
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
        <h2 className="text-2xl font-serif font-bold text-slate-900">Legacy Lane OS Fit Finder</h2>
        <p className="text-slate-500 mt-1 text-sm">Answer a few questions to see whether Legacy Lane OS is the right next step for your estate sale company.</p>
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
          : 'See My Fit Result'}
      </Button>
    </div>
  );
}

// ==========================================
// LEAD CAPTURE SCREEN
// ==========================================
function LeadCaptureScreen({ fitScore, onSubmit }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  const result = getFitResult(fitScore);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP7_FitFinder',
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Fit Score: ${fitScore} | Fit Level: ${result.fitLevel}`,
      });
    } catch (_) {}
    setSubmitting(false);
    onSubmit(result);
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 font-medium">
        ✓ Quiz complete — enter your info to see your fit result.
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">See Your Fit Result</h2>
        <p className="text-slate-500 mt-1 text-sm">Enter your information to see whether Legacy Lane OS is a strong fit for your company.</p>
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
          {submitting ? 'Saving…' : 'Show My Fit Result'}
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
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Legacy Lane OS Fit Result</p>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Here Is Where You Stand</h2>
      </div>

      <div className={`rounded-2xl border-2 p-5 ${result.levelBg} space-y-1`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fit Level</p>
        <p className={`text-2xl font-bold ${result.levelColor}`}>{result.fitLevel}</p>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Why This Result', text: result.fitReason },
          { label: 'Best Next Step', text: result.bestNextStep },
          { label: 'Recommendation', text: result.recommendation },
        ].map(({ label, text }) => (
          <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base"
          onClick={() => window.location.href = '/LandingPageOfferClose'}
        >
          Book a Demo
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-300 text-slate-700 font-semibold py-5 rounded-xl"
          onClick={() => window.location.href = '/LandingPageCalculator'}
        >
          Calculate My Sale Leak
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
export default function LandingPageFitFinder() {
  const [step, setStep] = useState('landing');
  const [fitScore, setFitScore] = useState(0);
  const [fitResult, setFitResult] = useState(null);

  const handleQuizComplete = (total) => {
    setFitScore(total);
    setStep('leadCapture');
  };

  const handleLeadSubmit = (result) => {
    setFitResult(result);
    setStep('result');
  };

  const handleRetake = () => {
    setFitScore(0);
    setFitResult(null);
    setStep('landing');
  };

  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'fitQuiz' && <FitQuizScreen onComplete={handleQuizComplete} />}
          {step === 'leadCapture' && <LeadCaptureScreen fitScore={fitScore} onSubmit={handleLeadSubmit} />}
          {step === 'result' && <ResultScreen result={fitResult} onRetake={handleRetake} />}
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
            Free Fit Finder Quiz
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            Not Every Estate Sale Company Needs More Software. Some Need a Better Operating System.
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Legacy Lane OS is built for estate sale companies that want to save time, reduce setup chaos, improve pricing support, organize teams, and run more repeatable sales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('fitQuiz')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Take the Fit Finder Quiz
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('fit')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              See Who It's Built For
            </Button>
          </div>
        </div>
      </section>

      {/* For / Not For */}
      <section id="fit" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" /> Built For Companies That Want To:
            </h2>
            <div className="space-y-2">
              {FOR_ITEMS.map(item => (
                <div key={item} className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-400" /> Probably Not For You If:
            </h2>
            <div className="space-y-2">
              {NOT_FOR_ITEMS.map(item => (
                <div key={item} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Real Question */}
      <section className="py-16 px-6 bg-slate-50 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-serif font-bold text-slate-900">The Real Question</h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Do you need another tool — or do you need a repeatable system that helps every sale run cleaner, faster, and with less owner-dependent chaos?
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">Find Out If Legacy Lane OS Fits Your Business</h2>
          <p className="text-slate-300 text-lg">Take the quick quiz and see whether your company is a strong fit, a possible fit, or not quite ready yet.</p>
          <Button
            onClick={() => setStep('fitQuiz')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            Start Fit Finder
          </Button>
        </div>
      </section>

    </div>
  );
}