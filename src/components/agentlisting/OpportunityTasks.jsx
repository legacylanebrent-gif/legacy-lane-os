import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus } from 'lucide-react';
import { opportunities } from './listingApi';

export default function OpportunityTasks({ opportunity, onUpdated }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tasks = opportunity.tasks || [];

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError('');
    try {
      await opportunities.act('add_task', opportunity.id, { title: title.trim(), due_date: due });
      setTitle('');
      setDue('');
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async (taskId) => {
    setBusy(true);
    setError('');
    try {
      await opportunities.act('complete_task', opportunity.id, { task_id: taskId });
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Follow-up tasks</h4>
      {tasks.length === 0 && <p className="mt-1 text-xs text-slate-500">No tasks yet.</p>}
      <div className="mt-2 space-y-1.5">
        {tasks.map((task) => (
          <div key={task.task_id} className="flex items-start gap-2">
            <Checkbox
              checked={task.status === 'done'}
              disabled={busy || task.status === 'done'}
              onCheckedChange={() => complete(task.task_id)}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <p className={`text-sm ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {task.title}
              </p>
              {task.due_date && <p className="text-xs text-slate-500">Due {task.due_date}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="min-w-[160px] flex-1"
        />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
        <Button size="sm" onClick={add} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </section>
  );
}