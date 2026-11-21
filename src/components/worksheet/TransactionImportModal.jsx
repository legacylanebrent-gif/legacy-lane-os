import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseTransactionFile, setRowKind, toTransactionRecord } from '@/lib/transactionImport';
import { Upload, X, FileSpreadsheet, Loader2, AlertCircle, Package, Tag, Check } from 'lucide-react';

const formatMoney = (value) => `$${(value || 0).toFixed(2)}`;

export default function TransactionImportModal({ sale, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const validRows = rows.filter((row) => !row.issue);
  const skippedRows = rows.filter((row) => row.issue);
  const singleCount = validRows.filter((row) => row.kind === 'single').length;
  const bundleCount = validRows.filter((row) => row.kind === 'bundle').length;
  const importTotal = validRows.reduce((sum, row) => sum + (row.total || 0), 0);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError('');
    setRows([]);
    setImportedCount(0);
    setFileName(file.name);
    try {
      const parsed = await parseTransactionFile(file);
      setRows(parsed.rows);
      if (!parsed.rows.some((row) => !row.issue)) {
        setError('No rows could be read from that file. Make sure it has an item name and a price.');
      }
    } catch (parseError) {
      setError(parseError.message || 'That file could not be read.');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const changeKind = (id, kind) => {
    setRows((current) => current.map((row) => (row.id === id ? setRowKind(row, kind) : row)));
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    setError('');
    try {
      const records = validRows.map((row) => toTransactionRecord(row, sale));
      for (let i = 0; i < records.length; i += 100) {
        await base44.entities.Transaction.bulkCreate(records.slice(i, i + 100));
      }
      setImportedCount(records.length);
      setRows([]);
      if (onImported) await onImported(records.length);
    } catch (importError) {
      console.error('Transaction import failed:', importError);
      setError('The transactions could not be saved. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-start justify-between gap-3 p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              Import Transactions
            </h2>
            <p className="text-sm text-slate-600 mt-1">Upload an Excel or CSV file. Each row is read as a single item or a bundle.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={importing}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {importedCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{importedCount} transaction{importedCount === 1 ? '' : 's'} imported.</span>
            </div>
          )}

          {!rows.length && !importing && (
            <>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-orange-400 hover:bg-orange-50/40 transition-colors text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFile}
                />
                {parsing ? (
                  <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7 text-slate-500" />
                )}
                <span className="font-semibold text-slate-900 text-sm">
                  {parsing ? 'Reading file...' : 'Choose Excel or CSV file'}
                </span>
                <span className="text-xs text-slate-500">.csv, .xlsx, .xls</span>
              </label>
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-700">Columns we look for (any order):</p>
                <p>Item / Description, Quantity, Price or Total, Payment, Notes, Type, Contents, Date.</p>
                <p>A row is read as a bundle when its Type says bundle / lot / set, when a Contents column lists the items, or when the name reads as several items (e.g. "Kitchen Set", "Lot of tools").</p>
              </div>
            </>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-green-600 hover:bg-green-600">{singleCount} single</Badge>
                <Badge className="bg-purple-600 hover:bg-purple-600">{bundleCount} bundle{bundleCount === 1 ? '' : 's'}</Badge>
                {skippedRows.length > 0 && <Badge variant="outline" className="text-slate-500">{skippedRows.length} skipped</Badge>}
                <span className="ml-auto font-semibold text-slate-900">{formatMoney(importTotal)}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{fileName}</p>

              <div className="space-y-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={`rounded-lg border p-3 ${row.issue ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{row.name || '(no name)'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Row {row.rowNumber}
                          {row.quantity > 1 ? ` · ${row.quantity} × ${formatMoney(row.price)}` : ''}
                          {' · '}{row.payment_method.replace('_', ' ')}
                          {' · '}{row.kindReason}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">{formatMoney(row.total)}</span>
                    </div>

                    {row.issue ? (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {row.issue} — not imported
                      </p>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => changeKind(row.id, 'single')}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${row.kind === 'single' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}
                        >
                          <Tag className="w-3 h-3" /> Single
                        </button>
                        <button
                          type="button"
                          onClick={() => changeKind(row.id, 'bundle')}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${row.kind === 'bundle' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}
                        >
                          <Package className="w-3 h-3" /> Bundle
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={importing} className="sm:flex-1">
            {importedCount > 0 ? 'Close' : 'Cancel'}
          </Button>
          {rows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || !validRows.length}
              className="sm:flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {importing ? 'Importing...' : `Import ${validRows.length} transaction${validRows.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}