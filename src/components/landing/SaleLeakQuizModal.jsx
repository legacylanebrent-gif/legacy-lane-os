import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, DollarSign } from 'lucide-react';

const QUESTIONS = [
  {
    id: 1,
    question: 'How many estate sales do you run per month?',
    options: ['1', '2–3', '4–6', '7+'],
    scores:   [0,    1,     2,     3]
  },
  {
    id: 2,
    question: 'How many hours do you typically spend setting up each sale before doors open?',
    options: ['1–3 hours', '4–6 hours', '7–10 hours', '10+ hours'],
    scores:   [0,           1,           2,             3]
  },
  {
    id: 3,
    question: 'Do you pay helpers to price, sort, tag, stage, or organize items?',
    options: ['No, mostly myself', 'Yes, occasionally', 'Yes, every sale', 'Yes, multiple helpers every sale'],
    scores:   [0,                   1,                   2,                 3]
  },
  {
    id: 4,
    question: 'How do you currently price most items?',
    options: ['Experience / best guess', 'Google or eBay lookups', 'Helper/team judgment', 'A structured pricing system', 'AI-assisted pricing'],
    scores:   [3,                         2,                         3,                       1,                              0]
  },
  {
    id: 5,
    question: 'How much time do you spend creating item descriptions, sale listings, photos, or marketing content?',
    options: ['Less than 1 hour', '1–3 hours', '4–6 hours', '7+ hours'],
    scores:   [0,                  1,           2,            3]
  },
  {
    id: 6,
    question: 'How confident are you that higher-value items are getting the best possible exposure before sale day?',
    options: ['Very confident', 'Somewhat confident', 'Not very confident', 'We probably miss opportunities'],
    scores:   [0,                1,                    2,                    3]
  },
  {
    id: 7,
    question: 'What is your biggest frustration before every sale?',
    options: ['Setup takes too long', 'Pricing takes too long', 'Team coordination is messy', 'Marketing takes too much effort', 'I know we are leaving money on the table', 'All of the above'],
    scores:   [1,                      2,                         1,                            2,                                  3,                                         3]
  }
];

const RESULTS = {
  low: {
    range: '$250–$500',
    label: 'Low Leak',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    body: 'You have some systems in place, but there may still be opportunities to save time and increase sale value through AI-assisted pricing, marketing, and workflow automation.',
    cta: 'See How Legacy Lane OS Can Tighten Your Process'
  },
  moderate: {
    range: '$500–$1,250',
    label: 'Moderate Leak',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    body: 'Your sale process is likely costing you through a mix of setup time, helper labor, manual pricing, and missed marketing exposure. Legacy Lane OS can help reduce repetitive setup work, speed up pricing, and improve how inventory is presented to buyers.',
    cta: 'Book a Legacy Lane OS Demo'
  },
  high: {
    range: '$1,250–$2,000',
    label: 'High Leak',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    body: 'Your current process may be costing you serious time and profit every sale. Between setup hours, helper labor, pricing inefficiencies, and missed exposure on higher-value items, you may be working harder than necessary while leaving money behind.',
    cta: 'See How Much Legacy Lane OS Could Save You'
  }
};

function getResult(totalScore) {
  if (totalScore <= 6) return RESULTS.low;
  if (totalScore <= 13) return RESULTS.moderate;
  return RESULTS.high;
}

export default function SaleLeakQuizModal({ open, onClose }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const question = QUESTIONS[currentQ];
  const totalQuestions = QUESTIONS.length;
  const progress = ((currentQ + (selected !== null ? 1 : 0)) / totalQuestions) * 100;

  const handleSelect = (optionIndex) => {
    setSelected(optionIndex);
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = { ...answers, [question.id]: question.scores[selected] };
    setAnswers(newAnswers);
    setSelected(null);

    if (currentQ < totalQuestions - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
    }
  };

  const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
  const result = getResult(totalScore);

  const handleReset = () => {
    setCurrentQ(0);
    setAnswers({});
    setSelected(null);
    setShowResult(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {!showResult ? (
          <>
            <DialogHeader>
              <div className="mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Find Out Where Your Sale Is Leaking Time and Money
                </p>
                <DialogTitle className="text-xl font-serif text-slate-900 leading-snug">
                  {question.question}
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Question {currentQ + 1} of {totalQuestions}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 py-2">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    selected === idx
                      ? 'border-orange-500 bg-orange-50 text-orange-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected === idx ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                    }`}>
                      {selected === idx && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {option}
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={selected === null}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl mt-2"
            >
              {currentQ < totalQuestions - 1 ? (
                <span className="flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></span>
              ) : 'See My Results'}
            </Button>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Estimated Sale Leak</p>
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-lg border-2 ${result.badge} ${result.bg}`}>
                <DollarSign className="w-5 h-5" />
                {result.range} Per Sale
              </div>
              <p className={`text-sm font-semibold ${result.color}`}>{result.label}</p>
            </div>

            <div className={`rounded-2xl border-2 p-5 ${result.bg} space-y-3`}>
              <p className="text-slate-700 text-sm leading-relaxed">{result.body}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">With Legacy Lane OS you can:</p>
              {['Save 3–10 hours per setup', 'Reduce helper labor costs', 'Improve pricing confidence with AI', 'Market items more effectively'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
                {result.cta}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                Retake Quiz
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}