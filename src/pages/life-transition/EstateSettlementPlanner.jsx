import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';

const PLAN_PHASES = [
  {
    phase: 'Phase 1: Immediate Steps (Days 1–7)',
    color: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    tasks: [
      'Obtain certified copies of the death certificate (order 10–15)',
      'Secure the property — change locks, forward mail, cancel deliveries',
      'Locate the original will, trust documents, and safe deposit box keys',
      'Notify close family members and begin gathering contact info for all heirs',
      'Contact the deceased\'s attorney if one is known',
      'Do not distribute, sell, or discard anything yet',
    ]
  },
  {
    phase: 'Phase 2: Legal Foundation (Weeks 1–4)',
    color: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    tasks: [
      'Consult a probate attorney to determine if probate is required',
      'File petition with the appropriate probate court if required',
      'Obtain Letters Testamentary or Letters of Administration',
      'Open an estate bank account',
      'Notify all financial institutions, insurance companies, and government agencies',
      'Cancel credit cards, subscriptions, and memberships',
    ]
  },
  {
    phase: 'Phase 3: Asset Inventory (Weeks 2–6)',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    tasks: [
      'Create a complete inventory of all real property',
      'Inventory personal property — photograph and document everything',
      'Gather all financial account statements',
      'Identify all debts — mortgages, loans, credit cards, taxes',
      'Get the home appraised if it will be sold',
      'Identify high-value items for separate appraisal (jewelry, art, collectibles)',
    ]
  },
  {
    phase: 'Phase 4: Personal Property Disposition (Weeks 4–10)',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    tasks: [
      'Meet with heirs to agree on personal property distribution',
      'Contact estate sale companies and get quotes',
      'Schedule and hold the estate sale',
      'Arrange donation pickups for remaining donation-worthy items',
      'Schedule cleanout for remaining items',
    ]
  },
  {
    phase: 'Phase 5: Real Estate (Weeks 6–16+)',
    color: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    tasks: [
      'Obtain court approval for real estate sale if required',
      'Interview 2–3 probate-friendly realtors',
      'Address needed repairs and staging',
      'List the property or accept a cash offer',
      'Close the sale and deposit proceeds into the estate account',
    ]
  },
  {
    phase: 'Phase 6: Closing the Estate',
    color: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    tasks: [
      'Pay all valid debts from estate funds',
      'File final income tax return for the deceased',
      'File estate income tax return if required',
      'Prepare and distribute final accounting to all heirs',
      'Distribute remaining assets per the will or intestate law',
      'File petition to close the estate with the probate court',
    ]
  }
];

export default function EstateSettlementPlanner() {
  const [checked, setChecked] = useState({});
  const toggle = (k) => setChecked(p => ({ ...p, [k]: !p[k] }));
  const total = PLAN_PHASES.reduce((sum, p) => sum + p.tasks.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />
      <SEBreadcrumb crumbs={[{ label: 'Estate Settlement Planner' }]} />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Estate Settlement Planner</h1>
        <p className="text-slate-300 max-w-2xl mx-auto">A phased, step-by-step plan for settling an estate from the first week through final distribution. Track your progress as you go.</p>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <SEDisclaimer />

        {/* Progress */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Your Progress</p>
            <p className="text-2xl font-bold text-slate-900">{done} / {total} tasks completed</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-600">{Math.round((done / total) * 100)}%</p>
            <p className="text-xs text-slate-500">of plan complete</p>
          </div>
        </div>

        {PLAN_PHASES.map((phase, pi) => (
          <div key={pi} className={`rounded-xl border p-5 ${phase.color}`}>
            <div className="flex items-center gap-2 mb-4">
              <Badge className={phase.badge}>{phase.phase}</Badge>
            </div>
            <div className="space-y-2">
              {phase.tasks.map((task, ti) => {
                const key = `${pi}-${ti}`;
                return (
                  <div key={key} onClick={() => toggle(key)} className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked[key] ? 'bg-green-50 border border-green-200' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {checked[key] ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                    </div>
                    <p className={`text-sm ${checked[key] ? 'text-green-800 line-through' : 'text-slate-700'}`}>{task}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <Link to="/estate-checklist"><Button variant="outline">View Checklist Format</Button></Link>
          <Link to="/executor-guide"><Button variant="outline">Executor Guide</Button></Link>
          <Link to="/probate"><Button variant="outline">Probate Guide</Button></Link>
        </div>

        <SELeadCTA
          lifeEventType="estate_settlement"
          sourceUrl="/estate-settlement-planner"
          sourcePageType="life_event_hub"
          ctaTitle="Need Help with Any of These Steps?"
          ctaDesc="Connect with estate sale companies, realtors, attorneys, and cleanout vendors in your area."
        />
      </div>
      <SharedFooter />
    </div>
  );
}