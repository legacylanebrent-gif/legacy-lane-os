import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CalendarDays, Loader2 } from 'lucide-react';
import { QUARTER_TWO_PRIORITIES } from './launchModel';

// Chapter 27 P1 — QUARTER TWO BUILDER. The smallest useful next-90-days step:
// operator-selected priority areas + goals + a review point. A structured plan
// for humans — NOT automated goal analytics (Chapter 26 goal analytics were
// not built; nothing here pretends otherwise).

export default function QuarterTwoCard({ launch, saving, onSave }) {
  const plan = launch?.quarter_two;
  const [priorities, setPriorities] = useState(plan?.priorities || []);
  const [goals, setGoals] = useState(plan?.goals?.length ? plan.goals : []);
  const [reviewPoint, setReviewPoint] = useState(plan?.review_point || '');
  const [note, setNote] = useState(plan?.note || '');

  const toggle = (key) => setPriorities(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  const setGoal = (priority, field, value) => {
    setGoals(gs => {
      const idx = gs.findIndex(g => g.priority === priority);
      if (idx === -1) return [...gs, { priority, [field]: value }];
      const next = [...gs]; next[idx] = { ...next[idx], [field]: value }; return next;
    });
  };
  const goalFor = (p) => goals.find(g => g.priority === p) || { priority: p };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-cyan-600" /> Quarter Two Builder</p>
        {plan && <Badge className="bg-green-100 text-green-700 border border-green-300">Plan created {new Date(plan.created_at).toLocaleDateString()}</Badge>}
      </div>
      <p className="text-[11px] text-slate-500">
        A 90-day plan should end by creating the next 90-day plan. Choose priority areas from what Day 90 evidence (and your
        judgment) support. This is a plan for humans, not an automated commitment engine.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUARTER_TWO_PRIORITIES.map(p => (
          <button key={p.key} type="button" onClick={() => toggle(p.key)}
            className={`text-[11px] font-medium rounded-lg px-2.5 py-1.5 border transition-colors ${priorities.includes(p.key) ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}>
            {p.label}
          </button>
        ))}
      </div>
      {priorities.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          {priorities.map(key => {
            const g = goalFor(key);
            return (
              <div key={key} className="flex flex-col sm:flex-row gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 sm:w-52 shrink-0">{QUARTER_TWO_PRIORITIES.find(p => p.key === key)?.label}</span>
                <Input className="text-xs h-8 flex-1" placeholder="Goal / outcome (optional)" value={g.goal || ''} onChange={(e) => setGoal(key, 'goal', e.target.value)} />
                <Input className="text-xs h-8 sm:w-36" type="date" value={g.target_date || ''} onChange={(e) => setGoal(key, 'target_date', e.target.value)} />
              </div>
            );
          })}
          <div className="flex flex-col sm:flex-row gap-1.5 items-start sm:items-end">
            <label className="flex-1 w-full">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Review point</span>
              <Input className="text-xs h-8" type="date" value={reviewPoint} onChange={(e) => setReviewPoint(e.target.value)} />
            </label>
            <label className="flex-1 w-full">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Note (optional)</span>
              <Input className="text-xs h-8" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          <Button size="sm" className="text-xs gap-1.5" disabled={saving} onClick={() => onSave({ priorities, goals: goals.filter(g => priorities.includes(g.priority)), review_point: reviewPoint, note })}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}{plan ? 'Update the plan' : 'Create the Quarter Two plan'}
          </Button>
        </div>
      )}
    </div>
  );
}