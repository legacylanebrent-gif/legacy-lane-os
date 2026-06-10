import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, CheckCircle2, AlertCircle, Loader, Download, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Full field map: entity field -> array of CSV column aliases (lowercase)
const FIELD_MAP = {
  // Property
  property_address:         ['address', 'property address', 'street address', 'situs address', 'prop address', 'property_address'],
  city:                     ['city', 'prop city', 'property city', 'situs city'],
  state:                    ['state', 'prop state', 'property state', 'situs state'],
  zip:                      ['zip', 'zip code', 'postal code', 'situs zip', 'prop zip'],
  county:                   ['county', 'prop county'],
  // MLS
  mls_number:               ['mls number', 'mls#', 'mls id', 'listing id', 'mls_number'],
  propstream_property_id:   ['propstream id', 'property id', 'prop id', 'ps id'],
  listing_status:           ['status', 'listing status', 'mls status'],
  list_date:                ['list date', 'listing date', 'status date'],
  days_on_market:           ['days on market', 'dom', 'days listed'],
  list_price:               ['list price', 'listing price', 'price'],
  estimated_value:          ['estimated value', 'avm', 'estimated avm', 'estimated market value', 'est. value'],
  // Property details
  beds:                     ['beds', 'bedrooms', 'bed'],
  baths:                    ['baths', 'bathrooms', 'bath', 'total bathrooms'],
  square_feet:              ['sqft', 'square feet', 'living sqft', 'gross living area', 'building sqft'],
  lot_size:                 ['lot size', 'lot sqft', 'lot area'],
  year_built:               ['year built', 'yr built', 'effective year built'],
  property_type:            ['property type', 'prop type'],
  listing_remarks:          ['remarks', 'listing remarks', 'public remarks', 'description'],
  listing_url:              ['listing url', 'mls url', 'url'],
  // Owner info
  owner_name:               ['owner name', 'owner', 'owner 1 full name'],
  owner_mailing_address:    ['mailing address', 'owner mailing address', 'mail address'],
  owner_mailing_city:       ['mailing city', 'mail city'],
  owner_mailing_state:      ['mailing state', 'mail state'],
  owner_mailing_zip:        ['mailing zip', 'mail zip', 'mailing postal'],
  ownership_length_years:   ['ownership length', 'years owned', 'length of ownership', 'years of ownership'],
  // Indicators (boolean)
  absentee_owner:           ['absentee', 'absentee owner'],
  vacant:                   ['vacant', 'vacancy'],
  senior_owner_indicator:   ['senior', 'senior owner', 'senior indicator'],
  probate_indicator:        ['probate', 'in probate'],
  inherited_indicator:      ['inherited', 'inheritance'],
  divorce_indicator:        ['divorce', 'divorcing'],
  preforeclosure_indicator: ['preforeclosure', 'pre-foreclosure', 'lis pendens'],
  foreclosure_indicator:    ['foreclosure', 'in foreclosure', 'reo'],
  lien_indicator:           ['lien', 'has lien'],
  tax_delinquent_indicator: ['tax delinquent', 'delinquent taxes', 'tax lien'],
  // Financials
  equity_estimate:          ['equity', 'estimated equity', 'equity estimate', 'est. equity'],
  mortgage_balance:         ['mortgage balance', 'loan balance', 'open loan balance'],
  // Listing agent
  listing_agent_name:       ['listing agent', 'agent name', 'list agent name', 'agent'],
  listing_agent_email:      ['agent email', 'listing agent email', 'list agent email'],
  listing_agent_phone:      ['agent phone', 'listing agent phone', 'list agent phone'],
  listing_brokerage:        ['brokerage', 'listing brokerage', 'broker name', 'list office name'],
  // Geo
  latitude:                 ['latitude', 'lat'],
  longitude:                ['longitude', 'lng', 'lon'],
};

const BOOLEAN_FIELDS = new Set([
  'absentee_owner', 'vacant', 'senior_owner_indicator', 'probate_indicator',
  'inherited_indicator', 'divorce_indicator', 'preforeclosure_indicator',
  'foreclosure_indicator', 'lien_indicator', 'tax_delinquent_indicator',
]);
const NUMBER_FIELDS = new Set([
  'list_price', 'estimated_value', 'equity_estimate', 'mortgage_balance',
  'ownership_length_years', 'beds', 'baths', 'square_feet', 'days_on_market',
  'latitude', 'longitude',
]);
const INT_FIELDS = new Set(['year_built']);

