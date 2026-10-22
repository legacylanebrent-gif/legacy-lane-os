// Chapter 20 P1-9/P1-55 — My Sale Day context: the ENTRY PROCEDURE (operator
// procedure, never a legal capacity) and the team-safe CLIENT DAY notice.
// Server-projected, least-privilege fields only.
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DoorOpen, UserRound } from 'lucide-react';

export default function MyDayContextCard({ entry, clientDay }) {
  if (!entry && !clientDay) return null;
  const showClient = clientDay && (clientDay.client_expected || clientDay.client_on_site || clientDay.boundaries_note || clientDay.instructions);
  if (!entry && !showClient) return null;
  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        {entry && (
          <div className="text-sm space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-teal-700" /> Entry procedure
              <Badge variant="outline" className="text-[10px]">{entry.mode === 'CAPACITY_CONTROLLED' ? 'CAPACITY CONTROLLED' : 'OPEN ENTRY'}</Badge>
            </p>
            {entry.mode === 'CAPACITY_CONTROLLED' && (
              <p className="text-xs text-slate-700">
                Working target: about {entry.capacity_target || '—'} people inside{entry.one_out_one_in ? ' · one-out-one-in when reached' : ''}.
                <span className="text-slate-400"> (Operator procedure — not a legal capacity.)</span>
              </p>
            )}
            {entry.procedure_note && <p className="text-xs text-slate-700">{entry.procedure_note}</p>}
            {entry.instructions && <p className="text-xs text-slate-600">{entry.instructions}</p>}
          </div>
        )}
        {showClient && (
          <div className="text-sm space-y-1 border-t border-slate-100 pt-2">
            <p className="font-semibold flex items-center gap-1.5">
              <UserRound className="w-4 h-4 text-amber-700" /> Client day
              {clientDay.client_on_site
                ? <Badge className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300">ON SITE</Badge>
                : clientDay.client_expected
                  ? <Badge variant="outline" className="text-[10px]">EXPECTED{clientDay.expected_time ? ` (${clientDay.expected_time})` : ''}</Badge>
                  : null}
            </p>
            {clientDay.client_on_site && <p className="text-xs text-amber-800">The client is on site — any client matter goes to the operator. You cannot authorize client requests.</p>}
            {clientDay.boundaries_note && <p className="text-xs text-slate-700">{clientDay.boundaries_note}</p>}
            {clientDay.instructions && <p className="text-xs text-slate-600">{clientDay.instructions}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}