import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, CheckCircle2, AlertCircle, Loader, Download, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Hardcoded default mapping from known PropStream export format
const DEFAULT_MAPPING = {
  property_address:         'Address',
  unit_number:              'Unit #',
  city:                     'City',
  state:                    'State',
  zip:                      'Zip',
  county:                   'County',
  fips_code:                'FIPS',
  apn:                      'APN',
  property_type:            'Property Type',
  property_status:          'Property Status',
  beds:                     'Bedrooms',
  baths:                    'Total Bathrooms',
  square_feet:              'Building Sqft',
  lot_size:                 'Lot Size Sqft',
  year_built:               'Year Built',
  last_sale_date:           'Last Sale Date',
  last_sale_recording_date: 'Last Sale Recording Date',
  last_sale_amount:         'Last Sale Amount',
  total_open_loans:         'Total Open Loans',
  mortgage_balance:         'Est. Remaining balance of Open Loans',
  estimated_value:          'Est. Value',
  estimated_ltv:            'Est. Loan-to-Value',
  equity_estimate:          'Est. Equity',
  owner_1_first_name:       'Owner 1 First Name',
  owner_1_last_name:        'Owner 1 Last Name',
  owner_2_first_name:       'Owner 2 First Name',
  owner_2_last_name:        'Owner 2 Last Name',
  litigator:                'Litigator',
  deceased_owner:           'Deceased Owner',
  mailing_care_of_name:     'Mailing Care of Name',
  owner_mailing_address:    'Mailing Address',
  owner_mailing_unit:       'Mailing Unit #',
  owner_mailing_city:       'Mailing City',
  owner_mailing_state:      'Mailing State',
  owner_mailing_zip:        'Mailing Zip',
  owner_mailing_county:     'Mailing County',
  do_not_mail:              'Do Not Mail',
  owner_occupied:           'Owner Occupied',
  phone_1:                  'Phone 1',
  phone_1_type:             'Phone 1 Type',
  phone_1_dnc:              'Phone 1 DNC',
  phone_2:                  'Phone 2',
  phone_2_type:             'Phone 2 Type',
  phone_2_dnc:              'Phone 2 DNC',
  phone_3:                  'Phone 3',
  phone_3_type:             'Phone 3 Type',
  phone_3_dnc:              'Phone 3 DNC',
  phone_4:                  'Phone 4',
  phone_4_type:             'Phone 4 Type',
  phone_4_dnc:              'Phone 4 DNC',
  phone_5:                  'Phone 5',
  phone_5_type:             'Phone 5 Type',
  phone_5_dnc:              'Phone 5 DNC',
  email_1:                  'Email 1',
  email_2:                  'Email 2',
  email_3:                  'Email 3',
  email_4:                  'Email 4',
  foreclosure_indicator:    'Foreclosure Factor',
  lien_indicator:           'Lien Type',
  lien_date:                'Lien Date',
  lien_amount:              'Lien Amount',
  probate_indicator:        'BK Date',
  divorce_indicator:        'Divorce Date',
  preforeclosure_indicator: 'Pre-FC Recording Date',
  prefc_doc_number:         'Pre-FC Doc Number',
  prefc_unpaid_balance:     'Pre-FC Unpaid Balance',
  prefc_auction_date:       'Pre-FC Auction Date',
  listing_status:           'MLS Status',
  list_date:                'MLS Date',
  list_price:               'MLS Amount',
  listing_agent_name:       'MLS Agent Name',
  listing_agent_phone:      'MLS Agent Phone',
  listing_agent_email:      'MLS Agent E-Mail',
  listing_brokerage:        'MLS Brokerage Name',
  marketing_lists:          'Marketing Lists',
  skip_traces:              'Skip Traces',
  date_added_to_list:       'Date Added to List',
  method_of_add:            'Method of Add',
};

const FIELD_MAP = {};
const BOOLEAN_FIELDS = new Set(['absentee_owner', 'owner_occupied', 'vacant', 'senior_owner_indicator', 'probate_indicator', 'inherited_indicator', 'divorce_indicator', 'preforeclosure_indicator', 'foreclosure_indicator', 'lien_indicator', 'tax_delinquent_indicator', 'deceased_owner', 'litigator', 'do_not_mail', 'phone_1_dnc', 'phone_2_dnc', 'phone_3_dnc', 'phone_4_dnc', 'phone_5_dnc']);
const NUMBER_FIELDS = new Set(['list_price', 'estimated_value', 'equity_estimate', 'mortgage_balance', 'estimated_ltv', 'ownership_length_years', 'beds', 'baths', 'square_feet', 'days_on_market', 'last_sale_amount', 'lien_amount', 'prefc_unpaid_balance', 'latitude', 'longitude']);
const INT_FIELDS = new Set(['year_built', 'total_open_loans']);

