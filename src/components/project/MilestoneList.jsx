// Chapter 13 P1 — MILESTONES (P1-29): derived-only milestone chips computed by
// projectModel from canonical state. No milestone records, no workflow engine.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, MinusCircle, Flag } from 'lucide-react';

const STATE_ICON = {
  COMPLETE: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
  PENDING: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />,
  NOT_APPLICABLE: <MinusCircle className="w-4 h-4 text-slate-200 flex-shrink-0" />,
};

export default function MilestoneList({ milestones }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Flag className="w-5 h-5 text-green-600" /> Milestones
        </CardTitle>
        <p className="text-xs text-slate-500">Derived from canonical records — not a separate checklist.</p>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {milestones.map((m) => (
            <div key={m.key} className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
              {STATE_ICON[m.state]}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${m.state === 'COMPLETE' ? 'text-slate-900' : m.state === 'NOT_APPLICABLE' ? 'text-slate-400' : 'text-slate-700'}`}>
                  {m.label}
                </p>
                <p className="text-xs text-slate-500">{m.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}