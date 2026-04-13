import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Scan, DollarSign, ExternalLink, ChevronLeft, ChevronRight, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function SalePricingTool() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [pricingResults, setPricingResults] = useState({});
  const [loadingPhoto, setLoadingPhoto] = useState(null);
  const [savedPricings, setSavedPricings] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [processingAll, setProcessingAll] = useState(false);
  const [userPrices, setUserPrices] = useState({});

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    if (selectedSale) {
      const imgs = (selectedSale.images || []).map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
      setPhotos(imgs);
      setCurrentPhotoIndex(0);
      loadSavedPricings(selectedSale.id);
    }
  }, [selectedSale]);

  const loadSales = async () => {
    try {
      const data = await base44.entities.EstateSale.list('-created_date', 50);
      setSales(data.filter(s => s.images && s.images.length > 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSales(false);
    }
  };

  const loadSavedPricings = async (saleId) => {
    try {
      const data = await base44.entities.SaleItemPricing.filter({ sale_id: saleId });
      setSavedPricings(data);
      // Pre-populate results from saved
      const saved = {};
      data.forEach(p => { saved[p.image_url] = p; });
      setPricingResults(saved);
    } catch (e) {
      console.error(e);
    }
  };

  const analyzePhoto = async (imageUrl) => {
    setLoadingPhoto(imageUrl);
    try {
      const res = await base44.functions.invoke('googleLensPricing', {
        image_url: imageUrl,
        sale_id: selectedSale.id,
      });
      setPricingResults(prev => ({ ...prev, [imageUrl]: res.data }));
      // Reload saved
      await loadSavedPricings(selectedSale.id);
    } catch (e) {
      console.error(e);
      setPricingResults(prev => ({ ...prev, [imageUrl]: { error: e.message } }));
    } finally {
      setLoadingPhoto(null);
    }
  };

  const analyzeAll = async () => {
    setProcessingAll(true);
    for (const photo of photos) {
      if (!pricingResults[photo]) {
        await analyzePhoto(photo);
        await new Promise(r => setTimeout(r, 1000)); // rate limit
      }
    }
    setProcessingAll(false);
  };

  const saveUserPrice = async (imageUrl, price) => {
    const existing = savedPricings.find(p => p.image_url === imageUrl);
    if (existing) {
      await base44.entities.SaleItemPricing.update(existing.id, { user_price: parseFloat(price) });
      await loadSavedPricings(selectedSale.id);
    }
  };

  const currentPhoto = photos[currentPhotoIndex];
  const currentResult = currentPhoto ? pricingResults[currentPhoto] : null;
  const analyzedCount = Object.keys(pricingResults).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
          <Scan className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Google Lens Pricing Tool</h1>
          <p className="text-sm text-slate-500">Analyze sale photos to get real market pricing</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sale Selector */}
        <div className="lg:col-span-1">
          <h2 className="font-semibold text-slate-700 mb-3">Select a Sale</h2>
          {loadingSales ? (
            <div className="text-slate-400 text-sm">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
              {sales.map(sale => (
                <button
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                    selectedSale?.id === sale.id
                      ? 'bg-orange-50 border-orange-400 text-orange-800'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="font-medium truncate">{sale.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{sale.images?.length || 0} photos</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {!selectedSale ? (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-400">Select a sale to start pricing photos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">{selectedSale.title}</h2>
                  <p className="text-sm text-slate-500">{analyzedCount} of {photos.length} photos analyzed</p>
                </div>
                <Button
                  onClick={analyzeAll}
                  disabled={processingAll || analyzedCount === photos.length}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {processingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}
                  {processingAll ? 'Analyzing...' : 'Analyze All Photos'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Viewer */}
                <div className="bg-white rounded-xl border p-4">
                  {currentPhoto ? (
                    <>
                      <div className="relative">
                        <img src={currentPhoto} alt="Sale item" className="w-full h-64 object-contain rounded-lg bg-slate-50" />
                        <div className="absolute top-2 right-2">
                          {currentResult && !currentResult.error ? (
                            <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Analyzed</Badge>
                          ) : loadingPhoto === currentPhoto ? (
                            <Badge className="bg-orange-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scanning...</Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPhotoIndex(i => Math.max(0, i - 1))} disabled={currentPhotoIndex === 0}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-slate-500">{currentPhotoIndex + 1} / {photos.length}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPhotoIndex(i => Math.min(photos.length - 1, i + 1))} disabled={currentPhotoIndex === photos.length - 1}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        onClick={() => analyzePhoto(currentPhoto)}
                        disabled={loadingPhoto === currentPhoto}
                        className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
                      >
                        {loadingPhoto === currentPhoto
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning with Google Lens...</>
                          : currentResult
                          ? <><RefreshCw className="w-4 h-4 mr-2" />Re-analyze</>
                          : <><Scan className="w-4 h-4 mr-2" />Analyze This Photo</>
                        }
                      </Button>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">No photos</div>
                  )}
                </div>

                {/* Results Panel */}
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-slate-800 mb-3">Google Lens Results</h3>
                  {!currentResult ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      Click "Analyze This Photo" to get pricing
                    </div>
                  ) : currentResult.error ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" /> {currentResult.error}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500">Identified Item</p>
                        <p className="font-semibold text-slate-900">{currentResult.item_title || currentResult.knowledge_graph?.title || 'Unknown'}</p>
                        {currentResult.knowledge_graph?.type && (
                          <Badge variant="secondary" className="text-xs mt-1">{currentResult.knowledge_graph.type}</Badge>
                        )}
                      </div>

                      {currentResult.price_range?.avg && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Market Price Range</p>
                          <div className="flex gap-3">
                            <div className="text-center">
                              <p className="text-xs text-slate-400">Low</p>
                              <p className="font-bold text-green-700">${currentResult.price_range.min}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-400">Avg</p>
                              <p className="font-bold text-orange-600 text-lg">${currentResult.price_range.avg}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-400">High</p>
                              <p className="font-bold text-green-700">${currentResult.price_range.max}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-slate-500 mb-1">Set Your Sale Price</p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter price..."
                            value={userPrices[currentPhoto] || ''}
                            onChange={e => setUserPrices(prev => ({ ...prev, [currentPhoto]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                          <Button size="sm" onClick={() => saveUserPrice(currentPhoto, userPrices[currentPhoto])} className="bg-slate-800">
                            <DollarSign className="w-3 h-3 mr-1" />Save
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        <p className="text-xs font-medium text-slate-500">Top Matches</p>
                        {(currentResult.matches || []).filter(m => m.price).slice(0, 5).map((match, i) => (
                          <a key={i} href={match.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">{match.title}</p>
                              <p className="text-xs text-slate-400">{match.source}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <span className="text-xs font-bold text-green-700">{match.price}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Table */}
              {savedPricings.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 border-b bg-slate-50">
                    <h3 className="font-semibold text-slate-800">Pricing Table — {selectedSale.title}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-xs text-slate-500">
                          <th className="text-left px-4 py-2">Photo</th>
                          <th className="text-left px-4 py-2">Item</th>
                          <th className="text-right px-4 py-2">Min</th>
                          <th className="text-right px-4 py-2">Avg</th>
                          <th className="text-right px-4 py-2">Max</th>
                          <th className="text-right px-4 py-2">Sale Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedPricings.map((pricing, i) => (
                          <tr key={i} className="border-b hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <img src={pricing.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                            </td>
                            <td className="px-4 py-2">
                              <p className="font-medium text-slate-800">{pricing.item_title}</p>
                              {pricing.knowledge_graph_type && (
                                <p className="text-xs text-slate-400">{pricing.knowledge_graph_type}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-600">{pricing.price_min ? `$${pricing.price_min}` : '—'}</td>
                            <td className="px-4 py-2 text-right font-semibold text-orange-600">{pricing.price_avg ? `$${pricing.price_avg}` : '—'}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{pricing.price_max ? `$${pricing.price_max}` : '—'}</td>
                            <td className="px-4 py-2 text-right font-bold text-green-700">{pricing.user_price ? `$${pricing.user_price}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}