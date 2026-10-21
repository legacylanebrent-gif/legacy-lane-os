// Chapter 13 P1 — CLIENT CHANGE CONTROL on the dashboard (P1-24..P1-27, P1-43,
// P1-44, P1-50): CLIENT REQUEST → REVIEW → AUTHORIZATION → CURRENT PROJECT
// CHANGE → TEAM ACTION, reusing SaleClientDecision (no parallel change log).
// REQUESTED never changes current truth; only explicit approval appends the
// controlling history entry. Approval shows the deterministic downstream
// facts known about the item (P1-27). Approved decisions can become tasks
// (P1-43); unresolved acceptance conditions can become tasks (P1-44).
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DECISION_SOURCES, buildHistoryEntry } from '@/components/saleops/saleDecisionModel';
import { downstreamFacts } from '@/components/saleops/projectModel';
import { syncTaskBlocks } from '@/components/saleops/taskDependency';
import CreateTaskDialog from './CreateTaskDialog';

export default function DecisionsCard({ sale, decisions, authorities, items, linkedDeal, onChanged }) {
  const [requestTarget, setRequestTarget] = useState(null); // existing decision being requested against
  const [approveTarget, setApproveTarget] = useState(null);
  const [taskFrom, setTaskFrom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reqForm, setReqForm] = useState({ requested_decision: '', requested_by_name: '', answer_by: '' });
  const [approveForm, setApproveForm] = useState({ authorityId: '', source: 'phone', reason: '' });

  const byId = {};
  (items || []).forEach((i) => { byId[i.id] = i; });

  const openDecisions = (decisions || []).filter((d) => d.status === 'open');
  const requested = (decisions || []).filter((d) => d.request_status === 'REQUESTED' || d.request_status === 'UNDER_REVIEW');
  const conditions = ((linkedDeal && linkedDeal.consultation && linkedDeal.consultation.acceptance_conditions) || [])
    .filter((c) => (c.status || 'open') === 'open');
  const activeAuthorities = (authorities || []).filter((a) => a.is_active);

  const recordRequest = async () => {
    const t = requestTarget;
    if (!t) return;
    if (!reqForm.requested_decision.trim()) { toast.error('What did the client ask for?'); return; }
    setSaving(true);
    try {
      // P1-25: REQUESTED changes the request state ONLY — current_decision and
      // project truth stay untouched until approval.
      await base44.entities.SaleClientDecision.update(t.id, {
        request_status: 'REQUESTED',
        requested_decision: reqForm.requested_decision.trim(),
        requested_by_name: reqForm.requested_by_name.trim(),
        requested_at: new Date().toISOString(),
        answer_by: reqForm.answer_by || null,
      });
      toast.success('Client request recorded — awaiting your approval');
      setRequestTarget(null);
      setReqForm({ requested_decision: '', requested_by_name: '', answer_by: '' });
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not record the request');
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    const t = approveTarget;
    if (!t) return;
    if (!approveForm.authorityId) { toast.error('Select the authorizing decision-maker'); return; }
    setSaving(true);
    try {
      const authority = activeAuthorities.find((a) => a.id === approveForm.authorityId);
      const me = await base44.auth.me().catch(() => null);
      const entry = buildHistoryEntry({
        decision: t.requested_decision,
        authority,
        source: approveForm.source,
        reason: `Client request approved${t.requested_by_name ? ` (requested by ${t.requested_by_name})` : ''}${approveForm.reason ? ` — ${approveForm.reason}` : ''}`,
        notes: '',
        user: me,
      });
      const newDecision = t.requested_decision;
      await base44.entities.SaleClientDecision.update(t.id, {
        current_decision: newDecision,
        history: [...(t.history || []), entry],
        authorized_by: authority?.id || '',
        authorized_by_name: authority?.full_name || '',
        decided_at: entry.decided_at,
        source: approveForm.source,
        request_status: 'APPROVED',
        status: newDecision === 'review' ? 'open' : 'resolved',
      });
      // Retained-photo privacy (P1-21): an image-level KEEP decision marks the photo
      // retained-private; SELL clears it.
      if (typeof t.image_index === 'number') {
        const images = [...(sale.images || [])];
        const img = images[t.image_index];
        if (img && typeof img === 'object') {
          images[t.image_index] = {
            ...img,
            excluded_from_public: newDecision === 'keep' ? true : newDecision === 'sell' ? false : !!img.excluded_from_public,
          };
          await base44.entities.EstateSale.update(sale.id, { images });
        }
      }
      await syncTaskBlocks(sale.id); // release tasks waiting on this decision (P1-31/P1-32)
      toast.success('Request approved — current project truth updated');
      setApproveTarget(null);
      setApproveForm({ authorityId: '', source: 'phone', reason: '' });
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not approve the request');
    } finally {
      setSaving(false);
    }
  };

  const decline = async (d) => {
    setSaving(true);
    try {
      await base44.entities.SaleClientDecision.update(d.id, {
        request_status: 'DECLINED',
        requested_at: d.requested_at || null,
      });
      toast.success('Request declined — current truth unchanged; the request stays visible in history');
      onChanged();
    } catch (e) {
      toast.error('Could not decline the request');
    } finally {
      setSaving(false);
    }
  };

  const approveItem = approveTarget ? (approveTarget.item_id ? byId[approveTarget.item_id] : null) : null;
  const impact = approveItem ? downstreamFacts(approveItem) : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-600" /> Client Decisions
          {requested.length > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-300">{requested.length} request{requested.length === 1 ? '' : 's'}</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">A client request is not an approved change — nothing changes until you approve it.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {requested.length > 0 && requested.map((d) => (
          <div key={d.id} className="p-3 border border-amber-200 bg-amber-50/70 rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{d.subject}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Requested: <span className="font-semibold">{String(d.requested_decision).toUpperCase()}</span>
                  {' '}· current: <span className="font-semibold">{String(d.current_decision).toUpperCase()}</span>
                  {d.requested_by_name ? ` · by ${d.requested_by_name}` : ''}
                  {d.answer_by ? ` · answer by ${d.answer_by.slice(0, 10)}` : ''}
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex-shrink-0">{d.request_status}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-green-700 hover:bg-green-800"
                onClick={() => { setApproveTarget(d); setApproveForm({ authorityId: '', source: 'phone', reason: '' }); }}>
                Review &amp; Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => decline(d)} disabled={saving}>Decline</Button>
            </div>
          </div>
        ))}

        {openDecisions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Open matters awaiting instructions</p>
            {openDecisions.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-slate-800">{d.subject}</p>
                  <p className="text-xs text-slate-500">Current: {String(d.current_decision).slice(0, 60)}</p>
                </div>
                <Button size="sm" variant="ghost" className="flex-shrink-0 text-xs"
                  onClick={() => { setRequestTarget(d); setReqForm({ requested_decision: '', requested_by_name: '', answer_by: '' }); }}>
                  <Plus className="w-3 h-3 mr-1" />Request
                </Button>
              </div>
            ))}
            {openDecisions.length > 6 && <p className="text-xs text-slate-400">{openDecisions.length - 6} more…</p>}
          </div>
        )}

        {conditions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Unresolved acceptance conditions (from consultation)</p>
            {conditions.slice(0, 5).map((c, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-sm border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-slate-800">{c.condition}</p>
                  {c.due_date && <p className="text-xs text-slate-500">Due {c.due_date}</p>}
                </div>
                <Button size="sm" variant="ghost" className="flex-shrink-0 text-xs"
                  onClick={() => setTaskFrom({
                    source: { type: 'ACCEPTANCE_CONDITION', id: linkedDeal.id, label: c.condition },
                    defaultName: `Resolve condition: ${(c.condition || '').slice(0, 60)}`,
                    defaultDescription: c.condition,
                  })}>
                  Create Task
                </Button>
              </div>
            ))}
          </div>
        )}

        {requested.length === 0 && openDecisions.length === 0 && conditions.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-1">No open decisions or requests.</p>
        )}

        {/* Record client request */}
        <Dialog open={!!requestTarget} onOpenChange={(o) => { if (!o) setRequestTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Client Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-sm p-2.5 rounded-md bg-slate-50 border border-slate-200">
                <p className="font-medium">{requestTarget?.subject}</p>
                <p className="text-xs text-slate-500">Current instruction: {String(requestTarget?.current_decision || '').toUpperCase()}</p>
              </div>
              <div><Label>What did the client ask for? *</Label>
                <Input value={reqForm.requested_decision} onChange={(e) => setReqForm((f) => ({ ...f, requested_decision: e.target.value }))}
                  placeholder="e.g. keep" /></div>
              <div><Label>Requested by</Label>
                <Input value={reqForm.requested_by_name} onChange={(e) => setReqForm((f) => ({ ...f, requested_by_name: e.target.value }))}
                  placeholder="Client/family member name" /></div>
              <div><Label>Answer needed by</Label>
                <Input type="date" value={reqForm.answer_by} onChange={(e) => setReqForm((f) => ({ ...f, answer_by: e.target.value }))} /></div>
              <p className="text-xs text-slate-500">Recording a request does NOT change the current instruction — only your approval does.</p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setRequestTarget(null)}>Cancel</Button>
                <Button onClick={recordRequest} disabled={saving || !reqForm.requested_decision.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Record Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve request — with deterministic downstream impact (P1-27) */}
        <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Approve Client Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-sm p-2.5 rounded-md bg-slate-50 border border-slate-200">
                <p className="font-medium">{approveTarget?.subject}</p>
                <p className="text-xs text-slate-600">
                  {String(approveTarget?.current_decision || '').toUpperCase()} → <span className="font-semibold">{String(approveTarget?.requested_decision || '').toUpperCase()}</span>
                  {approveTarget?.requested_by_name ? ` (requested by ${approveTarget.requested_by_name})` : ''}
                </p>
              </div>
              {impact.length > 0 && (
                <div className="text-xs p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                  <p className="font-semibold mb-1">Known downstream state on this item:</p>
                  <ul className="list-disc list-inside space-y-0.5">{impact.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
              {activeAuthorities.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  Add an authorized decision-maker first — an approval must record who authorized it.
                </p>
              ) : (
                <div><Label>Authorized by *</Label>
                  <Select value={approveForm.authorityId} onValueChange={(v) => setApproveForm((f) => ({ ...f, authorityId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select decision-maker" /></SelectTrigger>
                    <SelectContent>
                      {activeAuthorities.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.full_name}{a.authority_role ? ` — ${a.authority_role}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select></div>
              )}
              <div><Label>How was approval received?</Label>
                <Select value={approveForm.source} onValueChange={(v) => setApproveForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DECISION_SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>Note / reason</Label><Textarea rows={2} value={approveForm.reason}
                onChange={(e) => setApproveForm((f) => ({ ...f, reason: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
                <Button onClick={approve} disabled={saving || activeAuthorities.length === 0}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Approve Change
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {taskFrom && (
          <CreateTaskDialog open={true} onClose={() => setTaskFrom(null)} sale={sale}
            source={taskFrom.source} defaultName={taskFrom.defaultName} defaultDescription={taskFrom.defaultDescription} />
        )}
      </CardContent>
    </Card>
  );
}