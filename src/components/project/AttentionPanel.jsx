// Chapter 13 P1 — OWNER ATTENTION (P1-47): deterministic attention list —
// overdue tasks, overdue issues, unresolved authority, blocked tasks,
// outstanding client requests, upcoming family/client deadlines, open
// decisions. NO AI, no fake score.
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell } from 'lucide-react';

export default function AttentionPanel({ attention }) {
  const high = attention.filter((a) => a.severity === 'high');
  const medium = attention.filter((a) => a.severity !== 'high');
  return (
    <Card className={high.length > 0 ? 'border-red-200' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className={`w-5 h-5 ${high.length > 0 ? 'text-red-600' : 'text-slate-400'}`} /> Needs My Attention
          <Badge className={high.length > 0 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-100 text-slate-500'}>{attention.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attention.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">Nothing needs attention right now.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {attention.map((a, idx) => (
              <Link key={idx} to={a.link} className="block">
                <div className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${a.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50/60 border-amber-200'}`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${a.severity === 'high' ? 'text-red-800' : 'text-amber-800'}`}>{a.label}</p>
                    <p className="text-xs text-slate-600">{a.detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {medium.length > 0 && high.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">{high.length} urgent · {medium.length} to watch</p>
        )}
      </CardContent>
    </Card>
  );
}