import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BarChart3, Loader2 } from 'lucide-react';
import { day90Comparisons } from './launchModel';

// Chapter 27 P1 — DAY 90 REALITY + 90-DAY BUSINESS REVIEW. Compares Day 1
// baseline assumptions with ACTUAL canonical evidence. Missing evidence is
// INSUFFICIENT EVIDENCE — never $0, never "no activity". No causal or
// statistical conclusions; one quarter is one quarter.

const CLASS_TONES = {
  'CLOSE TO EXPECTATION': 'bg-green-50 text-green-700 border-green-200',
  'HIGHER THAN EXPECTED': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'LOWER THAN EXPECTED': 'bg-amber-50 text-amber-700 border-amber-200',
  'CHANGED': 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function Day90ReviewCard({ launch, actuals, saving, onComplete }) {
  const done = !!launch?.day90_review?.completed_at;
  const rows = day90Comparisons({ baseline: launch?.baseline, actuals });
  const [learned, setLearned] = useState(launch?.day90_review?.learned_note || '');
  const [needsWork, setNeedsWork] = useState(launch?.day90_review?.needs_work_note || '');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-600" /> Day 90 Reality — what we expected vs what happened</p>
        {done && <Badge className="bg-green-100 text-green-700 border border-green-300">Completed {new Date(launch.day90_review.completed_at).toLocaleDateString()}</Badge>}
      </div>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.key} className="border border-slate-100 rounded-lg p-2">
            <p className="text-[11px] font-semibold text-slate-700">{r.label}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[11px] text-slate-500">
              <span>Expected: <strong className="text-slate-700">{r.expected || 'UNKNOWN'}</strong></span>
              <span>Actual: <strong className="text-slate-700">{r.actual || (r.classification.includes('NOT YET TESTED') ? 'no evidence yet' : 'unknown')}</strong></span>
              <Badge className={`text-[9px] px-1.5 ${CLASS_TONES[r.classification] || 'bg-slate-50 text-slate-500 border border-slate-200'}`}>{r.classification}</Badge>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400">
        Honest comparisons only: missing actual evidence is INSUFFICIENT EVIDENCE — never $0 and never "no activity". One quarter is one quarter, not a pattern.
      </p>
      {!done ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">What did we learn?</span>
            <Textarea rows={2} value={learned} onChange={(e) => setLearned(e.target.value)} className="text-xs" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">What still needs work? (feeds Quarter Two)</span>
            <Textarea rows={2} value={needsWork} onChange={(e) => setNeedsWork(e.target.value)} className="text-xs" />
          </label>
          <Button size="sm" className="text-xs gap-1.5" disabled={saving} onClick={() => onComplete({ learned_note: learned, needs_work_note: needsWork, comparisons: rows })}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Complete the Day 90 review
          </Button>
        </div>
      ) : (
        <div className="border-t border-slate-100 pt-2 space-y-1">
          {launch.day90_review.learned_note && <p className="text-[11px] text-slate-600"><strong>Learned:</strong> {launch.day90_review.learned_note}</p>}
          {launch.day90_review.needs_work_note && <p className="text-[11px] text-slate-600"><strong>Still needs work:</strong> {launch.day90_review.needs_work_note}</p>}
          <p className="text-[10px] text-slate-400">Snapshot preserved as company history; live truth stays in canonical records.</p>
        </div>
      )}
    </div>
  );
}