import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SALE_FLOW = [
  'A new lead comes in.',
  'You schedule an appointment.',
  'Meet with the family.',
  'Create a proposal.',
  'Sign the contract.',
  'Coordinate staff.',
  'Order supplies.',
  'Take photos.',
  'Research values.',
  'Price items.',
  'Write descriptions.',
  'Create signs.',
  'Build social media posts.',
  'Send marketing emails.',
  'Answer customer questions.',
  'SALE DAY 1 — Manage offers.',
  'Handle checkout.',
  'Coordinate deliveries, movers, donations and vendors.',
  'Prepare reports.',
  'Calculate and enter all expenses.',
  'Pay staff.',
  'Calculate and deliver payouts.',
  'Final follow up with the client.',
  'Then do it all over again next week.',
];

const SALE_DAY_MARKETING = [
  '25% Off Day',
  '50% Off Day',
  'Liquidation Sale',
  'Final Day Discounts',
  'Last Chance Offers',
  'Everything Must Go',
];

const WHAT_IF = [
  'Your leads were automatically organized?',
  'Your contracts were generated from information already entered?',
  'Your staff knew exactly what tasks to complete?',
  'Your pricing research happened faster?',
  'Your descriptions were written for you?',
  'Your signs could be printed with a click?',
  'Your social media posts were created automatically?',
  'Your marketing emails were scheduled automatically?',
  'Your customers could scan QR codes for item details and pricing?',
  'Your checkout system tracked every transaction?',
  'Your reports and payouts practically built themselves?',
];

const SMALL_TASKS = [
  { time: 'A few minutes here.', detail: 'A client call.' },
  { time: 'Twenty minutes there.', detail: 'A staff member text.' },
  { time: 'A half hour.', detail: 'Answering buyer questions.' },
  { time: 'An hour.', detail: 'Building social media posts.' },
  { time: 'Another hour.', detail: 'Entering expenses.' },
  { time: 'Another hour.', detail: 'Preparing owner payouts.' },
];

