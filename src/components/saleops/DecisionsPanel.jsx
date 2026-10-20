import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, History, CheckCircle2 } from 'lucide-react';
import DecisionChangeDialog from './DecisionChangeDialog';
import { DECISION_TYPES, decisionTypeLabel, buildHistoryEntry, fmtDateTime } from './saleDecisionModel';

export default function DecisionsPanel({ sale, user, authorities, decisions, onChanged }) {
  const [showNew, setShowNew] = useState(false);
  const [changeTarget, setChangeTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [form, setForm] = useState({ decision_type: 'general', subject: '', current_decision: '' });
  const [saving, setSaving] = useState(false);

  const general = decisions.filter(d => d.decision_type !== 'merchandise');
  const openCount = general.filter(d => d.status === 'open').length;

  const createDecision = async ({ authorityId, source, reason, notes }) => {
    if (!form.subject.trim() || !form.current_decision.trim()) { alert('Subject and decision are required'); return; }
    setSaving(true);
    try {
      const authority = authorities.find(a => a.id === authorityId);
      const entry = buildHistoryEntry({ decision: form.current_decision.trim(), authority, source, reason, notes, user });
      await base44.entities.SaleClientDecision.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        decision_type: form.decision_type,
        subject: form.subject.trim(),
        current_decision: form.current_decision.trim(),
        status: 'open',
        history: [entry],
        authorized_by: authority?.id || '',
        authorized_by_name: authority?.full_name || '',
        decided_at: entry.decided_at,
        source,
        notes: notes || '',
        recorded_by: user?.id || '',
        recorded_by_name: user?.full_name || '',
      });
      setShowNew(false);
      setForm({ decision_type: 'general', subject: '', current_decision: '' });
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Could not record decision');
    } finally {
      setSaving(false);
    }
  };

  const changeDecision = async ({ authorityId, source, reason, notes, decisionText }) => {
    const t = changeTarget;
    if (!decisionText) return;
    setSaving(true);
    try {
      const authority = authorities.find(a => a.id === authorityId);
      const entry = buildHistoryEntry({ decision: decisionText, authority, source, reason, notes, user });
      await base44.entities.SaleClientDecision.update(t.id, {
        current_decision: decisionText,
        history: [...(t.history || []), entry],
        authorized_by: authority?.id || '',
        authorized_by_name: authority?.full_name || '',
        decided_at: entry.decided_at,
        source,
        status: 'open',
      });
      setChangeTarget(null);
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Could not change decision');
    } finally {
      setSaving(false);
    }
  };

  const resolveDecision = async (d) => {
    if (!window.confirm('Mark this decision as resolved? The decision and its full history remain on record.')) return;
    try {
      await base44.entities.SaleClientDecision.update(d.id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_note: '',
      });
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Could not resolve decision');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {general.length} decision{general.length === 1 ? '' : 's'} on record · {openCount} open
        </p>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" />Record Decision</Button>
      </div>

      {general.length === 0 && (
        <Card><CardContent className="p-8 text-center text-slate-500">
          <p>No client decisions recorded for this sale yet.</p>
        </CardContent></Card>
      )}

      {general.map(d => (
        <Card key={d.id} className={d.status === 'open' ? 'border-amber-200' : ''}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{decisionTypeLabel(d.decision_type)}</Badge>
                  {d.status === 'open'
                    ? <Badge className="bg-amber-100 text-amber-700">OPEN</Badge>
                    : <Badge className="bg-green-100 text-green-700">RESOLVED</Badge>}
                </div>
                <p className="font-semibold text-slate-900 mt-1.5">{d.subject}</p>
                <p className="text-sm text-slate-700 mt-0.5">Current: <strong>{d.current_decision}</strong></p>
                <p className="text-xs text-slate-500 mt-1">
                  Authorized by {d.authorized_by_name || 'unknown'} · {fmtDateTime(d.decided_at)} · via {d.source?.replace('_', ' ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {(d.history || []).length > 1 && (
                  <Button variant="outline" size="sm" onClick={() => setHistoryTarget(d)}><History className="w-3.5 h-3.5 mr-1" />History</Button>
                )}
                {d.status === 'open' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setChangeTarget(d)}>Change</Button>
                    <Button variant="outline" size="sm" className="text-green-700 hover:bg-green-50" onClick={() => resolveDecision(d)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Resolve</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Client Decision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Decision type</Label>
              <Select value={form.decision_type} onValueChange={v => setForm(f => ({ ...f, decision_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DECISION_TYPES.filter(t => t.key !== 'merchandise').map(t => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Jewelry handling, pickup date change" /></div>
            <div><Label>Decision / instruction *</Label><Input value={form.current_decision} onChange={e => setForm(f => ({ ...f, current_decision: e.target.value }))} placeholder="What did they instruct?" /></div>
          </div>
        </DialogContent>
      </Dialog>
      {showNew && (
        <DecisionChangeDialog open={showNew} onClose={() => setShowNew(false)} onSubmit={createDecision}
          authorities={authorities} mode="create" />
      )}
      {changeTarget && (
        <DecisionChangeDialog open={true} onClose={() => setChangeTarget(null)} onSubmit={changeDecision}
          authorities={authorities} mode="change" needsDecisionText decisionTextPlaceholder="The new instruction"
          lockedDecision={`Current: ${changeTarget.current_decision}`} />
      )}

      <Dialog open={!!historyTarget} onOpenChange={o => { if (!o) setHistoryTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Decision History — {historyTarget?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(historyTarget?.history || []).slice().reverse().map((h, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${idx === 0 ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{h.decision}</span>
                  {idx === 0 && <Badge className="bg-cyan-100 text-cyan-700">CURRENT</Badge>}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Authorized by {h.authorized_by_name || 'unknown'} · {fmtDateTime(h.decided_at)} · via {h.source?.replace('_', ' ')}
                  {h.reason ? ` — ${h.reason}` : ''}
                </p>
                {h.notes && <p className="text-xs text-slate-500 mt-0.5">{h.notes}</p>}
                <p className="text-[11px] text-slate-400 mt-0.5">Recorded by {h.recorded_by_name || 'unknown'}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}