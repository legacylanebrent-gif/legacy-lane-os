import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload } from 'lucide-react';
import { IMPORT_FIELDS, guessMapping, headerSignature, listingImport } from './listingApi';

export default function ImportPanel({ onImported }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceDate, setSourceDate] = useState('');
  const [savedName, setSavedName] = useState('');
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickFile = (file) => {
    if (!file) return;
    setError('');
    setProgress(null);
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data || []).filter((row) => Object.values(row).some((v) => String(v ?? '').trim()));
        const fields = result.meta?.fields || Object.keys(parsed[0] || {});
        setRows(parsed);
        setHeaders(fields);
        const guessed = guessMapping(fields);
        setMapping(guessed);
        setSavedName('');
        listingImport.mappingFor(headerSignature(fields))
          .then((saved) => {
            if (saved?.mapping) {
              setMapping({ ...guessed, ...saved.mapping });
              setSavedName(saved.name || '');
            }
          })
          .catch(() => {});
      },
      error: () => setError('That file could not be read. A plain CSV export works best.'),
    });
  };

  const ready = mapping.street && mapping.city && mapping.state && rows.length > 0;

  const runImport = async () => {
    setBusy(true);
    setError('');
    try {
      const started = await listingImport.start({
        file_name: fileName || 'pending-listings.csv',
        source_label: sourceLabel,
        source_date: sourceDate,
        save_mapping: true,
        headers,
        mapping,
        rows,
      });
      setProgress({ total_rows: started.total_rows, pending: started.total_rows });
      let guard = 0;
      while (guard < 40) {
        const step = await listingImport.process(started.import_id);
        setProgress(step);
        if (!step.has_more) break;
        guard += 1;
      }
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const processed = progress ? (progress.total_rows || 0) - (progress.counts?.pending || 0) : 0;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Import your pending listings</h3>
        <p className="mt-1 text-sm text-slate-600">
          Upload the CSV export of your own pending listings. Each address is cross-referenced against the stored
          ownership reference database, and only the properties you imported land in your workspace.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="pl-file" className="text-xs text-slate-600">CSV file</Label>
          <Input
            id="pl-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="mt-1 cursor-pointer text-sm"
          />
        </div>
        <div>
          <Label htmlFor="pl-source" className="text-xs text-slate-600">Where this export came from</Label>
          <Input
            id="pl-source"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="MLS export, brokerage export…"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="pl-date" className="text-xs text-slate-600">Export date</Label>
          <Input id="pl-date" type="date" value={sourceDate} onChange={(e) => setSourceDate(e.target.value)} className="mt-1" />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">
              {rows.length} row{rows.length === 1 ? '' : 's'} found · map the address columns
            </p>
            {savedName && <span className="text-xs text-cyan-700">Using your saved mapping “{savedName}”</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key}>
                <Label className="text-xs text-slate-600">
                  {field.label}
                  {field.required && <span className="text-rose-500"> *</span>}
                </Label>
                <select
                  value={mapping[field.key] || ''}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value || undefined })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
                >
                  <option value="">Not in this file</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {progress && (
        <div className="space-y-2 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-cyan-900">
            <span>
              {busy ? 'Matching addresses…' : 'Import finished'} {processed}/{progress.total_rows || 0}
            </span>
            <span>
              {progress.counts?.imported || 0} added · {progress.counts?.updated || 0} updated · {progress.counts?.failed || 0} not imported
            </span>
          </div>
          <Progress value={progress.total_rows ? (processed / progress.total_rows) * 100 : 0} />
          {progress.matches && (
            <p className="text-xs text-cyan-900">
              Ownership: {progress.matches.verified} verified · {progress.matches.possible} need review · {progress.matches.unmatched} no match
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={runImport} disabled={!ready || busy} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Importing…' : 'Start import'}
        </Button>
        {!ready && rows.length > 0 && <span className="text-xs text-slate-500">Map street, city and state to continue.</span>}
      </div>
    </div>
  );
}