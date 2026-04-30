import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle, Loader, Download } from 'lucide-react';

export default function CSVLeadImport() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const EXPECTED_FIELDS = {
    contact_name: 'Owner Name',
    contact_phone: 'Phone Number',
    contact_email: 'Email Address',
    property_address: 'Property Address',
    property_city: 'City',
    property_state: 'State',
    property_zip: 'ZIP Code',
    estimated_value: 'Est. Value',
    source_details: 'County/Region',
    notes: 'Notes'
  };

  // Property export specific mappings
  const PROPERTY_FIELD_MAPPINGS = {
    'Mailing Care of Name': 'contact_name',
    'Owner 1 First Name': 'contact_name',
    'Owner 1 Last Name': 'contact_name',
    'Owner 2 First Name': 'contact_name',
    'Owner 2 Last Name': 'contact_name',
    'Phone 1': 'contact_phone',
    'Phone 2': 'contact_phone',
    'Email 1': 'contact_email',
    'Email 2': 'contact_email',
    'Address': 'property_address',
    'City': 'property_city',
    'State': 'property_state',
    'Zip': 'property_zip',
    'Est. Value': 'estimated_value',
    'County': 'source_details',
    'Notes': 'notes'
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Dynamically import Papa
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

        // Auto-map using property mappings, then fallback to field name matching
        const autoMapping = {};
        csvHeaders.forEach(header => {
          if (PROPERTY_FIELD_MAPPINGS[header]) {
            autoMapping[header] = PROPERTY_FIELD_MAPPINGS[header];
          } else {
            const lower = header.toLowerCase();
            Object.keys(EXPECTED_FIELDS).forEach(field => {
              if (lower.includes(field.replace(/_/g, ' ')) || 
                  EXPECTED_FIELDS[field].toLowerCase().includes(lower)) {
                autoMapping[header] = field;
              }
            });
          }
        });
        setMapping(autoMapping);
      },
      error: (error) => {
        alert('Error parsing CSV: ' + error.message);
      }
    });
  };

  const handleMapField = (csvHeader, leadField) => {
    const newMapping = { ...mapping };
    if (leadField === null) {
      delete newMapping[csvHeader];
    } else {
      newMapping[csvHeader] = leadField;
    }
    setMapping(newMapping);
  };

  const handleImport = async () => {
    if (data.length === 0) {
      alert('No data to import');
      return;
    }

    // Validate required fields are mapped
     const hasMappedFields = Object.values(mapping).length > 0;
     if (!hasMappedFields) {
       alert('Please map at least one field');
       return;
     }

    setImporting(true);
    try {
      const leads = data.map(row => {
          const lead = { source: 'propstream' };
          const addressParts = [];

          Object.entries(mapping).forEach(([csvCol, leadField]) => {
            let value = row[csvCol];
            if (!value) return;

            if (leadField === 'estimated_value') {
              value = parseFloat(value.toString().replace(/[^0-9.-]/g, '')) || 0;
              if (value > 0) lead[leadField] = value;
            } else if (leadField === 'property_address') {
              addressParts.push(value);
            } else if (leadField === 'property_city') {
              lead.property_city = value;
            } else if (leadField === 'property_state') {
              lead.property_state = value;
            } else if (leadField === 'property_zip') {
              lead.property_zip = value;
            } else if (leadField === 'contact_name') {
              // Combine first and last names if needed
              if (!lead.contact_name && value) {
                const lastName = row['Owner 1 Last Name'] || row['Owner 2 Last Name'];
                lead.contact_name = lastName ? `${value} ${lastName}` : value;
              }
            } else if (leadField === 'contact_phone' && !lead.contact_phone) {
              lead.contact_phone = value;
            } else if (leadField === 'contact_email' && !lead.contact_email) {
              lead.contact_email = value;
            } else if (leadField && value) {
              lead[leadField] = value;
            }
          });

          // Construct full property address if needed
          if (addressParts.length > 0) {
            lead.property_address = addressParts.filter(p => p).join(', ');
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
      setMapping({});
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = ['Mailing Care of Name', 'Phone 1', 'Email 1', 'Address', 'City', 'State', 'Zip', 'County', 'Est. Value', 'Notes'];
    const csv = templateHeaders.map(h => `"${h}"`).join(',');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'property_lead_template.csv');
    element.click();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Upload className="w-8 h-8" />
        Property List Lead Import
      </h1>
      <p className="text-slate-600">Import property lists from Propstream or similar exports to create leads</p>

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
                <p className="text-sm text-slate-500">Supports Propstream property exports and similar formats</p>
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
              <CardTitle>Map CSV Columns to Lead Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{header}</p>
                    <p className="text-xs text-slate-600">{data[0]?.[header]}</p>
                  </div>
                  <select
                    value={mapping[header] || ''}
                    onChange={(e) => handleMapField(header, e.target.value || null)}
                    className="border rounded-md p-2 text-sm"
                  >
                    <option value="">Skip this field</option>
                    {Object.entries(EXPECTED_FIELDS).map(([field, label]) => (
                      <option key={field} value={field}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview ({data.length} rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {Object.keys(mapping).map(col => (
                        <th key={col} className="text-left p-2 font-medium">
                          {mapping[col] || col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.keys(mapping).map(col => (
                          <td key={col} className="p-2 truncate">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setFile(null);
                setHeaders([]);
                setData([]);
                setMapping({});
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