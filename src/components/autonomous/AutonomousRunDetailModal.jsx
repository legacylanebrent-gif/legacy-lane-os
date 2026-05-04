import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  pending:   'bg-slate-500/20 text-slate-400',
  approved:  'bg-blue-500/20 text-blue-400',
  running:   'bg-cyan-500/20 text-cyan-400',
  completed: 'bg-green-500/20 text-green-400',
  failed:    'bg-red-500/20 text-red-400',
  skipped:   'bg-slate-600/20 text-slate-500',
  cancelled: 'bg-slate-600/20 text-slate-500',
};

const RISK_COLORS = {
  low:    'bg-green-500/15 text-green-400',
  medium: 'bg-amber-500/15 text-amber-400',
  high:   'bg-red-500/15 text-red-400',
};

function ActionItem({ action }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-700/30 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Badge className={`text-xs flex-shrink-0 ${STATUS_COLORS[action.status] || 'bg-slate-500/20 text-slate-400'}`}>{action.status}</Badge>
          <Badge className={`text-xs flex-shrink-0 ${RISK_COLORS[action.risk_level] || RISK_COLORS.low}`}>{action.risk_level}</Badge>
          <span className="text-sm text-slate-200 font-medium truncate">{action.title}</span>
          <span className="text-xs text-amber-400/70 flex-shrink-0">{action.action_type}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
          {action.description && <p className="text-xs text-slate-400">{action.description}</p>}
          {action.target_entity && <p className="text-xs text-slate-500">Target: <span className="text-slate-300">{action.target_entity}</span></p>}
          {action.payload && Object.keys(action.payload).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Payload Preview</p>
              <pre className="text-xs text-slate-400 bg-slate-900/60 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(action.payload, null, 2).slice(0, 800)}
              </pre>
            </div>
          )}
          {action.result && (
            <div>
              <p className="text-xs text-green-400 mb-1 uppercase tracking-wide">Result</p>
              <pre className="text-xs text-green-300 bg-green-900/10 rounded p-2 overflow-auto max-h-24">
                {JSON.stringify(action.result, null, 2)}
              </pre>
            </div>
          )}
          {action.error_message && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded p-2">Error: {action.error_message}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AutonomousRunDetailModal({ run, onClose, onApprove, onExecute, approving, executing }) {
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(true);

  useEffect(() => {
    if (!run) return;
    loadActions();
  }, [run?.id]);

  const loadActions = async () => {
    setLoadingActions(true);
    try {
      const data = await base44.entities.AutonomousAgentAction.filter({ run_id: run.id });
      setActions(data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    } catch (_) { setActions([]); }
    setLoadingActions(false);
  };

  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-white font-serif">{run.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Run ID: {run.id?.slice(0, 12)}...</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Summary */}
          {run.summary && (
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-4">
              <p className="text-xs text-amber-400 uppercase tracking-widest mb-1.5">AI Summary</p>
              <p className="text-sm text-slate-300">{run.summary}</p>
            </div>
          )}

          {/* Warnings */}
          {run.warnings?.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
              <p className="text-xs text-amber-400 uppercase tracking-widest mb-2">Compliance Warnings</p>
              {run.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">
              Proposed Actions {actions.length > 0 && `(${actions.length})`}
            </p>
            {loadingActions ? (
              <div className="text-center py-6 text-slate-500 text-sm">Loading actions...</div>
            ) : actions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">No actions found.</div>
            ) : (
              <div className="space-y-2">
                {actions.map(a => <ActionItem key={a.id} action={a} />)}
              </div>
            )}
          </div>

          {/* Execution result */}
          {run.status === 'completed' && run.result_json?.execution_log && (
            <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-4">
              <p className="text-xs text-green-400 uppercase tracking-widest mb-2">Execution Summary</p>
              <p className="text-sm text-green-300">{run.summary}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white text-sm">Close</Button>
          <div className="flex gap-2">
            {run.status === 'awaiting_approval' && (
              <Button onClick={() => onApprove(run.id)} disabled={approving === run.id}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />{approving === run.id ? 'Approving...' : 'Approve Run'}
              </Button>
            )}
            {run.status === 'approved' && (
              <Button onClick={() => onExecute(run.id)} disabled={executing === run.id}
                className="bg-green-600 hover:bg-green-500 text-white font-bold text-sm">
                {executing === run.id ? 'Executing...' : '▶ Execute Now'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}