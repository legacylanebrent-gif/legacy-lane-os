import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, BarChart3, Clock, DollarSign, Eye, Percent, Zap } from 'lucide-react';

const LEVERS = [
  {
    icon: Eye,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    title: 'Inventory Visibility',
    description: "If you don't fully understand what you have, you can't price or market it effectively."
  },
  {
    icon: DollarSign,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-200',
    title: 'Smart Pricing',
    description: 'Pricing determines results. Guessing leads to missed value.'
  },
  {
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    title: 'Buyer Exposure',
    description: 'More eyes on the right items creates better outcomes.'
  },
  {
    icon: Percent,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    title: 'Dynamic Discounts',
    description: 'Structured markdowns outperform reactive decisions.'
  },
  {
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    title: 'Setup Efficiency',
    description: 'Time is profit. Faster setup means more opportunity.'
  },
];

const SCORECARD_QUESTIONS = [
  {
    id: 'inventory',
    question: 'How do you track inventory during setup?',
    options: [
      { text: 'Mostly mental', score: 1 },
      { text: 'Notes or spreadsheets', score: 2 },
      { text: 'Some digital tools', score: 3 },
      { text: 'Structured system', score: 4 },
      { text: 'Fully optimized system', score: 5 },
    ]
  },
  {
    id: 'pricing',
    question: 'How are items priced?',
    options: [
      { text: 'Gut instinct', score: 1 },
      { text: 'Quick lookups', score: 2 },
      { text: 'Team judgment', score: 3 },
      { text: 'Structured system', score: 4 },
      { text: 'AI-assisted pricing', score: 5 },
    ]
  },
  {
    id: 'exposure',
    question: 'How do you promote high-value items?',
    options: [
      { text: 'Basic posts', score: 1 },
      { text: 'General listing', score: 2 },
      { text: 'Some highlights', score: 3 },
      { text: 'Targeted exposure', score: 4 },
      { text: 'Strategic system', score: 5 },
    ]
  },
  {
    id: 'discount',
    question: 'How do you handle discounts?',
    options: [
      { text: 'Random', score: 1 },
      { text: 'Based on feel', score: 2 },
      { text: 'Some structure', score: 3 },
      { text: 'Planned', score: 4 },
      { text: 'Strategic system', score: 5 },
    ]
  },
  {
    id: 'setup',
    question: 'How efficient is your setup process?',
    options: [
      { text: 'Chaotic', score: 1 },
      { text: 'Inconsistent', score: 2 },
      { text: 'Repeatable but slow', score: 3 },
      { text: 'Organized', score: 4 },
      { text: 'Highly optimized', score: 5 },
    ]
  },
];

const PROFIT_QUESTIONS = [
  {
    id: 'hours',
    question: 'How many hours does setup take?',
    options: [
      { text: '1–3 hours', score: 1 },
      { text: '4–6 hours', score: 2 },
      { text: '7–10 hours', score: 3 },
      { text: '10+ hours', score: 4 },
    ]
  },
  {
    id: 'helpers',
    question: 'Do you pay helpers for setup or pricing?',
    options: [
      { text: 'No', score: 1 },
      { text: 'Sometimes', score: 2 },
      { text: 'Every sale', score: 3 },
      { text: 'Multiple helpers', score: 4 },
    ]
  },
  {
    id: 'pricingConfidence',
    question: 'How confident are you in your pricing?',
    options: [
      { text: 'Very confident', score: 1 },
      { text: 'Somewhat', score: 2 },
      { text: 'Not very', score: 3 },
      { text: 'Often guessing', score: 4 },
    ]
  },
  {
    id: 'marketing',
    question: 'Time spent marketing items?',
    options: [
      { text: '<1 hour', score: 1 },
      { text: '1–3 hours', score: 2 },
      { text: '4–6 hours', score: 3 },
      { text: '7+ hours', score: 4 },
    ]
  },
];