const FIELD_GROUPS = [
  { label: 'Property Info', fields: ['property_address', 'unit_number', 'city', 'state', 'zip', 'county', 'fips_code', 'apn', 'property_type', 'property_status', 'beds', 'baths', 'square_feet', 'lot_size', 'year_built'] },
  { label: 'MLS / Listing', fields: ['mls_number', 'propstream_property_id', 'listing_status', 'list_date', 'days_on_market', 'list_price', 'estimated_value', 'listing_remarks', 'listing_url'] },
  { label: 'Owner Info', fields: ['owner_1_first_name', 'owner_1_last_name', 'owner_2_first_name', 'owner_2_last_name', 'owner_name', 'deceased_owner', 'litigator', 'owner_occupied', 'absentee_owner', 'ownership_length_years'] },
  { label: 'Mailing', fields: ['mailing_care_of_name', 'owner_mailing_address', 'owner_mailing_unit', 'owner_mailing_city', 'owner_mailing_state', 'owner_mailing_zip', 'owner_mailing_county', 'do_not_mail'] },
  { label: 'Phones', fields: ['phone_1', 'phone_1_type', 'phone_1_dnc', 'phone_2', 'phone_2_type', 'phone_2_dnc', 'phone_3', 'phone_3_type', 'phone_3_dnc', 'phone_4', 'phone_4_type', 'phone_4_dnc', 'phone_5', 'phone_5_type', 'phone_5_dnc'] },
  { label: 'Emails', fields: ['email_1', 'email_2', 'email_3', 'email_4'] },
  { label: 'Financials', fields: ['last_sale_date', 'last_sale_recording_date', 'last_sale_amount', 'total_open_loans', 'mortgage_balance', 'estimated_value', 'estimated_ltv', 'equity_estimate'] },
  { label: 'Distress Indicators', fields: ['vacant', 'senior_owner_indicator', 'probate_indicator', 'inherited_indicator', 'divorce_indicator', 'preforeclosure_indicator', 'prefc_doc_number', 'prefc_unpaid_balance', 'prefc_auction_date', 'foreclosure_indicator', 'lien_indicator', 'lien_date', 'lien_amount', 'tax_delinquent_indicator'] },
  { label: 'Listing Agent', fields: ['listing_agent_name', 'listing_agent_email', 'listing_agent_phone', 'listing_brokerage'] },
  { label: 'Meta / List Info', fields: ['marketing_lists', 'skip_traces', 'date_added_to_list', 'method_of_add'] },
  { label: 'Geo', fields: ['latitude', 'longitude'] },
];

function autoMap(headers) {
  const mapping = {};
  for (const [field, col] of Object.entries(DEFAULT_MAPPING)) {
    if (headers.includes(col)) mapping[field] = col;
  }
  return mapping;
}

function parseBoolean(val) {
  const v = String(val || '').toLowerCase().trim();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1' || v === 'x';
}

function mapRow(row, mapping) {
  const mapped = {};
  for (const [field, csvCol] of Object.entries(mapping)) {
    if (!csvCol || row[csvCol] === undefined) continue;
    const val = row[csvCol];
    if (BOOLEAN_FIELDS.has(field)) {
      mapped[field] = parseBoolean(val);
    } else if (NUMBER_FIELDS.has(field)) {
      const n = parseFloat(String(val).replace(/[,$\s]/g, ''));
      if (!isNaN(n)) mapped[field] = n;
    } else if (INT_FIELDS.has(field)) {
      const n = parseInt(String(val));
      if (!isNaN(n)) mapped[field] = n;
    } else {
      if (val !== '' && val !== undefined) mapped[field] = String(val).trim();
    }
  }
  return mapped;
}

const TEMPLATE_HEADERS = ['Address', 'City', 'State', 'Zip', 'County', 'Property Type', 'MLS Number', 'Listing Status', 'List Date', 'Days On Market', 'List Price', 'Estimated Value', 'Beds', 'Baths', 'Building Sqft', 'Lot Size', 'Year Built', 'Remarks', 'Listing URL', 'Owner Name', 'Mailing Address', 'Mailing City', 'Mailing State', 'Mailing Zip', 'Years Owned', 'Absentee Owner', 'Vacant', 'Senior Owner', 'Probate', 'Inherited', 'Divorce', 'Preforeclosure', 'Foreclosure', 'Lien', 'Tax Delinquent', 'Equity', 'Mortgage Balance', 'Listing Agent', 'Agent Email', 'Agent Phone', 'Brokerage', 'Latitude', 'Longitude'];

const BATCH_SIZE = 100;

