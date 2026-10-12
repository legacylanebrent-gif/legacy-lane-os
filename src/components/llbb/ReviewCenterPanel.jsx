// Phase 4D — admin Review Center for one website (Parts 21/22/24/25/28).
// Submission facts, staleness detection, required checks, review notes,
// activity history and the approve / request-changes actions. The live
// preview remains the certified tenant runtime (ManagerPreviewPanel).
import React from 'react';
import { Badge } from '@/components/ui/badge';
import ReviewNotesPanel from '@/components/llbb/ReviewNotesPanel';
import ReviewActions from '@/components/llbb/ReviewActions';
import ActivityHistoryPanel from '@/components/llbb/ActivityHistoryPanel';
import { CheckCircle2, AlertCircle, ClipboardCheck, User, Clock, Layers } from 'lucide-react';
import { WORKFLOW_LABELS, WORKFLOW_BADGE } from '@/components/llbb/managerConfig';

export default function ReviewCenterPanel({ ov, onDone }) {
  const tenant = ov.tenant;
  const review = {
    round: tenant.review_round || 0,
    submitted_at: tenant.review_submitted_at || null,
    approved_at: tenant.approved_at || null
  };
  const stale = !!(ov.readiness && ov.readiness.launch_ready && review.submitted_at
    && (ov.settings_version_current || 0) > (tenant.review_version || 0));
  const workflow = ov.workflow_status;
  const submittedByActivity = null; // name renders from activity history

  return (
    <div className="space-y-5">
      {/* Review state card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-slate-400" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-heading font-bold text-slate-900">Review</div>
            <div className="text-sm text-slate-500">Submit, review, request changes and approve — approval does not publish the website.</div>
          </div>
          <Badge className={WORKFLOW_BADGE[workflow]}>{WORKFLOW_LABELS[workflow]}</Badge>
        </div>
        {review.submitted_at && (
          <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div><span className="text-slate-400 text-xs block">Submitted</span>{new Date(review.submitted_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
            <div><span className="text-slate-400 text-xs block">Review round</span>{review.round}</div>
            <div><span className="text-slate-400 text-xs block">Reviewed version</span>Settings v{tenant.review_version || '—'}</div>
          </div>
        )}
        {stale && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span><strong>Review needs refresh</strong> — the website changed after submission. Ask the client to resubmit; do not approve stale content.</span>
          </div>
        )}
        {review.approved_at && (
          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-md p-3 text-sm text-indigo-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Approved {new Date(review.approved_at).toLocaleString()} at settings v{tenant.approved_version}. Publication (custom domain, go-live) happens in the publication phase — not automatically.</span>
          </div>
        )}
        <div className="mt-4">
          <ReviewActions overview={ov} role="admin" onDone={onDone} />
        </div>
      </div>

      {/* Required checks (Part 24 — the automated readiness gate) */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="font-heading font-bold text-slate-900 mb-3">Required Checks</div>
        {ov.readiness.blockers.length === 0 ? (
          <p className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> All required checks clear — setup {ov.readiness.percent}%.</p>
        ) : (
          <ul className="space-y-1.5">
            {ov.readiness.blockers.map(b => (
              <li key={b.key} className="text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span><span className="font-medium">{b.label}</span> — {b.reason}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-slate-400 mt-3">Checks cover: business data, contact method, homepage hero, at least one enabled service, valid navigation, no placeholder content, runtime resolution and draft privacy. The runtime preview below renders the real tenant website.</div>
      </div>

      {/* Review notes */}
      <ReviewNotesPanel websiteTenantId={tenant.id} authorRole="admin" canAddNote={true} onChanged={onDone} />

      {/* Activity history */}
      <ActivityHistoryPanel websiteTenantId={tenant.id} />
    </div>
  );
}