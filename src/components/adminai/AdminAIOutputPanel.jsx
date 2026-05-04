import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Save, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Section = ({ title, content, color = 'amber' }) => {
  const [open, setOpen] = React.useState(true);
  if (!content) return null;

  const colorMap = {
    amber: 'border-amber-300 bg-amber-50',
    blue: 'border-blue-300 bg-blue-50',
    green: 'border-green-300 bg-green-50',
    red: 'border-red-300 bg-red-50',
    purple: 'border-purple-300 bg-purple-50',
    cyan: 'border-cyan-300 bg-cyan-50',
  };
  const headerMap = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    purple: 'text-purple-700',
    cyan: 'text-cyan-700',
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
        <div className="text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none">
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
          <h3 className="text-lg font-bold text-amber-700 font-serif">{result.title}</h3>
          <Badge className="bg-green-100 text-green-700 border-green-300 text-xs mt-1">AI Report Generated</Badge>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={copyAll}
            className="border-slate-300 text-slate-600 hover:bg-slate-100 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={saving}
            className="border-amber-400 text-amber-700 hover:bg-amber-50 text-xs"
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