import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Save, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Section = ({ title, content, color = 'amber' }) => {
  const [open, setOpen] = React.useState(true);
  if (!content) return null;

  const colorMap = {
    amber: 'border-amber-500/40 bg-amber-500/5',
    blue: 'border-blue-500/40 bg-blue-500/5',
    green: 'border-green-500/40 bg-green-500/5',
    red: 'border-red-500/40 bg-red-500/5',
    purple: 'border-purple-500/40 bg-purple-500/5',
    cyan: 'border-cyan-500/40 bg-cyan-500/5',
  };
  const headerMap = {
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full text-left ${headerMap[color]} font-semibold text-xs uppercase tracking-widest mb-2`}
      >
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default function AdminAIOutputPanel({ result, onSave, onCreateTasks, saving, creatingTasks }) {
  if (!result) return null;

  const copyAll = () => {
    const text = [
      result.title && `# ${result.title}`,
      result.executive_summary && `## Executive Summary\n${result.executive_summary}`,
      result.recommended_actions && `## Recommended Actions\n${result.recommended_actions}`,
      result.assets_created && `## Assets Created\n${result.assets_created}`,
      result.kpi_targets && `## KPI Targets\n${result.kpi_targets}`,
      result.risks_watchouts && `## Risks & Watchouts\n${result.risks_watchouts}`,
      result.next_steps && `## Next Steps\n${result.next_steps}`,
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-amber-400 font-serif">{result.title}</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-1">AI Report Generated</Badge>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={copyAll}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={saving}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs"
          >
            <Save className="w-3 h-3 mr-1" />{saving ? 'Saving...' : 'Save Report'}
          </Button>
          <Button
            size="sm"
            onClick={onCreateTasks}
            disabled={creatingTasks}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold"
          >
            <ListChecks className="w-3 h-3 mr-1" />{creatingTasks ? 'Creating...' : 'Create Tasks'}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <Section title="Executive Summary" content={result.executive_summary} color="amber" />
      <Section title="Recommended Actions" content={result.recommended_actions} color="blue" />
      <Section title="Assets Created" content={result.assets_created} color="purple" />
      <Section title="KPI Targets" content={result.kpi_targets} color="green" />
      <Section title="Risks & Watchouts" content={result.risks_watchouts} color="red" />
      <Section title="Next Steps" content={result.next_steps} color="cyan" />
    </div>
  );
}