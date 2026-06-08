import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import EstateTransitionLeadForm from '@/components/leads/EstateTransitionLeadForm';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, ClipboardList, Clock, Users, Home, Package } from 'lucide-react';

// ──────────────────────────────────────────────
// Planner Questions
// ──────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'situation',
    question: 'What happened?',
    type: 'single',
    options: [
      { value: 'probate', label: 'Someone passed away', icon: '🕊️' },
      { value: 'downsizing', label: 'Parent or family member is downsizing', icon: '🏡' },
      { value: 'senior_transition', label: 'Moving to assisted living / memory care', icon: '🏥' },
      { value: 'divorce', label: 'Divorce', icon: '⚖️' },
      { value: 'foreclosure', label: 'Foreclosure', icon: '🔑' },
      { value: 'inherited_home', label: 'Inherited a house', icon: '🏠' },
      { value: 'estate_settlement', label: 'Need to settle an estate', icon: '📋' },
      { value: 'estate_sale_only', label: 'Need an estate sale / cleanout', icon: '📦' },
      { value: 'other', label: 'Not sure / something else', icon: '❓' },
    ],
  },
  {
    id: 'state',
    question: 'What state is the property in?',
    type: 'state_select',
  },
  {
    id: 'county',
    question: 'What county is the property in?',
    type: 'text',
    placeholder: 'e.g. Monmouth County',
    hint: 'Helps us find local court information and providers.',
  },
  {
    id: 'has_house',
    question: 'Is there a house or real property involved?',
    type: 'yes_no',
  },
  {
    id: 'has_belongings',
    question: 'Are there belongings (furniture, collectibles, household items) that need to be sold or cleared out?',
    type: 'yes_no',
  },
  {
    id: 'has_authority',
    question: 'Do you already have legal authority to act on behalf of the estate?',
    type: 'single',
    options: [
      { value: 'yes', label: 'Yes — I am the executor, trustee, or have Letters Testamentary' },
      { value: 'no', label: 'No — I have not been appointed yet' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'needs_estate_sale',
    question: 'Do you need help selling or liquidating personal property / contents?',
    type: 'yes_no',
  },
  {
    id: 'needs_realtor',
    question: 'Do you need help selling the house or real property?',
    type: 'yes_no',
    skipIf: (a) => a.has_house === 'no',
  },
  {
    id: 'wants_cash_offer',
    question: 'Are you open to receiving a cash offer from an investor for the property?',
    type: 'yes_no',
    skipIf: (a) => a.has_house === 'no',
    hint: 'Cash offers close faster than traditional listings and require no repairs or showings.',
  },
  {
    id: 'urgency',
    question: 'How urgent is your situation?',
    type: 'single',
    options: [
      { value: 'within_30_days', label: '⏰ Very urgent — within 30 days' },
      { value: '1_to_3_months', label: '📅 Moderate — 1 to 3 months' },
      { value: '3_to_6_months', label: '🗓️ Planning ahead — 3 to 6 months' },
      { value: 'no_rush', label: '🌿 No rush — just exploring options' },
    ],
  },
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

// ──────────────────────────────────────────────
// Planner output generator
// ──────────────────────────────────────────────
function buildPlannerOutput(answers) {
  const { situation, state, county, has_house, has_belongings, has_authority, needs_estate_sale, needs_realtor, wants_cash_offer, urgency } = answers;

  const steps = [];
  const timeline = [];
  const checklist = [];

  // Core steps based on situation
  if (['probate', 'inherited_home', 'estate_settlement'].includes(situation)) {
    steps.push({ icon: '📋', title: 'Consult a probate attorney', desc: 'Confirm whether probate is required and which court has jurisdiction in ' + (county || state || 'your area') + '.', urgency: 'critical' });
    steps.push({ icon: '📄', title: 'Obtain certified death certificates', desc: 'Order 10–15 copies. Required by courts, banks, insurers, and title companies.', urgency: 'critical' });
    steps.push({ icon: '🔐', title: 'Secure the property', desc: 'Change locks, forward mail, cancel recurring deliveries, and maintain insurance.', urgency: 'immediate' });
    steps.push({ icon: '📁', title: 'Locate the will and estate documents', desc: 'Check home files, safe deposit boxes, and contact the deceased\'s attorney if known.', urgency: 'immediate' });
    checklist.push('Obtain certified death certificates (10–15 copies)');
    checklist.push('Secure the property and change locks');
    checklist.push('Locate original will, trusts, and key documents');
    checklist.push('File probate petition with the court if required');
    checklist.push('Obtain Letters Testamentary / Letters of Administration');
    checklist.push('Open an estate bank account');
    checklist.push('Notify all financial institutions and creditors');
  }

  if (situation === 'downsizing' || situation === 'senior_transition') {
    steps.push({ icon: '📋', title: 'Understand the timeline', desc: 'Clarify how much time you have before the home must be cleared.', urgency: 'immediate' });
    steps.push({ icon: '⚖️', title: 'Consult an elder law attorney (if Medicaid is involved)', desc: 'If your family member may need Medicaid, the home\'s disposition can affect benefits. Confirm with a licensed elder law attorney.', urgency: 'critical' });
    checklist.push('Clarify move-in date and property timeline');
    checklist.push('Consult elder law attorney if Medicaid may be involved');
    checklist.push('Sort belongings — keep, sell, donate, discard');
  }

  if (situation === 'divorce') {
    steps.push({ icon: '⚖️', title: 'Consult your divorce attorney', desc: 'Any property decisions during divorce can have legal consequences. Get your attorney\'s guidance first.', urgency: 'critical' });
    steps.push({ icon: '🏠', title: 'Get an independent appraisal', desc: 'Establish fair market value for equitable division.', urgency: 'immediate' });
    checklist.push('Consult divorce attorney before selling or moving any assets');
    checklist.push('Get independent home appraisal');
    checklist.push('Agree on personal property division with spouse / attorneys');
  }

  if (situation === 'foreclosure') {
    steps.push({ icon: '⚖️', title: 'Consult a foreclosure attorney immediately', desc: 'You may have options — defenses, loan modifications, or short sale alternatives. Act quickly.', urgency: 'critical' });
    checklist.push('Consult foreclosure or real estate attorney');
    checklist.push('Document and inventory all personal belongings');
    checklist.push('Understand your state\'s foreclosure timeline');
  }

  // Personal property
  if (has_belongings === 'yes' || needs_estate_sale === 'yes') {
    steps.push({ icon: '🏷️', title: 'Contact estate sale companies', desc: 'Get 2–3 quotes. Companies typically charge 25–40% commission. Confirm pricing and availability.', urgency: 'soon' });
    steps.push({ icon: '📸', title: 'Document and photograph all items', desc: 'Before anything is moved, photographed, or removed — document everything.', urgency: 'immediate' });
    checklist.push('Photograph and inventory all personal property');
    checklist.push('Contact 2–3 estate sale companies for quotes');
    checklist.push('Schedule estate sale or buyout');
    checklist.push('Arrange donation pickups for remaining items');
    checklist.push('Schedule cleanout for final clearing');
  }

  // Real estate
  if (has_house === 'yes' && needs_realtor === 'yes') {
    steps.push({ icon: '🏠', title: 'Interview probate-friendly realtors', desc: 'Look for agents with experience selling inherited or probate homes in ' + (state || 'your area') + '.', urgency: 'soon' });
    checklist.push('Interview 2–3 probate-friendly realtors');
    checklist.push('Address needed repairs and staging');
    checklist.push('List property or accept cash offer');
  }

  if (has_house === 'yes' && wants_cash_offer === 'yes') {
    steps.push({ icon: '💰', title: 'Request investor cash offers', desc: 'Cash buyers close fast (often 2–4 weeks), require no repairs, and simplify the process.', urgency: 'soon' });
    checklist.push('Request cash offers from investors');
  }

  // Authority
  if (has_authority === 'no' || has_authority === 'not_sure') {
    steps.unshift({ icon: '⚖️', title: 'Confirm your legal authority', desc: 'Before selling or distributing anything, confirm you have the legal right to act. Consult an attorney.', urgency: 'critical' });
    checklist.unshift('Confirm your legal authority to act on the estate');
  }

  // Timeline
  if (urgency === 'within_30_days') {
    timeline.push({ period: 'This week', tasks: ['Secure the property', 'Gather documents', 'Consult an attorney', 'Contact estate sale companies'] });
    timeline.push({ period: 'Next 2 weeks', tasks: ['File with the court if required', 'Schedule estate sale', 'Begin property prep'] });
    timeline.push({ period: 'Within 30 days', tasks: ['Hold estate sale', 'List property or accept cash offer'] });
  } else if (urgency === '1_to_3_months') {
    timeline.push({ period: 'Month 1', tasks: ['Secure property', 'Consult attorney', 'Gather documents', 'Inventory assets'] });
    timeline.push({ period: 'Month 2', tasks: ['Hold estate sale', 'Clear and clean property', 'List real estate'] });
    timeline.push({ period: 'Month 3', tasks: ['Close on property', 'Settle debts', 'Distribute assets'] });
  } else {
    timeline.push({ period: 'Phase 1 — Legal Foundation', tasks: ['Consult attorney', 'File probate if required', 'Obtain legal authority'] });
    timeline.push({ period: 'Phase 2 — Asset Disposition', tasks: ['Estate sale', 'Cleanout', 'Prepare real estate'] });
    timeline.push({ period: 'Phase 3 — Close', tasks: ['Sell real estate', 'Pay debts', 'Distribute assets'] });
  }

  // Provider CTA needs
  const providerNeeds = {
    needs_estate_sale: needs_estate_sale === 'yes' || has_belongings === 'yes',
    needs_realtor: has_house === 'yes' && needs_realtor === 'yes',
    wants_cash_offer: has_house === 'yes' && wants_cash_offer === 'yes',
    needs_probate_help: ['probate', 'inherited_home', 'estate_settlement'].includes(situation) && (has_authority === 'no' || has_authority === 'not_sure'),
  };

  return { steps, timeline, checklist, providerNeeds };
}

// ──────────────────────────────────────────────
// Question renderers
// ──────────────────────────────────────────────
function QuestionBlock({ q, value, onChange }) {
  if (q.type === 'single') {
    return (
      <div className="space-y-2">
        {q.options.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-sm font-medium ${value === opt.value ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'}`}>
            {opt.icon && <span className="text-lg flex-shrink-0">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'yes_no') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {['yes', 'no'].map(v => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`p-4 rounded-xl border-2 font-semibold text-sm transition-all capitalize ${value === v ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>
            {v === 'yes' ? '✅ Yes' : '❌ No'}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'state_select') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
        {US_STATES.map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`p-2 rounded-lg border text-xs font-medium transition-all ${value === s ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'text') {
    return (
      <div>
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={q.placeholder || ''}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        {q.hint && <p className="text-xs text-slate-400 mt-1">{q.hint}</p>}
      </div>
    );
  }
  return null;
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function EstateSettlementPlanner() {
  const [step, setStep] = useState(0); // -1 = intro, 0..n = questions, n+1 = results
  const [answers, setAnswers] = useState({});
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [started, setStarted] = useState(false);

  // Build visible questions (skip conditionals)
  const visibleQuestions = QUESTIONS.filter(q => !q.skipIf || !q.skipIf(answers));
  const currentQ = visibleQuestions[step];
  const isLast = step === visibleQuestions.length - 1;
  const isDone = step >= visibleQuestions.length;

  const setAnswer = (val) => setAnswers(p => ({ ...p, [currentQ.id]: val }));
  const currentAnswer = answers[currentQ?.id];

  const canAdvance = currentAnswer !== undefined && currentAnswer !== '';

  const advance = () => {
    if (isLast) { setStep(visibleQuestions.length); return; }
    setStep(p => p + 1);
  };
  const back = () => setStep(p => Math.max(0, p - 1));
  const toggleCheck = (k) => setCheckedItems(p => ({ ...p, [k]: !p[k] }));

  // Map answers to lead form defaults
  const leadDefaults = {
    defaultState: answers.state || '',
    defaultLifeEventType: answers.situation === 'estate_sale_only' ? 'estate_settlement' : (answers.situation || ''),
    defaultNeedsMap: {
      has_real_estate: answers.has_house === 'yes',
      has_personal_property_to_sell: answers.has_belongings === 'yes',
      needs_estate_sale: answers.needs_estate_sale === 'yes',
      needs_realtor: answers.needs_realtor === 'yes',
      wants_cash_offer: answers.wants_cash_offer === 'yes',
      needs_probate_help: ['probate','inherited_home','estate_settlement'].includes(answers.situation),
    },
  };

  const output = isDone ? buildPlannerOutput(answers) : null;

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />
      <SEBreadcrumb crumbs={[{ label: 'Estate Settlement Planner' }]} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Estate Settlement Planner</h1>
        <p className="text-slate-300 max-w-2xl mx-auto text-base">Answer a few questions and EstateSalen will help organize your next practical steps. This is not legal advice, but it can help you understand what may need to happen next.</p>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <SEDisclaimer />

        {/* ── Intro / Start ── */}
        {!started && (
          <div className="mt-8 text-center space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: ClipboardList, label: '10 quick questions', color: 'bg-blue-100 text-blue-700' },
                { icon: Clock, label: 'Takes ~3 minutes', color: 'bg-amber-100 text-amber-700' },
                { icon: Users, label: 'Free, no obligation', color: 'bg-green-100 text-green-700' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setStarted(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-10 h-12 text-base font-semibold">
              Start the Planner <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ── Questions ── */}
        {started && !isDone && currentQ && (
          <div className="mt-8 space-y-6">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Question {step + 1} of {visibleQuestions.length}</span>
                <span>{Math.round(((step + 1) / visibleQuestions.length) * 100)}% complete</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full"><div className="h-1.5 bg-slate-800 rounded-full transition-all" style={{ width: `${((step + 1) / visibleQuestions.length) * 100}%` }} /></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-5">{currentQ.question}</h2>
              <QuestionBlock q={currentQ} value={answers[currentQ.id]} onChange={setAnswer} />
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={back} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button onClick={advance} disabled={!canAdvance} className={`bg-slate-800 hover:bg-slate-900 text-white ${step > 0 ? 'flex-1' : 'w-full'}`}>
                {isLast ? 'See My Plan →' : 'Next →'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {isDone && output && (
          <div className="mt-8 space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex gap-3 items-start">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-green-900 mb-1">Your Personalized Estate Plan</h2>
                <p className="text-sm text-green-700">Based on your answers, here are your recommended next steps. This is educational guidance, not legal advice — always confirm with licensed professionals.</p>
              </div>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              {answers.situation && <Badge className="bg-slate-100 text-slate-700 text-xs">{QUESTIONS[0].options?.find(o => o.value === answers.situation)?.label || answers.situation}</Badge>}
              {answers.state && <Badge className="bg-blue-100 text-blue-700 text-xs">{answers.state}</Badge>}
              {answers.county && <Badge className="bg-blue-100 text-blue-700 text-xs">{answers.county}</Badge>}
              {answers.urgency && <Badge className="bg-amber-100 text-amber-700 text-xs">{QUESTIONS.find(q => q.id === 'urgency')?.options?.find(o => o.value === answers.urgency)?.label}</Badge>}
            </div>

            {/* Recommended steps */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><ArrowRight className="w-5 h-5 text-amber-500" /> Recommended Next Steps</h3>
              <div className="space-y-3">
                {output.steps.map((s, i) => (
                  <div key={i} className={`flex gap-3 p-4 rounded-xl border ${s.urgency === 'critical' ? 'bg-red-50 border-red-200' : s.urgency === 'immediate' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                        {s.urgency === 'critical' && <Badge className="bg-red-100 text-red-700 text-xs">Critical first step</Badge>}
                        {s.urgency === 'immediate' && <Badge className="bg-amber-100 text-amber-700 text-xs">Do this soon</Badge>}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            {output.timeline.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Suggested Timeline</h3>
                <div className="space-y-3">
                  {output.timeline.map((t, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold">{t.period}</div>
                      <ul className="p-4 space-y-1">
                        {t.tasks.map((task, j) => (
                          <li key={j} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-slate-400 mt-0.5">•</span>{task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist */}
            {output.checklist.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-green-600" /> Your Checklist</h3>
                <div className="space-y-2">
                  {output.checklist.map((item, i) => (
                    <div key={i} onClick={() => toggleCheck(i)} className={`flex gap-3 items-center p-3 rounded-lg cursor-pointer border transition-colors ${checkedItems[i] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      {checkedItems[i] ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                      <span className={`text-sm ${checkedItems[i] ? 'line-through text-green-700' : 'text-slate-700'}`}>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">{Object.values(checkedItems).filter(Boolean).length} of {output.checklist.length} completed</p>
              </div>
            )}

            {/* Lead form CTA */}
            <div className="border-t border-slate-200 pt-8">
              {!showLeadForm ? (
                <div className="bg-slate-900 rounded-2xl p-6 text-center text-white">
                  <h3 className="text-xl font-bold mb-2">Ready to Connect with Local Experts?</h3>
                  <p className="text-slate-300 text-sm mb-5">Based on your plan, we can connect you with estate sale companies{output.providerNeeds.needs_realtor ? ', realtors' : ''}{output.providerNeeds.wants_cash_offer ? ', cash buyers' : ''}{output.providerNeeds.needs_probate_help ? ', and probate resources' : ''} in {answers.state || 'your area'}.</p>
                  <Button onClick={() => setShowLeadForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 h-11">
                    Get Free Help & Referrals →
                  </Button>
                  <p className="text-xs text-slate-400 mt-3">Free service. No obligation.</p>
                </div>
              ) : (
                <EstateTransitionLeadForm
                  sourceUrl="/estate-settlement-planner"
                  sourcePageType="estate_settlement_planner"
                  {...leadDefaults}
                  ctaTitle="Get Connected with Local Experts"
                  ctaDesc={`Based on your plan, we'll connect you with the right professionals in ${answers.state || 'your area'}.`}
                />
              )}
            </div>

            {/* Related links */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Probate Guide', href: '/probate' },
                { label: 'Executor Guide', href: '/executor-guide' },
                { label: 'Find Estate Sale Companies', href: '/estate-sale-companies' },
                { label: 'Find Probate Realtors', href: '/probate-realtors' },
              ].map(({ label, href }) => (
                <Link key={href} to={href} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-sm text-slate-700 font-medium">
                  <span className="text-amber-500">→</span> {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}