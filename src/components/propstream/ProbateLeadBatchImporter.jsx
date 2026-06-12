import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, CheckCircle, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

const BATCH_SIZE = 100;

// Map CSV columns → Lead entity fields
const FIELD_MAP = {
  // Contact — Name
  contact_name: ['owner 1 full name', 'contact name', 'owner name', 'name'],
  contact_name_first: ['owner 1 first name'],
  contact_name_last: ['owner 1 last name'],
  contact_name_2_first: ['owner 2 first name'],
  contact_name_2_last: ['owner 2 last name'],
  // Contact — Email
  contact_email: ['email 1', 'email', 'owner email'],
  contact_email_2: ['email 2'],
  contact_email_3: ['email 3'],
  contact_email_4: ['email 4'],
  // Contact — Phone (5 numbers with type/DNC)
  contact_phone: ['phone 1', 'phone'],
  contact_phone_1_type: ['phone 1 type'],
  contact_phone_1_dnc: ['phone 1 dnc'],
  contact_phone_2: ['phone 2'],
  contact_phone_2_type: ['phone 2 type'],
  contact_phone_2_dnc: ['phone 2 dnc'],
  contact_phone_3: ['phone 3'],
  contact_phone_3_type: ['phone 3 type'],
  contact_phone_3_dnc: ['phone 3 dnc'],
  contact_phone_4: ['phone 4'],
  contact_phone_4_type: ['phone 4 type'],
  contact_phone_4_dnc: ['phone 4 dnc'],
  contact_phone_5: ['phone 5'],
  contact_phone_5_type: ['phone 5 type'],
  contact_phone_5_dnc: ['phone 5 dnc'],
  // Mailing
  mailing_care_of: ['mailing care of name', 'care of'],
  mailing_address: ['mailing address', 'owner mailing address'],
  mailing_unit: ['mailing unit #', 'mailing unit'],
  mailing_city: ['mailing city'],
  mailing_state: ['mailing state'],
  mailing_zip: ['mailing zip'],
  mailing_county: ['mailing county'],
  do_not_mail: ['do not mail'],
  // Property Address
  property_address: ['address', 'property address', 'street address', 'situs address'],
  property_unit: ['unit #', 'unit number', 'unit'],
  property_city: ['city', 'prop city'],
  property_state: ['state', 'prop state'],
  property_zip: ['zip', 'zip code'],
  property_county: ['county'],
  property_apn: ['apn', 'assessor parcel number'],
  property_latitude: ['latitude'],
  property_longitude: ['longitude'],
  // Property Details
  propstream_beds: ['bedrooms', 'beds'],
  propstream_baths: ['total bathrooms', 'bathrooms', 'baths'],
  propstream_sqft: ['building sqft', 'sqft', 'square feet'],
  propstream_lot_size: ['lot size', 'lot size sqft'],
  propstream_year_built: ['year built'],
  propstream_property_type: ['property type'],
  propstream_zoning: ['zoning'],
  home_size: ['home size'],
  property_status: ['property status'],
  gated_community: ['gated community'],
  sales_allowed: ['sales allowed'],
  // PropStream IDs & Values
  propstream_id: ['propstream property id', 'propstream id', 'property id', 'prop id'],
  propstream_owner_type: ['owner type', 'propstream owner type'],
  propstream_equity: ['est. equity', 'estimated equity', 'equity'],
  propstream_market_value: ['est. value', 'estimated value', 'estimated market value', 'market value', 'avm'],
  propstream_loan_amount: ['est. remaining balance of open loans', 'mortgage balance'],
  total_assessed_value: ['total assessed value', 'assessed value'],
  estimated_value: ['est. value', 'estimated value', 'avm'],
  // Sale History
  propstream_last_sale_date: ['last sale date'],
  propstream_last_sale_price: ['last sale amount', 'last sale price'],
  total_open_loans: ['total open loans'],
  est_remaining_balance_loans: ['est. remaining balance of open loans', 'mortgage balance'],
  est_loan_to_value: ['est. loan-to-value', 'estimated ltv', 'est. ltv'],
  // Liens / Bankruptcy / Divorce
  lien_amount: ['lien amount'],
  lien_date: ['lien date'],
  lien_type: ['lien type'],
  bk_date: ['bk date', 'bankruptcy date'],
  divorce_date: ['divorce date'],
  // Owner Indicators
  owner_occupied: ['owner occupied'],
  deceased_owner: ['deceased owner', 'deceased'],
  litigator: ['litigator'],
  absentee_owner: ['absentee owner', 'absentee'],
  vacant: ['vacant'],
  senior_owner_indicator: ['senior owner', 'senior'],
  probate_indicator: ['probate', 'in probate', 'probate indicator'],
  inherited_indicator: ['inherited', 'inherited indicator'],
  preforeclosure_indicator: ['preforeclosure', 'pre-foreclosure', 'preforeclosure indicator'],
  foreclosure_indicator: ['foreclosure', 'in foreclosure', 'foreclosure indicator'],
  foreclosure_factor: ['foreclosure factor'],
  // Condition
  total_condition: ['total condition', 'condition'],
  interior_condition: ['interior condition'],
  exterior_condition: ['exterior condition'],
  bathroom_condition: ['bathroom condition'],
  kitchen_condition: ['kitchen condition'],
  // MLS
  mls_status: ['mls status', 'listing status'],
  mls_date: ['mls date', 'list date', 'mls list date'],
  mls_amount: ['mls amount', 'list price', 'price'],
  mls_agent_name: ['mls agent name', 'listing agent', 'listing agent name'],
  mls_agent_email: ['mls agent e-mail', 'listing agent email', 'listing agent e-mail'],
  mls_agent_phone: ['mls agent phone', 'listing agent phone'],
  mls_brokerage: ['mls brokerage name', 'brokerage'],
  // Marketing Counts
  marketing_lists: ['marketing lists'],
  marketing_campaigns: ['marketing campaigns'],
  skip_traces: ['skip traces'],
  voicemail_drops: ['voicemail drops'],
  dialer: ['dialer'],
  postcards: ['postcards'],
  emails: ['emails'],
  // Intent / Situation / Timeline
  intent: ['intent', 'lead intent'],
  situation: ['situation', 'life event', 'lead type'],
  timeline: ['timeline', 'urgency', 'timeframe'],
  // Meta
  notes: ['notes', 'remarks', 'listing remarks'],
  date_added_to_list: ['date added to list'],
  method_of_add: ['method of add'],
};

