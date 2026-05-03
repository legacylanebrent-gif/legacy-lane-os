import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BEFORE_ITEMS = [
  'Setup takes hours longer than expected',
  'Pricing feels rushed or inconsistent',
  'Helpers constantly ask what to do',
  'Items get missed or underpriced',
  'Marketing is last-minute',
  'Every sale feels like starting over',
  'Stress builds as sale day approaches',
];

const AFTER_ITEMS = [
  'Setup is faster and structured',
  'Pricing is supported and more consistent',
  'Team follows clear tasks and workflows',
  'Inventory is more organized and visible',
  'Marketing is easier and more effective',
  'Each sale improves on the last',
  'You feel in control before doors open',
];

const QUESTIONS = [
  {
    id: 'setupExperience',
    question: 'How does setup usually feel?',
    options: [
      { text: 'Chaotic and stressful', score: 1 },
      { text: 'Busy but manageable', score: 2 },
      { text: 'Somewhat organized', score: 3 },
      { text: 'Structured and controlled', score: 4 },
    ],
  },
  {
    id: 'pricingConfidence',
    question: 'How confident are you in pricing consistency?',
    options: [
      { text: 'Not very confident', score: 1 },
      { text: 'Sometimes confident', score: 2 },
      { text: 'Mostly confident', score: 3 },
      { text: 'Very confident with support', score: 4 },
    ],
  },
  {
    id: 'teamCoordination',
    question: 'How well does your team operate during setup?',
    options: [
      { text: 'Constant direction needed', score: 1 },
      { text: 'Some independence', score: 2 },
      { text: 'Mostly clear roles', score: 3 },
      { text: 'Fully structured workflow', score: 4 },
    ],
  },
  {
    id: 'inventoryControl',
    question: 'How organized is your inventory during setup?',
    options: [
      { text: 'Disorganized', score: 1 },
      { text: 'Somewhat organized', score: 2 },
      { text: 'Mostly organized', score: 3 },
      { text: 'Fully tracked and structured', score: 4 },
    ],
  },
  {
    id: 'marketingPrep',
    question: 'How prepared is your marketing before the sale?',
    options: [
      { text: 'Last-minute', score: 1 },
      { text: 'Basic preparation', score: 2 },
      { text: 'Planned content', score: 3 },
      { text: 'Structured marketing system', score: 4 },
    ],
  },
  {
    id: 'stressLevel',
    question: 'How do you feel the day before the sale?',
    options: [
      { text: 'Overwhelmed', score: 1 },
      { text: 'Stressed', score: 2 },
      { text: 'Prepared but busy', score: 3 },
      { text: 'Confident and in control', score: 4 },
    ],
  },
];

function getResult(total) {
  if (total <= 10) return {
    currentState: 'Chaotic and Manual',
    futureState: 'Structured and Controlled',
    currentColor: 'text-red-600',
    currentBg: 'bg-red-50 border-red-200',
    futureColor: 'text-green-600',
    futureBg: 'bg-green-50 border-green-200',
    gapInsight: 'Your process is likely costing you time, energy, and consistency because each sale requires too much manual effort.',
  };
  if (total <= 18) return {
    currentState: 'Partially Organized',
    futureState: 'Fully Systemized',
    currentColor: 'text-orange-600',
    currentBg: 'bg-orange-50 border-orange-200',
    futureColor: 'text-green-600',
    futureBg: 'bg-green-50 border-green-200',
    gapInsight: 'You have some structure, but inconsistencies are still creating stress and inefficiency.',
  };
  return {
    currentState: 'Mostly Controlled',
    futureState: 'Optimized and Scalable',
    currentColor: 'text-cyan-600',
    currentBg: 'bg-cyan-50 border-cyan-200',
    futureColor: 'text-green-600',
    futureBg: 'bg-green-50 border-green-200',
    gapInsight: 'You are ahead of many companies, but there is still room to reduce effort and improve consistency.',
  };
}

