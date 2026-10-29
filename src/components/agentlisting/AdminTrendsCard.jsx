import React, { useEffect, useState } from 'react';
import { adminApi } from './listingApi';

export default function AdminTrendsCard() {
  const [trends, setTrends] = useState(null);

  useEffect(() => {
    adminApi.trends().then(setTrends).catch(() => setTrends(null));
  }, []);

  if (!trends) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Coverage and reference freshness</h3>
      <p className="mt-1 text-xs text-slate-600">
        Ownership can only be matched where the stored reference database has records. Recheck unmatched addresses after a
        new reference import.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">{trends.reference?.total_records ?? 0}</p>
          <p className="text-xs text-slate-500">reference records (up to 1,000 sampled)</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{trends.imports_30d ?? 0}</p>
          <p className="text-xs text-slate-500">imports in the last 30 days</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{trends.rows_imported_30d ?? 0}</p>
          <p className="text-xs text-slate-500">rows imported in the last 30 days</p>
        </div>
      </div>
      {(trends.by_state || []).length > 0 && (
        <div className="mt-3 space-y-1">
          {(trends.by_state || []).slice(0, 8).map((row) => (
            <p key={row.state} className="text-xs text-slate-600">
              <span className="font-medium text-slate-800">{row.state}</span> · {row.total} properties ·{' '}
              {row.verified} verified · {row.possible} review · {row.unmatched} unmatched
            </p>
          ))}
        </div>
      )}
    </section>
  );
}