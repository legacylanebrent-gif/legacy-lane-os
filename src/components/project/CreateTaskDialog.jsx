// Chapter 13 P1 — PROMISE → TASK (P1-41/P1-42): one reusable manual
// "Create Task from this" dialog. The created SaleTask carries provenance
// (source_type/source_id/source_label) so the system can always answer
// WHY DOES THIS TASK EXIST? Human confirms details; no AI, no auto-creation.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Planning', 'Preparation', 'Marketing', 'Execution', 'Post-Sale'];

export default function CreateTaskDialog({ open, onClose, sale, source, defaultName, defaultDescription, onCreated }) {
  // source: { type: 'SALE_NOTE' | 'CLIENT_DECISION' | 'SALE_ISSUE' | 'ACCEPTANCE_CONDITION' | 'COMMUNICATION' | 'CONSULTATION' | 'MANUAL', id, label }
  const [name, setName] = useState(defaultName || '');
  const [description, setDescription] = useState(defaultDescription || '');
  const [definitionOfDone, setDefinitionOfDone] = useState('');
  const [category, setCategory] = useState('Preparation');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('unassigned');
  const [teamOptions, setTeamOptions] = useState([{ id: 'unassigned', label: 'Unassigned' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultName || '');
    setDescription(defaultDescription || '');
    setDefinitionOfDone('');
    setDueDate('');
    setAssignee('unassigned');
    (async () => {
      const options = [{ id: 'unassigned', label: 'Unassigned' }];
      try {
        const me = await base44.auth.me();
        if (me) options.push({ id: me.id, label: `${me.full_name || me.email} (You)` });
        (sale?.sale_team || []).forEach((id) => options.push({ id, label: 'Team member' }));
      } catch (e) { /* keep unassigned */ }
      setTeamOptions(options);
    })();
  }, [open, defaultName, defaultDescription, sale]);

  const submit = async () => {
    if (!name.trim()) { toast.error('Task name is required'); return; }
    setSaving(true);
    try {
      const opt = teamOptions.find((o) => o.id === assignee);
      const created = await base44.entities.SaleTask.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        name: name.trim(),
        description: description.trim(),
        definition_of_done: definitionOfDone.trim(),
        category,
        status: 'not_started',
        priority: 'medium',
        due_date: dueDate || '',
        assignee_user_id: assignee === 'unassigned' ? '' : assignee,
        assignee_name: assignee === 'unassigned' ? '' : (opt?.label || 'Team member'),
        source_type: source?.type || 'MANUAL',
        source_id: source?.id || '',
        source_label: (source?.label || '').slice(0, 300),
      });
      toast.success('Task created');
      onCreated && onCreated(created);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Could not create the task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Task from This</DialogTitle></DialogHeader>
        {source?.label && (
          <div className="text-xs p-2.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 max-h-24 overflow-y-auto">
            <span className="font-semibold">Source ({(source.type || 'MANUAL').replace(/_/g, ' ').toLowerCase()}): </span>{source.label}
          </div>
        )}
        <div className="space-y-3">
          <div><Label>Task name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="What will the team do?" /></div>
          <div><Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Definition of done</Label>
            <Textarea rows={2} value={definitionOfDone} onChange={(e) => setDefinitionOfDone(e.target.value)}
              placeholder="What must be TRUE for this task to count as complete (the assignee sees this)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div><Label>Owner</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{teamOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}