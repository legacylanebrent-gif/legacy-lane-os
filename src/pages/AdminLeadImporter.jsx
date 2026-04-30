import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle, Loader, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CSV_FIELD_MAPPINGS = {
  'Mailing Care of Name': 'mailing_care_of',
  'Owner 1 First Name': 'contact_name_first',
  'Owner 1 Last Name': 'contact_name_last',
  'Owner 2 First Name': 'contact_name_first',
  'Owner 2 Last Name': 'contact_name_last',
  'Phone 1': 'contact_phone',
  'Phone 2': 'contact_phone_2',
  'Email 1': 'contact_email',
  'Email 2': 'contact_email',
  'Address': 'property_address',
  'City': 'property_city',
  'State': 'property_state',
  'Zip': 'property_zip',
  'County': 'property_county',
  'Est. Value': 'estimated_value',
  'Market Value': 'propstream_market_value',
  'Loan Amount': 'propstream_loan_amount',
  'Last Sale Date': 'propstream_last_sale_date',
  'Last Sale Price': 'propstream_last_sale_price',
  'Beds': 'propstream_beds',
  'Baths': 'propstream_baths',
  'Sq Ft': 'propstream_sqft',
  'Lot Size': 'propstream_lot_size',
  'Year Built': 'propstream_year_built',
  'Property Type': 'propstream_property_type',
  'Zoning': 'propstream_zoning',
  'Owner Type': 'propstream_owner_type',
  'Notes': 'notes'
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
          if (!value) return;

          const leadField = CSV_FIELD_MAPPINGS[csvCol];

          if (leadField === 'estimated_value' || leadField === 'propstream_market_value' || 
              leadField === 'propstream_loan_amount' || leadField === 'propstream_last_sale_price') {
            const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, '')) || 0;
            if (numValue > 0) lead[leadField] = numValue;
          } else if (leadField === 'propstream_beds' || leadField === 'propstream_baths' || leadField === 'propstream_sqft' || leadField === 'propstream_year_built') {
            const numValue = parseInt(value.toString().replace(/[^0-9]/g, '')) || 0;
            if (numValue > 0) lead[leadField] = numValue;
          } else if (leadField === 'propstream_last_sale_date') {
            if (value) lead[leadField] = value;
          } else if (leadField === 'contact_name_first' || leadField === 'contact_name_last') {
            // Combine names
            if (leadField === 'contact_name_first') {
              lead.contact_name_first = value;
            } else {
              lead.contact_name_last = value;
            }
          } else if (leadField) {
            lead[leadField] = value;
          } else {
            // Store unmapped fields
            unmappedData[csvCol] = value;
          }
        });

        // Combine first and last names
        if (lead.contact_name_first || lead.contact_name_last) {
          lead.contact_name = `${lead.contact_name_first || ''} ${lead.contact_name_last || ''}`.trim();
        }

        // Store unmapped data
        if (Object.keys(unmappedData).length > 0) {
          lead.raw_csv_data = unmappedData;
        }

        return lead;
      });

      const imported = [];
      const failed = [];

      for (const lead of leads) {
        try {
          const created = await base44.entities.Lead.create(lead);
          imported.push(created);
        } catch (error) {
          failed.push({
            lead: lead.contact_name || lead.contact_email || 'Unknown',
            reason: error.message
          });
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
    const templateHeaders = ['Mailing Care of Name', 'Owner 1 First Name', 'Owner 1 Last Name', 'Phone 1', 'Phone 2', 'Email 1', 'Email 2', 'Address', 'City', 'State', 'Zip', 'County', 'Est. Value', 'Market Value', 'Loan Amount', 'Last Sale Date', 'Last Sale Price', 'Beds', 'Baths', 'Sq Ft', 'Lot Size', 'Year Built', 'Property Type', 'Zoning', 'Owner Type', 'Notes'];
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