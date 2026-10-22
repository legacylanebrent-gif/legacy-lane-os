// Chapter 20 P1-5 — LAST-MINUTE CHANGE REVIEW: meaningful recent changes
// assembled from canonical timestamps/history only. No separate change log
// exists or is created here.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { format } from 'date-fns';

const Row = ({ label, detail, at }) => (
  <li className="text-xs text-slate-700">
    <span className="font-medium">{label}</span>
    {detail ? <span> — {detail}</span> : null}
    {at ? <span className="text-slate-400"> · {format(new Date(at), 'MMM d, h:mm a')}</span> : null}
  </li>
);

export default function ChangesCard({ changes }) {
  const c = changes || {};
  const count = (c.sold || []).length + (c.updatedItems || []).length + (c.offers || []).length
    + (c.issues || []).length + (c.decisions || []).length + (c.assignmentChanges || []).length;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-700" /> What Changed
          <Badge variant="outline">{count}</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Since the last brief acknowledgment{c.since ? ` (${format(new Date(c.since), 'MMM d, h:mm a')})` : ' (last 24h)'} — from record history only.
        </p>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="text-xs text-slate-400">No recorded changes since then — the team is looking at current truth.</p>
        ) : (
          <ul className="space-y-1.5">
            {(c.sold || []).map((i) => <Row key={`s${i.id}`} label={`SOLD: ${i.title}`} detail={`$${Number(i.sold_price ?? i.price).toLocaleString()}`} at={i.sold_date} />)}
            {(c.updatedItems || []).map((i) => <Row key={`u${i.id}`} label={`${i.title}`} detail={`now ${i.status}`} at={i.updated_date} />)}
            {(c.offers || []).map((o) => <Row key={`o${o.id}`} label={`Offer $${Number(o.offer_amount).toLocaleString()}`} detail={`${o.item_name || ''} — ${o.status}`} at={o.created_date} />)}
            {(c.decisions || []).map((d) => <Row key={`d${d.id}`} label={`Client decision: ${d.subject}`} detail={d.current_decision} at={d.updated_date || d.created_date} />)}
            {(c.issues || []).map((x) => <Row key={`i${x.id}`} label={`New issue: ${x.title}`} detail={x.urgency} at={x.created_date} />)}
            {(c.assignmentChanges || []).map((a) => <Row key={`a${a.id}`} label={`Staffing: ${a.responsibility_type}`} detail={`${a.primary_member_name || 'unassigned'}${a.status === 'CLEARED' ? ' (cleared)' : ''}`} at={a.updated_date} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}