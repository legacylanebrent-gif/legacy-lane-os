import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SALE_CREATE_STAGES, STAGE_SCHEMA, stagePrompt } from './saleCreateStages';

// Per-stage explanations are cached for the session so re-opening a step costs nothing.
const stageCache = new Map();

export default function StageInfoButton({ step }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);

  const stage = SALE_CREATE_STAGES.find((s) => s.step === step) || SALE_CREATE_STAGES[0];

  useEffect(() => {
    setInfo(stageCache.get(stage.key) || null);
    setFailed(false);
  }, [stage.key]);

  const showHelp = async () => {
    setOpen(true);
    if (info || loading) return;
    setFailed(false);
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: stagePrompt(stage),
        response_json_schema: STAGE_SCHEMA,
      });
      stageCache.set(stage.key, result);
      setInfo(result);
    } catch (error) {
      console.error('Stage help failed:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={showHelp}
        className="h-9 w-9 rounded-full shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50"
        title={`Explain this step (${stage.label})`}
        aria-label={`Explain the ${stage.label} step`}
      >
        <Info className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Info className="w-4 h-4 text-orange-600" />
              This step: {stage.label}
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="py-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto" />
              <p className="text-sm text-slate-600">Reading this step…</p>
            </div>
          )}

          {!loading && failed && (
            <p className="text-sm text-slate-600 py-4">
              The explanation could not load right now. Here is what this step covers: {stage.contents[0]}.
            </p>
          )}

          {!loading && info && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">{info.headline}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{info.what_it_is}</p>

              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1.5">Do this</p>
                <ul className="space-y-1.5">
                  {(info.do_this || []).map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {info.watch_out && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-900">{info.watch_out}</p>
                </div>
              )}

              <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => setOpen(false)}>
                Got it
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}