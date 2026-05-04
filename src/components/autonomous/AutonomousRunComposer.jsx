import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Loader2, AlertTriangle } from 'lucide-react';

const SCOPES = [
  'Full plan with all asset types',
  'Campaign drafts only',
  'Task creation only',
  'KPI + reporting only',
  'Territory analysis only',
  'Email + SMS drafts only',
];

const CONTEXT_TOGGLES = [
  { key: 'operators', label: 'Operators' },
  { key: 'leads', label: 'Leads' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'campaigns', label: 'Campaigns' },
];

const QUICK_COMMANDS = [
  'Build and prepare a 14-day operator acquisition campaign for New Jersey estate sale companies.',
  'Create a full agent referral recruiting email sequence for licensed NJ real estate agents.',
  'Draft the KPI targets and admin tasks for Q3 growth — 25 operators, $25k MRR.',
  'Build a territory expansion plan for Bergen, Essex, and Middlesex County NJ.',
  'Create a 7-step operator onboarding sequence with tasks and follow-up drafts.',
  'Generate a CRM cleanup and lead scoring action plan.',
];

export default function AutonomousRunComposer({ onPropose, loading }) {
  const [command, setCommand] = useState('');
  const [scope, setScope] = useState('Full plan with all asset types');
  const [ctx, setCtx] = useState({});

  const toggle = (key) => setCtx(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-5">
      {/* Warning */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Autonomous runs will <strong>propose</strong> actions and wait for your approval before executing. No records are created until you approve and execute.
        </p>
      </div>

      {/* Quick Commands */}
      <div>
        <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-2">Quick Commands</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((q, i) => (
            <button key={i} onClick={() => setCommand(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-left">
              {q.length > 60 ? q.slice(0, 60) + '…' : q}
            </button>
          ))}
        </div>
      </div>

      {/* Command Input */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">Admin Command</p>
        <Textarea value={command} onChange={e => setCommand(e.target.value)}
          placeholder="Describe exactly what you want the autonomous agent to build, plan, or prepare..."
          className="min-h-[120px] bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-amber-400 resize-none text-sm" />
      </div>

      {/* Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">Execution Scope</p>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="bg-white border-slate-300 text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">Include Context</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {CONTEXT_TOGGLES.map(ct => (
              <button key={ct.key} onClick={() => toggle(ct.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${ctx[ct.key] ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
                {ctx[ct.key] ? '✓ ' : ''}{ct.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={() => onPropose({ command, execution_scope: scope, context_toggles: ctx })}
        disabled={loading || !command.trim()}
        className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm tracking-wide">
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI is building execution plan...</>
          : <><Zap className="w-4 h-4 mr-2" />Propose Autonomous Run</>}
      </Button>
    </div>
  );
}