const FIELD_GROUPS = [
  { label: 'Property Info', fields: ['property_address', 'city', 'state', 'zip', 'county', 'property_type', 'beds', 'baths', 'square_feet', 'lot_size', 'year_built'] },
  { label: 'MLS / Listing', fields: ['mls_number', 'propstream_property_id', 'listing_status', 'list_date', 'days_on_market', 'list_price', 'estimated_value', 'listing_remarks', 'listing_url'] },
  { label: 'Owner Info', fields: ['owner_name', 'owner_mailing_address', 'owner_mailing_city', 'owner_mailing_state', 'owner_mailing_zip', 'ownership_length_years'] },
  { label: 'Distress Indicators', fields: ['absentee_owner', 'vacant', 'senior_owner_indicator', 'probate_indicator', 'inherited_indicator', 'divorce_indicator', 'preforeclosure_indicator', 'foreclosure_indicator', 'lien_indicator', 'tax_delinquent_indicator'] },
  { label: 'Financials', fields: ['equity_estimate', 'mortgage_balance'] },
  { label: 'Listing Agent', fields: ['listing_agent_name', 'listing_agent_email', 'listing_agent_phone', 'listing_brokerage'] },
  { label: 'Geo', fields: ['latitude', 'longitude'] },
];

function autoMap(headers) {
  const mapping = {};
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const [field, aliases] of Object.entries(FIELD_MAP)) {
    const idx = lower.findIndex(h => aliases.includes(h));
    if (idx !== -1) mapping[field] = headers[idx];
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

const TEMPLATE_HEADERS = [
  'Address', 'City', 'State', 'Zip', 'County', 'Property Type',
  'MLS Number', 'Listing Status', 'List Date', 'Days On Market', 'List Price', 'Estimated Value',
  'Beds', 'Baths', 'Building Sqft', 'Lot Size', 'Year Built', 'Remarks', 'Listing URL',
  'Owner Name', 'Mailing Address', 'Mailing City', 'Mailing State', 'Mailing Zip', 'Years Owned',
  'Absentee Owner', 'Vacant', 'Senior Owner', 'Probate', 'Inherited', 'Divorce',
  'Preforeclosure', 'Foreclosure', 'Lien', 'Tax Delinquent',
  'Equity', 'Mortgage Balance',
  'Listing Agent', 'Agent Email', 'Agent Phone', 'Brokerage',
  'Latitude', 'Longitude',
];

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
        // Merge: saved mapping takes priority, fill gaps with autoMap
        const saved = loadSavedMapping();
        const auto = autoMap(headers);
        const merged = { ...auto };
        // Only apply saved mappings if that CSV column still exists in this file
        for (const [field, csvCol] of Object.entries(saved)) {
          if (csvCol && headers.includes(csvCol)) {
            merged[field] = csvCol;
          }
        }
        setCsvData(data);
        setHeaders(headers);
        setMapping(merged);
        setStep('mapping');
      }
    });
  };

  const handleImport = async () => {
    saveMapping(mapping); // persist for next import
    setImporting(true);
    setStep('importing');
    const listings = csvData.map(row => mapRow(row, mapping));
    const res = await base44.functions.invoke('importPropstreamCSV', { listings, filename });
    setResult(res.data);
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
        <p className="text-slate-500 text-sm">Import MLS/PropStream CSV exports directly into the RE Listings pipeline. Fields are auto-mapped, scored, deduped, and territory-matched on import.</p>
      </div>

      {/* Upload step */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => fileRef.current.click()}
            >
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
                <p className="text-xs font-semibold text-blue-700">What happens on import?</p>
              </div>
              <ul className="text-xs text-blue-700 space-y-1 ml-6 list-disc">
                <li>Duplicate detection by MLS number, PropStream ID, and address</li>
                <li>Estate sale opportunity scoring (0–100) with label: Low / Moderate / Strong / Priority</li>
                <li>Auto territory matching by ZIP, city, or county</li>
                <li>Matched operators pre-assigned based on territory</li>
                <li>Import batch record created for tracking</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping step */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Column Mapping — {csvData?.length} rows · {headers.length} columns detected</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">{mappedCount} mapped</Badge>
                {missingRequired.length > 0 && (
                  <Badge className="bg-red-100 text-red-700">Missing: {missingRequired.join(', ')}</Badge>
                )}
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
                      <select
                        value={mapping[field] || ''}
                        onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                        className="flex-1 border rounded px-2 py-1 text-xs bg-white"
                      >
                        <option value="">— not mapped —</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {mapping[field]
                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        : <div className="w-4 h-4 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Preview */}
            {csvData?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview (first 2 rows)</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="text-xs w-full min-w-max">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 2).map((row, i) => (
                        <tr key={i} className="border-b">
                          {headers.map(h => <td key={h} className="px-3 py-2 truncate max-w-[120px]">{row[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-600 text-xs"
                onClick={() => { localStorage.removeItem('propstream_re_listing_field_mapping'); setMapping(autoMap(headers)); }}
              >
                Reset to Auto-Detect
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button
                  onClick={handleImport}
                  disabled={missingRequired.length > 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Import {csvData?.length} Listings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-20 text-center">
            <Loader className="w-12 h-12 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="font-semibold text-slate-700 text-lg">Importing, deduplicating, scoring, and territory-matching…</p>
            <p className="text-slate-400 text-sm mt-1">This may take a moment for large files.</p>
          </CardContent>
        </Card>
      )}

      {/* Done step */}
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
            <Button onClick={() => navigate('/PropstreamREListings')} className="flex-1 bg-purple-600 hover:bg-purple-700">
              View RE Listings →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}