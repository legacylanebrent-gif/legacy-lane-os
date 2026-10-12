// Phase 4D (Part 38) — LLBB Admin Attention Center. Surfaces website states
// across the whole portfolio without opening each tenant: waiting for client,
// client started, ready for review, changes requested, resubmitted, approved
// (ready to publish), expired invitations, stalled setup.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Loader2, BellRing, ChevronRight } from 'lucide-react';
import { WORKFLOW_LABELS, WORKFLOW_BADGE } from '@/components/llbb/managerConfig';

const BUCKET_META = {
  ready_for_review: { label: 'Waiting for Review', tone: 'bg-blue-50 border-blue-200' },
  resubmitted: { label: 'Resubmitted', tone: 'bg-blue-50 border-blue-200' },
  changes_requested: { label: 'Changes Requested', tone: 'bg-orange-50 border-orange-200' },
  ready_to_publish: { label: 'Approved — Ready to Publish', tone: 'bg-indigo-50 border-indigo-200' },
  waiting_for_client: { label: 'Waiting for Client', tone: 'bg-amber-50 border-amber-200' },
  client_started: { label: 'Client Started Setup', tone: 'bg-cyan-50 border-cyan-200' },
  invitation_expired: { label: 'Invitation Expired', tone: 'bg-red-50 border-red-200' },
  setup_stalled: { label: 'Setup Stalled', tone: 'bg-slate-50 border-slate-200' }
};
const BUCKET_ORDER = ['ready_for_review', 'resubmitted', 'changes_requested', 'ready_to_publish', 'waiting_for_client', 'client_started', 'invitation_expired', 'setup_stalled'];

export default function AdminAttentionCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.functions.invoke('websiteCollab', { action: 'attention_center' })
      .then((res) => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>;
  if (!data) return null;
  const total = Object.values(data.counts || {}).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BellRing className="w-4 h-4 text-amber-500" />
        <span className="font-heading font-bold text-slate-900">Attention Center</span>
        <span className="text-xs text-slate-400">{total} item{total === 1 ? '' : 's'} need attention across your websites</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {BUCKET_ORDER.filter(k => (data.counts[k] || 0) > 0).map(key => (
          <div key={key} className={`border rounded-md p-3 ${BUCKET_META[key].tone}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-slate-800">{BUCKET_META[key].label}</span>
              <Badge variant="outline" className="bg-white">{data.counts[key]}</Badge>
            </div>
            <ul className="space-y-1">
              {data.buckets[key].slice(0, 4).map(r => (
                <li key={r.id}>
                  <Link to={`/WebsiteManager?tenant=${r.id}&tab=review`} className="flex items-center justify-between gap-2 text-xs text-slate-600 hover:text-slate-900 group">
                    <span className="truncate"><span className="font-medium">{r.name}</span><span className="text-slate-400"> · {r.company}</span>
                      {r.days_idle != null && r.days_idle >= 7 ? <span className="text-amber-700"> · idle {r.days_idle}d</span> : null}
                    </span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </Link>
                </li>
              ))}
              {(data.buckets[key].length > 4) && <li className="text-xs text-slate-400">+{data.buckets[key].length - 4} more</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}