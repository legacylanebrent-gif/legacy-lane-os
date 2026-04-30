import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle, Loader, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CSV_FIELD_MAPPINGS = {
  'Address': 'property_address',
  'Unit #': 'property_unit',
  'City': 'property_city',
  'State': 'property_state',
  'Zip': 'property_zip',
  'County': 'property_county',
  'APN': 'property_apn',
  'Phone 1': 'contact_phone',
  'Phone 1 Type': 'contact_phone_1_type',
  'Phone 1 DNC': 'contact_phone_1_dnc',
  'Phone 2': 'contact_phone_2',
  'Phone 2 Type': 'contact_phone_2_type',
  'Phone 2 DNC': 'contact_phone_2_dnc',
  'Phone 3': 'contact_phone_3',
  'Phone 3 Type': 'contact_phone_3_type',
  'Phone 3 DNC': 'contact_phone_3_dnc',
  'Phone 4': 'contact_phone_4',
  'Phone 4 Type': 'contact_phone_4_type',
  'Phone 4 DNC': 'contact_phone_4_dnc',
  'Phone 5': 'contact_phone_5',
  'Phone 5 Type': 'contact_phone_5_type',
  'Phone 5 DNC': 'contact_phone_5_dnc',
  'Email 1': 'contact_email',
  'Email 2': 'contact_email_2',
  'Email 3': 'contact_email_3',
  'Email 4': 'contact_email_4',
  'Owner Occupied': 'owner_occupied',
  'Owner 1 First Name': 'contact_name_first',
  'Owner 1 Last Name': 'contact_name_last',
  'Owner 2 First Name': 'contact_name_2_first',
  'Owner 2 Last Name': 'contact_name_2_last',
  'Litigator': 'litigator',
  'Mailing Care of Name': 'mailing_care_of',
  'Mailing Address': 'mailing_address',
  'Mailing Unit #': 'mailing_unit',
  'Mailing City': 'mailing_city',
  'Mailing State': 'mailing_state',
  'Mailing Zip': 'mailing_zip',
  'Mailing County': 'mailing_county',
  'Do Not Mail': 'do_not_mail',
  'Property Status': 'property_status',
  'Notes': 'notes',
  'Property Type': 'propstream_property_type',
  'Bedrooms': 'propstream_beds',
  'Total Bathrooms': 'propstream_baths',
  'Building Sqft': 'propstream_sqft',
  'Lot Size Sqft': 'propstream_lot_size',
  'Effective Year Built': 'propstream_year_built',
  'Total Assessed Value': 'total_assessed_value',
  'Last Sale Recording Date': 'propstream_last_sale_date',
  'Last Sale Amount': 'propstream_last_sale_price',
  'Total Open Loans': 'total_open_loans',
  'Est. Remaining balance of Open Loans': 'est_remaining_balance_loans',
  'Est. Value': 'estimated_value',
  'Est. Loan-to-Value': 'est_loan_to_value',
  'Est. Equity': 'propstream_equity',
  'Total Condition': 'total_condition',
  'Interior Condition': 'interior_condition',
  'Exterior Condition': 'exterior_condition',
  'Bathroom Condition': 'bathroom_condition',
  'Kitchen Condition': 'kitchen_condition',
  'Foreclosure Factor': 'foreclosure_factor',
  'MLS Status': 'mls_status',
  'MLS Date': 'mls_date',
  'MLS Amount': 'mls_amount',
  'Lien Amount': 'lien_amount',
  'Marketing Lists': 'marketing_lists',
  'Marketing Campaigns': 'marketing_campaigns',
  'Voicemail Drops': 'voicemail_drops',
  'Dialer': 'dialer',
  'Postcards': 'postcards',
  'E-Mails': 'emails',
  'Skip Traces': 'skip_traces',
  'Date Added to List': 'date_added_to_list',
  'Method of Add': 'method_of_add'
};

