import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const DEFAULT_STEPS = [
  { step: 1, title: 'Get Certified Death Certificates', desc: 'Obtain multiple certified copies of the death certificate. You will need them for courts, banks, insurers, and title companies. Confirm with your local probate court or licensed attorney for how many you may need.' },
  { step: 2, title: 'Locate the Will, Trust, Deeds & Financial Documents', desc: 'Search for the original will, any trusts, property deeds, vehicle titles, bank account statements, retirement accounts, and insurance policies. Keep them in a secure location.' },
  { step: 3, title: 'Determine Whether Probate Is Required', desc: 'Not all estates require formal probate. Assets held jointly, in trust, or with named beneficiaries may transfer outside probate. Confirm with your local probate court or licensed attorney.' },
  { step: 4, title: 'Identify the Correct Probate Court', desc: 'Probate is typically handled in the county where the deceased person lived. Search your state\'s court directory or confirm with your local probate court or licensed attorney.' },
  { step: 5, title: 'File the Required Petition / Forms', desc: 'File a petition to open the estate with the appropriate court. Required forms vary by state and county. Confirm with your local probate court or licensed attorney for current forms and filing fees.' },
  { step: 6, title: 'Get Appointed as Executor / Personal Representative', desc: 'The court will appoint an executor (if named in the will) or an administrator (if no will exists). This gives you legal authority to act on behalf of the estate.' },
  { step: 7, title: 'Inventory Assets and Debts', desc: 'Create a complete inventory of all assets (real estate, vehicles, bank accounts, personal property) and all debts (mortgages, credit cards, taxes, loans). The court may require a formal inventory.' },
  { step: 8, title: 'Notify Creditors and Interested Parties', desc: 'Most states require you to formally notify known creditors and publish a notice to unknown creditors. Confirm with your local probate court or licensed attorney for your state\'s specific requirements.' },
  { step: 9, title: 'Decide What to Keep, Sell, Donate, or Discard', desc: 'Work with beneficiaries to decide the fate of personal property. Document decisions carefully. An estate sale company can help appraise, organize, and sell items.' },
  { step: 10, title: 'Schedule an Estate Sale or Cleanout', desc: 'If there is significant personal property to liquidate, hire a licensed estate sale company to handle the sale. After the sale, schedule a cleanout for remaining items.' },
  { step: 11, title: 'Prepare Inherited Real Estate for Sale', desc: 'Determine condition of the property. Minor repairs and staging can increase value. Get a professional appraisal and market analysis before deciding on a sale price or method.' },
  { step: 12, title: 'Choose a Realtor, Investor, or Other Sale Path', desc: 'Options include listing with a probate-friendly real estate agent, accepting a cash offer from an investor, or auctioning the property. Each option has different timelines and net proceeds.' },
];

export default function ProbateStepProcess({ steps = DEFAULT_STEPS }) {
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <div key={s.step} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
            {s.step}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}