import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';

export default function BatchPricingModal({ 
  open, 
  onClose, 
  images, 
  onPriceUpdated,
  startIndex = 0
}) {
  const [batch, setBatch] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(startIndex);
  const [error, setError] = useState(null);

  const BATCH_SIZE = 10;

  useEffect(() => {
    if (open) {
      setError(null);
      const start = currentBatchIndex;
      const end = Math.min(start + BATCH_SIZE, images.length);
      const newBatch = images.slice(start, end);
      setBatch(newBatch);
      setResults([]);
    }
  }, [open, currentBatchIndex]);

  const generatePricing = async () => {
    setProcessing(true);
    setError(null);
    setResults([]);
    const generatedResults = [];

    try {
      for (let i = 0; i < batch.length; i++) {
        const image = batch[i];
        const actualIndex = currentBatchIndex + i;
        const title = image.name || '';

        if (!title || !title.trim()) {
          generatedResults.push({
            index: actualIndex,
            status: 'skipped',
            error: 'No title - skipped'
          });
          setResults([...generatedResults]);
          continue;
        }

        try {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `CRITICAL: You MUST ONLY use these specific websites for pricing research.

Item: ${title}

First, determine if this item is furniture.

If it IS furniture, you MUST ONLY research prices on EXACTLY these 3 sites:
1. Facebook Marketplace (facebook.com/marketplace)
2. 1stDibs.com
3. Chairish.com

If it is NOT furniture, you MUST ONLY research prices on EXACTLY these 3 sites:
1. eBay (ebay.com)
2. Facebook Marketplace (facebook.com/marketplace)
3. Etsy (etsy.com)

Return ONLY valid JSON with no markdown:
{
  "site1_name": "name of first site",
  "site1_price": numeric price,
  "site2_name": "name of second site",
  "site2_price": numeric price,
  "site3_name": "name of third site",
  "site3_price": numeric price,
  "low_price": lowest price found,
  "high_price": highest price found
}`,
            add_context_from_internet: true,
            response_json_schema: {
              type: 'object',
              properties: {
                site1_name: { type: 'string' },
                site1_price: { type: 'number' },
                site2_name: { type: 'string' },
                site2_price: { type: 'number' },
                site3_name: { type: 'string' },
                site3_price: { type: 'number' },
                low_price: { type: 'number' },
                high_price: { type: 'number' }
              }
            }
          });

          const result = response.data || response;
          const sources = [
            { site: result.site1_name, price: Math.round(result.site1_price || 0) },
            { site: result.site2_name, price: Math.round(result.site2_price || 0) },
            { site: result.site3_name, price: Math.round(result.site3_price || 0) }
          ];

          const avgPrice = Math.round(
            sources.reduce((sum, s) => sum + s.price, 0) / sources.length
          );

          const pricingResult = {
            sources,
            low_price: Math.round(result.low_price || 0),
            high_price: Math.round(result.high_price || 0),
            average_price: avgPrice
          };

          // Auto-fill price if empty
          if (onPriceUpdated && (!image.price || image.price === 0)) {
            onPriceUpdated(actualIndex, avgPrice);
          }

          generatedResults.push({
            index: actualIndex,
            status: 'success',
            pricing: pricingResult
          });
        } catch (err) {
          console.error('Error generating pricing for image', i, err);
          generatedResults.push({
            index: actualIndex,
            status: 'error',
            error: err.message
          });
        }

        setResults([...generatedResults]);

        // Delay between API calls
        if (i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleNextBatch = () => {
    const nextIndex = currentBatchIndex + BATCH_SIZE;
    if (nextIndex < images.length) {
      setResults([]);
      setCurrentBatchIndex(nextIndex);
      setTimeout(() => {
        const start = nextIndex;
        const end = Math.min(start + BATCH_SIZE, images.length);
        setBatch(images.slice(start, end));
        setTimeout(() => generatePricing(), 100);
      }, 0);
    } else {
      onClose();
    }
  };

  const isAllDone = currentBatchIndex + BATCH_SIZE >= images.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate AI Pricing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Processing {currentBatchIndex + 1} to {Math.min(currentBatchIndex + BATCH_SIZE, images.length)} of {images.length} photos
          </div>

          {processing && (
            <div className="space-y-3">
              <Progress value={(results.length / batch.length) * 100} />
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing {results.length} of {batch.length}...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, idx) => {
                const image = batch[idx];
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={image?.url}
                        alt=""
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 text-sm truncate mb-2">
                          {image?.name || 'Untitled'}
                        </h4>
                        
                        {result.status === 'success' && result.pricing && (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              {result.pricing.sources.map((source, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-slate-600">{source.site}</span>
                                  <span className="font-medium">${source.price}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                              <div className="flex justify-between text-sm font-medium text-orange-700">
                                <span>Price Range</span>
                                <span>${result.pricing.low_price} - ${result.pricing.high_price}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Average price (${result.pricing.average_price}) has been filled in the Price field above
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {result.status === 'error' && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{result.error}</span>
                          </div>
                        )}
                        
                        {result.status === 'skipped' && (
                          <div className="text-slate-500 text-sm">{result.error}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!processing && results.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <DollarSign className="w-12 h-12 mx-auto mb-2 text-slate-400" />
              <p>Ready to generate pricing for {batch.length} photos</p>
              <p className="text-xs mt-1">Items without titles will be skipped</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Done for now
            </Button>
            {!processing && results.length === 0 ? (
              <Button 
                onClick={generatePricing}
                disabled={processing || batch.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Generate Pricing
              </Button>
            ) : (
              !processing && (
                <Button 
                  onClick={handleNextBatch}
                  disabled={processing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isAllDone ? 'All Done' : `Do the Next ${Math.min(BATCH_SIZE, images.length - currentBatchIndex - BATCH_SIZE)}`}
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}