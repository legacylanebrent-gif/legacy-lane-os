import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2 } from 'lucide-react';

const COMMAND_TYPES = [
  'Growth Strategy', 'Operator Acquisition', 'Agent Referral Program',
  'Territory Expansion', 'Marketing Campaign', 'Revenue Analysis',
  'CRM Cleanup', 'Support Review', 'Funnel Builder',
  'Weekly Execution Plan', 'General Admin'
];

const EXECUTION_MODES = [
  { value: 'Plan Only', label: 'Plan Only' },
  { value: 'Draft Assets', label: 'Draft Assets' },
  { value: 'Analyze Data', label: 'Analyze Data' },
  { value: 'Recommend Actions', label: 'Recommend Actions' },
  { value: 'Prepare Execution Checklist', label: 'Prepare Execution Checklist' },
];

const CONTEXT_TOGGLES = [
  { key: 'operators', label: 'Operator Data' },
  { key: 'leads', label: 'Lead Data' },
  { key: 'referrals', label: 'Referral Data' },
  { key: 'subscriptions', label: 'Subscription Data' },
  { key: 'campaigns', label: 'Campaign Data' },
  { key: 'tickets', label: 'Support Tickets' },
  { key: 'revenue', label: 'Revenue / KPI Data' },
];

const QUICK_COMMANDS = [
  { label: "Build this week's operator acquisition plan", type: 'Operator Acquisition' },
  { label: 'Analyze subscription growth opportunities', type: 'Growth Strategy' },
  { label: 'Create agent referral recruiting campaign', type: 'Agent Referral Program' },
  { label: 'Find weak points in operator onboarding', type: 'Operator Acquisition' },
  { label: 'Build 30-day revenue plan', type: 'Revenue Analysis' },
  { label: 'Draft support response summaries', type: 'Support Review' },
  { label: 'Recommend top territories to target', type: 'Territory Expansion' },
  { label: 'Create Legacy Lane OS demo script', type: 'Marketing Campaign' },
  { label: 'Build follow-up campaign for inactive operators', type: 'Marketing Campaign' },
  { label: 'Create weekly admin priority list', type: 'Weekly Execution Plan' },
];

export default function AdminAICommandConsole({ onSubmit, loading }) {
  const [command, setCommand] = React.useState('');
  const [commandType, setCommandType] = React.useState('General Admin');
  const [executionMode, setExecutionMode] = React.useState('Plan Only');
  const [contextToggles, setContextToggles] = React.useState({});

  const toggleContext = (key) => {
    setContextToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleQuickCommand = (item) => {
    setCommand(item.label);
    setCommandType(item.type);
  };

  const handleSubmit = () => {
    if (!command.trim()) return;
    onSubmit({ command, command_type: commandType, execution_mode: executionMode, context_toggles: contextToggles });
  };

  return (
    <div className="space-y-6">
      {/* Quick Commands */}
      <div>
        <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-3">Quick Commands</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((qc, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommand(qc)}
              className="text-xs px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
            >
              {qc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command Input */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Admin Command</p>
        <Textarea
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder='Example: Build a 30-day plan to acquire 25 new estate sale operators in New Jersey and create the campaigns, follow-up tasks, and KPIs.'
          className="min-h-[120px] bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-amber-400 resize-none text-sm"
        />
      </div>

      {/* Selectors Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Command Type</p>
          <Select value={commandType} onValueChange={setCommandType}>
            <SelectTrigger className="bg-white border-slate-300 text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMAND_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Execution Mode</p>
          <Select value={executionMode} onValueChange={setExecutionMode}>
            <SelectTrigger className="bg-white border-slate-300 text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXECUTION_MODES.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Context Toggles */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Include Context Data</p>
        <div className="flex flex-wrap gap-2">
          {CONTEXT_TOGGLES.map(ct => (
            <button
              key={ct.key}
              onClick={() => toggleContext(ct.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                contextToggles[ct.key]
                  ? 'border-amber-400 bg-amber-100 text-amber-700'
                  : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400'
              }`}
            >
              {contextToggles[ct.key] ? '✓ ' : ''}{ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={loading || !command.trim()}
        className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm tracking-wide"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Admin AI Operator is thinking...</>
        ) : (
          <><Zap className="w-4 h-4 mr-2" />Execute Command</>
        )}
      </Button>
    </div>
  );
}