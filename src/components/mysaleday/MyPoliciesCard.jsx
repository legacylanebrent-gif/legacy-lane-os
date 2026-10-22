// Chapter 19 P1-13 — My Sale Day: company policies with my acknowledgment
// state. Files open through short-lived private links.
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck2, ShieldAlert } from 'lucide-react';

export default function MyPoliciesCard({ policies }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-cyan-700" /> Company policies</CardTitle>
        <p className="text-xs text-slate-500">Private documents — the links work for a few minutes. Ask the operator for a paper copy if a link has expired.</p>
        <Link to="/CompanyKnowledge" className="text-xs text-cyan-600 underline">Browse approved company knowledge →</Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!policies || policies.length === 0) && <p className="text-sm text-slate-400">No active policy documents on record.</p>}
        {policies?.map((p) => {
          const acked = p.my_ack && p.my_ack.status === 'ACKNOWLEDGED';
          const versionStale = acked && p.my_ack.acknowledged_version != null && p.my_ack.acknowledged_version < (p.version || 1);
          return (
            <div key={p.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                <p className="text-xs text-slate-400">v{p.version || 1}{p.expiration_date ? ` · expires ${p.expiration_date}` : ''}</p>
              </div>
              {acked && !versionStale && <Badge className="bg-green-100 text-green-700 border-green-300">Acknowledged</Badge>}
              {acked && versionStale && <Badge className="bg-amber-100 text-amber-800 border-amber-300"><ShieldAlert className="w-3 h-3 mr-1" />Updated since you acknowledged</Badge>}
              {!acked && <Badge className="bg-slate-100 text-slate-500 border-slate-300">Not acknowledged</Badge>}
              {p.file_url && (
                <a href={p.file_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-600 underline">Open</a>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}