// ==========================================
// QUIZ
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
        <h2 className="text-2xl font-serif font-bold text-slate-900">Estate Sale Transformation Assessment</h2>
        <p className="text-slate-500 mt-1 text-sm">Answer a few questions to see how your current process compares to a fully controlled, system-driven estate sale.</p>
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
// LEAD CAPTURE
// ==========================================
function LeadCaptureScreen({ onSubmit, score }) {
  const [form, setForm] = useState({ name: '', company: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP5_ChaosToControl',
        contact_name: form.name,
        contact_email: form.email,
        intent: 'estate_sale',
        notes: `Company: ${form.company} | Transformation Score: ${score}/24`,
      });
    } catch (_) {}
    setSubmitting(false);
    onSubmit();
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 font-medium">
        ✓ Assessment complete — enter your info to see your transformation potential.
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">See Your Transformation Potential</h2>
        <p className="text-slate-500 mt-1 text-sm">Enter your info to see how your current process compares — and what your next sale could feel like with a system in place.</p>
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
        <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base mt-2">
          {submitting ? 'Saving…' : 'Show My Results'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// RESULT
// ==========================================
function ResultScreen({ score, onRetake }) {
  const result = getResult(score);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Estate Sale Transformation Score</p>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Here's Where You Stand</h2>
        <p className="text-sm text-slate-500">Score: {score} / 24</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl border-2 p-4 ${result.currentBg}`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Current State</p>
          <p className={`text-lg font-bold ${result.currentColor}`}>{result.currentState}</p>
        </div>
        <div className={`rounded-2xl border-2 p-4 ${result.futureBg}`}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Potential State</p>
          <p className={`text-lg font-bold ${result.futureColor}`}>{result.futureState}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gap Insight</p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.gapInsight}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recommendation</p>
        <p className="text-sm text-slate-700 leading-relaxed">Legacy Lane OS helps transform estate sales from chaotic, manual processes into organized, repeatable, system-driven operations.</p>
      </div>

      <div className="space-y-3 pt-2">
        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
          See How Legacy Lane OS Creates Control
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-300 text-slate-700 font-semibold py-5 rounded-xl"
          onClick={() => window.location.href = '/LandingPageCalculator'}
        >
          Calculate Your Time & Profit Leak
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
export default function LandingPageChaosToControl() {
  const [step, setStep] = useState('landing');
  const [transformScore, setTransformScore] = useState(0);

  const handleQuizComplete = (total) => {
    setTransformScore(total);
    setStep('leadCapture');
  };

  const handleRetake = () => {
    setTransformScore(0);
    setStep('landing');
  };

  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'quiz' && <QuizScreen onComplete={handleQuizComplete} />}
          {step === 'leadCapture' && <LeadCaptureScreen onSubmit={() => setStep('result')} score={transformScore} />}
          {step === 'result' && <ResultScreen score={transformScore} onRetake={handleRetake} />}
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
            Free Transformation Assessment
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            What Would Your Estate Sales Look Like If Everything Just… Worked?
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            No scrambling. No guesswork. No rebuilding the process every time. Just organized, efficient, profitable estate sales that run the way they should.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('quiz')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              See What Your Next Sale Could Look Like
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              See the Difference
            </Button>
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section id="comparison" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">The Difference Between Chaos and Control</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" /> Before (Typical Sale)
              </h3>
              {BEFORE_ITEMS.map(item => (
                <div key={item} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <span className="text-red-400 font-bold mt-0.5">✕</span>
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> After (System-Driven Sale)
              </h3>
              {AFTER_ITEMS.map(item => (
                <div key={item} className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Not about working harder */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-slate-900">It's Not About Working Harder</h2>
            <p className="text-slate-600 leading-relaxed">
              Most estate sale owners are already working hard. The difference is whether your effort is supported by a system — or wasted on repetitive, manual tasks.
            </p>
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <h3 className="text-xl font-bold">Legacy Lane OS Turns Chaos Into Control</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Legacy Lane OS is a done-for-you, AI-assisted operating system that helps estate sale companies reduce setup time, organize inventory, support pricing decisions, streamline team workflows, and improve marketing without adding complexity.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-orange-50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">How Close Are You to a Controlled Sale?</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">
            Take the quick assessment to see how your current process compares — and what your next sale could look like with the right system in place.
          </p>
          <Button
            onClick={() => setStep('quiz')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/20"
          >
            Start the Transformation Assessment
          </Button>
        </div>
      </section>

      {/* Closing */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">Stop Starting Over Every Sale</h2>
          <p className="text-slate-300 text-lg">Find out where your process stands — and what it could feel like to run a controlled, system-driven sale.</p>
          <Button
            onClick={() => setStep('quiz')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            Take the Assessment Now
          </Button>
        </div>
      </section>

    </div>
  );
}