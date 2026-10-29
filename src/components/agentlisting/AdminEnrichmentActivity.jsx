import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApi } from './listingApi';

export default function AdminEnrichmentActivity() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.enrichmentOverview()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-xs text-rose-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading enrichment activity…
      </div>
    );
  }

  const s = data.summary || {};

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Enrichment and export activity</h3>
      <p className="mt-1 text-xs text-slate-600">
        Counts and outcomes only — exported phone numbers and emails are never shown here.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['jobs_running', 'Jobs running'],
          ['jobs_failed', 'Jobs with failures'],
          ['records_with_contacts', 'Records with contacts'],
          ['records_needing_review', 'Need review'],
          ['records_failed', 'Failed records'],
          ['exports_total', 'Exports'],
          ['people_exported', 'People exported'],
        ].map(([key, label]) => (
          <div key={key} className="rounded-lg border border-slate-100 p-2">
            <p className="text-lg font-semibold text-slate-900">{s[key] ?? 0}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-800">Recent jobs</p>
          {(data.jobs || []).length === 0 && <p className="mt-1 text-xs text-slate-500">No enrichment jobs yet.</p>}
          <ul className="mt-1 space-y-1">
            {(data.jobs || []).slice(0, 6).map((job) => (
              <li key={job.id} className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">{job.agent_name || job.agent_user_id}</span>
                {' · '}
                {job.processed_count}/{job.total_targets} · {job.status}
                {job.failed_count > 0 ? ` · ${job.failed_count} failed` : ''}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-800">Recent exports</p>
          {(data.exports || []).length === 0 && <p className="mt-1 text-xs text-slate-500">No exports yet.</p>}
          <ul className="mt-1 space-y-1">
            {(data.exports || []).slice(0, 6).map((e) => (
              <li key={e.id} className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">{e.agent_name || 'Agent'}</span>
                {' · '}
                {String(e.requested_at || '').slice(0, 10)} · {e.eligible_count} exported
                {e.summary_note ? ` · ${e.summary_note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Source use for advertising:{' '}
        <span className="font-medium text-slate-800">
          {data.source_use_policy?.customer_list_export_enabled
            ? `permitted (policy ${data.source_use_policy.policy_version || 'v1'})`
            : 'restricted — no customer-list exports qualify'}
        </span>
      </p>
    </section>
  );
}