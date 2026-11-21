import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReadinessAreaCard from './ReadinessAreaCard';

// Chapter 9 P1 — DETERMINISTIC agreement readiness (the interactive replacement
// for the book's Pre-Signing Review Checklist). Counts, never percentages.
// Language is operational — never "legally ready" / "safe to sign".
// Any item the operator deliberately passes over can be SKIPPED: recorded as
// skipped, never as complete, so work is never bottlenecked.

export default function AgreementReadiness({ readiness, onSkip, onUnskip, busyAreaId }) {
  const { areas, counts, headline } = readiness;
  return (
    <Card className="border-cyan-200 bg-cyan-50/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Agreement Readiness</span>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">{counts.complete} AREAS COMPLETE</Badge>
          {counts.skipped > 0 && <Badge className="bg-slate-100 text-slate-600 border-slate-300">{counts.skipped} SKIPPED</Badge>}
          {counts.review > 0 && <Badge className="bg-red-100 text-red-700 border-red-300">{counts.review} NEED REVIEW</Badge>}
          {counts.na > 0 && <Badge variant="outline">{counts.na} NOT APPLICABLE</Badge>}
        </div>
        <p className={`text-sm font-medium ${counts.review === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {headline}
        </p>
        <p className="text-xs text-slate-500">
          Computed from records only — operational information, never a legal conclusion. Resolve each item, or skip what does not apply yet: a skipped item is recorded as skipped, never as complete.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {areas.map(a => (
            <ReadinessAreaCard
              key={a.id}
              area={a}
              onSkip={onSkip}
              onUnskip={onUnskip}
              busy={busyAreaId === a.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}