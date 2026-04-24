import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Printer, FileText, Download, QrCode, CheckSquare, Square } from 'lucide-react';
import QRCode from 'qrcode';

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
  const [qrImages, setQrImages] = useState([]); // { image, qrDataUrl, selected }
  const [generatingQR, setGeneratingQR] = useState(false);
  const [selectedAll, setSelectedAll] = useState(false);

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

      const s = saleData[0];
      setSale(s);
      await generateQRCodes(s);
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = async (s) => {
    const images = (s.images || []).filter(img => img && (img.url || typeof img === 'string'));
    if (images.length === 0) return;

    setGeneratingQR(true);
    const results = [];
    for (const img of images) {
      const imageObj = typeof img === 'string' ? { url: img, name: '' } : img;
      const itemUrl = `${window.location.origin}/EstateSaleDetail?id=${s.id}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(itemUrl, { width: 200, margin: 1 });
        results.push({ image: imageObj, qrDataUrl, selected: true });
      } catch (e) {
        results.push({ image: imageObj, qrDataUrl: null, selected: true });
      }
    }
    setQrImages(results);
    setSelectedAll(true);
    setGeneratingQR(false);
  };

  const toggleSelect = (index) => {
    setQrImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      setSelectedAll(updated.every(q => q.selected));
      return updated;
    });
  };

  const toggleSelectAll = () => {
    const newVal = !selectedAll;
    setSelectedAll(newVal);
    setQrImages(prev => prev.map(q => ({ ...q, selected: newVal })));
  };

  const handlePrintQRSheet = () => {
    const selected = qrImages.filter(q => q.selected && q.qrDataUrl);
    if (selected.length === 0) {
      alert('Please select at least one item to print.');
      return;
    }

    const itemsHtml = selected.map(q => `
      <div class="qr-item">
        <img src="${q.image.url}" alt="item" class="thumb" />
        <img src="${q.qrDataUrl}" alt="QR Code" class="qr" />
        <p class="name">${q.image.name || 'Item'}</p>
      </div>
    `).join('');

    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Sheet - ${sale?.title}</title>
          <style>
            body { margin: 0; padding: 16px; font-family: Arial, sans-serif; background: #fff; }
            h2 { font-size: 18px; margin-bottom: 16px; }
            .grid { display: flex; flex-wrap: wrap; gap: 12px; }
            .qr-item {
              border: 1px solid #ccc;
              border-radius: 6px;
              padding: 10px;
              text-align: center;
              width: 160px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .thumb {
              width: 120px;
              height: 80px;
              object-fit: cover;
              border-radius: 4px;
              margin-bottom: 6px;
              display: block;
              margin-left: auto;
              margin-right: auto;
            }
            .qr {
              width: 120px;
              height: 120px;
              display: block;
              margin: 0 auto 6px;
            }
            .name {
              font-size: 11px;
              font-weight: bold;
              word-break: break-word;
              margin: 0;
              max-height: 36px;
              overflow: hidden;
            }
            @media print {
              body { padding: 8px; }
              .grid { gap: 8px; }
              .qr-item { width: 150px; }
            }
          </style>
        </head>
        <body>
          <h2>QR Codes — ${sale?.title}</h2>
          <div class="grid">${itemsHtml}</div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
            <p className="text-slate-600">Print Signs & QR Codes</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="qrcodes">
        <TabsList>
          <TabsTrigger value="qrcodes" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QR Code Sheet
          </TabsTrigger>
          <TabsTrigger value="signs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Sign Templates
          </TabsTrigger>
        </TabsList>

        {/* QR Code Sheet Tab */}
        <TabsContent value="qrcodes" className="space-y-4">
          {qrImages.length === 0 ? (
            <Card className="p-12 text-center">
              <QrCode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No photos found for this sale.</p>
              <p className="text-sm text-slate-400 mt-2">Add photos in the Sale Editor to generate QR codes.</p>
            </Card>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
                    {selectedAll ? <CheckSquare className="w-5 h-5 text-orange-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                    {selectedAll ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-slate-500">
                    {qrImages.filter(q => q.selected).length} of {qrImages.length} selected
                  </span>
                </div>
                <Button onClick={handlePrintQRSheet} className="bg-orange-600 hover:bg-orange-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Selected QR Codes
                </Button>
              </div>

              {generatingQR && (
                <div className="text-center py-8 text-slate-500">
                  <div className="w-8 h-8 border-4 border-orange-400 border-t-orange-600 rounded-full animate-spin mx-auto mb-3"></div>
                  Generating QR codes...
                </div>
              )}

              {/* QR Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {qrImages.map((q, index) => (
                  <div
                    key={index}
                    onClick={() => toggleSelect(index)}
                    className={`relative cursor-pointer rounded-lg border-2 p-2 text-center transition-all ${
                      q.selected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-1.5 right-1.5">
                      <Checkbox checked={q.selected} onCheckedChange={() => toggleSelect(index)} onClick={e => e.stopPropagation()} />
                    </div>

                    {/* Product thumbnail */}
                    <img
                      src={q.image.url}
                      alt={q.image.name || `Item ${index + 1}`}
                      className="w-full aspect-square object-cover rounded mb-2"
                    />

                    {/* QR Code */}
                    {q.qrDataUrl && (
                      <img src={q.qrDataUrl} alt="QR Code" className="w-full aspect-square mb-1" />
                    )}

                    {/* Title */}
                    <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-tight">
                      {q.image.name || `Item ${index + 1}`}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Sign Templates Tab */}
        <TabsContent value="signs">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}