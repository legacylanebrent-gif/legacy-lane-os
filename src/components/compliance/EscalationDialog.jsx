import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ADVISER_ROLES, adviserRoleLabel } from './complianceModel';

// Chapter 6 P2 — professional escalation: link an EXISTING Contact adviser, mark the
// question for professional review, optionally create a follow-up task (sale-linked
// questions only). Reuses the canonical Contact directory — no duplicate advisers.
export default function EscalationDialog({ open, onClose, question, onSaved }) {
  const [role, setRole] = useState('');
  const [contacts, setContacts] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [createTask, setCreateTask] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRole(''); setSelectedContactId(''); setCreateTask(false); setNotes(question?.escalation_notes || '');
      loadContacts();
    }
  }, [open]);

  const loadContacts = async () => {
    try {
      const mine = await base44.entities.Contact.filter({});
      setContacts(Array.isArray(mine) ? mine : (mine?.items || []));
    } catch { setContacts([]); }
  };

  const matching = (contacts || []).filter(c => role && (c.roles || []).includes(role));

  const handleSubmit = async () => {
    if (!role) { toast.error('Choose an adviser category.'); return; }
    if (!selectedContactId) { toast.error('Select an existing contact (or add the adviser in your CRM first).'); return; }
    setSaving(true);
    try {
      const contact = (contacts || []).find(c => c.id === selectedContactId);
      const linkedSale = question.sale_id ? (await base44.entities.EstateSale.filter({ id: question.sale_id }))[0] : null;

      // Optional follow-up task — only for sale-linked questions (SaleTask requires a sale).
      let taskId = null;
      if (createTask && linkedSale) {
        const task = await base44.entities.SaleTask.create({
          sale_id: linkedSale.id,
          operator_id: linkedSale.operator_id,
          sale_team_ids: linkedSale.sale_team || [],
          name: `Consult professional — ${adviserRoleLabel(role)}`,
          description: `Compliance question for ${linkedSale.title}: "${question.question}". Discuss with ${(contact?.first_name || '')} ${(contact?.last_name || '')} (${adviserRoleLabel(role)}).`,
          category: 'Planning',
          priority: 'high',
          status: 'not_started',
        });
        taskId = task.id;
      }

      await base44.entities.ComplianceQuestion.update(question.id, {
        professional_contact_id: selectedContactId,
        professional_review_needed: true,
        escalation_notes: notes || '',
        follow_up_sale_task_id: taskId || question.follow_up_sale_task_id || null,
      });
      toast.success('Professional review recorded — the adviser link reuses your existing contact.');
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Could not record the escalation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consult a Professional</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            "{question?.question}"
          </div>
          <div>
            <Label>Adviser category</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="e.g., Attorney, CPA…" /></SelectTrigger>
              <SelectContent>{ADVISER_ROLES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">EstateSalen suggests when review may help — it never claims a professional is legally required.</p>
          </div>
          <div>
            <Label>Select contact</Label>
            <Select value={selectedContactId} onValueChange={setSelectedContactId} disabled={!role}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={role ? `${matching.length} matching contact(s)` : 'Choose a category first'} /></SelectTrigger>
              <SelectContent>
                {matching.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.email ? ` · ${c.email}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role && matching.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No contact with role "{adviserRoleLabel(role)}" yet — add the adviser in your CRM, then link them here.</p>
            )}
          </div>
          <div>
            <Label>What to discuss / context (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={createTask} onChange={e => setCreateTask(e.target.checked)} disabled={!question?.sale_id} />
            <span>
              Create a follow-up task
              {!question?.sale_id && <span className="text-slate-400"> (available for sale-linked questions)</span>}
            </span>
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Saving…' : 'Record Professional Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}