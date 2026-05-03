import React, { useState } from 'react';
import SaleLeakQuizModal from '@/components/landing/SaleLeakQuizModal';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Clock, DollarSign, AlertTriangle } from 'lucide-react';

const BEFORE_AFTER = [
  { before: 'Setup feels chaotic', after: 'Setup is faster' },
  { before: 'Pricing takes too long', after: 'Pricing is more structured' },
  { before: 'Helpers are guessing', after: 'Inventory is easier to manage' },
  { before: 'Marketing is rushed', after: 'Marketing assets are easier to create' },
  { before: 'Valuable items may be underexposed', after: 'Teams know what to do' },
  { before: 'Owners feel overwhelmed', after: 'Owners get hours back every sale' },
];

const SOLUTION_FEATURES = [
  'AI-assisted pricing', 'Inventory organization', 'Sale setup workflows',
  'Item descriptions', 'Marketing support', 'Team task management',
  'Buyer check-in tools', 'Offer tracking', 'Sale-day systems', 'Done-for-you support options'
];

const SAVE_FEATURES = [
  'Save 3–10 hours per sale', 'Reduce manual setup work', 'Improve pricing confidence',
  'Create better item descriptions', 'Market sales more effectively',
  'Give your team a clear operating system', 'Track more of what matters'
];

const LEAKS = [
  {
    icon: Clock,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    title: 'Leak #1: Time Lost',
    body: 'If setup takes 6, 8, or 10+ hours, the cost is not just your time. It is the opportunity cost of losing a personal day per week, not marketing your company, or serving more clients.'
  },
  {
    icon: DollarSign,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-200',
    title: 'Leak #2: Labor Cost',
    body: 'Many companies pay helpers to solve problems that better systems could reduce. Pricing, sorting, tagging, and organizing should not feel like starting from scratch every time.'
  },
  {
    icon: AlertTriangle,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    title: 'Leak #3: Missed Item Value',
    body: 'Some items sell too cheaply because they are not researched, described, photographed, or marketed properly. Better exposure can create better buyer interest. Better buyer interest can create better results.'
  },
];

export default function LandingPageSaleLeak() {
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans">
      <SaleLeakQuizModal open={quizOpen} onClose={() => setQuizOpen(false)} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-2">
            Free 2-Minute Assessment
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            How Much Time and Money Is Your Estate Sale Company Losing Per Sale?
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Take the quick quiz to see how many hours you could save — and where your next sale may be leaking <span className="text-orange-400 font-bold">$500–$2,000</span> in lost profit, labor cost, and missed item value.
          </p>

          <div className="max-w-2xl mx-auto text-left bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3 text-slate-300 text-base mt-6">
            <p className="font-semibold text-white text-lg">Most estate sale companies are not losing money from one big mistake.</p>
            <p>They are losing it from small leaks:</p>
            <ul className="space-y-2 pl-4">
              {['Too much time spent setting up each sale', 'Paying helpers to price, sort, tag, and organize', 'Underpricing items that could sell for more with better marketing exposure', 'Rebuilding the same process from scratch every sale'].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-orange-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-slate-400 text-sm pt-2">Legacy Lane OS helps estate sale companies cut 3–10 hours off setup, reduce unnecessary manual work, and use AI-assisted tools to price, organize, market, and manage sales more efficiently.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setQuizOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Take the 2-Minute Sale Leak Quiz
            </Button>
            <Button
              variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl"
            >
              See How Legacy Lane OS Works
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: The Problem */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">The Problem</h2>
          <p className="text-lg text-slate-600">Estate sale companies are busy — but busy does not always mean profitable.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {['Inventory review', 'Pricing', 'Tagging', 'Staging', 'Team coordination', 'Marketing', 'Buyer communication', 'Sale-day execution', 'Post-sale follow-up'].map(item => (
              <div key={item} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-700 text-sm font-medium">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-base">Without a system, every sale becomes a custom project. That means more hours, more stress, more helper costs, and more chances for valuable items to be underpriced or under-marketed.</p>

          <div className="bg-white border-l-4 border-orange-500 rounded-xl p-6 shadow-sm space-y-4">
            <p className="text-lg font-semibold text-slate-900">
              What if you had access to a system that could add one 8-hour day back to your week — for personal use instead of work?
            </p>
            <p className="text-slate-600 text-sm">Imagine what you could do with that time every single week:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { emoji: '🏕️', label: 'A long weekend with your family — actually unplugged' },
                { emoji: '🏋️', label: 'Time to work out, eat well, and feel like yourself again' },
                { emoji: '📚', label: 'Learning a new skill, hobby, or side interest you have been putting off' },
                { emoji: '💼', label: 'Growing your business instead of just running it' },
                { emoji: '🌿', label: 'Rest — real rest, not just collapsing after a sale weekend' },
                { emoji: '✨', label: 'A spa day, a girls trip, or just a Saturday morning that belongs to you' },
                { emoji: '👩‍👧', label: 'Being fully present with your kids — not half-distracted by a sale in your head' },
                { emoji: '🌸', label: 'A passion project you keep promising yourself you will start someday' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500 italic">
              That is not a fantasy. That is what a repeatable operating system can do for your business — and your life.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Three Hidden Leaks */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">The Three Hidden Leaks</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {LEAKS.map(leak => {
              const Icon = leak.icon;
              return (
                <div key={leak.title} className={`rounded-2xl border p-6 space-y-3 ${leak.bg}`}>
                  <Icon className={`w-7 h-7 ${leak.color}`} />
                  <h3 className="font-bold text-slate-900 text-lg">{leak.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{leak.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: The Solution */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold">The Legacy Lane OS Solution</h2>
          <p className="text-slate-300 text-lg">Legacy Lane OS helps estate sale companies run cleaner, faster, more profitable sales.</p>
          <p className="text-slate-400">It combines:</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SOLUTION_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200">
                <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <p className="text-slate-400">So instead of rebuilding every sale manually, you operate from a repeatable system.</p>
        </div>
      </section>

      {/* Section 4: Before / After */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Before & After Legacy Lane OS</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="font-bold text-slate-700 text-lg mb-3">Before Legacy Lane OS</p>
              {BEFORE_AFTER.map(item => (
                <div key={item.before} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <span className="text-red-400 font-bold text-base">✕</span>
                  {item.before}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="font-bold text-slate-700 text-lg mb-3">After Legacy Lane OS</p>
              {BEFORE_AFTER.map(item => (
                <div key={item.after} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item.after}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Main Offer */}
      <section className="py-16 px-6 bg-orange-50">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Run Your Next Estate Sale With Less Chaos</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Legacy Lane OS is built for estate sale companies that want to save time, reduce manual work, and increase sale-day performance without hiring more people or piecing together disconnected tools.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {SAVE_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-4 py-3 text-sm text-slate-700 text-left">
                <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Button
            onClick={() => setQuizOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/20"
          >
            Take the Quick Quiz Now
          </Button>
        </div>
      </section>

      {/* Section 6: Closing CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">What Is Your Sale Really Costing You?</h2>
          <p className="text-slate-300 text-lg">You may not be losing money in one obvious place. You may be leaking profit through time, labor, pricing, and exposure.</p>
          <p className="text-slate-400">Take the quick quiz and see where your next sale could become faster, cleaner, and more profitable.</p>
          <Button
            onClick={() => setQuizOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            Start the 2-Minute Quiz
          </Button>
        </div>
      </section>
    </div>
  );
}