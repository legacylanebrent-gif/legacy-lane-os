import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, SkipForward, Undo2, Loader2 } from 'lucide-react';
import { READINESS_STATUS } from './agreementModel';

// One readiness item. An item that does not apply yet can be SKIPPED — recorded as
// skipped (who, when, why), never as complete, so the operator keeps moving.
export default function ReadinessAreaCard({ area, onSkip, onUnskip, busy }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cfg = READINESS_STATUS[area.status] || READINESS_STATUS.UNKNOWN;
  const wasCfg = area.computedStatus ? (READINESS_STATUS[area.computedStatus] || READINESS_STATUS.UNKNOWN) : null;
  const canSkip = !area.skipped && area.status === 'NEEDS_REVIEW';

  const confirmSkip = async () => {
    await onSkip(area, reason.trim());
    setOpen(false);
    setReason('');
  };

  return (
    <div className={`bg-white border rounded-lg p-2.5 ${area.skipped ? 'border-slate-300 border-dashed' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 leading-snug">{area.label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${cfg.tone}`}>{cfg.label}</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{area.detail}</p>
      {area.skipped && wasCfg && (
        <p className="text-[11px] text-slate-400 mt-1">Records showed {wasCfg.label} when this was skipped.</p>
      )}
      {area.link && area.linkLabel && (
        <Link to={area.link} className="text-[11px] text-orange-700 hover:underline inline-flex items-center gap-0.5 mt-1">
          {area.linkLabel}<ExternalLink className="w-2.5 h-2.5" />
        </Link>
      )}
      {(canSkip || area.skipped) && (
        <div className="mt-1.5">
          {area.skipped ? (
            <button
              type="button"
              onClick={() => onUnskip(area)}
              disabled={busy}
              className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Undo2 className="w-2.5 h-2.5" />}Undo skip
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
            >
              <SkipForward className="w-2.5 h-2.5" />Skip for now
            </button>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Skip {area.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              This item will be recorded as <strong>SKIPPED</strong>, not complete. What the records show stays visible, and you can undo the skip at any time.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600">Why are you skipping it? (optional)</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Client will decide at the walkthrough…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={confirmSkip} disabled={busy}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <SkipForward className="w-3.5 h-3.5 mr-1" />}Skip item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}