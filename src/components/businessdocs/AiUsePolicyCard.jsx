import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShieldCheck } from 'lucide-react';

// Chapter 24 P1 — COMPANY AI-USE POLICY (reuse of the Business Document vault:
// no new entity). This card surfaces a ready-to-adopt policy outline plus the
// human approval matrix, so the company's AI-use rules live with its other
// policies and can be acknowledged through the existing policy system.
const APPROVAL_MATRIX = [
  ['Item description', 'Yes', 'Yes', 'Yes', 'Operator', 'No', 'Verified-facts boundary'],
  ['Sale description', 'Yes', 'Yes', 'Yes (final review)', 'Operator', 'No', 'Marketing kit approval'],
  ['Marketing content', 'Yes', 'Yes', 'Yes', 'Operator', 'No', 'approve_final_review'],
  ['Email / SMS draft', 'Yes', 'Yes', 'Yes (human sends)', 'Operator', 'No', 'Consent guard on sends'],
  ['Item identification', 'Yes', '—', 'Yes (research note)', 'Operator', 'No', 'AI_SUGGESTION never fact'],
  ['Research / comparables', 'Yes', '—', 'Yes', 'Operator', 'No', 'Evidence ≠ verified'],
  ['Pricing support', 'Yes', '—', 'Yes', 'Operator / seller', 'No', 'changeItemPrice authority'],
  ['Client decision summary', 'Yes', '—', 'Always', 'Operator + SaleAuthority', 'No', 'SaleClientDecision RLS'],
  ['Disposition recommendation', 'Yes', '—', 'Always', 'Operator + client decision', 'No', 'transitionGuards'],
  ['Refund', 'No', 'No', 'Always', 'Operator / admin', 'No', 'saleRefund guard'],
  ['Payment exception', 'No', 'No', 'Always', 'Authorized merchant verification', 'No', 'PaymentAttempt resolution'],
  ['Settlement', 'No', 'No', 'Always', 'Operator', 'No', 'Chapter 23 readiness gates'],
  ['Public recap', 'Yes (draft)', 'Yes (draft)', 'Always', 'Operator', 'No', 'publishSaleRecap'],
  ['Project close', 'No', 'No', 'Always', 'Operator', 'No', 'Close gates'],
];

export default function AiUsePolicyCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(o => !o)}>
        <div>
          <p className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" /> Company AI-Use Policy — ready to adopt
          </p>
          <p className="text-xs text-slate-500">Our AI constitution and human-approval matrix. Save it into your vault as a Policy document (Policy type: “AI-Use Policy”) and acknowledge it like any other policy.</p>
        </div>
        <Badge variant="outline" className="border-orange-300 text-orange-700">{open ? 'Hide' : 'View'}</Badge>
      </button>
      {open && (
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="rounded-lg bg-white border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">AI constitution</p>
            <ul className="text-sm text-slate-700 list-disc list-inside space-y-0.5">
              <li>AI may draft, organize, summarize, surface, and recommend. AI never decides.</li>
              <li>AI output is not verified fact; an AI summary is never the source of truth.</li>
              <li>AI never gains access to data the requesting person cannot access.</li>
              <li>Minimum necessary data applies to everything sent to AI; private information is protected before AI ever sees it.</li>
              <li>A trigger is not authority — automation never creates the authority it needs.</li>
              <li>Publication is a consequential action: AI-generated content is never public until a human approves it.</li>
              <li>The higher the consequence of being wrong, the stronger the required human review.</li>
              <li>Research photos are not marketing photos.</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-3 overflow-x-auto">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Human approval matrix</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-1 text-left">Action</th>
                  <th className="border p-1">AI assists</th>
                  <th className="border p-1">AI drafts</th>
                  <th className="border p-1">Human review</th>
                  <th className="border p-1">Authority</th>
                  <th className="border p-1">AI executes</th>
                </tr>
              </thead>
              <tbody>
                {APPROVAL_MATRIX.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-1 font-medium">{row[0]}</td>
                    <td className="border p-1 text-center">{row[1]}</td>
                    <td className="border p-1 text-center">{row[2]}</td>
                    <td className="border p-1 text-center">{row[3]}</td>
                    <td className="border p-1 text-center">{row[4]}</td>
                    <td className="border p-1 text-center font-semibold text-red-600">{row[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-500" />
            This policy is a template, not legal advice. Adopt it as a Policy document in this vault and assign it for team acknowledgment so your version is the one your team sees.
          </p>
        </CardContent>
      )}
    </div>
  );
}