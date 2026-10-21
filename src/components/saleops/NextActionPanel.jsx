import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, CheckCircle2, AlertCircle, Clock, Edit2, Zap, User } from 'lucide-react';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';

// Chapter 10 P1 — the canonical WHAT HAPPENS NEXT panel for a seller opportunity.
// WHAT / WHEN / WHO is always visible on the deal. Completing an action prompts
// the operator to answer "what happens next?" — the system never invents it.
const PRESETS = [
  'Call seller',
  'Send consultation information',
  'Follow up after family meeting',
  'Contact after probate hearing',
  'Schedule consultation',
  'Check back in 60 days',
];

function whenLabel(iso) {
  if (!iso) return 'No date set';
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isPast(d)) return `Overdue — ${format(d, 'MMM d')}`;
  return format(d, 'MMM d, h:mm a');
}

export default function NextActionPanel({ deal, operatorName, onPersist }) {
  const [editing, setEditing] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [action, setAction] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);

  const pending = deal.next_action && !deal.next_action_completed_at;
  const done = deal.next_action && deal.next_action_completed_at;
  const overdue = pending && deal.next_action_at && isPast(parseISO(deal.next_action_at));
  const activeWork = !['completed', 'lost', 'referred'].includes(deal.stage);

  const startEdit = () => {
    setAction(deal.next_action || '');
    setWhen(deal.next_action_at ? deal.next_action_at.slice(0, 16) : '');
    setEditing(true);
    setPrompting(false);
  };

  const save = async () => {
    if (!action.trim()) return;
    setSaving(true);
    try {
      await onPersist({
        next_action: action.trim(),
        next_action_at: when ? new Date(when).toISOString() : null,
        next_action_completed_at: null,
      });
      setEditing(false);
      setPrompting(false);
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    setSaving(true);
    try {
      await onPersist({ next_action_completed_at: new Date().toISOString() });
      setPrompting(true);
    } finally {
      setSaving(false);
    }
  };

  const showForm = editing || prompting || (!deal.next_action && activeWork);

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Target className="w-4 h-4 text-orange-500" /> Next Action
        </p>
        {pending && overdue && <Badge className="bg-red-100 text-red-700 border border-red-200">OVERDUE</Badge>}
        {pending && !overdue && <Badge className="bg-green-100 text-green-700 border border-green-200">Scheduled</Badge>}
        {done && <Badge className="bg-slate-100 text-slate-500 border border-slate-200">Completed</Badge>}
        {!deal.next_action && activeWork && <Badge className="bg-amber-100 text-amber-700 border border-amber-200">NEEDS NEXT ACTION</Badge>}
        {!deal.next_action && !activeWork && <Badge variant="outline">Outcome recorded</Badge>}
      </div>

      {pending ? (
        <div className="space-y-2">
          <div className="font-medium text-slate-900 text-sm">{deal.next_action}</div>
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
              <Clock className="w-3.5 h-3.5" /> {whenLabel(deal.next_action_at)}
            </span>
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {operatorName || 'You'}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={complete} disabled={saving} className="gap-1 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </Button>
            <Button size="sm" variant="outline" onClick={startEdit} className="gap-1">
              <Edit2 className="w-3.5 h-3.5" /> Edit / Replace
            </Button>
          </div>
        </div>
      ) : done ? (
        <p className="text-sm text-slate-400 line-through">{deal.next_action}</p>
      ) : activeWork ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          NEXT ACTION REQUIRED — this active opportunity has no recorded next step.
        </p>
      ) : null}

      {showForm && (
        <div className="space-y-2.5 border-t border-slate-100 pt-3">
          {prompting && (
            <p className="text-xs font-semibold text-slate-600">The last action is complete. What happens next?</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setAction(p)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${action === p ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">What</Label>
              <Input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Call seller after the family meeting" />
            </div>
            <div>
              <Label className="text-xs">When</Label>
              <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {(editing || prompting) && (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPrompting(false); }}>Cancel</Button>
            )}
            <Button size="sm" onClick={save} disabled={saving || !action.trim()} className="bg-orange-600 hover:bg-orange-700 gap-1">
              <Zap className="w-3.5 h-3.5" /> Save Next Action
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}