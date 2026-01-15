import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function PricingImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;

      const values = lines[i].split('\t').map(v => v.trim());
      const row = {};

      headers.forEach((header, idx) => {
        let cleanHeader = header.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
        row[cleanHeader] = values[idx] || '';
      });

      data.push(row);
    }

    return data;
  };

  const mapCSVToEntity = (csvRows) => {
    return csvRows.map((row, index) => {
      // Handle various column name variations
      const categoryVal = row.category || row.item_category || '';
      const itemNameVal = row.item_name || row.name || '';
      const brandVal = row.brand || row.brand_name || '';
      const conditionVal = row.condition || row.item_condition || 'unknown';

      // Parse prices - handle various formats
      const parsePriceRange = (lowStr, medStr, highStr) => {
        return {
          low: parseFloat(lowStr) || 0,
          medium: parseFloat(medStr) || 0,
          high: parseFloat(highStr) || 0
        };
      };

      const prices = parsePriceRange(
        row.price_low || row.low || row.low_price || '',
        row.price_medium || row.medium || row.med_price || row.mid_price || '',
        row.price_high || row.high || row.high_price || ''
      );

      return {
        item_id: index + 1,
        category: categoryVal,
        item_name: itemNameVal,
        brand: brandVal,
        price_low: prices.low,
        price_medium: prices.medium,
        price_high: prices.high,
        condition: ['excellent', 'good', 'fair', 'poor'].includes(conditionVal.toLowerCase()) 
          ? conditionVal.toLowerCase() 
          : 'unknown',
        notes: row.notes || row.description || ''
      };
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const csvText = await file.text();
      const csvRows = parseCSV(csvText);
      
      if (csvRows.length === 0) {
        throw new Error('No data rows found in CSV file');
      }

      const entities = mapCSVToEntity(csvRows);

      // Bulk create pricing database entries
      await base44.entities.PricingDatabase.bulkCreate(entities);

      setSuccess(true);
      setImportedCount(entities.length);
      setFile(null);

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setImportedCount(0);
      }, 5000);
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import pricing data. Please check your CSV format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-slate-900">Import Pricing Database</h1>
        <p className="text-slate-600 mt-2">Upload your CSV file with 2000+ items</p>
      </div>

      {/* Main Card */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* CSV Upload Area */}
            <div>
              <label htmlFor="csv-upload" className="block text-sm font-medium text-slate-700 mb-3">
                Choose CSV file
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition-colors cursor-pointer bg-slate-50">
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">Choose CSV file</p>
                  <p className="text-sm text-slate-500 mt-1">Tab-separated values (TSV/CSV format)</p>
                  {file && (
                    <p className="text-sm text-green-600 mt-2 font-semibold">
                      Selected: {file.name}
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Required Fields Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Required CSV Columns:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Category</strong> - Item category (e.g., Furniture, Jewelry)</li>
                <li>• <strong>Item Name</strong> - Name of the item</li>
                <li>• <strong>Brand</strong> - Brand or manufacturer (optional)</li>
                <li>• <strong>Price Low</strong> - Low price point</li>
                <li>• <strong>Price Medium</strong> - Medium price point</li>
                <li>• <strong>Price High</strong> - High price point</li>
                <li>• <strong>Condition</strong> - excellent, good, fair, poor (optional)</li>
              </ul>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  Successfully imported <strong>{importedCount}</strong> pricing items
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 ml-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Pricing Data'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Format Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Sample CSV Format</h3>
          <p className="text-sm text-slate-600 mb-3">Your CSV should look like this (tab-separated):</p>
          <div className="bg-white rounded border border-slate-200 p-4 overflow-x-auto text-xs font-mono">
            <div>Category	Item Name	Brand	Price Low	Price Medium	Price High	Condition</div>
            <div>Furniture	Dining Table	Oak	150	250	500	good</div>
            <div>Jewelry	Gold Ring	Tiffany	200	400	800	excellent</div>
            <div>Art	Oil Painting	Unknown	300	600	1200	fair</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}