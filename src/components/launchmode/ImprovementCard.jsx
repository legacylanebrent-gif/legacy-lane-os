import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Lightbulb, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Chapter 27 P1 — IMPROVEMENT CAPTURE + IMPROVEMENT INBOX + POST-SALE SORT.
// Reuses the Chapter 25 observation architecture (companyKnowledge 'observe' →
// SaleIssue with source_label 'Process observation') — NO new entity. Capturing
// never changes a procedure and never interrupts current work. One project is an
// OBSERVATION, never a pattern; sorting routes to existing architecture.

export default function ImprovementCard({ sales, issues, onResolved }) {
  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const capture = async () => {
    if (!saleId || !note.trim()) { setError('Pick a project and write the note.'); return; }
    setBusy(true); setError('');
    try {
      const res = await base44.functions.invoke('companyKnowledge', {
        action: 'observe', sale_id: saleId, title: note.slice(0, 160), what_happened: note,
      });
      const d = res.data || res;
      if (d.error) { setError(d.error.message || 'Could not save'); return; }
      setNote(''); setOpen(false); onResolved && onResolved();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not save the observation.');
    } finally { setBusy(false); }
  };

  const sortOne = async (issue) => {
    await base44.entities.SaleIssue.update(issue.id, {
      status: 'RESOLVED', resolution: 'One-time circumstance — no permanent change needed', resolution_source: 'answer_only', resolved_at: new Date().toISOString(),
    });
    onResolved && onResolved();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Fix This Next Time</p>
        <Button size="sm" className="text-xs h-7" onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'Capture improvement'}</Button>
      </div>
      <p className="text-[11px] text-slate-500">
        Capture what to fix next time in seconds — without interrupting the work in front of you. Stored as an observation
        the operator reviews later; it never changes a procedure by itself.
      </p>
      {open && (
        <div className="space-y-2 border border-slate-100 rounded-lg p-2.5">
          <select value={saleId} onChange={(e) => setSaleId(e.target.value)} className="w-full text-xs border rounded-lg p-1.5 bg-white">
            <option value="">Which project?…</option>
            {(sales || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. We need two more directional signs next time."
            className="w-full text-xs border rounded-lg p-1.5" />
          {error && <p className="text-[10px] text-red-600">{error}</p>}
          <Button size="sm" className="text-xs h-7 gap-1" onClick={capture} disabled={busy}>{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Save observation</Button>
        </div>
      )}
      {(issues || []).length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Improvement inbox — {issues.length} observation(s) to sort</p>
          <p className="text-[10px] text-slate-400">One project is an OBSERVATION, never a pattern. Sort each item into where it belongs:</p>
          {issues.map(issue => (
            <div key={issue.id} className="border border-slate-200 rounded-lg p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-slate-800">{issue.title}</p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => sortOne(issue)}>One-time circumstance</Button>
                <Link to="/KnowledgeManager" className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-md px-2 py-1">SOP / procedure candidate →</Link>
                <Link to="/SaleTasks" className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-md px-2 py-1">Make it a task →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}