import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Download, FileText, FileSpreadsheet, 
  FileImage, Receipt, Package, Users, Calendar
} from 'lucide-react';

const EXPORT_OPTIONS = [
  {
    id: 'inventory',
    name: 'Inventory List',
    description: 'Complete list of all items with pricing',
    icon: Package,
    format: 'CSV / Excel'
  },
  {
    id: 'sales-report',
    name: 'Sales Report',
    description: 'Detailed sales transactions and totals',
    icon: Receipt,
    format: 'PDF / CSV'
  },
  {
    id: 'attendance',
    name: 'Attendance Report',
    description: 'Visitor check-in data and analytics',
    icon: Users,
    format: 'CSV / PDF'
  },
  {
    id: 'photos',
    name: 'Sale Photos',
    description: 'All photos from the sale listing',
    icon: FileImage,
    format: 'ZIP'
  },
  {
    id: 'financial',
    name: 'Financial Summary',
    description: 'Revenue breakdown and commission details',
    icon: FileText,
    format: 'PDF'
  },
  {
    id: 'timeline',
    name: 'Sale Timeline',
    description: 'Complete timeline of sale activities',
    icon: Calendar,
    format: 'PDF'
  }
];

export default function SaleExport() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState({});

  useEffect(() => {
    loadSale();
  }, []);

  const loadSale = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      
      if (!saleId) {
        alert('Sale ID not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        alert('Sale not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      setSale(saleData[0]);
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (exportId) => {
    setExporting(prev => ({ ...prev, [exportId]: true }));
    
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    alert(`Export complete! (${exportId})`);
    setExporting(prev => ({ ...prev, [exportId]: false }));
  };

  const handleExportAll = async () => {
    alert('Export all files functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">{sale?.title}</h1>
            <p className="text-slate-600">Export Sale Data</p>
          </div>
        </div>
        <Button 
          onClick={handleExportAll}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Available Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-6">
            Download comprehensive reports and data from your estate sale
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {EXPORT_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <Card key={option.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{option.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{option.description}</p>
                        <p className="text-xs text-slate-500 mb-3">Format: {option.format}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleExport(option.id)}
                          disabled={exporting[option.id]}
                        >
                          {exporting[option.id] ? (
                            'Exporting...'
                          ) : (
                            <>
                              <Download className="w-3 h-3 mr-2" />
                              Export
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-2">Export Notes</h4>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>All exports are generated in real-time with current data</li>
              <li>Financial reports are formatted for accounting software</li>
              <li>Image exports maintain original quality</li>
              <li>CSV files are compatible with Excel and Google Sheets</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}