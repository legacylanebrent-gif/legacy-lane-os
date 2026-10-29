import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { facebookExport } from './listingApi';
import { downloadCsv } from './downloadCsv';

export default function FacebookExportDialog({ open, onClose, filter, q, selectedIds, matchingCount }) {
  const [scope, setScope] = useState('selected');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setScope(selectedIds.size > 0 ? 'selected' : 'filtered');
    setPreview(null);
    setResult(null);
    setError('');
  }, [open, selectedIds.size]);

  const payload = () => (scope === 'selected'
    ? { scope, opportunity_ids: [...selectedIds] }
    : { scope, filter, q });

  const runPreview = async () => {
    setBusy('preview');
    setError('');
    setResult(null);
    try {
      const res = await facebookExport.preview(payload());
      setPreview(res);
    } catch (e) {
      setError(e.message);
      setPreview(null);
    } finally {
      setBusy('');
    }
  };

  const download = async () => {
    setBusy('download');
    setError('');
    try {
      const res = await facebookExport.generate(payload());
      downloadCsv(res.file_name, res.csv);
      setResult({ rows: res.row_count, expires: res.expires_at, fileName: res.file_name });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export for a Facebook customer list</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setScope('selected')}
            disabled={selectedIds.size === 0}
            className={`w-full rounded-lg border p-3 text-left disabled:opacity-50 ${
              scope === 'selected' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'
            }`}
          >
            <span className="block text-sm font-medium text-slate-900">Selected properties</span>
            <span className="block text-xs text-slate-500">{selectedIds.size} selected</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('filtered')}
            className={`w-full rounded-lg border p-3 text-left ${
              scope === 'filtered' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'
            }`}
          >
            <span className="block text-sm font-medium text-slate-900">Everything in this view</span>
            <span className="block text-xs text-slate-500">{matchingCount || 0} matching the current filters</span>
          </button>
        </div>

        {!preview && (
          <Button onClick={runPreview} disabled={!!busy} className="w-full">
            {busy === 'preview' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Check who qualifies
          </Button>
        )}

        {error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}

        {preview && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm text-slate-800">
                <span className="font-semibold">{preview.summary.eligible}</span> of{' '}
                {preview.summary.people_evaluated} people qualify from {preview.opportunity_count} propert
                {preview.opportunity_count === 1 ? 'y' : 'ies'}.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Columns: email, phone, first name, last name, city, state, zip, country. Policy version{' '}
                {preview.policy_version}.
              </p>
            </div>

            {(preview.exclusions || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-700">Not included</p>
                <ul className="mt-1 space-y-1">
                  {preview.exclusions.map((group) => (
                    <li key={group.status} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{group.count}</span> · {group.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={download} disabled={!!busy || preview.summary.eligible === 0} className="gap-2">
                {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download CSV
              </Button>
              <Button variant="outline" onClick={runPreview} disabled={!!busy}>Recalculate</Button>
            </div>

            {result && (
              <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
                Downloaded {result.rows} row{result.rows === 1 ? '' : 's'} as {result.fileName}. Upload it in Meta Ads
                Manager under Audiences → Create audience → Customer list. This file is a snapshot; download a fresh
                one rather than re-uploading an old copy.
              </p>
            )}

            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              Only owners with documented advertising permission and permitted source use are included. Contact details
              stay unverified, and matching a property never grants marketing permission.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}