import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import ProbateDisclaimer from '@/components/probate/ProbateDisclaimer';
import ProbateLeadForm from '@/components/probate/ProbateLeadForm';
import { CheckCircle2, Circle } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { step: 1, category: 'Immediate Steps', task: 'Obtain certified copies of the death certificate', desc: 'You will need multiple copies — typically 8–12. These are required by courts, banks, insurance companies, and government agencies.' },
  { step: 2, category: 'Document Gathering', task: 'Locate the original will and any codicils', desc: 'Check safe deposit boxes, file cabinets, or with the deceased\'s attorney. A copy is not sufficient — you need the original.' },
  { step: 3, category: 'Document Gathering', task: 'Locate trusts, deeds, titles, and account statements', desc: 'Gather all financial accounts, real property deeds, vehicle titles, and investment account statements.' },
  { step: 4, category: 'Legal', task: 'Consult with a probate attorney', desc: 'Even a brief consultation can help you understand what your state requires and avoid costly mistakes.' },
  { step: 5, category: 'Legal', task: 'Determine if probate is required', desc: 'Some assets pass outside probate (joint accounts, trusts, beneficiary designations). Confirm with an attorney.' },
  { step: 6, category: 'Legal', task: 'File petition with the probate court', desc: 'File in the county where the deceased resided. Forms and fees vary by state and county.' },
  { step: 7, category: 'Legal', task: 'Receive Letters Testamentary / Letters of Administration', desc: 'This document gives you legal authority to act on behalf of the estate.' },
  { step: 8, category: 'Asset Management', task: 'Create a complete inventory of all assets and debts', desc: 'Include real estate, vehicles, bank accounts, retirement accounts, personal property, and all known debts.' },
  { step: 9, category: 'Notifications', task: 'Notify creditors and publish required notices', desc: 'Most states require formal creditor notification. Confirm requirements with the court or your attorney.' },
  { step: 10, category: 'Personal Property', task: 'Decide what to keep, sell, donate, or discard', desc: 'Work with beneficiaries to catalog and divide personal property before scheduling any sale or cleanout.' },
  { step: 11, category: 'Estate Sale', task: 'Hire an estate sale company if needed', desc: 'For significant personal property, a licensed estate sale company can appraise, organize, and run the sale.' },
  { step: 12, category: 'Real Estate', task: 'Get the property appraised and assessed', desc: 'A licensed appraiser can establish the property\'s fair market value, which may be needed for the estate and tax purposes.' },
  { step: 13, category: 'Real Estate', task: 'Prepare the home for sale or rental', desc: 'Consider repairs, cleaning, staging, and landscaping to maximize value. Get contractor quotes if needed.' },
  { step: 14, category: 'Real Estate', task: 'Choose a sale method (realtor, investor, auction)', desc: 'Each option has different timelines, costs, and net proceeds. Interview multiple options.' },
  { step: 15, category: 'Closing the Estate', task: 'Pay all debts, taxes, and estate expenses', desc: 'Debts must be paid before distributions to heirs. Consult a CPA regarding estate and inheritance taxes.' },
  { step: 16, category: 'Closing the Estate', task: 'Distribute remaining assets to heirs', desc: 'Follow the will or state intestate succession laws. Document all distributions carefully.' },
  { step: 17, category: 'Closing the Estate', task: 'File final tax returns for the deceased and the estate', desc: 'A CPA or tax attorney familiar with estate taxation should handle this.' },
  { step: 18, category: 'Closing the Estate', task: 'File to close the estate with the probate court', desc: 'Once all debts are paid and assets distributed, file a petition to formally close the estate.' },
];

const CATEGORIES = [...new Set(CHECKLIST_ITEMS.map(i => i.category))];
const categoryColors = {
  'Immediate Steps': 'bg-red-100 text-red-700',
  'Document Gathering': 'bg-blue-100 text-blue-700',
  'Legal': 'bg-purple-100 text-purple-700',
  'Asset Management': 'bg-amber-100 text-amber-700',
  'Notifications': 'bg-orange-100 text-orange-700',
  'Personal Property': 'bg-green-100 text-green-700',
  'Estate Sale': 'bg-yellow-100 text-yellow-700',
  'Real Estate': 'bg-cyan-100 text-cyan-700',
  'Closing the Estate': 'bg-slate-100 text-slate-700',
};

export default function ProbateChecklist() {
  const [checked, setChecked] = useState({});
  const toggle = (step) => setChecked(prev => ({ ...prev, [step]: !prev[step] }));
  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 text-center">
        <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30">Free Resource</Badge>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">
          Probate & Estate Settlement Checklist
        </h1>
        <p className="text-slate-300 max-w-xl mx-auto">
          18 steps from death certificate to closing the estate. Print it, share it, check things off as you go.
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <ProbateDisclaimer />

        {/* Progress */}
        <div className="bg-slate-50 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Your Progress</p>
            <p className="text-2xl font-bold text-slate-900">{completedCount} / {CHECKLIST_ITEMS.length} steps completed</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
                strokeDasharray={`${(completedCount / CHECKLIST_ITEMS.length) * 100} 100`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">
              {Math.round((completedCount / CHECKLIST_ITEMS.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Checklist */}
        {CATEGORIES.map(cat => (
          <div key={cat}>
            <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Badge className={categoryColors[cat]}>{cat}</Badge>
            </h2>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.filter(i => i.category === cat).map(item => (
                <div
                  key={item.step}
                  onClick={() => toggle(item.step)}
                  className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${checked[item.step] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {checked[item.step]
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <Circle className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${checked[item.step] ? 'text-green-800 line-through' : 'text-slate-900'}`}>
                      Step {item.step}: {item.task}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <Card className="shadow-xl border-amber-200">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Need Help with Any of These Steps?</h2>
            <p className="text-slate-600 mb-6">Tell us where you are in the process and we'll connect you with estate sale companies, realtors, and other resources in your area.</p>
            <ProbateLeadForm sourcePage="/probate-checklist" />
          </CardContent>
        </Card>
      </div>

      <SharedFooter />
    </div>
  );
}