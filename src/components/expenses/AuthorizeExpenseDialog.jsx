import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { buildHistoryEntry, DECISION_SOURCES } from '@/components/saleops/saleDecisionModel';

// Chapter 6 P2 — client authorization for a reimbursable expense, through the CANONICAL
// SaleClientDecision system (decision_type 'financial' + related_expense_id). A
// reimbursable expense reduces client proceeds ONLY when a decision like this exists.
export default function AuthorizeExpenseDialog({ open, onClose, expense, sale, onAuthorized }) {
  const [authorities, setAuthorities] = useState(null);
  const [authorityId, setAuthorityId] = useState('');
  const [source, setSource] = useState('in_person');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && expense && sale) {
      setAuthorityId(''); setSource('in_person'); setNotes('');
      loadAuthorities();
    }
  }, [open]);

  const loadAuthorities = async () => {
    try {
      const list = await base44.entities.SaleAuthority.filter({ sale_id: sale.id });
      setAuthorities(Array.isArray(list) ? list : (list?.items || []));
    } catch {
      setAuthorities([]);
    }
  };

  const handleSubmit = async () => {
    if (!authorityId) { toast.error('Select which client authority authorized this reimbursement.'); return; }
    const authority = (authorities || []).find(a => a.id === authorityId);
    if (!authority) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const label = expense.description || expense.vendor || 'sale expense';
      const entry = buildHistoryEntry({ decision: 'authorized', authority, source, notes, user: me });
      await base44.entities.SaleClientDecision.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        decision_type: 'financial',
        subject: `Client reimbursement — ${label}`,
        current_decision: 'authorized',
        status: 'resolved',
        charge_amount: Number(expense.amount) || 0,
        related_expense_id: expense.id,
        history: [entry],
        authorized_by: authority.id,
        authorized_by_name: authority.full_name || '',
        decided_at: entry.decided_at,
        source,
        notes: notes || '',
        recorded_by: me.id,
        recorded_by_name: me.full_name || me.email || '',
        resolved_at: entry.decided_at,
        resolved_note: 'Client-authorized reimbursable expense for settlement.',
      });
      toast.success('Reimbursement authorized — it will appear on the settlement statement.');
      onAuthorized();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Could not record the authorization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Authorize Reimbursable Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
            <p className="font-medium">{expense?.description || expense?.vendor}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {expense?.date ? `Dated ${expense.date} · ` : ''}${Number(expense?.amount || 0).toFixed(2)}
              {' '}· marked client-reimbursable
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Recording that the client authorized reimbursing this expense. Without this, the expense stays a company cost
            and never reduces client proceeds.
          </p>
          <div>
            <Label>Authorized by (client authority)</Label>
            <Select value={authorityId} onValueChange={setAuthorityId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={authorities?.length ? 'Choose authority…' : 'Loading authorities…'} /></SelectTrigger>
              <SelectContent>
                {(authorities || []).map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name || 'Authority'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>How it was received</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DECISION_SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Saving…' : 'Record Authorization'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}