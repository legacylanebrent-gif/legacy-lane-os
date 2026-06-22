import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Download, FileText, FileSpreadsheet, 
  FileImage, Receipt, Package, Users, Calendar, Scan, FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';

const EXPORT_OPTIONS = [
  {
    id: 'pricing-list',
    name: 'Pricing List',
    description: 'Google Lens pricing results with market ranges and sale prices',
    icon: Scan,
    format: 'CSV / PDF'
  },
  {
    id: 'inventory',
    name: 'Inventory List',
    description: 'Complete list of all items with pricing',
    icon: Package,
    formats: ['csv', 'pdf']
  },
  {
    id: 'sales-report',
    name: 'Sales Report',
    description: 'Detailed sales transactions and totals',
    icon: Receipt,
    formats: ['pdf', 'csv']
  },
  {
    id: 'attendance',
    name: 'Attendance Report',
    description: 'Visitor check-in data and analytics',
    icon: Users,
    formats: ['csv', 'pdf']
  },
  {
    id: 'photos',
    name: 'Sale Photos',
    description: 'All photos from the sale listing',
    icon: FileImage,
    formats: ['zip']
  },
  {
    id: 'financial',
    name: 'Financial Summary',
    description: 'Revenue breakdown and commission details',
    icon: FileText,
    formats: ['pdf']
  },
  {
    id: 'timeline',
    name: 'Sale Timeline',
    description: 'Complete timeline of sale activities',
    icon: Calendar,
    formats: ['pdf']
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

    try {
      // Pricing List
      if (exportId === 'pricing-list-csv' || exportId === 'pricing-list-pdf') {
        const pricings = await base44.entities.SaleItemPricing.filter({ sale_id: sale.id });
        if (pricings.length === 0) {
          alert('No pricing data found. Use the Pricing Tool to analyze photos first.');
          return;
        }
        const headers = ['Item', 'Type', 'Min Price', 'Avg Price', 'Max Price', 'Sale Price'];
        const rows = pricings.map(p => [
          p.item_title || '',
          p.knowledge_graph_type || '',
          p.price_min || '',
          p.price_avg || '',
          p.price_max || '',
          p.user_price || ''
        ]);

        if (exportId === 'pricing-list-pdf') {
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 40;
          const tableWidth = pageWidth - margin * 2;
          const colWidths = [tableWidth * 0.35, tableWidth * 0.15, tableWidth * 0.12, tableWidth * 0.12, tableWidth * 0.12, tableWidth * 0.14];
          let y = margin;

          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(`${sale.title} — Pricing List`, margin, y);
          y += 24;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y - 12, tableWidth, 18, 'F');
          let x = margin;
          headers.forEach((h, i) => {
            doc.text(h, x + 4, y);
            x += colWidths[i];
          });
          y += 18;

          doc.setFont('helvetica', 'normal');
          rows.forEach((row, rowIdx) => {
            if (y > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              y = margin;
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, y - 12, tableWidth, 18, 'F');
              doc.setFont('helvetica', 'bold');
              x = margin;
              headers.forEach((h, i) => { doc.text(h, x + 4, y); x += colWidths[i]; });
              y += 18;
              doc.setFont('helvetica', 'normal');
            }
            if (rowIdx % 2 === 0) {
              doc.setFillColor(248, 248, 252);
              doc.rect(margin, y - 12, tableWidth, 16, 'F');
            }
            x = margin;
            row.forEach((cell, i) => {
              const val = cell !== '' && i >= 2 ? `$${cell}` : cell;
              doc.text(String(val).substring(0, 60), x + 4, y);
              x += colWidths[i];
            });
            y += 16;
          });

          doc.save(`${sale.title.replace(/[^a-z0-9]/gi, '_')}_pricing.pdf`);
          return;
        }

        const csv = [headers, ...rows]
          .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sale.title.replace(/[^a-z0-9]/gi, '_')}_pricing.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Inventory List
      if (exportId === 'inventory-csv' || exportId === 'inventory-pdf') {
        const items = sale.images || [];
        if (items.length === 0) {
          alert('No inventory items found.');
          return;
        }
        const headers = ['Item Name', 'Description', 'Category', 'Price', 'Status'];
        const rows = items.map(img => [
          typeof img === 'object' ? (img.name || '') : '',
          typeof img === 'object' ? (img.description || '') : '',
          typeof img === 'object' ? ((img.categories || []).join(', ')) : '',
          typeof img === 'object' ? (img.price || '') : '',
          typeof img === 'object' ? (img.status || 'available') : ''
        ]);

        if (exportId === 'inventory-pdf') {
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 40;
          const tableWidth = pageWidth - margin * 2;
          const colWidths = [tableWidth * 0.3, tableWidth * 0.35, tableWidth * 0.15, tableWidth * 0.1, tableWidth * 0.1];
          let y = margin;

          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(`${sale.title} — Inventory List`, margin, y);
          y += 24;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y - 12, tableWidth, 18, 'F');
          let x = margin;
          headers.forEach((h, i) => {
            doc.text(h, x + 4, y);
            x += colWidths[i];
          });
          y += 18;

          doc.setFont('helvetica', 'normal');
          rows.forEach((row, rowIdx) => {
            if (y > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              y = margin;
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, y - 12, tableWidth, 18, 'F');
              doc.setFont('helvetica', 'bold');
              x = margin;
              headers.forEach((h, i) => { doc.text(h, x + 4, y); x += colWidths[i]; });
              y += 18;
              doc.setFont('helvetica', 'normal');
            }
            if (rowIdx % 2 === 0) {
              doc.setFillColor(248, 248, 252);
              doc.rect(margin, y - 12, tableWidth, 16, 'F');
            }
            x = margin;
            row.forEach((cell, i) => {
              const val = i === 3 && cell !== '' ? `$${cell}` : cell;
              doc.text(String(val).substring(0, 50), x + 4, y);
              x += colWidths[i];
            });
            y += 16;
          });

          doc.save(`${sale.title.replace(/[^a-z0-9]/gi, '_')}_inventory.pdf`);
          return;
        }

        const csv = [headers, ...rows]
          .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sale.title.replace(/[^a-z0-9]/gi, '_')}_inventory.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Sales Report
      if (exportId === 'sales-report-pdf' || exportId === 'sales-report-csv') {
        const headers = ['Date', 'Item', 'Price', 'Payment Method', 'Buyer'];
        const rows = [];
        const revenue = sale.actual_revenue || 0;
        rows.push(['Total Revenue', '', `$${revenue}`, '', '']);

        if (exportId === 'sales-report-pdf') {
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 40;
          const tableWidth = pageWidth - margin * 2;
          const colWidths = [tableWidth * 0.2, tableWidth * 0.35, tableWidth * 0.15, tableWidth * 0.15, tableWidth * 0.15];
          let y = margin;

          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(`${sale.title} — Sales Report`, margin, y);
          y += 24;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y - 12, tableWidth, 18, 'F');
          let x = margin;
          headers.forEach((h, i) => {
            doc.text(h, x + 4, y);
            x += colWidths[i];
          });
          y += 18;

          doc.setFont('helvetica', 'normal');
          rows.forEach((row, rowIdx) => {
            if (y > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              y = margin;
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, y - 12, tableWidth, 18, 'F');
              doc.setFont('helvetica', 'bold');
              x = margin;
              headers.forEach((h, i) => { doc.text(h, x + 4, y); x += colWidths[i]; });
              y += 18;
              doc.setFont('helvetica', 'normal');
            }
            if (rowIdx % 2 === 0) {
              doc.setFillColor(248, 248, 252);
              doc.rect(margin, y - 12, tableWidth, 16, 'F');
            }
            x = margin;
            row.forEach((cell, i) => {
              doc.text(String(cell).substring(0, 50), x + 4, y);
              x += colWidths[i];
            });
            y += 16;
          });

          doc.save(`${sale.title.replace(/[^a-z0-9]/gi, '_')}_sales_report.pdf`);
          return;
        }

        const csv = [headers, ...rows]
          .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sale.title.replace(/[^a-z0-9]/gi, '_')}_sales_report.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Attendance Report
      if (exportId === 'attendance-csv' || exportId === 'attendance-pdf') {
        const signIns = await base44.entities.EarlySignIn.filter({ sale_id: sale.id });
        const headers = ['Name', 'Email', 'Sale Date', 'Signed At'];
        const rows = signIns.map(s => [
          s.user_name || '',
          s.user_email || '',
          s.sale_date || '',
          s.signed_at || ''
        ]);

        if (exportId === 'attendance-pdf') {
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 40;
          const tableWidth = pageWidth - margin * 2;
          const colWidths = [tableWidth * 0.25, tableWidth * 0.3, tableWidth * 0.2, tableWidth * 0.25];
          let y = margin;

          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(`${sale.title} — Attendance Report`, margin, y);
          y += 24;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y - 12, tableWidth, 18, 'F');
          let x = margin;
          headers.forEach((h, i) => {
            doc.text(h, x + 4, y);
            x += colWidths[i];
          });
          y += 18;

          doc.setFont('helvetica', 'normal');
          rows.forEach((row, rowIdx) => {
            if (y > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              y = margin;
              doc.setFillColor(240, 240, 240);
              doc.rect(margin, y - 12, tableWidth, 18, 'F');
              doc.setFont('helvetica', 'bold');
              x = margin;
              headers.forEach((h, i) => { doc.text(h, x + 4, y); x += colWidths[i]; });
              y += 18;
              doc.setFont('helvetica', 'normal');
            }
            if (rowIdx % 2 === 0) {
              doc.setFillColor(248, 248, 252);
              doc.rect(margin, y - 12, tableWidth, 16, 'F');
            }
            x = margin;
            row.forEach((cell, i) => {
              doc.text(String(cell).substring(0, 50), x + 4, y);
              x += colWidths[i];
            });
            y += 16;
          });

          doc.save(`${sale.title.replace(/[^a-z0-9]/gi, '_')}_attendance.pdf`);
          return;
        }

        const csv = [headers, ...rows]
          .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sale.title.replace(/[^a-z0-9]/gi, '_')}_attendance.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Photos (ZIP - placeholder)
      if (exportId === 'photos-zip') {
        alert('Photo export coming soon!');
        return;
      }

      // Financial Summary (PDF)
      if (exportId === 'financial-pdf') {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
        const margin = 40;
        let y = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sale.title} — Financial Summary`, margin, y);
        y += 36;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lines = [
          `Total Revenue: $${sale.actual_revenue || 0}`,
          `Commission Rate: ${sale.commission_rate || 0}%`,
          `Commission Earned: $${sale.commission_earned || 0}`,
          `Total Items: ${sale.total_items || 0}`,
          `Views: ${sale.views || 0}`,
          `Saves: ${sale.saves || 0}`
        ];
        lines.forEach(line => {
          doc.text(line, margin, y);
          y += 20;
        });

        doc.save(`${sale.title.replace(/[^a-z0-9]/gi, '_')}_financial.pdf`);
        return;
      }

      // Timeline (PDF)
      if (exportId === 'timeline-pdf') {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
        const margin = 40;
        let y = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sale.title} — Sale Timeline`, margin, y);
        y += 36;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const saleDates = sale.sale_dates || [];
        if (saleDates.length > 0) {
          saleDates.forEach((sd, i) => {
            doc.text(`Day ${i + 1}: ${sd.date || ''} from ${sd.start_time || ''} to ${sd.end_time || ''}`, margin, y);
            y += 20;
          });
        } else {
          doc.text('No sale dates scheduled.', margin, y);
        }

        doc.save(`${sale.title.replace(/[^a-z0-9]/gi, '_')}_timeline.pdf`);
        return;
      }

      alert(`Export complete! (${exportId})`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(prev => ({ ...prev, [exportId]: false }));
    }
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
                        <div className="flex gap-2">
                          {option.formats.map(fmt => (
                            <Button 
                              key={fmt}
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleExport(`${option.id}-${fmt}`)}
                              disabled={exporting[`${option.id}-${fmt}`]}
                            >
                              {exporting[`${option.id}-${fmt}`] ? 'Exporting...' : (
                                <>
                                  {fmt === 'pdf' ? <FileDown className="w-3 h-3 mr-2" /> : <Download className="w-3 h-3 mr-2" />}
                                  {fmt.toUpperCase()}
                                </>
                              )}
                            </Button>
                          ))}
                        </div>
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