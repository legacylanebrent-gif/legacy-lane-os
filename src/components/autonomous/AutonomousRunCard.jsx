import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Play, XCircle, Eye, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  draft:              { color: 'bg-slate-100 text-slate-500 border-slate-300',    label: 'Draft' },
  awaiting_approval:  { color: 'bg-amber-100 text-amber-700 border-amber-300',    label: 'Awaiting Approval' },
  approved:           { color: 'bg-blue-100 text-blue-700 border-blue-300',       label: 'Approved' },
  running:            { color: 'bg-cyan-100 text-cyan-700 border-cyan-300',       label: 'Running' },
  completed:          { color: 'bg-green-100 text-green-700 border-green-300',    label: 'Completed' },
  failed:             { color: 'bg-red-100 text-red-700 border-red-300',          label: 'Failed' },
  cancelled:          { color: 'bg-slate-100 text-slate-400 border-slate-200',   label: 'Cancelled' },
};

const RISK_CONFIG = {
  low:    'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high:   'bg-red-100 text-red-700 border-red-200',
};

export default function AutonomousRunCard({ run, onView, onApprove, onExecute, onCancel, approving, executing, cancelling }) {
  const sc = STATUS_CONFIG[run.status] || STATUS_CONFIG.draft;
  const rc = RISK_CONFIG[run.risk_level] || RISK_CONFIG.low;
  const actionCount = run.proposed_actions_json?.actions?.length || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
            <Badge className={`text-xs ${rc}`}>{run.risk_level || 'low'} risk</Badge>
            {actionCount > 0 && <span className="text-xs text-slate-400">{actionCount} proposed actions</span>}
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mt-1">{run.title}</h3>
          {run.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{run.summary}</p>}
          {run.warnings?.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">{run.warnings.length} warning{run.warnings.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
            {run.created_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(run.created_at), 'MMM d, h:mm a')}</span>}
            {run.approved_by && <span>Approved by {run.approved_by}</span>}
            {run.status === 'completed' && run.result_json?.success_count !== undefined && (
              <span className="text-green-600">{run.result_json.success_count} actions completed</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onView(run)}
            className="text-slate-600 hover:bg-slate-100 text-xs">
            <Eye className="w-3 h-3 mr-1" />View
          </Button>

          {run.status === 'awaiting_approval' && (
            <Button size="sm" onClick={() => onApprove(run.id)} disabled={approving === run.id}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">
              <CheckCircle2 className="w-3 h-3 mr-1" />{approving === run.id ? 'Approving...' : 'Approve'}
            </Button>
          )}

          {run.status === 'approved' && (
            <Button size="sm" onClick={() => onExecute(run.id)} disabled={executing === run.id}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold">
              <Play className="w-3 h-3 mr-1" />{executing === run.id ? 'Executing...' : 'Execute'}
            </Button>
          )}

          {['awaiting_approval', 'approved'].includes(run.status) && (
            <Button size="sm" variant="ghost" onClick={() => onCancel(run.id)} disabled={cancelling === run.id}
              className="text-red-400 hover:bg-red-500/10 text-xs">
              <XCircle className="w-3 h-3 mr-1" />{cancelling === run.id ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}