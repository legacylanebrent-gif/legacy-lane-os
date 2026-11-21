import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckSquare, Loader2 } from 'lucide-react';

const list = (r) => (Array.isArray(r) ? r : (r?.items || []));

// Turn a piece of coaching into a real task on the operator's task list — assigned to
// themselves or to a team member, with a due date, so the advice has an owner.
export default function CoachTaskDialog({ open, onOpenChange, user, suggestedTitle, suggestedDetail, saleId, onDone }) {
  const [sales, setSales] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [form, setForm] = useState({ sale_id: '', name: '', description: '', definition_of_done: '', priority: 'medium', due_date: '', assignee_user_id: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(f => ({
      ...f,
      sale_id: saleId || '',
      name: (suggestedTitle || '').slice(0, 120),
      description: (suggestedDetail || '').slice(0, 1200),
      definition_of_done: '',
      priority: 'medium',
      due_date: '',
      assignee_user_id: user?.id || '',
    }));
    loadSales();
  }, [open]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = list(await base44.entities.EstateSale.filter({ operator_id: user.id }, '-created_date', 50));
      setSales(res);
      setForm(f => ({ ...f, sale_id: f.sale_id || res[0]?.id || '' }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedSale = sales.find(s => s.id === form.sale_id);

  useEffect(() => {
    const buildAssignees = async () => {
      if (!selectedSale) { setAssignees(user?.id ? [{ id: user.id, label: user.full_name || 'Me' }] : []); return; }
      const ids = [selectedSale.operator_id, ...(selectedSale.sale_team || [])].filter(Boolean);
      let options = [];
      try {
        const users = ids.length ? list(await base44.entities.User.filter({ id: { $in: ids } })) : [];
        options = users.map(u => ({ id: u.id, label: u.full_name || u.email }));
      } catch (_) { options = []; }
      (selectedSale.sale_team || []).forEach(id => {
        if (!options.some(o => o.id === id)) options.push({ id, label: 'Team member' });
      });
      if (user?.id && !options.some(o => o.id === user.id)) options.unshift({ id: user.id, label: user.full_name || 'Me' });
      setAssignees(options);
    };
    buildAssignees();
  }, [form.sale_id, sales.length]);

  const save = async () => {
    const name = form.name.trim();
    if (!name) { setError('Give the task a name.'); return; }
    if (!selectedSale) { setError('Pick the sale this task belongs to.'); return; }
    setSaving(true);
    setError('');
    try {
      const assignee = assignees.find(a => a.id === form.assignee_user_id);
      await base44.entities.SaleTask.create({
        sale_id: selectedSale.id,
        operator_id: selectedSale.operator_id,
        company_id: selectedSale.company_id || '',
        sale_team_ids: selectedSale.sale_team || [],
        name,
        description: form.description.trim(),
        definition_of_done: form.definition_of_done.trim(),
        category: 'Planning',
        status: 'not_started',
        priority: form.priority,
        due_date: form.due_date || undefined,
        assignee_user_id: form.assignee_user_id || '',
        assignee_name: assignee?.label || '',
        source_type: 'MANUAL',
        source_label: 'From AI Coach',
        sort_order: 0,
      });
      onOpenChange(false);
      onDone?.(`Task created: "${name}"${assignee ? ` — assigned to ${assignee.label}` : ''}.`);
    } catch (e) {
      console.error(e);
      setError('Could not create the task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a task from this coaching</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Put the advice on your task list with an owner and a due date — yours to do, or handed to someone on your team.
          </p>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <Label>Sale *</Label>
            <Select value={form.sale_id} onValueChange={v => set('sale_id', v)} disabled={loading || !sales.length}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={loading ? 'Loading sales…' : 'Select a sale'} /></SelectTrigger>
              <SelectContent>
                {sales.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {!loading && !sales.length && <p className="text-[11px] text-amber-700 mt-1">Create a sale first — tasks live on a sale.</p>}
          </div>
          <div>
            <Label>Task *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Email 10 agents about the March sale" />
          </div>
          <div>
            <Label>Details from the coaching</Label>
            <Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="The steps the coach gave you…" />
          </div>
          <div>
            <Label>Done when</Label>
            <Input value={form.definition_of_done} onChange={e => set('definition_of_done', e.target.value)} placeholder="10 emails sent and logged in the CRM" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Assign to</Label>
              <Select value={form.assignee_user_id || 'unassigned'} onValueChange={v => set('assignee_user_id', v === 'unassigned' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !sales.length} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-1" />}
              {saving ? 'Creating…' : 'Create task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}