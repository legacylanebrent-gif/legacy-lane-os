import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';

const SIGN_TEMPLATES = [
  { id: 'welcome', name: 'Welcome Sign', description: 'Front door welcome sign' },
  { id: 'pricing', name: 'Pricing Information', description: 'General pricing guidelines' },
  { id: 'payment', name: 'Payment Methods', description: 'Accepted payment methods' },
  { id: 'checkout', name: 'Checkout Area', description: 'Checkout/payment station sign' },
  { id: 'sale-rules', name: 'Sale Rules', description: 'Rules and guidelines for shoppers' },
  { id: 'parking', name: 'Parking Instructions', description: 'Parking location and rules' },
  { id: 'restroom', name: 'Restroom', description: 'Restroom location sign' },
  { id: 'no-entry', name: 'No Entry', description: 'Private/restricted areas' }
];

export default function PrintSigns() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

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
            <p className="text-slate-600">Print Signs & Templates</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Available Sign Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-6">
            Letter-size (8.5" x 11") professional signs for your estate sale. Each template includes your business logo and information.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SIGN_TEMPLATES.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                      <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 p-6 bg-slate-50 rounded-lg text-center">
            <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">
              Sign templates with custom branding coming soon
            </p>
            <p className="text-sm text-slate-500">
              Templates will automatically include your company logo, contact information, and sale details
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}