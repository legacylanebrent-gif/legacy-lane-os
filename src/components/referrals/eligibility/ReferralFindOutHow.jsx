import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Sparkles, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    title: 'Hold a real-estate license',
    body: 'An active salesperson or broker license in your state. Already licensed as an estate sale professional or agent? You are most of the way there.',
  },
  {
    title: 'Work through a brokerage',
    body: 'Referral fees are paid through a brokerage, so you confirm which brokerage you hang your license with.',
  },
  {
    title: 'Submit it here once',
    body: 'Upload your license and brokerage details on this page. An administrator reviews it — no exams, no new business entity, no extra software.',
  },
  {
    title: 'Refer your clients',
    body: 'Send a client through the referral center. We notify the agents serving the property and track what happens with them.',
  },
  {
    title: 'Earn when the sale closes',
    body: 'Your share of the referral fee is paid once the referred sale closes, subject to the executed referral agreement.',
  },
];

export default function ReferralFindOutHow() {
  const [open, setOpen] = useState(false);

  const startApplication = () => {
    document.getElementById('eligibility-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
            <Sparkles className="h-3 w-3" />
            Find out how
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-slate-900">
            How easy it really is to become a real estate referral agent
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <CardContent className="space-y-3 border-t border-slate-100 pt-3">
          <p className="text-sm leading-relaxed text-slate-600">
            Most of the work is a license you may already hold. There is nothing new to run: you refer
            the client once, and the transaction is handled by the agent who closes it.
          </p>

          <ol className="space-y-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="text-xs leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              Tracked introductions already work without a license. A verified license is what makes
              the referral income above apply — and compensation stays disabled platform-wide until
              the program goes live.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={startApplication}
            className="w-full bg-cyan-600 text-white hover:bg-cyan-700"
          >
            Start my application below
          </Button>
        </CardContent>
      )}
    </Card>
  );
}