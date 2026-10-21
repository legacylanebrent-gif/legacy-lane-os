import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileWarning, ShieldQuestion, UserCheck, Receipt, RefreshCcw } from 'lucide-react';

// Chapter 6 P2 — DETERMINISTIC administrative checks. The database already knows
// these facts; AI is never asked to discover them (AI may summarize/prioritize).
export default function AdminChecksPanel({ user }) {
  const [checks, setChecks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [docs, acks, questions] = await Promise.all([
        base44.entities.BusinessDocument.filter({}),
        base44.entities.PolicyAcknowledgment.filter({}),
        base44.entities.ComplianceQuestion.filter({}),
      ]);
      const docList = Array.isArray(docs) ? docs : (docs?.items || []);
      const ackList = Array.isArray(acks) ? acks : (acks?.items || []);
      const qList = Array.isArray(questions) ? questions : (questions?.items || []);

      const docById = Object.fromEntries(docList.map(d => [d.id, d]));
      const expiredDocs = docList.filter(d => d.expiration_date && d.expiration_date < today && d.status === 'ACTIVE');
      const pendingAcks = ackList.filter(a => {
        const doc = docById[a.business_document_id];
        if (!doc) return false;
        return a.status === 'ASSIGNED' || (a.acknowledged_version || a.document_version) !== doc.version;
      });
      const researchNeeded = qList.filter(q => q.status === 'RESEARCH_NEEDED');
      const staleQuestions = qList.filter(q =>
        q.status !== 'RESEARCH_NEEDED' &&
        (!q.last_verified_at || (Date.now() - new Date(q.last_verified_at).getTime()) > 365 * 24 * 3600 * 1000)
      );

      // Reimbursable expenses missing client authorization
      let reimbursableMissingAuth = [];
      try {
        const exps = await base44.entities.Expense.filter({ is_reimbursable: true });
        const expList = Array.isArray(exps) ? exps : (exps?.items || []);
        if (expList.length > 0) {
          const decs = await base44.entities.SaleClientDecision.filter({
            related_expense_id: { $in: expList.map(e => e.id) },
          });
          const decList = Array.isArray(decs) ? decs : (decs?.items || []);
          const authorizedIds = new Set(decList
            .filter(d => d.decision_type === 'financial' && d.current_decision === 'authorized')
            .map(d => d.related_expense_id));
          reimbursableMissingAuth = expList.filter(e => !authorizedIds.has(e.id));
        }
      } catch (e) { console.error('Reimbursable check failed', e); }

      setChecks([
        {
          icon: FileWarning,
          label: 'Documents expired',
          count: expiredDocs.length,
          hint: 'Check the Business Documents vault — a missing renewal may matter to your business.',
        },
        {
          icon: UserCheck,
          label: 'Policy acknowledgments pending',
          count: pendingAcks.length,
          hint: 'Team policies not acknowledged at their current version.',
        },
        {
          icon: ShieldQuestion,
          label: 'Questions needing research',
          count: researchNeeded.length,
          hint: 'Questions you have not yet investigated or confirmed.',
        },
        {
          icon: RefreshCcw,
          label: 'Answers to re-confirm',
          count: staleQuestions.length,
          hint: 'Verified over a year ago — review prompt only, not a legal expiration.',
        },
        {
          icon: Receipt,
          label: 'Reimbursable expenses needing authorization',
          count: reimbursableMissingAuth.length,
          hint: 'Marked reimbursable but not client-authorized — they do not reduce client proceeds until authorized.',
        },
      ]);
    } catch (e) {
      console.error('Admin checks failed', e);
      setChecks([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="p-4 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking your records…
      </CardContent></Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {(checks || []).map(c => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className={c.count > 0 ? 'border-amber-300' : 'border-slate-200'}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${c.count > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                <p className="text-xs text-slate-500 truncate">{c.label}</p>
              </div>
              <p className={`text-xl font-bold mt-1 ${c.count > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{c.count}</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-1 hidden sm:block">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}