import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { adminApi } from '@/components/agentlisting/listingApi';
import AdminReviewQueue from '@/components/agentlisting/AdminReviewQueue';
import AdminImportsTable from '@/components/agentlisting/AdminImportsTable';
import AdminConfigPanel from '@/components/agentlisting/AdminConfigPanel';
import AdminTrendsCard from '@/components/agentlisting/AdminTrendsCard';

const SUMMARY = [
  ['total_imports', 'Imports'],
  ['processing', 'Processing'],
  ['partial', 'Partial'],
  ['opportunities', 'Opportunities'],
  ['verified', 'Verified'],
  ['needs_review', 'Needs review'],
  ['unmatched', 'Unmatched'],
  ['conflicts', 'Conflicts'],
];

export default function AdminAgentListingImports() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminApi.overview({}));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    base44.auth.me()
      .then((me) => {
        const admin = me?.role === 'admin';
        setIsAdmin(admin);
        if (admin) load();
        else setLoading(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  }, [load]);

  const recheck = async () => {
    setBusy('recheck');
    setNote('');
    try {
      const res = await adminApi.recheckUnmatched('');
      setNote(`Rechecked ${res.processed?.length || 0} unmatched addresses against the current reference data.`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-serif font-semibold text-slate-900">Agent listing imports</h1>
        <p className="mt-2 text-sm text-slate-600">This workspace is limited to platform administrators.</p>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-slate-900">Agent listing imports</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Monitor every agent import, resolve ownership matches, retry failed rows, and tune the deterministic matching
            policy.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={recheck} disabled={!!busy} className="gap-1.5 bg-cyan-600 hover:bg-cyan-700">
            {busy === 'recheck' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Recheck unmatched
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {note && <p className="text-sm text-emerald-700">{note}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SUMMARY.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xl font-semibold text-slate-900">{summary[key] ?? 0}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {data && (
        <>
          <AdminReviewQueue queue={data.review_queue || []} onResolved={load} />
          <AdminImportsTable imports={data.imports || []} onChanged={load} />
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminConfigPanel config={data.config || {}} defaultFields={data.config?.allowed_enrichment_fields || []} onSaved={load} />
            <AdminTrendsCard />
          </div>
        </>
      )}
      {!data && loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading imports…
        </div>
      )}
    </div>
  );
}