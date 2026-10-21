import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { READINESS_STATUS } from './agreementModel';

// Chapter 9 P1 — DETERMINISTIC agreement readiness (the interactive replacement
// for the book's Pre-Signing Review Checklist). Counts, never percentages.
// Language is operational — never "legally ready" / "safe to sign".

export default function AgreementReadiness({ readiness }) {
  const { areas, counts, headline } = readiness;
  return (
    <Card className="border-cyan-200 bg-cyan-50/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Agreement Readiness</span>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">{counts.complete} AREAS COMPLETE</Badge>
          {counts.review > 0 && <Badge className="bg-red-100 text-red-700 border-red-300">{counts.review} NEED REVIEW</Badge>}
          {counts.na > 0 && <Badge variant="outline">{counts.na} NOT APPLICABLE</Badge>}
        </div>
        <p className={`text-sm font-medium ${counts.review === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {headline}
        </p>
        <p className="text-xs text-slate-500">Computed from records only — operational information, never a legal conclusion. Resolve each item, then build the agreement.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {areas.map(a => {
            const cfg = READINESS_STATUS[a.status] || READINESS_STATUS.UNKNOWN;
            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 leading-snug">{a.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${cfg.tone}`}>{cfg.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{a.detail}</p>
                {a.link && a.linkLabel && <Link to={a.link} className="text-[11px] text-orange-700 hover:underline inline-flex items-center gap-0.5 mt-1">{a.linkLabel}<ExternalLink className="w-2.5 h-2.5" /></Link>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}