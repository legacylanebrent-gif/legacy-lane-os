import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, CheckCircle2, Circle, Loader2 } from 'lucide-react';

// Chapter 27 P1 — LAUNCH GRADUATION. Evidence-based, human-confirmed — NEVER
// granted because 90 days elapsed. Graduating moves the operator from Launch
// Mode to the normal EstateSalen operating system; launch history (baseline,
// Day 90 review, Quarter Two plan) is preserved as company history.

export default function GraduationCard({ eligibility, launch, saving, onGraduate, onNotApplicable }) {
  const done = eligibility.every(e => e.done);
  const graduated = !!launch?.graduated_at;
  const [waiving, setWaiving] = useState(false);
  const [waiveNote, setWaiveNote] = useState('');

  if (graduated) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-green-800 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Graduated from Launch Mode — {new Date(launch.graduated_at).toLocaleDateString()}</p>
        <p className="text-[11px] text-green-700">{launch.graduation_note || 'Running the normal EstateSalen operating system.'}</p>
        <p className="text-[10px] text-green-600">Your Day 1 baseline, Day 90 review and Quarter Two plan remain preserved below as company history.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-cyan-600" /> Graduation from Launch Mode</p>
      <p className="text-[11px] text-slate-500">
        The goal of Launch Mode is to graduate OUT of it. Graduation is evidence-based and human-confirmed — days elapsed
        never graduate you by themselves.
      </p>
      <ul className="space-y-1.5">
        {eligibility.map(e => (
          <li key={e.key} className="flex items-start gap-2 text-xs">
            {e.done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />}
            <span className={e.done ? 'text-slate-700' : 'text-slate-500'}>
              {e.label}{e.waived ? ' (recorded as not applicable by human judgment)' : ''}
            </span>
          </li>
        ))}
      </ul>
      {!done && (
        <div className="border-t border-slate-100 pt-2 space-y-2">
          {waiving ? (
            <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <p className="text-[11px] text-amber-800">Record that a complete first-project cycle is NOT applicable to your circumstances (a human judgment, never automatic). Explain the business reason — it is preserved.</p>
              <input className="w-full text-xs border rounded p-1.5" value={waiveNote} onChange={(e) => setWaiveNote(e.target.value)} placeholder="Why is a first sale project not applicable?" />
              <Button size="sm" variant="outline" className="text-xs" disabled={!waiveNote.trim() || saving} onClick={() => { onNotApplicable(waiveNote); setWaiving(false); setWaiveNote(''); }}>Record not-applicable judgment</Button>
            </div>
          ) : (
            <button className="text-[10px] text-slate-400 underline hover:text-slate-600" onClick={() => setWaiving(true)}>
              A first sale project is not applicable to my circumstances
            </button>
          )}
        </div>
      )}
      <Button size="sm" className="text-xs gap-1.5" disabled={!done || saving} onClick={onGraduate}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Graduate to the normal operating system
      </Button>
      {!done && <p className="text-[10px] text-slate-400">Complete the checklist above to unlock graduation.</p>}
    </div>
  );
}