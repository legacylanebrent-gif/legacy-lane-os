// Chapter 25 P1 — operator dialog to create a DRAFT procedure (new or
// revision). AI assist produces a DRAFT only — approval is always a separate
// human act.
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ROLE_OPTIONS, KNOWLEDGE_CATEGORIES } from './knowledgeModel';

export default function SopDraftDialog({ open, onClose, onSaved, initial }) {
  const init = initial || {};
  const [title, setTitle] = useState(init.title || '');
  const [category, setCategory] = useState(init.category || 'SOP');
  const [purpose, setPurpose] = useState(init.purpose || '');
  const [steps, setSteps] = useState(init.steps || ['']);
  const [decisions, setDecisions] = useState(init.decision_points || []);
  const [exceptions, setExceptions] = useState(init.exceptions || ['']);
  const [esc, setEsc] = useState(init.escalation || {});
  const [completion, setCompletion] = useState(init.completion_standard || '');
  const [changeReason, setChangeReason] = useState(init.change_reason || '');
  const [roles, setRoles] = useState(init.audience_roles || []);
  const [sourceText, setSourceText] = useState(init.source_text || '');
  const [meta] = useState({
    mode: init.mode || 'new',
    supersedes_document_id: init.supersedes_document_id || null,
    source_type: init.source_type || 'MANUAL',
    source_id: init.source_id || null,
    source_label: init.source_label || '',
    contributor_name: init.contributor_name || '',
  });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleRole = (r) => setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const aiDraft = async () => {
    setAiBusy(true); setError('');
    try {
      const res = await base44.functions.invoke('companyKnowledge', {
        action: 'ai_draft', source_text: sourceText || changeReason,
        source_type: meta.source_type, source_id: meta.source_id, source_label: meta.source_label,
        contributor_name: meta.contributor_name, mode: meta.mode,
        supersedes_document_id: meta.supersedes_document_id, category,
      });
      const d = res.data || res;
      if (d.error) { setError(d.error.message || 'AI draft failed'); return; }
      onSaved && onSaved({ refresh: true });
      onClose(d.document_id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'AI draft failed.');
    } finally { setAiBusy(false); }
  };

  const save = async () => {
    setBusy(true); setError('');
    try {
      const res = await base44.functions.invoke('companyKnowledge', {
        action: 'propose', ...meta, title, category, purpose,
        steps: steps.filter(Boolean), decision_points: decisions.filter((d) => d.condition),
        exceptions: exceptions.filter(Boolean), escalation: esc,
        completion_standard: completion, change_reason: changeReason, audience_roles: roles,
      });
      const d = res.data || res;
      if (d.error) { setError(d.error.message || 'Could not save'); return; }
      onSaved && onSaved({ refresh: true });
      onClose(d.document_id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not save the draft.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{meta.mode === 'revise' ? `Revise procedure (new draft, v${(init.version || 1) + 1})` : 'New procedure draft'}</DialogTitle>
          <p className="text-xs text-slate-500">Saving creates a DRAFT — employees never see it until you approve a version.</p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Title</Label>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 text-sm border rounded-md p-2 bg-white">
                {KNOWLEDGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Source note (for AI draft / provenance)</Label>
            <Textarea className="min-h-[60px] mt-1" value={sourceText} onChange={(e) => setSourceText(e.target.value)}
              placeholder={init.source_text || 'Paste the observation, near-miss, or lesson this procedure comes from'} />
            <Button size="sm" variant="outline" className="mt-1.5" onClick={aiDraft} disabled={aiBusy || !(sourceText || changeReason)}>
              {aiBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />} Draft with AI
            </Button>
          </div>
          <Textarea className="min-h-[50px]" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose — what is this procedure for?" />
          <div>
            <Label className="text-xs">Normal steps (one per line)</Label>
            {steps.map((s, i) => (
              <div key={i} className="flex gap-1.5 mt-1.5">
                <Input value={s} onChange={(e) => setSteps((p) => p.map((x, j) => j === i ? e.target.value : x))} placeholder={`Step ${i + 1}`} />
                {steps.length > 1 && <Button size="icon" variant="ghost" onClick={() => setSteps((p) => p.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></Button>}
              </div>
            ))}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setSteps((p) => [...p, ''])}><Plus className="w-3.5 h-3.5 mr-1" /> Add step</Button>
          </div>
          <div>
            <Label className="text-xs">Decision points (optional)</Label>
            {decisions.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-1.5 mt-1.5">
                <div className="space-y-1">
                  <Input value={d.condition || ''} onChange={(e) => setDecisions((p) => p.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} placeholder="IF …" />
                  <Input value={d.if_yes || ''} onChange={(e) => setDecisions((p) => p.map((x, j) => j === i ? { ...x, if_yes: e.target.value } : x))} placeholder="→ do this" />
                  <Input value={d.if_no || ''} onChange={(e) => setDecisions((p) => p.map((x, j) => j === i ? { ...x, if_no: e.target.value } : x))} placeholder="otherwise → …" />
                </div>
                <Button size="icon" variant="ghost" onClick={() => setDecisions((p) => p.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setDecisions((p) => [...p, {}])}><Plus className="w-3.5 h-3.5 mr-1" /> Add decision point</Button>
          </div>
          <div>
            <Label className="text-xs">Exceptions — when the normal path does not apply (one per line)</Label>
            {exceptions.map((s, i) => (
              <div key={i} className="flex gap-1.5 mt-1.5">
                <Input value={s} onChange={(e) => setExceptions((p) => p.map((x, j) => j === i ? e.target.value : x))} />
                {exceptions.length > 1 && <Button size="icon" variant="ghost" onClick={() => setExceptions((p) => p.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></Button>}
              </div>
            ))}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setExceptions((p) => [...p, ''])}><Plus className="w-3.5 h-3.5 mr-1" /> Add exception</Button>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-red-700">Escalation (stop instead of guessing)</p>
            <Input value={esc.stop_when || ''} onChange={(e) => setEsc((p) => ({ ...p, stop_when: e.target.value }))} placeholder="Stop when…" />
            <Input value={esc.escalate_to || ''} onChange={(e) => setEsc((p) => ({ ...p, escalate_to: e.target.value }))} placeholder="Escalate to (operator / manager / role)" />
            <Input value={esc.provide || ''} onChange={(e) => setEsc((p) => ({ ...p, provide: e.target.value }))} placeholder="What to bring / provide" />
          </div>
          <Textarea className="min-h-[50px]" value={completion} onChange={(e) => setCompletion(e.target.value)} placeholder="Completion standard — what must be true before this is done?" />
          <Input value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Why this version exists (near miss, employee suggestion, efficiency…)" />
          <div>
            <Label className="text-xs">Who should see it (empty = all staff)</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ROLE_OPTIONS.map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)}
                  className={`text-[11px] px-2 py-1 rounded-full border ${roles.includes(r) ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                  {r.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}