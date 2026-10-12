// Phase 4D — per-tenant activity history (Part 16). Meaningful actions only,
// tenant-isolated, shared by the admin Review Center and the client Overview.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, History } from 'lucide-react';

const ACTION_LABELS = {
  website_created: 'Website created',
  client_invited: 'Client invited',
  invitation_accepted: 'Invitation accepted',
  invitation_revoked: 'Invitation revoked',
  access_revoked: 'Website access removed',
  section_updated: 'Section updated',
  review_submitted: 'Submitted for review',
  review_resubmitted: 'Resubmitted for review',
  changes_requested: 'Changes requested',
  review_approved: 'Website approved',
  review_note_added: 'Review note added',
  review_note_responded: 'Note response',
  review_note_resolved: 'Note resolved',
  media_added: 'Image added',
  media_removed: 'Image removed',
  setup_started: 'Setup started',
  management_mode_changed: 'Management mode changed'
};

export default function ActivityHistoryPanel({ websiteTenantId, limit = 40 }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.functions.invoke('websiteCollab', { action: 'activity_list', website_tenant_id: websiteTenantId, limit })
      .then((res) => { if (alive) setRows((res.data && res.data.activity) || []); })
      .catch(() => { if (alive) setRows([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [websiteTenantId, limit]);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
        <History className="w-4 h-4 text-slate-300" /> No activity yet.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-400" />
        <span className="font-heading font-bold text-slate-900 text-sm">Website Activity</span>
      </div>
      <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {rows.map(a => (
          <li key={a.id} className="px-4 py-2.5 flex items-start gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-800">{ACTION_LABELS[a.action] || (a.action || '').replace(/_/g, ' ')}</span>
              {a.section && a.section !== 'team' && <span className="text-slate-400"> · {String(a.section).replace(/_/g, ' ')}</span>}
              {a.detail && <div className="text-xs text-slate-500 truncate">{a.detail}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-slate-600">{a.actor_display || '—'}<span className="text-slate-300"> · {a.actor_role === 'admin' ? 'Team' : a.actor_role === 'system' ? 'System' : 'Client'}</span></div>
              <div className="text-[11px] text-slate-400">{a.created_date ? new Date(a.created_date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}