import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Common PropStream CSV column name mappings
const FIELD_MAP = {
  property_address: ['address', 'property address', 'street address', 'situs address', 'prop address'],
  city: ['city', 'prop city', 'property city', 'situs city'],
  state: ['state', 'prop state', 'property state', 'situs state'],
  zip: ['zip', 'zip code', 'postal code', 'situs zip', 'prop zip'],
  county: ['county', 'prop county'],
  mls_number: ['mls number', 'mls#', 'mls id', 'listing id'],
  propstream_property_id: ['propstream id', 'property id', 'prop id', 'ps id'],
  listing_status: ['status', 'listing status', 'mls status'],
  list_date: ['list date', 'listing date', 'status date'],
  days_on_market: ['days on market', 'dom', 'days listed'],
  list_price: ['list price', 'listing price', 'price'],
  estimated_value: ['estimated value', 'avm', 'estimated avm', 'estimated market value'],
  beds: ['beds', 'bedrooms', 'bed'],
  baths: ['baths', 'bathrooms', 'bath'],
  square_feet: ['sqft', 'square feet', 'living sqft', 'gross living area'],
  lot_size: ['lot size', 'lot sqft', 'lot area'],
  year_built: ['year built', 'yr built'],
  property_type: ['property type', 'prop type'],
  listing_remarks: ['remarks', 'listing remarks', 'public remarks', 'description'],
  owner_name: ['owner name', 'owner', 'owner 1 full name'],
  owner_mailing_address: ['mailing address', 'owner mailing address', 'mail address'],
  owner_mailing_city: ['mailing city', 'mail city'],
  owner_mailing_state: ['mailing state', 'mail state'],
  owner_mailing_zip: ['mailing zip', 'mail zip', 'mailing postal'],
  ownership_length_years: ['ownership length', 'years owned', 'length of ownership', 'years of ownership'],
  absentee_owner: ['absentee', 'absentee owner'],
  vacant: ['vacant', 'vacancy'],
  senior_owner_indicator: ['senior', 'senior owner', 'senior indicator'],
  probate_indicator: ['probate', 'in probate'],
  inherited_indicator: ['inherited', 'inheritance'],
  divorce_indicator: ['divorce', 'divorcing'],
  preforeclosure_indicator: ['preforeclosure', 'pre-foreclosure', 'lis pendens'],
  foreclosure_indicator: ['foreclosure', 'in foreclosure', 'reo'],
  lien_indicator: ['lien', 'has lien'],
  tax_delinquent_indicator: ['tax delinquent', 'delinquent taxes', 'tax lien'],
  equity_estimate: ['equity', 'estimated equity', 'equity estimate'],
  mortgage_balance: ['mortgage balance', 'loan balance', 'open loan balance'],
  listing_agent_name: ['listing agent', 'agent name', 'list agent name', 'agent'],
  listing_agent_email: ['agent email', 'listing agent email', 'list agent email'],
  listing_agent_phone: ['agent phone', 'listing agent phone', 'list agent phone'],
  listing_brokerage: ['brokerage', 'listing brokerage', 'broker name', 'list office name'],
  listing_url: ['listing url', 'mls url', 'url'],
};

function autoMap(headers) {
  const mapping = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const [field, aliases] of Object.entries(FIELD_MAP)) {
    const idx = lowerHeaders.findIndex(h => aliases.includes(h));
    if (idx !== -1) mapping[field] = headers[idx];
  }
  return mapping;
}

function parseBoolean(val) {
  if (val === undefined || val === null || val === '') return false;
  const v = String(val).toLowerCase().trim();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1' || v === 'x';
}

function mapRow(row, mapping) {
  const mapped = {};
  for (const [field, csvCol] of Object.entries(mapping)) {
    if (csvCol && row[csvCol] !== undefined) {
      const val = row[csvCol];
      if (['absentee_owner', 'vacant', 'senior_owner_indicator', 'probate_indicator',
           'inherited_indicator', 'divorce_indicator', 'preforeclosure_indicator',
           'foreclosure_indicator', 'lien_indicator', 'tax_delinquent_indicator'].includes(field)) {
        mapped[field] = parseBoolean(val);
      } else if (['list_price', 'estimated_value', 'equity_estimate', 'mortgage_balance',
                   'ownership_length_years', 'beds', 'baths', 'square_feet', 'days_on_market'].includes(field)) {
        const n = parseFloat(String(val).replace(/[,$]/g, ''));
        mapped[field] = isNaN(n) ? undefined : n;
      } else if (field === 'year_built') {
        const n = parseInt(String(val));
        mapped[field] = isNaN(n) ? undefined : n;
      } else {
        mapped[field] = val ? String(val).trim() : '';
      }
    }
  }
  return mapped;
}

export default function PropstreamImportModal({ open, onClose, onImportComplete }) {
  const [step, setStep] = useState('upload'); // upload | mapping | importing | done
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [filename, setFilename] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setCsvData(data);
        setHeaders(meta.fields || []);
        setMapping(autoMap(meta.fields || []));
        setStep('mapping');
      }
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('importing');
    const listings = csvData.map(row => mapRow(row, mapping));
    const res = await base44.functions.invoke('importPropstreamCSV', { listings, filename });
    setResult(res.data);
    setStep('done');
    setImporting(false);
    if (res.data?.success) onImportComplete && onImportComplete(res.data);
  };

  const reset = () => { setStep('upload'); setCsvData(null); setHeaders([]); setMapping({}); setResult(null); setFilename(''); };

  const REQUIRED = ['property_address', 'city', 'state', 'zip'];
  const missingRequired = REQUIRED.filter(f => !mapping[f]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import PropStream CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl">
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-2">Drop your PropStream CSV here or click to browse</p>
            <p className="text-xs text-slate-400 mb-4">Supports all standard PropStream export formats</p>
            <Button onClick={() => fileRef.current.click()}>Choose CSV File</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">{csvData?.length} rows detected · {Object.keys(mapping).length} fields auto-mapped</p>
              {missingRequired.length > 0 && (
                <Badge className="bg-red-100 text-red-700">Missing required: {missingRequired.join(', ')}</Badge>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-3">
              {Object.entries(FIELD_MAP).slice(0, 20).map(([field, _aliases]) => (
                <div key={field} className="flex items-center gap-3 text-sm">
                  <span className="w-44 text-slate-700 font-medium shrink-0">{field.replace(/_/g, ' ')}</span>
                  <select
                    value={mapping[field] || ''}
                    onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                    className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value="">— not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {mapping[field] ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <div className="w-4 h-4 shrink-0" />}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={missingRequired.length > 0} className="bg-purple-600 hover:bg-purple-700">
                Import {csvData?.length} Rows
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-16 text-center">
            <Loader className="w-10 h-10 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="text-slate-600">Importing, deduplicating, and scoring listings…</p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-3 text-xl font-semibold text-green-600">
              <CheckCircle className="w-8 h-8" /> Import Complete
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Total Rows', result.total, 'text-slate-700'],
                ['Imported', result.imported, 'text-green-600'],
                ['Duplicates Skipped', result.duplicates, 'text-yellow-600'],
                ['Errors', result.errors, 'text-red-600'],
              ].map(([label, val, cls]) => (
                <div key={label} className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-3xl font-bold ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-3 justify-end">
              <Button variant="outline" onClick={reset}>Import Another</Button>
              <Button onClick={() => { reset(); onClose(); }} className="bg-purple-600 hover:bg-purple-700">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}