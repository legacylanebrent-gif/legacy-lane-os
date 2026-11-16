import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, CheckCircle2, ExternalLink, EyeOff, Sparkles } from 'lucide-react';
import TOUR_STEPS from './usageTourSteps';
import UsageTourAskPanel from './UsageTourAskPanel';
import { cn } from '@/lib/utils';

export default function UsageTourDialog({ open, onClose, onDismissAuto, user }) {
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-cyan-900 px-4 py-3 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 font-serif text-lg text-white sm:text-xl">
            <Sparkles className="w-5 h-5 text-cyan-300" />
            Your guided tour
          </DialogTitle>
          <p className="text-xs text-cyan-100">
            The 5 things to do first, in order — ask the AI anything along the way.
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Step navigation */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 md:w-48 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                className={cn(
                  'flex-shrink-0 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold leading-snug transition-colors md:w-full md:text-xs',
                  i === index
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Step content + ask panel */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900 sm:text-xl">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.summary}</p>
            </div>

            <ul className="space-y-1.5">
              {step.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 w-4 h-4 flex-shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              to={step.href}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Open {step.pageName}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="text-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <span className="text-xs text-slate-400">
                Step {index + 1} of {TOUR_STEPS.length}
              </span>
              {isLast ? (
                <Button size="sm" onClick={onClose} className="bg-cyan-600 text-white hover:bg-cyan-700">
                  Done
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>

            <UsageTourAskPanel user={user} stepId={step.id} askExample={step.askExample} />

            {onDismissAuto && (
              <button
                onClick={async () => {
                  await onDismissAuto();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600"
              >
                <EyeOff className="w-3 h-3" />
                Stop opening this tour automatically (you can always open it from the dashboard)
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}