function QuizPanel({ title, subtitle, questions, onComplete, accentColor = 'orange' }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);

  const question = questions[currentQ];
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / questions.length) * 100;

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = { ...answers, [question.id]: question.options[selected].score };
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      const total = Object.values(newAnswers).reduce((sum, s) => sum + s, 0);
      onComplete(total);
    }
  };

  const accent = accentColor === 'cyan'
    ? { btn: 'bg-cyan-500 hover:bg-cyan-600', border: 'border-cyan-500', bar: 'bg-cyan-500', selected: 'border-cyan-500 bg-cyan-50 text-cyan-900' }
    : { btn: 'bg-orange-500 hover:bg-orange-600', border: 'border-orange-500', bar: 'bg-orange-500', selected: 'border-orange-500 bg-orange-50 text-orange-900' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">{title}</h2>
        <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {currentQ + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className={`${accent.bar} h-2 rounded-full transition-all duration-300`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="text-lg font-semibold text-slate-900">{question.question}</p>

      <div className="space-y-3">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(idx)}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
              selected === idx ? accent.selected : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === idx ? `${accent.border} bg-current` : 'border-slate-300'
              }`}>
                {selected === idx && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              {opt.text}
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleNext}
        disabled={selected === null}
        className={`w-full ${accent.btn} text-white font-bold py-5 rounded-xl`}
      >
        {currentQ < questions.length - 1 ? (
          <span className="flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></span>
        ) : 'See My Results'}
      </Button>
    </div>
  );
}

function ResultPanel({ scorecardScore, profitScore, onRetake }) {
  const systemLevel = scorecardScore <= 10 ? 'No System' : scorecardScore <= 18 ? 'Partially Systemized' : 'Strong System';
  const systemColor = scorecardScore <= 10 ? 'text-red-600' : scorecardScore <= 18 ? 'text-orange-500' : 'text-green-600';
  const systemBg = scorecardScore <= 10 ? 'bg-red-50 border-red-200' : scorecardScore <= 18 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200';

  let estimatedLoss, timeSaved;
  if (profitScore <= 6) {
    estimatedLoss = '$250–$500 per sale';
    timeSaved = '1–3 hours';
  } else if (profitScore <= 10) {
    estimatedLoss = '$500–$1,250 per sale';
    timeSaved = '3–6 hours';
  } else {
    estimatedLoss = '$1,250–$2,000 per sale';
    timeSaved = '6–10 hours';
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Estate Sale Efficiency Report</p>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Here's What We Found</h2>
      </div>

      <div className={`rounded-2xl border-2 p-5 ${systemBg} space-y-1`}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">System Strength</p>
        <p className={`text-2xl font-bold ${systemColor}`}>{systemLevel}</p>
        <p className="text-sm text-slate-600">Score: {scorecardScore} / 25</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Estimated Leak</p>
          <p className="text-xl font-bold text-red-600">{estimatedLoss}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Time You Could Save</p>
          <p className="text-xl font-bold text-green-600">{timeSaved} / sale</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm text-slate-700 leading-relaxed">
          Your current system is creating unnecessary time loss, labor cost, and pricing inefficiencies. Legacy Lane OS helps streamline setup, improve pricing, and reduce manual workload.
        </p>
        <div className="space-y-2">
          {['Save 3–10 hours per sale setup', 'Reduce helper labor with structured workflows', 'Improve pricing confidence with AI-assisted tools', 'Market items more effectively to maximize value'].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
        See How Legacy Lane OS Works
      </Button>
      <button onClick={onRetake} className="w-full text-sm text-slate-400 hover:text-slate-600 text-center">
        Retake the Quiz
      </button>
    </div>
  );
}

export default function LandingPageProfitLevers() {
  const [step, setStep] = useState('landing'); // landing → scorecard → profitQuiz → result
  const [scorecardScore, setScorecardScore] = useState(0);
  const [profitScore, setProfitScore] = useState(0);

  const handleScorecardComplete = (total) => {
    setScorecardScore(total);
    setStep('profitQuiz');
  };

  const handleProfitComplete = (total) => {
    setProfitScore(total);
    setStep('result');
  };

  const handleRetake = () => {
    setScorecardScore(0);
    setProfitScore(0);
    setStep('landing');
  };

  // Quiz / Result overlay
  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'scorecard' && (
            <QuizPanel
              title="Estate Sale System Scorecard"
              subtitle="Answer a few quick questions to see how strong your current system really is."
              questions={SCORECARD_QUESTIONS}
              onComplete={handleScorecardComplete}
              accentColor="orange"
            />
          )}
          {step === 'profitQuiz' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                ✓ Scorecard complete — now let's estimate what your process may be costing you.
              </div>
              <QuizPanel
                title="Time & Profit Leak Quiz"
                subtitle="Now let's estimate what your current process may be costing you."
                questions={PROFIT_QUESTIONS}
                onComplete={handleProfitComplete}
                accentColor="cyan"
              />
            </div>
          )}
          {step === 'result' && (
            <ResultPanel
              scorecardScore={scorecardScore}
              profitScore={profitScore}
              onRetake={handleRetake}
            />
          )}
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
            Free 2-Minute Assessment
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            The 5 Profit Levers That Control Every Estate Sale
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Most estate sale companies focus on the sale itself… but the real difference between average and high-performing companies comes down to how well they control these 5 areas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('scorecard')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Take the 2-Minute System Scorecard
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('levers')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              Learn the 5 Profit Levers
            </Button>
          </div>
        </div>
      </section>

      {/* Connector text */}
      <section className="py-10 px-6 bg-slate-50 text-center">
        <p className="text-xl text-slate-700 font-serif max-w-2xl mx-auto">
          "If you've ever felt like some sales go great… and others don't… it's not random. It's your system."
        </p>
      </section>

      {/* 5 Levers */}
      <section id="levers" className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">The 5 Profit Levers of Every Estate Sale</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {LEVERS.map((lever, idx) => {
              const Icon = lever.icon;
              return (
                <div key={lever.title} className={`rounded-2xl border p-6 space-y-3 ${lever.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-widest ${lever.color}`}>Lever {idx + 1}</span>
                  </div>
                  <Icon className={`w-7 h-7 ${lever.color}`} />
                  <h3 className="font-bold text-slate-900 text-lg">{lever.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{lever.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mid-page connector + CTA */}
      <section className="py-16 px-6 bg-slate-50 text-center space-y-6">
        <p className="text-xl text-slate-700 font-serif max-w-xl mx-auto">
          "If each sale feels like starting over… you don't have a system yet."
        </p>
        <Button
          onClick={() => setStep('scorecard')}
          className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/20"
        >
          Find Out Which Lever Is Costing You the Most
        </Button>
      </section>

      {/* Closing CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">What Is Your Current System Actually Worth?</h2>
          <p className="text-slate-300 text-lg">Take the free 2-minute scorecard and find out which of the 5 profit levers is holding your business back most.</p>
          <Button
            onClick={() => setStep('scorecard')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            Start the Scorecard Now
          </Button>
        </div>
      </section>

    </div>
  );
}