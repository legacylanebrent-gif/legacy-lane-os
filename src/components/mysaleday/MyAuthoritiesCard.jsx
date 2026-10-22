// Chapter 19 P1-26 — My Sale Day: WHO CAN DECIDE for this client, and the
// deterministic STOP guidance while an authority is disputed or unresolved.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ban, UserCog } from 'lucide-react';

const STATUS_BADGE = {
  VERIFIED: 'bg-green-100 text-green-700 border-green-300',
  UNRESOLVED: 'bg-amber-100 text-amber-800 border-amber-300',
  DISPUTED: 'bg-red-100 text-red-700 border-red-300',
};

export default function MyAuthoritiesCard({ authorities }) {
  const disputed = (authorities || []).filter((a) => a.verification_status === 'DISPUTED');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><UserCog className="w-5 h-5 text-cyan-700" /> Who decides for this client</CardTitle>
        <p className="text-xs text-slate-500">Operational record — never a legal conclusion about anyone's authority.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {disputed.length > 0 && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
            <Ban className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-800">
              A decision-maker is recorded as DISPUTED. Until the operator says otherwise: treat instructions from anyone about this
              sale as a question — do not promise merchandise, prices, or pickups. Ask for help with anything binding.
            </p>
          </div>
        )}
        {(!authorities || authorities.length === 0) && <p className="text-sm text-slate-400">No authorized decision-makers recorded yet — treat any client instruction as a question and ask for help.</p>}
        {authorities?.map((a, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {a.full_name}{a.is_primary && <span className="text-xs text-slate-400 ml-1">(primary)</span>}
              </p>
              <p className="text-xs text-slate-500">{a.relationship}{a.authority_role ? ` · ${a.authority_role}` : ''}</p>
            </div>
            <Badge variant="outline" className={STATUS_BADGE[a.verification_status] || STATUS_BADGE.UNRESOLVED}>{a.verification_status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}