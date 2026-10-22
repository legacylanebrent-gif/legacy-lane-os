// Chapter 25 P1 — OPERATOR/ADMIN knowledge manager: SOP lifecycle (draft →
// review → approve → supersede), improvement suggestions, effectiveness
// reviews, and the knowledge audit. Manager actions are enforced server-side;
// no manager role exists in the platform, so this surface is operator/admin
// (truthful to the Chapter 19 role architecture).
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ClipboardCheck, GitPullRequest, ShieldCheck, RefreshCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SopContent from '@/components/knowledge/SopContent';
import SopDraftDialog from '@/components/knowledge/SopDraftDialog';
import { ApproveSopDialog, EffectivenessDialog } from '@/components/knowledge/SopReviewDialogs';
import { SOP_STATUS_LABELS, SOP_STATUS_TONES, fmtDate, fmtDateTime } from '@/components/knowledge/knowledgeModel';

const callFn = async (payload) => {
  const res = await base44.functions.invoke('companyKnowledge', payload);
  return res.data || res;
};

const Stat = ({ label, value, tone }) => (
  <Card><CardContent className="p-3">
    <p className={`text-xl font-semibold ${tone || 'text-slate-800'}`}>{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </CardContent></Card>
);

export default function KnowledgeManager() {
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [tab, setTab] = useState('DRAFT');
  const [openDoc, setOpenDoc] = useState(null);
  const [draftDialog, setDraftDialog] = useState(null); // {initial}
  const [approveDoc, setApproveDoc] = useState(null);
  const [effectDoc, setEffectDoc] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [list, audit, sugg] = await Promise.all([
        callFn({ action: 'manage_list' }),
        callFn({ action: 'audit' }),
        callFn({ action: 'suggestions' }),
      ]);
      if (list.error) { setError(list.error.message); return; }
      setItems(list.items || []);
      setCounts(audit.counts || null);
      setSuggestions(sugg.items || []);
    } catch (e) { setError(e?.response?.data?.error?.message || 'Could not load.'); }
  };
  useEffect(() => { load(); }, []);

  const act = async (payload, id) => {
    setBusyId(id || 'x'); setError('');
    try {
      const r = await callFn(payload);
      if (r.error) setError(r.error.message);
      await load();
    } catch (e) { setError('Action failed.'); } finally { setBusyId(null); }
  };

  const revise = (d) => setDraftDialog({
    initial: {
      mode: 'revise', supersedes_document_id: d.id, version: d.version,
      title: d.title, category: d.category, purpose: d.purpose, steps: (d.steps || []).map((s) => s.text),
      decision_points: d.decision_points, exceptions: d.exceptions, escalation: d.escalation,
      completion_standard: d.completion_standard, audience_roles: d.audience_roles,
      change_reason: '', source_type: 'MANAGER_OBSERVATION',
    },
  });

  const proposeFrom = (s) => setDraftDialog({
    initial: {
      mode: 'new', title: `Procedure: ${s.title}`.slice(0, 120),
      source_text: s.description, source_type: 'EMPLOYEE_OBSERVATION', source_id: s.id,
      source_label: `Observation from ${s.requested_by_name || 'a team member'}`,
      contributor_name: s.requested_by_name || '', change_reason: `Team suggestion: ${s.title}`,
    },
  });

  const proposeNearMiss = () => setDraftDialog({
    initial: {
      mode: 'new', source_type: 'NEAR_MISS',
      source_label: 'Near-miss procedure review',
      change_reason: 'Near miss — control weakness review',
      source_text: 'Describe the near miss and the procedure change it motivates.',
    },
  });

  const byStatus = (s) => (items || []).filter((d) => d.sop_status === s);
  const tabs = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED'];

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-cyan-700" /> Company knowledge manager</h1>
          <p className="text-sm text-slate-500">Draft → review → approve. Approving supersedes the prior version (history kept); drafts are never visible to employees.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => load()}><RefreshCcw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setDraftDialog({ initial: { mode: 'new' } })}><Plus className="w-4 h-4 mr-1" /> New procedure draft</Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-3 text-sm text-red-600">{error}</CardContent></Card>}

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Stat label="Current approved" value={counts.current_approved} tone="text-green-700" />
          <Stat label="Drafts" value={counts.draft} />
          <Stat label="In review" value={counts.in_review} tone="text-amber-700" />
          <Stat label="Superseded" value={counts.superseded} tone="text-stone-500" />
          <Stat label="Due for review" value={counts.due_for_review} tone={counts.due_for_review ? 'text-red-600' : 'text-slate-800'} />
          <Stat label="Open suggestions" value={counts.open_suggestions} tone={counts.open_suggestions ? 'text-cyan-700' : 'text-slate-800'} />
        </div>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardContent className="p-3.5 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5"><GitPullRequest className="w-4 h-4 text-cyan-600" /> Improvement suggestions from your team</p>
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                <p className="text-sm font-medium text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-500 whitespace-pre-line line-clamp-3">{s.description}</p>
                <p className="text-[11px] text-slate-400 mt-1">{s.requested_by_name ? `${s.requested_by_name} · ` : ''}{fmtDateTime(s.created_date)}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Button size="sm" variant="outline" onClick={() => proposeFrom(s)}>Propose procedure change</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-3 py-1.5 rounded-full border ${tab === t ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-300'}`}>
            {SOP_STATUS_LABELS[t]} ({byStatus(t).length})
          </button>
        ))}
      </div>

      {items === null && <p className="text-sm text-slate-400">Loading…</p>}
      {byStatus(tab).length === 0 && items !== null && (
        <p className="text-sm text-slate-400">No {SOP_STATUS_LABELS[tab].toLowerCase()} procedures.</p>
      )}

      <div className="space-y-2">
        {byStatus(tab).map((d) => (
          <Card key={d.id}>
            <CardContent className="p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{d.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge variant="outline" className={SOP_STATUS_TONES[d.sop_status]}>{SOP_STATUS_LABELS[d.sop_status]}</Badge>
                    <Badge variant="outline" className="bg-white">v{d.version} · {d.category}</Badge>
                    {d.employee_visible ? <Badge variant="outline" className="bg-white">employee-visible</Badge> : <Badge variant="outline" className="bg-white">operator-only</Badge>}
                    {d.review_date && <Badge variant="outline" className="bg-white">review {fmtDate(d.review_date)}</Badge>}
                    {d.ai_generated && <Badge variant="outline" className="bg-white">AI-drafted</Badge>}
                    {(d.effectiveness_reviews || []).length > 0 && (
                      <Badge variant="outline" className="bg-white">{(d.effectiveness_reviews.slice(-1)[0] || {}).outcome}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setOpenDoc(d)}>Open</Button>
                  {d.sop_status === 'DRAFT' && <Button size="sm" variant="outline" disabled={busyId === d.id} onClick={() => act({ action: 'submit_review', id: d.id }, d.id)}>Submit for review</Button>}
                  {(d.sop_status === 'DRAFT' || d.sop_status === 'IN_REVIEW') && <Button size="sm" onClick={() => setApproveDoc(d)}><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Approve</Button>}
                  {d.sop_status === 'APPROVED' && <Button size="sm" variant="outline" onClick={() => revise(d)}>Revise</Button>}
                  {d.sop_status === 'APPROVED' && <Button size="sm" variant="outline" onClick={() => setEffectDoc(d)}>Review effectiveness</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={proposeNearMiss}><GitPullRequest className="w-4 h-4 mr-1" /> Propose change from a near miss</Button>
      </div>

      <Dialog open={!!openDoc} onOpenChange={(o) => !o && setOpenDoc(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">{openDoc?.title}
              {openDoc && <Badge variant="outline" className={SOP_STATUS_TONES[openDoc.sop_status]}>{SOP_STATUS_LABELS[openDoc.sop_status]}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {openDoc && (
            <>
              <SopContent doc={openDoc} />
              {(openDoc.effectiveness_reviews || []).length > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Effectiveness history</p>
                  {openDoc.effectiveness_reviews.map((r, i) => (
                    <p key={i} className="text-xs text-slate-600">{fmtDate(r.at)} — {r.outcome}{r.note ? ` · ${r.note}` : ''}{r.by_name ? ` (${r.by_name})` : ''}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {draftDialog && (
        <SopDraftDialog open onClose={(id) => { setDraftDialog(null); if (id) load(); }}
          onSaved={() => load()} initial={draftDialog.initial} />
      )}
      <ApproveSopDialog open={!!approveDoc} onClose={() => setApproveDoc(null)} doc={approveDoc} onDone={load} />
      <EffectivenessDialog open={!!effectDoc} onClose={() => setEffectDoc(null)} doc={effectDoc} onDone={load} />
    </div>
  );
}