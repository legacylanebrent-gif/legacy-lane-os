// Chapter 22 P1 — completion OBJECTIVE, PROPERTY DEADLINE, and COMPLETION
// STANDARD editors (additive EstateSale.transition block).
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, Calendar, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

const OBJECTIVES = ['MAXIMIZE_PROCEEDS', 'MEET_PROPERTY_DEADLINE', 'CLEAR_PROPERTY', 'MINIMIZE_ADDITIONAL_WORK', 'PRESERVE_SPECIFIC_PROPERTY', 'BALANCED_CUSTOM'];
const DEADLINE_TYPES = ['REAL_ESTATE_CLOSING', 'WALKTHROUGH', 'MOVE', 'CLEANING', 'POSSESSION', 'TURNOVER', 'OTHER'];
const STANDARDS = ['SALE_SERVICES_ONLY', 'POST_SALE_SERVICES', 'ROOMS_CLEARED', 'DONATION_COORDINATED', 'CLEANOUT_COORDINATED', 'CLEANOUT_COMPLETED', 'PROPERTY_CLEARED', 'CUSTOM_AGREED'];

export default function ObjectiveCard({ sale, onChanged }) {
  const t = sale.transition || {};
  const [objectiveKey, setObjectiveKey] = useState(t.objective?.key || '');
  const [objectiveNotes, setObjectiveNotes] = useState(t.objective?.notes || '');
  const [deadlineDate, setDeadlineDate] = useState(t.property_deadline?.date || '');
  const [deadlineType, setDeadlineType] = useState(t.property_deadline?.deadline_type || '');
  const [deadlineNote, setDeadlineNote] = useState(t.property_deadline?.note || '');
  const [standard, setStandard] = useState(t.completion_standard?.standard || '');
  const [standardNote, setStandardNote] = useState(t.completion_standard?.note || '');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const t2 = sale.transition || {};
    setObjectiveKey(t2.objective?.key || '');
    setObjectiveNotes(t2.objective?.notes || '');
    setDeadlineDate(t2.property_deadline?.date || '');
    setDeadlineType(t2.property_deadline?.deadline_type || '');
    setDeadlineNote(t2.property_deadline?.note || '');
    setStandard(t2.completion_standard?.standard || '');
    setStandardNote(t2.completion_standard?.note || '');
  }, [sale.id, sale.transition]);

  const save = async (which) => {
    setBusy(which);
    try {
      const transition = { ...(sale.transition || {}) };
      if (which === 'objective') transition.objective = { ...(transition.objective || {}), key: objectiveKey || null, notes: objectiveNotes || null };
      if (which === 'deadline') transition.property_deadline = { date: deadlineDate || null, deadline_type: deadlineType || null, note: deadlineNote || null };
      if (which === 'standard') transition.completion_standard = { standard: standard || null, requires_item_disposition: transition.completion_standard?.requires_item_disposition !== false, note: standardNote || null };
      await base44.entities.EstateSale.update(sale.id, { transition });
      toast.success('Saved');
      onChanged && onChanged();
    } catch (e) { toast.error(e?.message || 'Could not save'); }
    finally { setBusy(''); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Target className="w-4 h-4" />Client objective — the client's objective defines success</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">Objective</Label>
              <Select value={objectiveKey} onValueChange={setObjectiveKey}>
                <SelectTrigger><SelectValue placeholder="Not recorded" /></SelectTrigger>
                <SelectContent>{OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ').toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">In the client's own words (nuance is never reduced to the enum)</Label>
              <Textarea className="h-9" value={objectiveNotes} onChange={(e) => setObjectiveNotes(e.target.value)} />
            </div>
          </div>
          <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => save('objective')}>{busy === 'objective' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Save objective</Button>
        </div>
        <div className="border-t pt-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4" />Property deadline</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">Deadline date</Label>
              <Input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={deadlineType} onValueChange={setDeadlineType}>
                <SelectTrigger><SelectValue placeholder="Not recorded" /></SelectTrigger>
                <SelectContent>{DEADLINE_TYPES.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ').toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Source / context</Label>
              <Input value={deadlineNote} onChange={(e) => setDeadlineNote(e.target.value)} />
            </div>
          </div>
          {!deadlineDate && <p className="text-xs text-slate-400 mt-1">No deadline recorded — unknown stays unknown, never "no deadline needed".</p>}
          <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => save('deadline')}>{busy === 'deadline' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Save deadline</Button>
        </div>
        <div className="border-t pt-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" />Completion standard — what finished means for THIS project</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">Standard</Label>
              <Select value={standard} onValueChange={setStandard}>
                <SelectTrigger><SelectValue placeholder="Not defined" /></SelectTrigger>
                <SelectContent>{STANDARDS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Tied back to the accepted scope (never an assumed "empty house")</Label>
              <Textarea className="h-9" value={standardNote} onChange={(e) => setStandardNote(e.target.value)} />
            </div>
          </div>
          <div className="mt-2"><Badge variant="outline">Every remaining tracked item must have a recorded disposition or reason before completion.</Badge></div>
          <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => save('standard')}>{busy === 'standard' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Save standard</Button>
        </div>
      </CardContent>
    </Card>
  );
}