export default function PropstreamREListingImporter() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [step, setStep] = useState('upload');
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [filename, setFilename] = useState('');
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchId, setBatchId] = useState(null);
  const [totalBatches, setTotalBatches] = useState(0);

  const STORAGE_KEY = 'propstream_re_listing_field_mapping';

  const loadSavedMapping = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  };

  const saveMapping = (m) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch {}
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const headers = meta.fields || [];
        const saved = loadSavedMapping();
        const auto = autoMap(headers);
        const merged = { ...auto };
        for (const [field, csvCol] of Object.entries(saved)) {
          if (csvCol && headers.includes(csvCol)) {
            merged[field] = csvCol;
          }
        }
        setCsvData(data);
        setHeaders(headers);
        setMapping(merged);
        setStep('confirm');
      }
    });
  };

  const startBatchImport = async () => {
    saveMapping(mapping);
    const listings = csvData.map(row => mapRow(row, mapping));
    const totalBatches = Math.ceil(listings.length / BATCH_SIZE);
    setTotalBatches(totalBatches);
    
    const initRes = await base44.functions.invoke('initBatchImport', { filename, total_rows: listings.length });
    setBatchId(initRes.data.batch_id);
    
    setStep('batch_import');
    setCurrentBatchIndex(0);
    setBatchResults([]);
    
    processBatch(listings, 0, totalBatches);
  };

  const processBatch = async (listings, batchIdx) => {
    setImporting(true);
    const start = batchIdx * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, listings.length);
    const batchData = listings.slice(start, end);
    
    try {
      const res = await base44.functions.invoke('importBatchChunk', { 
        batch_id: batchId,
        listings: batchData,
        batch_index: batchIdx,
        total_batches: totalBatches
      });
      
      const batchResult = {
        batchIndex: batchIdx,
        imported: res.data.imported,
        duplicates: res.data.duplicates,
        errors: res.data.errors,
        total: end - start
      };
      
      setBatchResults(prev => [...prev, batchResult]);
      
      if (end < listings.length) {
        setCurrentBatchIndex(batchIdx + 1);
        setImporting(false);
      } else {
        const totalImported = batchResults.reduce((sum, r) => sum + r.imported, 0) + res.data.imported;
        const totalDupes = batchResults.reduce((sum, r) => sum + r.duplicates, 0) + res.data.duplicates;
        const totalErrors = batchResults.reduce((sum, r) => sum + r.errors, 0) + res.data.errors;
        
        setResult({
          batch_id: batchId,
          total: listings.length,
          imported: totalImported,
          duplicates: totalDupes,
          errors: totalErrors
        });
        setStep('done');
        setImporting(false);
      }
    } catch (error) {
      alert('Error importing batch: ' + error.message);
      setImporting(false);
    }
  };

  const handleNextBatch = () => {
    const listings = csvData.map(row => mapRow(row, mapping));
    processBatch(listings, currentBatchIndex);
  };

  const handleImportAllRemaining = async () => {
    const listings = csvData.map(row => mapRow(row, mapping));
    setImporting(true);
    
    for (let i = currentBatchIndex; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, listings.length);
      const batchData = listings.slice(start, end);
      
      const res = await base44.functions.invoke('importBatchChunk', { 
        batch_id: batchId,
        listings: batchData,
        batch_index: i,
        total_batches: totalBatches
      });
      
      setBatchResults(prev => [...prev, {
        batchIndex: i,
        imported: res.data.imported,
        duplicates: res.data.duplicates,
        errors: res.data.errors,
        total: end - start
      }]);
    }
    
    const totalImported = batchResults.reduce((sum, r) => sum + r.imported, 0) + batchResults.reduce((sum, r) => r.imported, 0);
    const totalDupes = batchResults.reduce((sum, r) => sum + r.duplicates, 0) + batchResults.reduce((sum, r) => r.duplicates, 0);
    const totalErrors = batchResults.reduce((sum, r) => sum + r.errors, 0) + batchResults.reduce((sum, r) => r.errors, 0);
    
    setResult({
      batch_id: batchId,
      total: listings.length,
      imported: totalImported,
      duplicates: totalDupes,
      errors: totalErrors
    });
    setStep('done');
    setImporting(false);
  };

  const reset = () => {
    setStep('upload');
    setCsvData(null);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setFilename('');
    setBatchId(null);
    setBatchResults([]);
    setCurrentBatchIndex(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.map(h => `"${h}"`).join(',') + '\n';
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'propstream_re_listing_template.csv';
    a.click();
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const REQUIRED = ['property_address', 'state'];
  const missingRequired = REQUIRED.filter(f => !mapping[f]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/PropstreamREListings')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to RE Listings
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">PropStream RE Listing Importer</h1>
        <p className="text-slate-500 text-sm">Import MLS/PropStream CSV exports in batches of 100 records. Review each batch before continuing.</p>
      </div>

      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => fileRef.current.click()}>
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="font-semibold text-slate-700 mb-1">Drop your PropStream CSV here or click to browse</p>
              <p className="text-xs text-slate-400">Supports all standard PropStream MLS export formats. All fields auto-detected.</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" /> Download CSV Template
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-blue-700">Batch Import Process</p>
              </div>
              <ul className="text-xs text-blue-700 space-y-1 ml-6 list-disc">
                <li>Records are imported in batches of 100</li>
                <li>Review each batch results before continuing</li>
                <li>Or click "Import All Remaining" to process automatically</li>
                <li>Duplicate detection, scoring, and territory matching included</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'confirm' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800">{csvData?.length} rows ready to import</p>
                <p className="text-sm text-slate-500">{mappedCount} fields mapped from <span className="font-medium">{filename}</span></p>
                <p className="text-xs text-slate-400 mt-1">Will be processed in {Math.ceil(csvData?.length / BATCH_SIZE)} batches of {BATCH_SIZE} records</p>
              </div>
            </div>
            {missingRequired.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Missing required fields: {missingRequired.join(', ')}. Please review the mapping.
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep('mapping')} className="flex-1">Review Mapping</Button>
              <Button onClick={startBatchImport} disabled={missingRequired.length > 0} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Start Batch Import →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Column Mapping — {csvData?.length} rows · {headers.length} columns detected</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">{mappedCount} mapped</Badge>
                {missingRequired.length > 0 && <Badge className="bg-red-100 text-red-700">Missing: {missingRequired.join(', ')}</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {FIELD_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{group.label}</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {group.fields.map(field => (
                    <div key={field} className="flex items-center gap-2 text-sm">
                      <span className="w-44 text-slate-700 font-medium shrink-0 text-xs">{field.replace(/_/g, ' ')}</span>
                      <select value={mapping[field] || ''} onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))} className="flex-1 border rounded px-2 py-1 text-xs bg-white">
                        <option value="">— not mapped —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {mapping[field] ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <div className="w-4 h-4 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 text-xs" onClick={() => { localStorage.removeItem('propstream_re_listing_field_mapping'); setMapping(autoMap(headers)); }}>Reset to Auto-Detect</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={startBatchImport} disabled={missingRequired.length > 0} className="bg-purple-600 hover:bg-purple-700">Start Batch Import</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'batch_import' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-12 text-center">
              {importing ? (
                <>
                  <Loader className="w-12 h-12 animate-spin mx-auto text-purple-600 mb-4" />
                  <p className="font-semibold text-slate-700 text-lg">Importing batch {currentBatchIndex + 1} of {totalBatches}...</p>
                  <p className="text-slate-400 text-sm mt-1">Processing records {currentBatchIndex * BATCH_SIZE + 1} to {Math.min((currentBatchIndex + 1) * BATCH_SIZE, csvData?.length || 0)}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="font-semibold text-slate-700 text-lg mb-2">Batch {currentBatchIndex} Complete!</p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {batchResults[batchResults.length - 1] && (
                      <>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Imported</p>
                          <p className="text-2xl font-bold text-green-600">{batchResults[batchResults.length - 1].imported}</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Duplicates</p>
                          <p className="text-2xl font-bold text-yellow-600">{batchResults[batchResults.length - 1].duplicates}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500">Errors</p>
                          <p className="text-2xl font-bold text-red-600">{batchResults[batchResults.length - 1].errors}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Batch {currentBatchIndex + 1} of {totalBatches} ready to process</p>
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
                <div className="space-y-2 max-h-64 overflow-auto">
                  {batchResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                      <span>Batch {r.batchIndex + 1}</span>
                      <div className="flex gap-3">
                        <span className="text-green-600 font-medium">{r.imported} imported</span>
                        <span className="text-yellow-600">{r.duplicates} dupes</span>
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
          <Card className={result.imported > 0 ? 'border-green-200' : 'border-yellow-200'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">Import Complete</p>
                  <p className="text-slate-500 text-sm">Batch ID: {result.batch_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Total Rows', result.total, 'text-slate-700'],
                  ['Imported', result.imported, 'text-green-600'],
                  ['Duplicates Skipped', result.duplicates, 'text-yellow-600'],
                  ['Errors', result.errors, 'text-red-600'],
                ].map(([label, val, cls]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-3xl font-black ${cls}`}>{val ?? 0}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset} className="flex-1">Import Another File</Button>
            <Button onClick={() => navigate('/PropstreamREListings')} className="flex-1 bg-purple-600 hover:bg-purple-700">View RE Listings →</Button>
          </div>
        </div>
      )}
    </div>
  );
}