const BOOLEAN_FIELDS = new Set([
  'owner_occupied', 'deceased_owner', 'litigator', 'do_not_mail',
  'probate_indicator', 'inherited_indicator', 'preforeclosure_indicator',
  'foreclosure_indicator', 'vacant', 'absentee_owner', 'senior_owner_indicator',
  'gated_community', 'contact_phone_1_dnc', 'contact_phone_2_dnc',
  'contact_phone_3_dnc', 'contact_phone_4_dnc', 'contact_phone_5_dnc',
]);

const NUMBER_FIELDS = new Set([
  'estimated_value', 'propstream_equity', 'propstream_market_value',
  'propstream_beds', 'propstream_baths', 'propstream_sqft', 'propstream_year_built',
  'propstream_last_sale_price', 'total_open_loans', 'est_remaining_balance_loans',
  'est_loan_to_value', 'lien_amount', 'mls_amount', 'propstream_loan_amount',
  'total_assessed_value', 'property_latitude', 'property_longitude',
  'marketing_lists', 'marketing_campaigns', 'skip_traces',
  'voicemail_drops', 'dialer', 'postcards', 'emails',
]);

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
  const mapped = { source: 'propstream', intent: 'estate_sale' };
  for (const [field, csvCol] of Object.entries(mapping)) {
    if (!csvCol || row[csvCol] === undefined) continue;
    const val = row[csvCol];
    if (BOOLEAN_FIELDS.has(field)) {
      mapped[field] = parseBoolean(val);
    } else if (NUMBER_FIELDS.has(field)) {
      const n = parseFloat(String(val).replace(/[,$\s]/g, ''));
      if (!isNaN(n)) mapped[field] = n;
    } else {
      if (val !== '' && val !== undefined) mapped[field] = String(val).trim();
    }
  }
  // Combine first+last into contact_name if not set
  if (!mapped.contact_name && (mapped.contact_name_first || mapped.contact_name_last)) {
    mapped.contact_name = [mapped.contact_name_first, mapped.contact_name_last].filter(Boolean).join(' ');
  }
  // Derive owner type from indicators if not in CSV
  if (!mapped.propstream_owner_type) {
    const types = [];
    if (mapped.probate_indicator) types.push('Probate');
    if (mapped.inherited_indicator) types.push('Inherited');
    if (mapped.preforeclosure_indicator) types.push('Pre-Foreclosure');
    if (mapped.foreclosure_indicator) types.push('Foreclosure');
    if (mapped.absentee_owner) types.push('Absentee Owner');
    if (mapped.senior_owner_indicator) types.push('Senior Owner');
    if (mapped.propstream_equity > 0 && !mapped.total_open_loans) types.push('Free & Clear');
    else if (mapped.propstream_equity > 100000) types.push('High Equity');
    if (types.length > 0) mapped.propstream_owner_type = types[0];
  }
  return mapped;
}