export default function LandingPageOneDay() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-orange-400 font-serif font-bold text-2xl tracking-tight">Estate<span className="text-white">Salen</span></span>
        </Link>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold px-4 py-1.5 rounded-full">
            For Estate Sale Company Owners
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            How I Got One Full Day Per Week Back
          </h1>
          <p className="text-xl text-slate-300 font-medium max-w-2xl mx-auto">
            And Why Other Estate Sale Company Owners Started Asking To Use My System
          </p>
          <p className="text-lg text-orange-400 font-semibold">
            Save 8–10+ Hours Per Sale. Stay Organized. Market More Consistently. Grow Without Working More.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              asChild
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              <Link to="/OperatorPackages">See How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: The Story */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-5 text-slate-700 text-lg leading-relaxed">
          <h2 className="text-3xl font-serif font-bold text-slate-900">The Story Behind EstateSalen.com</h2>
          <p>As an estate sale company owner for nearly 10 years, I found myself working 7 days a week.</p>
          <p>Not because the sales weren't profitable.</p>
          <p>Not because I didn't enjoy helping families.</p>
          <p className="font-semibold text-slate-900">Because every sale seemed to create hundreds of small tasks that consumed my time.</p>

          <div className="grid sm:grid-cols-2 gap-3 my-6">
            {[
              'A client would call.',
              'A staff member would text.',
              'A buyer would ask a question.',
              'A realtor would want an update.',
              'A vendor would need directions.',
              'A sign needed to be printed.',
              'A social media post needed to be written.',
              'A payout needed to be calculated.',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <p>None of these tasks were difficult.</p>
          <p className="font-semibold text-slate-900">But together they stole hours from every sale.</p>
          <p>I didn't need more business. I didn't need another employee.</p>
          <p className="text-2xl font-serif font-bold text-slate-900 border-l-4 border-orange-500 pl-5 py-2">
            I needed more time.
          </p>
          <p>I wanted one full day off every week — and needed to find a way to keep profitability high while growing my marketing presence and improving organization.</p>
          <p className="font-semibold text-slate-900">So I built a tool for myself.</p>
          <p>Not because I wanted to start a software company. Because I wanted to stop working every day of the week.</p>
          <p>A few months later, after showing it to several local estate sale company owners, they all wanted to use it too. What surprised me most wasn't that they liked the tool — it was that they were dealing with many of the <em>exact same frustrations</em> I was.</p>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 space-y-3">
            <p className="text-slate-900 font-bold text-xl">That's how EstateSalen.com was born.</p>
            <p className="text-slate-600">Today the platform helps save approximately <strong className="text-orange-600">8–10+ hours per sale</strong> while helping owners stay organized, market more effectively, and create additional revenue opportunities.</p>
          </div>
        </div>
      </section>

      {/* Section 2: Built For Owners Not Tech People */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">EstateSalen.com Was Built For Estate Sale Company Owners, Not Tech People</h2>
          <p className="text-lg text-slate-600">Let's be honest. Most estate sale company owners didn't get into this business because they love software.</p>
          <p className="text-slate-600">You got into this business because you enjoy helping families, organizing sales, pricing merchandise, and creating successful events.</p>
          <p className="text-slate-600">The problem is that every year there seems to be another app, another social media platform, another marketing system, and another piece of technology you're expected to learn.</p>
          <p className="text-slate-700 font-medium">I felt exactly the same way. That's why EstateSalen.com was built around a simple rule:</p>

          <div className="bg-slate-900 text-white rounded-2xl px-8 py-8 text-center space-y-3">
            <p className="text-2xl md:text-3xl font-serif font-bold leading-snug">
              "If It Doesn't Save Time, It Doesn't Belong In The Platform."
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'You don\'t need to become a marketer.', icon: '📣' },
              { label: 'You don\'t need to become a software expert.', icon: '💻' },
              { label: 'You don\'t need to become a tech wizard.', icon: '🧙' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-2">
                <div className="text-3xl">{item.icon}</div>
                <p className="text-slate-700 font-medium text-sm">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xl font-serif font-bold text-slate-900">You simply need better systems.</p>
        </div>
      </section>

      {/* Section 3: Typical Sale Flow */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900">Is This Your Typical Sale Flow?</h2>
            <p className="text-slate-500 text-lg italic">It was mine.</p>
          </div>

          <div className="space-y-2">
            {SALE_FLOW.slice(0, 15).map((step, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${step.startsWith('SALE DAY') ? 'bg-orange-100 border border-orange-300 font-bold text-orange-900' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>{step.replace('SALE DAY 1 — ', '')}</span>
              </div>
            ))}
            <div className="bg-orange-500 text-white rounded-xl px-5 py-4 font-bold text-center text-base">
              ⚡ Actual Start of Sale Day 1
            </div>
            {SALE_FLOW.slice(15, 16).map((step, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>{step.replace('SALE DAY 1 — ', '')}</span>
              </div>
            ))}
            {/* Sale day marketing */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600 space-y-2">
              <div className="flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Promote additional sale days with updated marketing campaigns:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-7">
                {SALE_DAY_MARKETING.map(item => (
                  <span key={item} className="bg-orange-50 border border-orange-200 rounded px-3 py-1 text-xs text-orange-700 font-medium text-center">{item}</span>
                ))}
              </div>
            </div>
            {SALE_FLOW.slice(17).map((step, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${step.includes('do it all over') ? 'bg-red-50 border border-red-200 text-red-700 font-semibold' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                <ChevronRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: The Real Problem */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold">The Problem Isn't One Big Task</h2>
          <p className="text-slate-300 text-lg">The problem is not that any one task is difficult. The problem is that every sale creates dozens of small tasks.</p>

          <div className="space-y-3">
            {SMALL_TASKS.map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <div className="text-left min-w-[160px]">
                  <span className="text-orange-400 font-bold text-sm">{item.time}</span>
                </div>
                <div className="h-4 w-px bg-white/20 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{item.detail}</span>
              </div>
            ))}
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 space-y-3">
            <p className="text-white font-bold text-xl">Before you know it, an entire day has disappeared.</p>
            <p className="text-slate-300">The goal wasn't to eliminate the work. The goal was to <strong className="text-orange-400">eliminate the repetition</strong> — to stop spending hours every week doing things that could be automated, organized, simplified, or delegated to technology.</p>
          </div>
        </div>
      </section>

      {/* Section 5: What If */}
      <section className="py-16 px-6 bg-orange-50">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900">What If You Could Get One Full Day Back?</h2>
            <p className="text-slate-500 text-lg">What if...</p>
          </div>

          <div className="space-y-3">
            {WHAT_IF.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-orange-200 rounded-xl px-5 py-4 shadow-sm">
                <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 text-white rounded-2xl px-8 py-8 space-y-4 text-center">
            <p className="text-xl font-serif font-bold">That's exactly what I set out to create.</p>
            <p className="text-slate-300">And the result is a system that helps save approximately <strong className="text-orange-400">8–10+ hours every sale</strong> without requiring you to become a technology expert.</p>
            <Button
              asChild
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30 mt-2"
            >
              <Link to="/OperatorPackages">
                See How EstateSalen Works <ArrowRight className="w-5 h-5 ml-2 inline" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 6: Walk Through Coming Next */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold px-4 py-1.5 rounded-full">
            <Clock className="w-4 h-4" /> Coming Up Next
          </div>
          <h2 className="text-3xl font-serif font-bold text-slate-900">Here's How I Use EstateSalen.com Throughout The Life Of A Sale</h2>
          <p className="text-slate-500 text-lg">We'll walk through every stage of a typical estate sale and show exactly where the time savings come from.</p>
          <div className="grid sm:grid-cols-3 gap-4 text-left mt-4">
            {[
              { stage: 'Before The Sale', desc: 'Lead intake, contracts, staff coordination, and sale setup.' },
              { stage: 'During The Sale', desc: 'Checkout, offers, QR scanning, and sale-day marketing.' },
              { stage: 'After The Sale', desc: 'Reports, payouts, vendors, cleanouts, and client follow-up.' },
            ].map(item => (
              <div key={item.stage} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <p className="font-bold text-slate-900 text-sm">{item.stage}</p>
                </div>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold">Ready To Get Your Day Back?</h2>
          <p className="text-slate-300 text-lg">EstateSalen.com was built by an estate sale company owner who was tired of working every day of the week. It was built for owners exactly like you.</p>
          <p className="text-slate-400">See the platform, explore the features, and decide if it's the right fit for your company.</p>
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/30 mt-4"
          >
            <Link to="/OperatorPackages">See How EstateSalen Works</Link>
          </Button>
        </div>
      </section>

    </div>
  );
}