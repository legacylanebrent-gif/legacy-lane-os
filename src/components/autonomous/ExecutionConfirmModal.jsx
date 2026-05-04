import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Play, X } from 'lucide-react';

export default function ExecutionConfirmModal({ run, onConfirm, onCancel, loading }) {
  if (!run) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Confirm Execution</h3>
            <p className="text-xs text-slate-500">This action will run approved safe actions</p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4 mb-5">
          <p className="text-sm font-semibold text-slate-200 mb-1">{run.title}</p>
          <p className="text-xs text-slate-400">{run.summary}</p>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-start gap-2">
            <span className="text-green-400 text-sm mt-0.5">✓</span>
            <p className="text-xs text-slate-300">Only <strong>approved safe actions</strong> will run (record creation, drafts, tasks, reports)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 text-sm mt-0.5">✗</span>
            <p className="text-xs text-slate-300">No emails sent, no payments processed, no records deleted, no legal actions taken</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-sm mt-0.5">⚑</span>
            <p className="text-xs text-slate-300">Restricted actions are not enabled and will be skipped</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}
            className="flex-1 border border-slate-700 text-slate-400 hover:text-white text-sm">
            <X className="w-4 h-4 mr-1.5" />Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold text-sm">
            <Play className="w-4 h-4 mr-1.5" />{loading ? 'Executing...' : 'Execute Run'}
          </Button>
        </div>
      </div>
    </div>
  );
}