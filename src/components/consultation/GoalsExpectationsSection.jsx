import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Target } from 'lucide-react';
import { CLIENT_GOAL_OPTIONS, DEADLINE_TYPES, GOAL_LABEL, DEADLINE_LABEL, timelineFlags, uid } from '@/components/consultation/consultationModel';
import VoiceNoteInput from '@/components/consultation/VoiceNoteInput';

// Chapter 12 P1 — CLIENT GOALS & EXPECTATIONS (P1-5/P1-6/P1-7/P1-24).
// CLIENT GOAL (what the client wants) is distinct from OPERATOR RECOMMENDATION.
// CLIENT EXPECTATIONS are what the CLIENT SAID — never verified truth, never authority.
const EXP_FIELDS = [
  { key: 'value', label: 'Expected value (their words)', ph: 'What the client believes the sale/items are worth' },
  { key: 'timing', label: 'Expected timing', ph: 'When they expect the sale / need it done' },
  { key: 'responsibilities', label: 'Responsibilities expected', ph: 'Who they expect does what' },
  { key: 'scope', label: 'Expected scope', ph: 'What they expect is included' },
  { key: 'likely_proceeds', label: 'Expected proceeds', ph: 'What they expect to receive' },
  { key: 'company_responsibilities', label: 'What they expect the company will do', ph: '' },
  { key: 'family_responsibilities', label: 'What they expect the family will do', ph: '' },
];

export default function GoalsExpectationsSection({ deal, consult, saveConsult }) {
  const goals = consult.client_goals || [];
  const deadlines = consult.external_deadlines || [];
  const exp = consult.client_expectations || {};
  const [dl, setDl] = useState({ type: '', date: '', note: '', is_estimated: false });

  const toggleGoal = (v) => saveConsult({ client_goals: goals.includes(v) ? goals.filter(g => g !== v) : [...goals, v] });
  const addDeadline = () => {
    if (!dl.type || !dl.date) return;
    saveConsult({ external_deadlines: [...deadlines, { deadline_id: uid(), ...dl }] });
    setDl({ type: '', date: '', note: '', is_estimated: false });
  };
  const delDeadline = (id) => saveConsult({ external_deadlines: deadlines.filter(d => d.deadline_id !== id) });
  const setExp = (k, v) => saveConsult({ client_expectations: { ...exp, [k]: v } });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-cyan-600" /> Client goals</p>
        <p className="text-[10px] text-slate-400">What the CLIENT wants (multiple priorities allowed). Keep this distinct from YOUR recommendation.</p>
        <div className="grid grid-cols-2 gap-2">
          {CLIENT_GOAL_OPTIONS.map(g => (
            <button key={g.value} onClick={() => toggleGoal(g.value)}
              className={`min-h-[44px] rounded-lg border text-xs font-medium px-2 ${goals.includes(g.value) ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {g.label}
            </button>
          ))}
        </div>
        <VoiceNoteInput label="Goal notes (their words)" value={consult.client_goals_notes || ''} onChange={v => saveConsult({ client_goals_notes: v })} placeholder="e.g. Wants the house emptied before the closing, but also wants top dollar for the coins" rows={2} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">External deadlines</p>
        {deadlines.map(d => (
          <div key={d.deadline_id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg p-2.5 bg-slate-50">
            <div>
              <p className="text-xs font-medium text-slate-800">{DEADLINE_LABEL(d.type)} — {d.date}{d.is_estimated ? ' (estimated)' : ''}</p>
              {d.note && <p className="text-[11px] text-slate-500">{d.note}</p>}
            </div>
            <button onClick={() => delDeadline(d.deadline_id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500" aria-label="Remove deadline"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <Select value={dl.type} onValueChange={v => setDl(p => ({ ...p, type: v }))}>
            <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Deadline type" /></SelectTrigger>
            <SelectContent>
              {DEADLINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={dl.date} onChange={e => setDl(p => ({ ...p, date: e.target.value }))} className="h-11 text-base" />
            <Button onClick={addDeadline} disabled={!dl.type || !dl.date} className="h-11 px-4 bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4" /></Button>
          </div>
          <Input value={dl.note} onChange={e => setDl(p => ({ ...p, note: e.target.value }))} placeholder="Brief note (optional)" className="h-11 text-base" />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={dl.is_estimated} onChange={e => setDl(p => ({ ...p, is_estimated: e.target.checked }))} className="w-4 h-4" />
            Date is estimated, not confirmed
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Timeline visibility</p>
        {timelineFlags(deal).map((f, i) => (
          <p key={i} className={`text-xs rounded-lg p-2 border ${f.level === 'conflict' ? 'bg-red-50 border-red-200 text-red-700' : f.level === 'needs_review' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
            {f.text}
          </p>
        ))}
        <p className="text-[10px] text-slate-400">Deterministic date math only — the system surfaces conflicts, it does not optimize the calendar.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Client expectations</p>
        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">CLIENT SAID / EXPECTS — not verified truth</Badge>
        {EXP_FIELDS.map(f => (
          <div key={f.key}>
            <p className="text-xs font-medium text-slate-600 mb-1">{f.label}</p>
            <Input value={exp[f.key] || ''} onChange={e => setExp(f.key, e.target.value)} placeholder={f.ph} className="h-11 text-base" />
          </div>
        ))}
      </div>
    </div>
  );
}