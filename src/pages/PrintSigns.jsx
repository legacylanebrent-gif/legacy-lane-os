import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Printer, FileText, Download, QrCode, CheckSquare, Square, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode';
import { SIGN_TEMPLATES, SIGN_CATEGORIES } from '@/components/signs/signTemplatesData';
import SignTemplateCard from '@/components/signs/SignTemplateCard';

export default function PrintSigns() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [qrImages, setQrImages] = useState([]); // { image, qrDataUrl, selected }
  const [generatingQR, setGeneratingQR] = useState(false);
  const [selectedAll, setSelectedAll] = useState(false);
  const [signSearch, setSignSearch] = useState('');
  const [signCategoryFilter, setSignCategoryFilter] = useState('all');

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

      const [userData, saleData, itemsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.EstateSale.filter({ id: saleId }),
        base44.entities.Item.filter({ estate_sale_id: saleId })
      ]);

      setCurrentUser(userData);

      if (saleData.length === 0) {
        alert('Sale not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      const s = saleData[0];
      setSale(s);
      await generateQRCodes(s, itemsData);
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = async (s, marketplaceItems = []) => {
    const images = (s.images || []).filter(img => img && (img.url || typeof img === 'string'));
    if (images.length === 0) return;

    // Build a map from image URL -> marketplace item id
    const imageToItemId = {};
    for (const item of marketplaceItems) {
      for (const imgUrl of (item.images || [])) {
        if (imgUrl) imageToItemId[imgUrl] = item.id;
      }
    }

    setGeneratingQR(true);
    const results = [];
    for (const img of images) {
      const imageObj = typeof img === 'string' ? { url: img, name: '' } : img;
      const matchedItemId = imageToItemId[imageObj.url];
      const targetUrl = matchedItemId
        ? `${window.location.origin}/ItemDetail?itemId=${matchedItemId}`
        : `${window.location.origin}/EstateSaleDetail?id=${s.id}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 200, margin: 1 });
        results.push({ image: imageObj, qrDataUrl, selected: true, linkedToItem: !!matchedItemId });
      } catch (e) {
        results.push({ image: imageObj, qrDataUrl: null, selected: true, linkedToItem: false });
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

    const printWindow = window.open('', '', 'width=900,height=1100');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Sheet - ${sale?.title}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif; 
              background: #fff;
              width: 8.5in;
              min-height: 11in;
              margin: 0 auto;
            }
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
              @page { size: letter; margin: 0.5in; }
              body { 
                padding: 0; 
                width: 8.5in; 
                min-height: 11in;
                margin: 0;
              }
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

      <Tabs defaultValue="signs">
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
                    <span className={`text-[9px] mt-1 inline-block px-1 rounded ${q.linkedToItem ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {q.linkedToItem ? '→ Item Page' : '→ Sale Page'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Sign Templates Tab */}
        <TabsContent value="signs" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-lg p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search signs..."
                value={signSearch}
                onChange={(e) => setSignSearch(e.target.value)}
                className="pl-9 pr-8 text-sm"
              />
              {signSearch && (
                <button onClick={() => setSignSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSignCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${signCategoryFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >All ({SIGN_TEMPLATES.length})</button>
              {SIGN_CATEGORIES.map(cat => {
                const count = SIGN_TEMPLATES.filter(t => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSignCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${signCategoryFilter === cat.id ? 'bg-slate-800 text-white border-slate-800' : `${cat.color} hover:opacity-80`}`}
                  >{cat.name} ({count})</button>
                );
              })}
            </div>
          </div>

          {/* Signs Grid */}
          {(() => {
            const q = signSearch.toLowerCase();
            const filtered = SIGN_TEMPLATES.filter(t => {
              const matchesSearch = !q || t.name.toLowerCase().includes(q);
              const matchesCat = signCategoryFilter === 'all' || t.category === signCategoryFilter;
              return matchesSearch && matchesCat;
            });

            const getOperatorLogo = () => {
              return currentUser?.logo_dark || currentUser?.logo_light || currentUser?.company_logo_url || currentUser?.company_logo || '';
            };

            const generateSignHtml = (template, forView = false) => {
              const logoUrl = getOperatorLogo();
              const bg = forView ? 'background: #f8fafc;' : '';
              
              // Dynamic font size: shorter text = bigger, up to 120px
              const charCount = template.name.length;
              const fontSize = charCount <= 10 ? 120 : charCount <= 16 ? 100 : charCount <= 24 ? 80 : charCount <= 36 ? 64 : 52;

              return `<html><head><title>${template.name}</title>
                <style>
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  html, body { 
                    ${forView ? 'height: 100%; display: flex; align-items: center; justify-content: center; background: #f8fafc;' : 'height: auto;'}
                    font-family: Arial, Helvetica, sans-serif; 
                  }
                  .letter-page {
                    ${forView ? 'width: 816px; height: 1056px; margin: 20px auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 4px; overflow: hidden;' : 'width: 8.5in; height: 11in; margin: 0;'}
                    border: 3px solid #1e293b;
                    display: flex; flex-direction: column;
                    padding: 48px;
                    page-break-after: always;
                    break-after: page;
                  }
                  .sign-content {
                    flex: 1;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    text-align: center;
                  }
                  .sign-content h1 {
                    font-size: ${fontSize}px; font-family: 'Arial Black', Gadget, sans-serif; font-weight: 900; margin: 0; color: #1e293b;
                    text-transform: uppercase; letter-spacing: 4px; line-height: 1.15;
                    word-break: break-word; max-width: 100%;
                  }
                  .sign-content .body { font-size: 28px; color: #334155; white-space: pre-line; line-height: 1.6; }
                  .logo-footer {
                    display: flex; justify-content: flex-end; align-items: flex-end;
                    padding-top: 12px; width: 100%;
                  }
                  .logo-footer img {
                    max-height: 192px; max-width: 600px; object-fit: contain;
                  }
                  @media print {
                    @page { size: letter; margin: 0.5in; }
                    html, body { 
                      height: auto; 
                      margin: 0; 
                      padding: 0; 
                      print-color-adjust: exact; 
                      -webkit-print-color-adjust: exact; 
                    }
                    .letter-page { 
                      width: 8.5in; 
                      height: 11in; 
                      border: 3px solid #000; 
                      box-shadow: none; 
                      margin: 0; 
                      border-radius: 0;
                      page-break-after: always;
                      break-after: page;
                    }
                  }
                </style></head><body>
                <div class="letter-page">
                  <div class="sign-content">
                    <h1>${template.name}</h1>
                    ${template.content && template.id !== 'garage-arrow' ? `<div class="body">${template.content}</div>` : ''}
                  </div>
                  ${logoUrl ? `<div class="logo-footer"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
                </div>
                ${forView ? '' : '<script>window.onload = () => window.print();</script>'}
              </body></html>`;
            };

            const handlePrintSign = (template) => {
              const printWindow = window.open('', '', 'width=850,height=1100');
              printWindow.document.write(generateSignHtml(template));
              printWindow.document.close();
            };

            const handleDownloadSign = (template) => {
              const html = generateSignHtml(template);
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${template.name.replace(/[^a-z0-9]/gi, '-')}.html`;
              a.click();
              URL.revokeObjectURL(url);
            };

            const handleViewSign = (template) => {
              const viewWindow = window.open('', '', 'width=880,height=1140');
              viewWindow.document.write(generateSignHtml(template, true));
              viewWindow.document.close();
            };

            const handleEditSign = (template) => {
              alert(`Edit functionality for "${template.name}" — content will be added soon.`);
            };

            const getCategoryColor = (catId) => {
              const cat = SIGN_CATEGORIES.find(c => c.id === catId);
              return cat?.color || 'bg-slate-100 text-slate-500 border-slate-200';
            };

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No signs match your search.</p>
                </div>
              );
            }

            // Group by category
            const grouped = {};
            filtered.forEach(t => {
              if (!grouped[t.category]) grouped[t.category] = [];
              grouped[t.category].push(t);
            });

            return Object.entries(grouped).map(([catId, templates]) => {
              const cat = SIGN_CATEGORIES.find(c => c.id === catId);
              return (
                <div key={catId} className="space-y-3">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${cat?.color?.split(' ')[0] || 'bg-slate-300'}`} />
                    {cat?.name || catId} ({templates.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map(template => (
                      <SignTemplateCard
                        key={template.id}
                        template={template}
                        categoryColor={getCategoryColor(catId)}
                        onView={handleViewSign}
                        onEdit={handleEditSign}
                        onPrint={handlePrintSign}
                        onDownload={handleDownloadSign}
                      />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}