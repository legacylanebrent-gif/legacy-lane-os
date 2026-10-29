import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { listingImport } from './listingApi';

const STATUS_STYLE = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  processing: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  queued: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function ImportHistory({ refreshKey }) {
  const [imports, setImports] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listingImport.history()
      .then((res) => setImports(res.imports || []))
      .catch(() => setImports([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Past imports</h3>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-slate-600">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>
      {!loading && (imports || []).length === 0 && (
        <p className="text-sm text-slate-500">No imports yet. Your first upload creates the history here.</p>
      )}
      <div className="space-y-2">
        {(imports || []).map((imp) => (
          <div key={imp.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{imp.file_name}</p>
                <p className="text-xs text-slate-500">
                  {[imp.source_label, imp.source_date].filter(Boolean).join(' · ') || 'No source noted'}
                  {' · '}
                  {String(imp.imported_at || '').slice(0, 10)}
                </p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[imp.status] || STATUS_STYLE.queued}`}>
                {imp.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {imp.total_rows} rows · {imp.imported_count || 0} added · {imp.updated_count || 0} updated ·{' '}
              {imp.failed_count || 0} not imported
            </p>
            {imp.failed_count > 0 && imp.error_summary && (
              <p className="mt-1 text-xs text-rose-600">{imp.error_summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}