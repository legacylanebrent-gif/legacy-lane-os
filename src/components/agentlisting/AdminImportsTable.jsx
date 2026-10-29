import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { adminApi } from './listingApi';

const STATUS_STYLE = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  processing: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  queued: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminImportsTable({ imports, onChanged }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const retry = async (id) => {
    setBusy(id);
    setError('');
    try {
      await adminApi.retryImport(id);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Imports</h3>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">File</th>
              <th className="py-2 pr-3 font-medium">Agent</th>
              <th className="py-2 pr-3 font-medium">Imported</th>
              <th className="py-2 pr-3 font-medium">Rows</th>
              <th className="py-2 pr-3 font-medium">Added / Updated / Failed</th>
              <th className="py-2 pr-3 font-medium">Matches</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <tr key={imp.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3">
                  <p className="font-medium text-slate-800">{imp.file_name}</p>
                  <p className="text-slate-500">{[imp.source_label, imp.source_date].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="py-2 pr-3 text-slate-700">{imp.agent_name || imp.agent_email}</td>
                <td className="py-2 pr-3 text-slate-600">{String(imp.imported_at || '').slice(0, 10)}</td>
                <td className="py-2 pr-3 text-slate-600">{imp.total_rows}</td>
                <td className="py-2 pr-3 text-slate-600">
                  {imp.imported_count || 0} / {imp.updated_count || 0} / {imp.failed_count || 0}
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {imp.matched_verified_count || 0} verified · {imp.matched_possible_count || 0} review ·{' '}
                  {imp.unmatched_count || 0} none
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_STYLE[imp.status] || STATUS_STYLE.queued}`}>
                      {imp.status}
                    </span>
                    {(imp.status === 'failed' || imp.status === 'partial') && (
                      <Button size="sm" variant="ghost" onClick={() => retry(imp.id)} disabled={!!busy} className="gap-1 text-xs">
                        {busy === imp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Retry rows
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {imports.length === 0 && <p className="mt-2 text-sm text-slate-500">No imports recorded yet.</p>}
      </div>
    </section>
  );
}