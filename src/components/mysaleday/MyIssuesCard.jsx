// Chapter 19 P1-30 — My Sale Day: my asks for help and their answers.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleHelp } from 'lucide-react';

const URGENCY_BADGE = {
  URGENT: 'bg-red-100 text-red-700 border-red-300',
  IMPORTANT: 'bg-amber-100 text-amber-800 border-amber-300',
  ROUTINE: 'bg-slate-100 text-slate-500 border-slate-300',
};
const STATUS_BADGE = {
  OPEN: 'bg-red-100 text-red-700 border-red-300',
  WAITING: 'bg-amber-100 text-amber-800 border-amber-300',
  RESOLVED: 'bg-green-100 text-green-700 border-green-300',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-300',
};

export default function MyIssuesCard({ issues }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><CircleHelp className="w-5 h-5 text-cyan-700" /> My asks for help</CardTitle>
        <p className="text-xs text-slate-500">What you raised, and the operator's answer when it comes.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!issues || issues.length === 0) && <p className="text-sm text-slate-400">You have not raised anything for this sale.</p>}
        {issues?.map((i) => (
          <div key={i.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-1.5">
              {i.title}
              <Badge variant="outline" className={URGENCY_BADGE[i.urgency]}>{i.urgency}</Badge>
              <Badge variant="outline" className={STATUS_BADGE[i.status]}>{i.status}</Badge>
            </p>
            {(i.status === 'RESOLVED' || i.status === 'CANCELLED') ? (
              i.resolution && (
                <p className="text-xs text-slate-600 mt-1 bg-green-50 border border-green-200 rounded-md px-2 py-1.5">
                  <span className="font-semibold">Answer:</span> {i.resolution}
                </p>
              )
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Waiting on {i.owner_name || 'the operator'}{i.answer_by ? ` — needed by ${i.answer_by}` : ''}.
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}