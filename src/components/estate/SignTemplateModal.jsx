import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function SignTemplateModal({ open, onClose, sale, operator }) {
  const templateRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!templateRef.current) return;

    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11);
      pdf.save(`${sale?.title || 'estate-sale'}-sign.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sign Template</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleExportPDF} className="bg-orange-600 hover:bg-orange-700" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Letter-sized template: 8.5" x 11" at 96 DPI = 816px x 1056px */}
        <div className="bg-slate-100 p-6 flex items-center justify-center">
          <div 
            ref={templateRef}
            className="bg-white shadow-lg relative"
            style={{
              width: '816px',
              height: '1056px',
              padding: '48px'
            }}
          >
            {/* Main content area - 90% of page */}
            <div style={{ height: '90%' }} className="flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4">
                  {sale?.title || 'Estate Sale'}
                </h1>
                {sale?.property_address && (
                  <p className="text-2xl text-slate-700 mb-6">
                    {sale.property_address.street}
                    <br />
                    {sale.property_address.city}, {sale.property_address.state} {sale.property_address.zip}
                  </p>
                )}
                {sale?.sale_dates && sale.sale_dates.length > 0 && (
                  <div className="mt-8 space-y-2">
                    {sale.sale_dates.map((date, idx) => (
                      <p key={idx} className="text-xl text-slate-800">
                        {new Date(date.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        <br />
                        {date.start_time} - {date.end_time}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Operator info - 10% of page, lower right corner */}
            <div 
              className="absolute bottom-12 right-12 text-right"
              style={{ maxWidth: '300px' }}
            >
              <div className="space-y-1">
                {operator?.company_logo && (
                  <img 
                    src={operator.company_logo} 
                    alt="Company Logo"
                    className="ml-auto mb-2 max-h-12 max-w-32 object-contain"
                  />
                )}
                {operator?.company_name && (
                  <p className="font-semibold text-slate-900 text-sm">{operator.company_name}</p>
                )}
                {operator?.company_address && (
                  <p className="text-xs text-slate-700">{operator.company_address}</p>
                )}
                {operator?.phone && (
                  <p className="text-xs text-slate-700">{operator.phone}</p>
                )}
                {operator?.email && (
                  <p className="text-xs text-slate-700">{operator.email}</p>
                )}
                {operator?.company_website && (
                  <p className="text-xs text-slate-700">{operator.company_website}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #sign-template, #sign-template * {
              visibility: visible;
            }
            #sign-template {
              position: absolute;
              left: 0;
              top: 0;
              width: 8.5in;
              height: 11in;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}