export default function AdminLeadImporter() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const me = await base44.auth.me();
    if (me?.role !== 'admin') {
      navigate('/');
      return;
    }
    setUser(me);
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const Papa = (await import('papaparse')).default;
    
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        if (results.data.length === 0) {
          alert('CSV is empty');
          return;
        }

        const csvHeaders = Object.keys(results.data[0]).filter(h => h.trim());
        setHeaders(csvHeaders);
        setData(results.data.filter(row => Object.values(row).some(v => v)));
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      }
    });
  };

  const handleImport = async () => {
    if (data.length === 0) {
      alert('No data to import');
      return;
    }

    setImporting(true);
    try {
      const leads = data.map(row => {
        const lead = { source: 'propstream', intent: 'sell_home' };
        const unmappedData = {};

        // Process all CSV columns
        headers.forEach(csvCol => {
          const value = row[csvCol];
          if (!value && value !== '0' && value !== 'No' && value !== 'Yes') return;

          const leadField = CSV_FIELD_MAPPINGS[csvCol];

          if (!leadField) {
            unmappedData[csvCol] = value;
            return;
          }

          // Number fields
          if (['estimated_value', 'propstream_market_value', 'propstream_loan_amount', 
               'propstream_last_sale_price', 'total_assessed_value', 'est_remaining_balance_loans',
               'est_loan_to_value', 'mls_amount', 'lien_amount', 'propstream_equity'].includes(leadField)) {
            const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, '')) || 0;
            if (numValue > 0) lead[leadField] = numValue;
          } 
          // Integer fields
          else if (['propstream_beds', 'propstream_year_built', 'total_open_loans',
                    'marketing_lists', 'marketing_campaigns', 'voicemail_drops', 'dialer',
                    'postcards', 'emails', 'skip_traces'].includes(leadField)) {
            const numValue = parseInt(value.toString().replace(/[^0-9]/g, '')) || 0;
            if (numValue > 0 || leadField === 'marketing_lists') lead[leadField] = numValue;
          }
          // Float fields (baths)
          else if (leadField === 'propstream_baths') {
            const numValue = parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
            if (numValue > 0) lead[leadField] = numValue;
          }
          // Date fields
          else if (['propstream_last_sale_date', 'mls_date', 'date_added_to_list'].includes(leadField)) {
            if (value) lead[leadField] = value;
          }
          // Boolean fields
          else if (['owner_occupied', 'litigator', 'do_not_mail', 'contact_phone_1_dnc', 
                    'contact_phone_2_dnc', 'contact_phone_3_dnc', 'contact_phone_4_dnc', 'contact_phone_5_dnc'].includes(leadField)) {
            const boolValue = value === 'Yes' || value === 'true' || value === true;
            lead[leadField] = boolValue;
          }
          // String fields
          else {
            lead[leadField] = value;
          }
        });

        // Combine first and last names for owner 1
        if (lead.contact_name_first || lead.contact_name_last) {
          lead.contact_name = `${lead.contact_name_first || ''} ${lead.contact_name_last || ''}`.trim();
        } else if (lead.mailing_care_of) {
          lead.contact_name = lead.mailing_care_of;
        }

        // Store unmapped data
        if (Object.keys(unmappedData).length > 0) {
          lead.raw_csv_data = unmappedData;
        }

        return lead;
      });

      const imported = [];
      const failed = [];
      const BATCH_SIZE = 3;
      const BATCH_DELAY = 1000; // ms between batches

      for (let i = 0; i < leads.length; i += BATCH_SIZE) {
        const batch = leads.slice(i, i + BATCH_SIZE);
        
        await Promise.all(
          batch.map(lead =>
            base44.entities.Lead.create(lead)
              .then(created => imported.push(created))
              .catch(error => {
                failed.push({
                  lead: lead.contact_name || lead.contact_email || 'Unknown',
                  reason: error.message
                });
              })
          )
        );

        // Delay between batches (except after last batch)
        if (i + BATCH_SIZE < leads.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      setResults({ imported: imported.length, failed: failed.length, failures: failed });
      setFile(null);
      setHeaders([]);
      setData([]);
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'Address', 'Unit #', 'City', 'State', 'Zip', 'County', 'APN',
      'Phone 1', 'Phone 1 Type', 'Phone 1 DNC', 'Phone 2', 'Phone 2 Type', 'Phone 2 DNC',
      'Phone 3', 'Phone 3 Type', 'Phone 3 DNC', 'Phone 4', 'Phone 4 Type', 'Phone 4 DNC',
      'Phone 5', 'Phone 5 Type', 'Phone 5 DNC',
      'Email 1', 'Email 2', 'Email 3', 'Email 4',
      'Owner Occupied', 'Owner 1 First Name', 'Owner 1 Last Name', 'Owner 2 First Name', 'Owner 2 Last Name',
      'Litigator', 'Mailing Care of Name', 'Mailing Address', 'Mailing Unit #', 'Mailing City', 'Mailing State', 'Mailing Zip', 'Mailing County', 'Do Not Mail',
      'Property Status', 'Notes', 'Property Type', 'Bedrooms', 'Total Bathrooms', 'Building Sqft', 'Lot Size Sqft', 'Effective Year Built',
      'Total Assessed Value', 'Last Sale Recording Date', 'Last Sale Amount', 'Total Open Loans', 'Est. Remaining balance of Open Loans',
      'Est. Value', 'Est. Loan-to-Value', 'Est. Equity', 'Total Condition', 'Interior Condition', 'Exterior Condition', 'Bathroom Condition', 'Kitchen Condition',
      'Foreclosure Factor', 'MLS Status', 'MLS Date', 'MLS Amount', 'Lien Amount',
      'Marketing Lists', 'Marketing Campaigns', 'Voicemail Drops', 'Dialer', 'Postcards', 'E-Mails', 'Skip Traces',
      'Date Added to List', 'Method of Add'
    ];
    const csv = templateHeaders.map(h => `"${h}"`).join(',');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'propstream_lead_template.csv');
    element.click();
  };

  if (!user) {
    return <div className="p-8 text-center">Checking permissions...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Lead Importer</h1>
        <p className="text-slate-600">Import property lists from Propstream and assign to local operators by territory</p>
      </div>

      {!data.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csvInput"
              />
              <label htmlFor="csvInput" className="cursor-pointer block">
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="font-medium">Drop CSV or click to upload</p>
                <p className="text-sm text-slate-500">Supports Propstream property exports with all fields automatically captured</p>
              </label>
            </div>

            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preview ({data.length} rows detected)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {headers.map(col => (
                        <th key={col} className="text-left p-2 font-medium text-xs">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 2).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {headers.map(col => (
                          <td key={col} className="p-2 truncate text-xs">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {headers.length} columns, {data.length} rows. All fields will be imported automatically.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setFile(null);
                setHeaders([]);
                setData([]);
              }}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {importing ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {importing ? 'Importing...' : `Import ${data.length} Leads`}
            </Button>
          </div>
        </>
      )}

      {results && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold">Import Complete</p>
                <p className="text-sm text-slate-600">
                  {results.imported} imported, {results.failed} failed
                </p>
                {results.failures.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {results.failures.map((f, idx) => (
                      <p key={idx} className="text-xs text-red-600">{f.lead}: {f.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}