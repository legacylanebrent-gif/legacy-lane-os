import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PLAN_ITEMS = [
  'Where your current sale process is leaking the most time',
  'Which part of your workflow should be fixed first',
  'How Legacy Lane OS can help reduce setup friction',
  'What your next sale could look like with a better system',
  'Recommended next steps based on your answers',
];

const SALES_PER_MONTH = ['1', '2–3', '4–6', '7+'];
const BIGGEST_PAIN = [
  'Setup takes too long',
  'Pricing is inconsistent',
  'Helpers need too much direction',
  'Marketing takes too much time',
  'Higher-value items are not getting enough exposure',
  'Every sale feels chaotic',
  'All of the above',
];
const NEXT_SALE = ['This week', 'Next 2 weeks', 'This month', 'Not scheduled yet'];
const CURRENT_TOOLS = [
  'Paper / notebooks',
  'Spreadsheets',
  'Basic CRM or task tool',
  'Multiple disconnected tools',
  'A structured estate sale platform',
];

function generatePlan(answers) {
  const { biggestPain = 'All of the above', salesPerMonth = '2–3', currentTools = 'Multiple disconnected tools' } = answers;

  let primaryLeak = 'Setup inefficiency';
  let firstFix = 'Create a repeatable setup workflow before your next sale.';

  if (biggestPain.includes('Pricing')) {
    primaryLeak = 'Pricing inconsistency';
    firstFix = 'Use AI-assisted pricing support and create a structured pricing review process.';
  } else if (biggestPain.includes('Helpers')) {
    primaryLeak = 'Team coordination';
    firstFix = 'Create assigned roles, task lists, and sale-day responsibility flows.';
  } else if (biggestPain.includes('Marketing') || biggestPain.includes('exposure')) {
    primaryLeak = 'Marketing exposure';
    firstFix = 'Identify higher-value items earlier and create stronger item descriptions before sale day.';
  } else if (biggestPain.includes('chaotic') || biggestPain.includes('All')) {
    primaryLeak = 'Lack of operating system';
    firstFix = 'Systemize intake, setup, pricing, marketing, team tasks, and sale-day execution.';
  }

  return {
    primaryLeak,
    firstFix,
    diagnosis: `Based on your answers, your company appears to be losing efficiency through ${primaryLeak.toLowerCase()}. With ${salesPerMonth} sales per month and current tools listed as ${currentTools}, the biggest opportunity is to reduce manual decisions and create a repeatable operating flow.`,
    nextSalePlan: [
      'Step 1: Review your next sale before setup begins and identify the top 3 workflow bottlenecks.',
      'Step 2: Use a structured inventory and pricing process instead of relying only on memory or rushed judgment.',
      'Step 3: Assign helper tasks before setup begins so the owner is not directing every move.',
      'Step 4: Identify higher-value items early and create better descriptions and marketing exposure.',
      'Step 5: Track what slowed the sale down so the next sale becomes easier, not harder.',
    ],
    legacyLaneRecommendation:
      'Legacy Lane OS is designed to turn this plan into a working system by combining AI-assisted pricing, inventory organization, sale setup workflows, team task management, marketing support, and done-for-you guidance.',
    ctaMessage:
      'The best next step is to map Legacy Lane OS to your next actual estate sale and show exactly where it can save time and improve control.',
  };
}

