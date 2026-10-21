// Chapter 13 P1 — AUTHORITY SUMMARY (P1-13/P1-15): a clear team-facing answer
// to WHO MAY GIVE INSTRUCTIONS / WHO RECEIVES ROUTINE COMMUNICATION / WHO MUST
// APPROVE CONSEQUENTIAL CHANGES, from the canonical SaleAuthority records.
// INVOLVEMENT IS NOT AUTHORITY; no evidence/private detail is exposed here.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const VERIFIED_BADGE = {
  VERIFIED: 'bg-green-100 text-green-700 border-green-300',
  UNRESOLVED: 'bg-amber-100 text-amber-800 border-amber-300',
  DISPUTED: 'bg-red-100 text-red-700 border-red-300',
};

const scopeLabel = (s) => (s || '').replace(/_/g, ' ');

export default function AuthoritySummaryCard({ authorities, sale }) {
  const active = (authorities || []).filter((a) => a.is_active);
  const plan = sale?.communication_plan || {};
  const instructors = active.filter((a) => (a.authority_scopes || []).some((s) =>
    ['general_project', 'merchandise_decisions', 'pricing_approval', 'disposition', 'other'].includes(s)));
  const consequential = active.filter((a) => (a.authority_scopes || []).some((s) =>
    ['financial_settlement', 'disposition', 'pricing_approval'].includes(s)));
  const primary = active.find((a) => a.is_primary);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" /> Authority Summary
        </CardTitle>
        <p className="text-xs text-slate-500">Involvement is not authority — these are the recorded decision-makers.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" /> No authorized decision-maker recorded yet.
          </p>
        )}
        {active.map((a) => (
          <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {a.full_name}
                {a.is_primary && <Badge className="ml-2 bg-indigo-100 text-indigo-700">PRIMARY</Badge>}
                {a.authority_role ? <span className="text-slate-500 text-xs ml-1.5">— {a.authority_role}</span> : null}
              </p>
              <p className="text-xs text-slate-500">{(a.authority_scopes || []).map(scopeLabel).join(' · ') || 'general project'}</p>
            </div>
            <Badge className={`${VERIFIED_BADGE[a.verification_status || 'UNRESOLVED']} flex-shrink-0 w-fit`}>
              {(a.verification_status || 'UNRESOLVED')}
            </Badge>
          </div>
        ))}
        <div className="pt-2 space-y-1.5 text-sm border-t border-slate-100">
          <p><span className="text-slate-500">May give instructions:</span>{' '}
            <span className="font-medium">{instructors.length ? instructors.map((a) => a.full_name).join(', ') : 'Not established'}</span></p>
          <p><span className="text-slate-500">Must approve consequential changes:</span>{' '}
            <span className="font-medium">{consequential.length ? consequential.map((a) => a.full_name).join(', ')
              : (primary ? primary.full_name : 'Not established')}</span></p>
          <p><span className="text-slate-500">Receives routine communication:</span>{' '}
            <span className="font-medium">{plan.primary_contact_name || 'Not set (see Communication Plan)'}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}