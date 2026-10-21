// Chapter 13 P1 — SALEISSUE panel (P1-34..P1-40): the home for important
// unanswered operational questions. An issue is NOT a task, NOT a client
// decision, NOT a note, NOT a research flag. Resolution records references to
// canonical destinations (answer / client decision / task / both) — final
// truth is never duplicated here. Resolving an issue releases tasks that were
// blocked by it (deterministic dependency sync).
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
import { CircleHelp, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ISSUE_CATEGORIES } from '@/components/saleops/projectModel';
import { syncTaskBlocks } from '@/components/saleops/taskDependency';
import CreateTaskDialog from './CreateTaskDialog';

const STATUS_BADGE = {
  OPEN: 'bg-red-100 text-red-700 border-red-300',
  WAITING: 'bg-amber-100 text-amber-800 border-amber-300',
  RESOLVED: 'bg-green-100 text-green-700 border-green-300',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-300',
};
const WAITING_OPTIONS = ['client', 'family', 'external_provider', 'hoa_association', 'team', 'other'];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SaleIssuesPanel({ sale, issues, onChanged }) {
  const [showNew, setShowNew] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [taskFrom, setTaskFrom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'other', answer_by: '', owner: 'me', waiting_on: '' });
  const [resolve, setResolve] = useState({ resolution: '', resolution_source: 'answer_only' });

  const open = issues.filter((i) => i.status === 'OPEN' || i.status === 'WAITING');
  const done = issues.filter((i) => i.status === 'RESOLVED' || i.status === 'CANCELLED');

  const create = async () => {
    if (!form.title.trim()) { toast.error('The question is required'); return; }
    setSaving(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.SaleIssue.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        status: form.owner === 'waiting' ? 'WAITING' : 'OPEN',
        waiting_on: form.owner === 'waiting' ? (form.waiting_on || 'other') : null,
        owner_user_id: form.owner === 'waiting' ? '' : (form.owner === 'me' ? (me?.id || '') : form.owner),
        owner_name: form.owner === 'waiting'
          ? `Waiting on ${form.waiting_on ? form.waiting_on.replace(/_/g, ' ') : 'external party'}`
          : (form.owner === 'me' ? (me?.full_name || 'Operator') : 'Team member'),
        answer_by: form.answer_by || '',
        source_type: 'MANUAL',
      });
      toast.success('Issue recorded');
      setShowNew(false);
      setForm({ title: '', description: '', category: 'other', answer_by: '', owner: 'me', waiting_on: '' });
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not save the issue');
    } finally {
      setSaving(false);
    }
  };

  const finishResolve = async (createdTaskIds = []) => {
    const t = resolveTarget;
    if (!t) return;
    if (!resolve.resolution.trim()) { toast.error('Record the answer/resolution'); return; }
    setSaving(true);
    try {
      await base44.entities.SaleIssue.update(t.id, {
        status: 'RESOLVED',
        resolution: resolve.resolution.trim(),
        resolution_source: resolve.resolution_source === 'answer_only' ? 'answer_only'
          : createdTaskIds.length > 0 ? (resolve.created_decision_id ? 'decision_and_task' : 'task')
          : (resolve.created_decision_id ? 'client_decision' : 'answer_only'),
        linked_task_ids: createdTaskIds,
        linked_decision_id: resolve.created_decision_id || t.linked_decision_id || '',
        resolved_at: new Date().toISOString(),
      });
      await syncTaskBlocks(sale.id); // release tasks this issue was blocking (P1-39)
      toast.success('Issue resolved');
      setResolveTarget(null);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Could not resolve the issue');
    } finally {
      setSaving(false);
    }
  };

  const createDecisionFromIssue = async () => {
    // Canonical destination #1: the resolution required a CLIENT DECISION.
    const t = resolveTarget;
    if (!t) return;
    const instruction = resolve.resolution.trim();
    if (!instruction) { toast.error('Record the decision instruction first'); return; }
    setSaving(true);
    try {
      const created = await base44.entities.SaleClientDecision.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        decision_type: t.category === 'merchandise' ? 'merchandise'
          : t.category === 'financial_settlement' ? 'financial'
          : t.category === 'property_access' ? 'property_access' : 'general',
        subject: t.title,
        current_decision: instruction,
        status: 'resolved',
        history: [{
          decision: instruction,
          decided_at: new Date().toISOString(),
          source: 'in_person',
          reason: 'Resolved from project issue',
          notes: t.title,
        }],
      });
      setResolve((r) => ({ ...r, created_decision_id: created.id }));
      toast.success('Client decision recorded — now create the operational task if work is needed');
      setSaving(false);
    } catch (e) {
      console.error(e);
      toast.error('Could not record the decision');
      setSaving(false);
    }
  };

  const renderIssue = (i) => {
    const overdue = i.answer_by && i.answer_by < todayStr() && (i.status === 'OPEN' || i.status === 'WAITING');
    return (
      <div key={i.id} className="p-3 border rounded-lg space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{i.title}</p>
            {i.description && <p className="text-xs text-slate-500 mt-0.5">{i.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={STATUS_BADGE[i.status]}>{i.status}</Badge>
            {overdue && <Badge className="bg-red-100 text-red-700 border border-red-300">OVERDUE</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>Owner: <span className="font-medium text-slate-700">{i.owner_name || 'Unassigned'}</span></span>
          {i.answer_by && <span>Answer by: <span className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>{i.answer_by}</span></span>}
          <span className="capitalize">{(i.category || 'other').replace(/_/g, ' ')}</span>
        </div>
        {(i.status === 'OPEN' || i.status === 'WAITING') ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { setResolveTarget(i); setResolve({ resolution: '', resolution_source: 'answer_only' }); }}>
              Resolve
            </Button>
            {i.status === 'OPEN' && (
              <Button size="sm" variant="ghost" onClick={async () => {
                await base44.entities.SaleIssue.update(i.id, { status: 'WAITING', waiting_on: 'client' });
                onChanged();
              }}>Mark Waiting on Client</Button>
            )}
            <Button size="sm" variant="ghost" onClick={async () => {
              await base44.entities.SaleIssue.update(i.id, { status: 'CANCELLED', resolved_at: new Date().toISOString() });
              await syncTaskBlocks(sale.id);
              onChanged();
            }}>Cancel</Button>
          </div>
        ) : (
          i.resolution && <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
            <span className="font-semibold">Resolution:</span> {i.resolution}
            <span className="text-slate-400"> ({(i.resolution_source || 'answer_only').replace(/_/g, ' ')})</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CircleHelp className="w-5 h-5 text-orange-600" /> Unresolved Issues
          <Badge variant="outline" className="ml-1">{open.length} open</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Important unanswered questions — not tasks, not client decisions, not notes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {open.length === 0 && <p className="text-sm text-slate-400 text-center py-1">No open issues.</p>}
        {open.map(renderIssue)}
        {done.length > 0 && (
          <details>
            <summary className="text-xs text-slate-500 cursor-pointer">Resolved / cancelled ({done.length})</summary>
            <div className="space-y-2 mt-2">{done.map(renderIssue)}</div>
          </details>
        )}
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-1" />Record Issue
        </Button>

        {/* New issue dialog */}
        <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record an Unresolved Issue</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>The question *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Who is removing the piano?" /></div>
              <div><Label>Context</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ISSUE_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div><Label>Answer needed by</Label>
                  <Input type="date" value={form.answer_by} onChange={(e) => setForm((f) => ({ ...f, answer_by: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Owner</Label>
                  <Select value={form.owner} onValueChange={(v) => setForm((f) => ({ ...f, owner: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">Me (operator)</SelectItem>
                      <SelectItem value="waiting">Waiting on someone else</SelectItem>
                    </SelectContent>
                  </Select></div>
                {form.owner === 'waiting' && (
                  <div><Label>Waiting on</Label>
                    <Select value={form.waiting_on || 'client'} onValueChange={(v) => setForm((f) => ({ ...f, waiting_on: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WAITING_OPTIONS.map((w) => <SelectItem key={w} value={w} className="capitalize">{w.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button onClick={create} disabled={saving || !form.title.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Save Issue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Resolve dialog — resolution records references to canonical destinations */}
        <Dialog open={!!resolveTarget} onOpenChange={(o) => { if (!o) setResolveTarget(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Resolve: {resolveTarget?.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>The answer / resolution *</Label>
                <Textarea rows={2} value={resolve.resolution}
                  onChange={(e) => setResolve((r) => ({ ...r, resolution: e.target.value }))}
                  placeholder="e.g. Client keeps the piano; family removes it by Friday" /></div>
              <div><Label>How was it resolved?</Label>
                <Select value={resolve.resolution_source} onValueChange={(v) => setResolve((r) => ({ ...r, resolution_source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answer_only">Answer only</SelectItem>
                    <SelectItem value="client_decision">Required a client decision</SelectItem>
                  </SelectContent>
                </Select></div>
              {resolve.resolution_source === 'client_decision' && !resolve.created_decision_id && (
                <Button size="sm" variant="outline" onClick={createDecisionFromIssue} disabled={saving}>
                  Record the Client Decision (canonical)
                </Button>
              )}
              {resolve.created_decision_id && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
                  Client decision recorded. Create the operational task below if work is needed.
                </p>
              )}
              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <Button size="sm" variant="outline"
                  disabled={!!resolve.created_decision_id}
                  onClick={() => setTaskFrom({
                    source: { type: 'SALE_ISSUE', id: resolveTarget?.id, label: resolveTarget?.title },
                    defaultName: `Follow up: ${resolveTarget?.title || ''}`,
                    defaultDescription: resolve.resolution,
                  })}>
                  {resolve.created_decision_id ? 'Create Task…' : 'Also Create Task…'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
                  <Button onClick={() => finishResolve()} disabled={saving || !resolve.resolution.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Resolve Issue
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create-task-from-issue (operational resolution destination) */}
        {taskFrom && (
          <CreateTaskDialog open={true} onClose={() => setTaskFrom(null)} sale={sale}
            source={taskFrom.source} defaultName={taskFrom.defaultName} defaultDescription={taskFrom.defaultDescription}
            onCreated={(t) => finishResolve(t?.id ? [t.id] : [])} />
        )}
      </CardContent>
    </Card>
  );
}