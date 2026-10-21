import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, CheckCircle2 } from 'lucide-react';
import { STARTING_QUESTIONS, cqCategoryLabel, cqJurisdictionLabel } from './complianceModel';

// Starter QUESTIONS — prompts to investigate, never answers or requirements.
export default function StartingQuestions({ existing, onAdd }) {
  const exists = (q) => existing.some(e => (e.question || '').trim().toLowerCase() === q.trim().toLowerCase());
  const remaining = STARTING_QUESTIONS.filter(s => !exists(s.question));
  if (remaining.length === 0) return null;

  return (
    <Card className="border-dashed border-slate-300 bg-slate-50/50">
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="font-semibold text-slate-800 text-sm">Starting questions to consider investigating</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Prompts to make sure your business has answered — not answers, and not legal advice.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {remaining.map((s) => (
            <div key={s.question} className="flex items-start justify-between gap-2 bg-white border border-slate-200 rounded-lg p-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-800 leading-snug">{s.question}</p>
                <p className="text-xs text-slate-400 mt-1">{cqCategoryLabel(s.category)} · {cqJurisdictionLabel(s.jurisdiction_type)}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-shrink-0" onClick={() => onAdd(s)}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}