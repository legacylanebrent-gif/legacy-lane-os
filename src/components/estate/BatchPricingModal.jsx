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
  onPricingGenerated,
  saleId,
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
            prompt: `You are a professional estate sale pricing expert. Analyze the provided image and item title to determine accurate current market pricing for estate sale context.

ITEM: ${title}

INSTRUCTIONS:
1. First, look at the image and title to understand what this item actually is - its style, condition, age, brand, materials, etc.

2. Determine the category:
   - If it's FURNITURE (chairs, tables, sofas, beds, dressers, cabinets, etc.) → Use: Facebook Marketplace, 1stDibs, Chairish
   - If it's NOT furniture (jewelry, art, collectibles, kitchenware, decor, etc.) → Use: eBay, Facebook Marketplace, Etsy

3. Search ONLY the 3 specified sites for this exact or very similar items:
   - Look for SOLD/COMPLETED listings when possible (actual selling prices, not asking prices)
   - Find items in similar condition
   - Consider brand, age, style, and materials
   - For common items, use typical market value
   - For unique/antique items, research comparable sales

4. Be realistic for estate sale pricing:
   - Estate sale items typically sell for 30-50% less than retail
   - Used condition, not new
   - Quick sale context
   - Price to sell, not to sit

5. Return 3 real prices from your research on the specified sites, plus a realistic price range.

Return ONLY valid JSON:
{
  "site1_name": "exact site name",
  "site1_price": actual_number,
  "site2_name": "exact site name", 
  "site2_price": actual_number,
  "site3_name": "exact site name",
  "site3_price": actual_number,
  "low_price": realistic_low_end,
  "high_price": realistic_high_end
}`,
            add_context_from_internet: true,
            file_urls: [image.url],
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

          // Store pricing data for display
          if (onPricingGenerated) {
            onPricingGenerated(actualIndex, pricingResult);
          }

          // Save to database if saleId exists
          if (saleId) {
            try {
              const existingPricing = await base44.entities.ItemPricing.filter({ 
                sale_id: saleId, 
                photo_url: image.url 
              });
              
              const pricingData = {
                sale_id: saleId,
                photo_url: image.url,
                low_price: pricingResult.low_price,
                high_price: pricingResult.high_price,
                sources: pricingResult.sources
              };

              if (existingPricing.length > 0) {
                await base44.entities.ItemPricing.update(existingPricing[0].id, pricingData);
              } else {
                await base44.entities.ItemPricing.create(pricingData);
              }
            } catch (dbError) {
              console.error('Error saving pricing to database:', dbError);
            }
          }

          generatedResults.push({
            index: actualIndex,
            status: 'success'
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
            <div className="space-y-2">
              {results.map((result, idx) => {
                const image = batch[idx];
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                    <img
                      src={image?.url}
                      alt=""
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-sm">
                      <p className="font-medium text-slate-900 truncate">{image?.name || 'Untitled'}</p>
                      {result.status === 'success' && <p className="text-green-600 text-xs">✓ Pricing generated</p>}
                      {result.status === 'error' && <p className="text-red-600 text-xs">✗ {result.error}</p>}
                      {result.status === 'skipped' && <p className="text-slate-500 text-xs">⊘ {result.error}</p>}
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