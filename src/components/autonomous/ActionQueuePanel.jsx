import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, ChevronUp, Lock } from 'lucide-react';

const STATUS_COLORS = {
  pending:   'bg-slate-100 text-slate-500 border-slate-300',
  approved:  'bg-blue-100 text-blue-700 border-blue-300',
  running:   'bg-cyan-100 text-cyan-700 border-cyan-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  failed:    'bg-red-100 text-red-700 border-red-300',
  skipped:   'bg-slate-100 text-slate-400 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
};

const RISK_COLORS = {
  low:    'text-green-600',
  medium: 'text-amber-600',
  high:   'text-red-600',
};

const RESTRICTED_TYPES = ['send_email','send_sms','launch_campaign','change_subscription','modify_operator_status','assign_referral_payout','export_sensitive_data'];

function ActionRow({ action }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
        <Badge className={`text-xs flex-shrink-0 ${STATUS_COLORS[action.status] || STATUS_COLORS.pending}`}>{action.status}</Badge>
        <span className={`text-xs flex-shrink-0 font-medium ${RISK_COLORS[action.risk_level] || 'text-slate-400'}`}>{action.risk_level}</span>
        <span className="text-sm text-slate-700 font-medium flex-1 truncate">{action.title}</span>
        <span className="text-xs text-amber-600/70 flex-shrink-0 hidden md:block">{action.action_type}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200 space-y-2 bg-slate-50">
          {action.description && <p className="text-xs text-slate-500">{action.description}</p>}
          {action.target_entity && <p className="text-xs text-slate-400">Creates: <span className="text-slate-600">{action.target_entity}</span></p>}
          {action.payload && Object.keys(action.payload).length > 0 && (
            <pre className="text-xs text-slate-600 bg-white border border-slate-200 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
              {JSON.stringify(action.payload, null, 2).slice(0, 600)}
            </pre>
          )}
          {action.result && <p className="text-xs text-green-600">Result: {JSON.stringify(action.result)}</p>}
          {action.error_message && <p className="text-xs text-red-600">Error: {action.error_message}</p>}
        </div>
      )}
    </div>
  );
}

export default function ActionQueuePanel() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadActions(); }, []);

  const loadActions = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AutonomousAgentAction.list('-created_at', 100);
      setActions(data);
    } catch (_) { setActions([]); }
    setLoading(false);
  };

  const FILTERS = ['all', 'pending', 'approved', 'completed', 'failed', 'cancelled'];
  const filtered = filter === 'all' ? actions : actions.filter(a => a.status === filter);

  return (
    <div className="space-y-4">
      {/* Restricted notice */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">
          <span className="text-slate-400 font-medium">Future Execution Tools — Not Enabled Yet:</span>{' '}
          {RESTRICTED_TYPES.join(' · ')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-all capitalize ${
                filter === f ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-slate-300 text-slate-500 hover:border-slate-400'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={loadActions} className="text-slate-500 hover:text-slate-700 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">Loading action queue...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No actions in queue yet. Propose an autonomous run above.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => <ActionRow key={a.id} action={a} />)}
        </div>
      )}
    </div>
  );
}