// ==========================================
// INTAKE SCREEN
// ==========================================
function IntakeScreen({ onComplete }) {
  const [form, setForm] = useState({ salesPerMonth: '', biggestPain: '', nextSaleDate: '', currentTools: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(form);
  };

  const SelectField = ({ id, label, options, required }) => (
    <div>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <select
        id={id}
        required={required}
        value={form[id]}
        onChange={e => setForm({ ...form, [id]: e.target.value })}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Confirm Your Sale Details</h2>
        <p className="text-slate-500 mt-1 text-sm">Answer these final questions so Legacy Lane OS can generate a more specific improvement plan.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField id="salesPerMonth" label="How many estate sales do you run per month?" options={SALES_PER_MONTH} required />
        <SelectField id="biggestPain" label="What is your biggest current challenge?" options={BIGGEST_PAIN} required />
        <SelectField id="nextSaleDate" label="When is your next estate sale?" options={NEXT_SALE} required={false} />
        <SelectField id="currentTools" label="What are you currently using to manage sales?" options={CURRENT_TOOLS} required />
        <Button
          type="submit"
          disabled={!form.salesPerMonth || !form.biggestPain || !form.currentTools}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl"
        >
          <span className="flex items-center gap-2">Continue <ChevronRight className="w-4 h-4" /></span>
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// LEAD CAPTURE SCREEN
// ==========================================
function LeadCaptureScreen({ onSubmit }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    onSubmit(form);
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 font-medium flex items-center gap-2">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        Generating your custom plan — enter your details below.
      </div>
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Where Should We Send Your Custom Plan?</h2>
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
        <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
          {loading ? 'Generating…' : 'Generate My Plan'}
        </Button>
      </form>
    </div>
  );
}

// ==========================================
// RESULT SCREEN
// ==========================================
function ResultScreen({ plan, onRetake }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          <Sparkles className="w-3 h-3" /> Your Custom Plan
        </div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Your Next Sale Improvement Plan</h2>
        <p className="text-slate-500 text-sm italic">"Your next estate sale should not feel like starting over."</p>
      </div>

      {/* Primary Leak */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 space-y-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-400" /> Primary Leak Identified
        </p>
        <p className="text-xl font-bold text-red-600">{plan.primaryLeak}</p>
      </div>

      {/* Diagnosis */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Diagnosis</p>
        <p className="text-sm text-slate-700 leading-relaxed">{plan.diagnosis}</p>
      </div>

      {/* First Fix */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">First Fix</p>
        <p className="text-sm text-slate-700 leading-relaxed font-medium">{plan.firstFix}</p>
      </div>

      {/* 5-Step Plan */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Your 5-Step Next Sale Plan</p>
        <div className="space-y-2">
          {plan.nextSalePlan.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 text-sm text-slate-700">
              <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <span>{step.replace(/^Step \d+: /, '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legacy Lane Recommendation */}
      <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Legacy Lane OS Recommendation</p>
        <p className="text-sm text-slate-200 leading-relaxed">{plan.legacyLaneRecommendation}</p>
        <p className="text-sm text-orange-300 leading-relaxed">{plan.ctaMessage}</p>
      </div>

      {/* CTAs */}
      <div className="space-y-3 pt-2">
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base"
          onClick={() => window.location.href = '/LandingPageOfferClose'}
        >
          Book My Legacy Lane OS Demo
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-300 text-slate-700 font-semibold py-5 rounded-xl"
          onClick={() => window.location.href = '/LandingPageCalculator'}
        >
          Calculate My Sale Leak
        </Button>
        <button onClick={onRetake} className="w-full text-sm text-slate-400 hover:text-slate-600 text-center">
          Start Over
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function LandingPageAIPlan() {
  const [step, setStep] = useState('landing');
  const [intakeAnswers, setIntakeAnswers] = useState({});
  const [plan, setPlan] = useState(null);

  const handleIntakeComplete = (answers) => {
    setIntakeAnswers(answers);
    setStep('leadCapture');
  };

  const handleLeadSubmit = async (lead) => {
    // Save lead
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'LP9_AIPlan',
        contact_name: lead.name,
        contact_email: lead.email,
        contact_phone: lead.phone,
        intent: 'estate_sale',
        notes: `Company: ${lead.company} | Pain: ${intakeAnswers.biggestPain} | Sales/mo: ${intakeAnswers.salesPerMonth} | Tools: ${intakeAnswers.currentTools}`,
      });
    } catch (_) {}

    const generatedPlan = generatePlan(intakeAnswers);
    setPlan(generatedPlan);
    setStep('aiResult');
  };

  const handleRetake = () => {
    setIntakeAnswers({});
    setPlan(null);
    setStep('landing');
  };

  if (step !== 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {step === 'intake' && <IntakeScreen onComplete={handleIntakeComplete} />}
          {step === 'leadCapture' && <LeadCaptureScreen onSubmit={handleLeadSubmit} />}
          {step === 'aiResult' && plan && <ResultScreen plan={plan} onRetake={handleRetake} />}
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
            <Sparkles className="w-4 h-4" /> Free Custom Improvement Plan
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            You Took the Quiz. Now Let's Turn Your Results Into a Plan.
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Legacy Lane OS can generate a personalized next-sale improvement plan based on your setup time, pricing process, team workflow, marketing exposure, and biggest bottlenecks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => setStep('intake')}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-orange-500/30"
            >
              Generate My Custom Plan
            </Button>
          </div>
        </div>
      </section>

      {/* What your plan will show */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Your Plan Will Show:</h2>
          <div className="space-y-3">
            {PLAN_ITEMS.map(item => (
              <div key={item} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not generic */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <h3 className="text-xl font-bold text-slate-900">This Is Not a Generic Report</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your plan is based on your actual answers, your current process, and the areas where your estate sale company has the most opportunity to save time, reduce manual work, and improve results.
            </p>
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <h3 className="text-xl font-bold">Takes Less Than 2 Minutes</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Answer a few questions about your process and we will generate a 5-step next-sale improvement plan with a diagnosis, a first fix, and a Legacy Lane OS recommendation specific to your company.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-orange-50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-serif font-bold text-slate-900">Ready to See Your Plan?</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">
            It only takes a few minutes to get a personalized improvement plan for your next estate sale.
          </p>
          <Button
            onClick={() => setStep('intake')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold px-12 py-7 rounded-xl shadow-xl shadow-orange-500/20"
          >
            Generate My Custom Plan
          </Button>
        </div>
      </section>

    </div>
  );
}