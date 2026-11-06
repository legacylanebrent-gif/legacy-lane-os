import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

export default function GoalRing({ user, monthRevenue }) {
  const [goal, setGoal] = useState(Number(user?.monthly_revenue_goal) || 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const revenue = Number(monthRevenue) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((revenue / goal) * 100)) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const startEdit = () => {
    setDraft(goal > 0 ? String(goal) : '');
    setEditing(true);
  };

  const save = async () => {
    const value = Math.max(0, Math.round(Number(draft) || 0));
    setSaving(true);
    try {
      await base44.auth.updateMe({ monthly_revenue_goal: value });
      setGoal(value);
      setEditing(false);
    } catch (e) {
      console.error('Save goal:', e);
      alert('Could not save your goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">Monthly goal</h2>
          <p className="text-xs text-slate-500">Your own target, not a quota</p>
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" className="text-slate-500" onClick={startEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            {goal > 0 ? 'Edit' : 'Set goal'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          <label className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">
            Goal for this month
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="25000"
            />
            <Button
              onClick={save}
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0"
            >
              <Check className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">Set 0 to clear your goal.</p>
        </div>
      ) : goal > 0 ? (
        <div className="mt-3 relative self-center">
          <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
            <circle cx="66" cy="66" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              stroke="url(#goalGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="goalGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-slate-900 leading-none">{pct}%</p>
            <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-400 mt-1">
              of goal
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <Target className="w-9 h-9 text-slate-300 mb-2" />
          <p className="text-sm text-slate-600">No goal set for this month.</p>
          <Button size="sm" onClick={startEdit} className="mt-3 bg-cyan-600 hover:bg-cyan-700">
            Set a monthly goal
          </Button>
        </div>
      )}

      {goal > 0 && !editing && (
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-slate-900">
            {money(revenue)} <span className="text-slate-400 font-normal">of {money(goal)}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {revenue >= goal
              ? 'Goal reached — nice work.'
              : `${money(goal - revenue)} to go this month`}
          </p>
        </div>
      )}
    </div>
  );
}