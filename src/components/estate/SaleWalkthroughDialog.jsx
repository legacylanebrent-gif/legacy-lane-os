import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { SALE_CREATE_STAGES, WALKTHROUGH_SCHEMA, walkthroughPrompt } from './saleCreateStages';

// One AI-written walkthrough covers all four stages, so it is cached for the session.
let walkthroughCache = null;

export default function SaleWalkthroughDialog({ open, onOpenChange, onGoToStage }) {
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState(walkthroughCache?.stages || null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const start = async () => {
    if (stages || loading) return;
    setFailed(false);
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: walkthroughPrompt(),
        response_json_schema: WALKTHROUGH_SCHEMA,
      });
      const list = (result?.stages || []).slice().sort((a, b) => (a.step || 0) - (b.step || 0));
      walkthroughCache = { stages: list };
      setStages(list);
    } catch (error) {
      console.error('Walkthrough failed:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setBlocked(false);
      start();
    }
  };

  const current = stages?.[index];
  const meta = SALE_CREATE_STAGES[index];
  const isLast = stages ? index === stages.length - 1 : false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600" />
            AI Walkthrough
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-10 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto" />
            <p className="text-sm text-slate-600">Writing your walkthrough…</p>
          </div>
        )}

        {!loading && failed && (
          <p className="text-sm text-slate-600 py-4">
            The walkthrough could not load right now. Try again in a moment, or tap the info button beside the
            steps for a quick explanation of where you are.
          </p>
        )}

        {!loading && current && (
          <div className="space-y-4">
            <div className="flex gap-1.5">
              {stages.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setIndex(i); setBlocked(false); }}
                  aria-label={`Go to step ${s.step}`}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i === index ? 'bg-orange-600' : i < index ? 'bg-orange-300' : 'bg-slate-200'}`}
                />
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              Step {current.step || index + 1} of {stages.length} · {meta?.label || ''}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">{current.headline}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{current.what_happens}</p>

            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1.5">What to do</p>
              <ul className="space-y-1.5">
                {(current.do_this || []).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {current.watch_out && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-900">{current.watch_out}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                Back
              </Button>
              {isLast ? (
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => onOpenChange(false)}>
                  Got it
                </Button>
              ) : (
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => setIndex((i) => i + 1)}>
                  Next step
                </Button>
              )}
            </div>

            {onGoToStage && meta && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-orange-700 hover:text-orange-800 hover:bg-orange-50"
                onClick={() => {
                  const jumped = onGoToStage(meta.step);
                  if (jumped === false) {
                    setBlocked(true);
                  } else {
                    onOpenChange(false);
                  }
                }}
              >
                Take me to {meta.label}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {blocked && (
              <p className="text-xs text-center text-slate-500">
                That step unlocks after the earlier steps are complete.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}