export default function ProbateLeadBatchImporter({ open, onClose, onImportComplete }) {
  const fileRef = useRef();
  const [step, setStep] = useState('upload');
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [filename, setFilename] = useState('');
  const [importing, setImporting] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchResults, setBatchResults] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
        const batches = Math.ceil(data.length / BATCH_SIZE);
        setTotalBatches(batches);
        setStep('confirm');
      }
    });
  };

  const startImport = async () => {
    setStep('importing');
    setCurrentBatch(0);
    setBatchResults([]);
    setError(null);
    processBatch(0);
  };

  const processBatch = async (batchIdx) => {
    setImporting(true);
    const start = batchIdx * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, csvData.length);
    const batchData = csvData.slice(start, end).map(row => mapRow(row, mapping));

    try {
      let imported = 0;
      let errors = 0;

      // Process records in smaller chunks of 25 within each batch
      for (let i = 0; i < batchData.length; i += 25) {
        const chunk = batchData.slice(i, i + 25);
        try {
          const created = await base44.entities.Lead.bulkCreate(chunk);
          imported += created?.length || chunk.length;
        } catch (e) {
          // Try individually if bulk fails
          for (const record of chunk) {
            try {
              await base44.entities.Lead.create(record);
              imported++;
            } catch {
              errors++;
            }
          }
        }
      }

      const batchResult = { batchIndex: batchIdx, imported, errors, total: end - start };
      const newResults = [...batchResults, batchResult];
      setBatchResults(newResults);
      setCurrentBatch(batchIdx + 1);

      if (end >= csvData.length) {
        // Done
        const totalImported = newResults.reduce((s, r) => s + r.imported, 0);
        const totalErrors = newResults.reduce((s, r) => s + r.errors, 0);
        setResult({ total: csvData.length, imported: totalImported, errors: totalErrors });
        setStep('done');
      }
      setImporting(false);
    } catch (e) {
      setError(e.message);
      setImporting(false);
    }
  };

  const handleNextBatch = () => {
    processBatch(currentBatch);
  };

  const handleImportAllRemaining = async () => {
    setImporting(true);
    for (let i = currentBatch; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, csvData.length);
      const batchData = csvData.slice(start, end).map(row => mapRow(row, mapping));

      let imported = 0;
      let errors = 0;
      for (let j = 0; j < batchData.length; j += 25) {
        const chunk = batchData.slice(j, j + 25);
        try {
          const created = await base44.entities.Lead.bulkCreate(chunk);
          imported += created?.length || chunk.length;
        } catch {
          for (const record of chunk) {
            try { await base44.entities.Lead.create(record); imported++; } catch { errors++; }
          }
        }
      }
      setBatchResults(prev => [...prev, { batchIndex: i, imported, errors, total: end - start }]);
    }
    const allResults = batchResults.length > 0 ? batchResults : [];
    const totalImported = allResults.reduce((s, r) => s + r.imported, 0);
    const totalErrors = allResults.reduce((s, r) => s + r.errors, 0);
    setResult({ total: csvData.length, imported: totalImported, errors: totalErrors });
    setStep('done');
    setImporting(false);
  };

  const reset = () => {
    setStep('upload');
    setCsvData(null);
    setHeaders([]);
    setMapping({});
    setFilename('');
    setCurrentBatch(0);
    setBatchResults([]);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Import Probate Leads</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => fileRef.current.click()}>
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="font-semibold text-slate-700 mb-1">Drop your CSV here or click to browse</p>
              <p className="text-xs text-slate-400">Supports PropStream probate export format. Processed in batches of {BATCH_SIZE}.</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">{csvData?.length} rows ready to import</p>
                <p className="text-sm text-slate-500">{mappedCount} fields auto-mapped from <span className="font-medium">{filename}</span></p>
                <p className="text-xs text-slate-400 mt-1">{totalBatches} batches of {BATCH_SIZE} records</p>
              </div>
            </div>

            {/* Field mapping preview */}
            <div className="max-h-60 overflow-y-auto border rounded-lg p-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Field Mapping</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(mapping).filter(([_, v]) => v).map(([field, csvCol]) => (
                  <div key={field} className="flex items-center gap-2 text-xs py-1">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                    <span className="text-slate-500 truncate">{csvCol}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-slate-700 truncate">{field}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={startImport} className="w-full bg-purple-600 hover:bg-purple-700">
              Start Batch Import — {totalBatches} batches
            </Button>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="w-5 h-5" /> Import Error
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Card>
              <CardContent className="py-12 text-center">
                {importing ? (
                  <>
                    <Loader className="w-12 h-12 animate-spin mx-auto text-purple-600 mb-4" />
                    <p className="font-semibold text-slate-700 text-lg">Importing batch {currentBatch + 1} of {totalBatches}...</p>
                    <p className="text-slate-400 text-sm mt-1">Records {currentBatch * BATCH_SIZE + 1} to {Math.min((currentBatch + 1) * BATCH_SIZE, csvData?.length)}</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="font-semibold text-slate-700 text-lg mb-2">Batch {currentBatch} Complete!</p>
                    {batchResults.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Imported</p>
                          <p className="text-2xl font-bold text-green-600">{batchResults[batchResults.length - 1].imported}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Errors</p>
                          <p className="text-2xl font-bold text-red-600">{batchResults[batchResults.length - 1].errors}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-2xl font-bold text-slate-600">{batchResults[batchResults.length - 1].total}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 mb-4">{currentBatch + 1} of {totalBatches} batches ready</p>
                    <div className="flex gap-3 max-w-md mx-auto">
                      <Button onClick={handleNextBatch} className="flex-1 bg-purple-600 hover:bg-purple-700">
                        Import Next Batch →
                      </Button>
                      <Button onClick={handleImportAllRemaining} variant="outline" className="flex-1">
                        Import All Remaining
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {batchResults.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Batch History</h3>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {batchResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                        <span>Batch {r.batchIndex + 1}</span>
                        <div className="flex gap-3">
                          <span className="text-green-600 font-medium">{r.imported} imported</span>
                          <span className="text-red-600">{r.errors} errors</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <Card className={result.errors === 0 ? 'border-green-200' : 'border-yellow-200'}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <p className="text-xl font-bold text-slate-800">Import Complete</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">Total Rows</p>
                    <p className="text-2xl font-black text-slate-700">{result.total}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">Imported</p>
                    <p className="text-2xl font-black text-green-600">{result.imported}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">Errors</p>
                    <p className="text-2xl font-black text-red-600">{result.errors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => { reset(); onClose(); if (onImportComplete) onImportComplete(); }} className="w-full bg-purple-600 hover:bg-purple-700">
              Done — View Leads
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}