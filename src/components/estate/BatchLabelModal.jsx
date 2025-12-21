import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function BatchLabelModal({ open, onClose, images, saleId, onLabelsApplied }) {
  const [processing, setProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, successful: 0, failed: 0 });
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState([]);
  const [workingImages, setWorkingImages] = useState([]);

  const BATCH_SIZE = 10;

  React.useEffect(() => {
    if (open) {
      setWorkingImages([...images]);
    }
  }, [open]);

  const processBatch = async (startIndex) => {
    // Use local variable to accumulate changes within the loop
    let currentImages = workingImages.length > 0 ? [...workingImages] : [...images];
    const unlabeledImages = currentImages.filter(img => !img.name || img.name.trim() === '');
    const endIndex = Math.min(startIndex + BATCH_SIZE, unlabeledImages.length);
    const batchImages = unlabeledImages.slice(startIndex, endIndex);

    setProgress({ 
      current: 0, 
      total: batchImages.length,
      successful: 0,
      failed: 0
    });
    setProcessing(true);

    const batchResults = [];

    for (let i = 0; i < batchImages.length; i++) {
      const image = batchImages[i];
      // Find index in the current working array
      const imageIndex = currentImages.findIndex(img => img.url === image.url);
      
      setProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        let imageUrl = image.url;
        if (typeof imageUrl === 'object' && imageUrl.url) {
          imageUrl = imageUrl.url;
        }

        const prompt = `You are analyzing a photo from an estate sale to help label and price items.

Look at this estate sale photo and provide:
1. A clear, concise name for the item (3-5 words max)
2. A brief description (1-2 sentences about condition, style, features)
3. Two realistic price estimates:
   - New price: What this item would cost brand new in a store
   - Used price: A realistic estate sale price based on condition
4. Detailed price comparisons from specific sources with actual prices found on each site

Be specific and practical. Focus on the main item in the photo.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: [imageUrl],
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              new_price: { type: "number", description: "Estimated retail price if brand new" },
              used_price: { type: "number", description: "Realistic estate sale price" },
              price_comparisons: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    source: { type: "string", description: "Website name (e.g., Amazon, eBay, Wayfair)" },
                    price: { type: "number", description: "Price found on this website" },
                    condition: { type: "string", description: "New or Used" }
                  }
                },
                description: "Detailed price comparisons from different websites"
              },
              suggested_categories: { 
                type: "array",
                items: { type: "string" },
                description: "Relevant categories from: Furniture, Art & Collectibles, Jewelry, Antiques, Electronics, Home Decor, Kitchen & Dining, Tools & Equipment, Books & Media, Clothing & Accessories, Outdoor & Garden, Other"
              }
            }
          }
        });

        // Update the local array (not state yet - that's async)
        currentImages[imageIndex] = {
          ...currentImages[imageIndex],
          name: result.name || '',
          description: result.description || '',
          price: result.used_price ? parseFloat(result.used_price) : null,
          categories: result.suggested_categories || []
        };
        
        // Update parent component state immediately with current array
        onLabelsApplied([...currentImages]);
        
        // Save to database immediately
        if (saleId) {
          try {
            await base44.entities.EstateSale.update(saleId, {
              images: currentImages
            });
          } catch (error) {
            console.error('Error saving labels to database:', error);
          }
        }

        // Save to product database
        try {
          const existingEntries = await base44.entities.ProductDatabase.filter({
            thumbnail_url: imageUrl,
            sale_id: saleId
          });

          const saveData = {
            title: result.name || '',
            description: result.description || '',
            suggested_new_price: result.new_price ? parseFloat(result.new_price) : null,
            suggested_used_price: result.used_price ? parseFloat(result.used_price) : null,
            actual_price: result.used_price ? parseFloat(result.used_price) : null,
            categories: result.suggested_categories || []
          };

          if (existingEntries.length > 0) {
            await base44.entities.ProductDatabase.update(existingEntries[0].id, saveData);
          } else {
            await base44.entities.ProductDatabase.create({
              thumbnail_url: imageUrl,
              sale_id: saleId,
              ...saveData
            });
          }
        } catch (error) {
          console.error('Error saving to product database:', error);
        }

        batchResults.push({ 
          imageIndex, 
          success: true, 
          name: result.name,
          description: result.description 
        });
        setProgress(prev => ({ ...prev, successful: prev.successful + 1 }));

        // Delay between requests to avoid rate limiting
        if (i < batchImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error labeling image:', error);
        batchResults.push({ imageIndex, success: false, error: error.message });
        setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }

    // Update state with final array after loop completes
    setWorkingImages(currentImages);
    
    setResults(prev => [...prev, ...batchResults]);
    setProcessing(false);
    setCurrentBatch(startIndex + BATCH_SIZE);

    // Check if all unlabeled images are processed
    if (endIndex >= unlabeledImages.length) {
      setCompleted(true);
    }

    return endIndex < unlabeledImages.length;
  };

  const handleStart = async () => {
    setResults([]);
    setCurrentBatch(0);
    setCompleted(false);
    setWorkingImages([...images]);
    await processBatch(0);
  };

  const handleContinue = async () => {
    await processBatch(currentBatch);
  };

  const handleExit = () => {
    onClose();
    setResults([]);
    setCurrentBatch(0);
    setCompleted(false);
    setWorkingImages([]);
  };

  const unlabeledCount = images.filter(img => !img.name || img.name.trim() === '').length;
  const remainingCount = Math.max(0, unlabeledCount - currentBatch);
  const hasMoreToProcess = remainingCount > 0 && !processing;

  return (
    <Dialog open={open} onOpenChange={handleExit}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Batch AI Labeling
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          {currentBatch === 0 && !processing && !completed && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-purple-900 font-semibold mb-2">Ready to Label Photos</p>
              <p className="text-purple-700 text-sm">
                Found {unlabeledCount} unlabeled photo{unlabeledCount !== 1 ? 's' : ''}. 
                We'll process them in batches of {BATCH_SIZE} at a time.
              </p>
            </div>
          )}

          {/* Processing Progress */}
          {processing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  Processing batch: {progress.current} of {progress.total}
                </span>
                <div className="flex gap-3">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {progress.successful} successful
                  </Badge>
                  {progress.failed > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {progress.failed} failed
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
              <p className="text-xs text-center text-slate-500">
                Labels are being saved automatically...
              </p>
            </div>
          )}

          {/* Batch Complete */}
          {!processing && currentBatch > 0 && (
            <div className={`border rounded-lg p-4 ${completed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`font-semibold mb-2 ${completed ? 'text-green-900' : 'text-blue-900'}`}>
                {completed ? 'All Photos Labeled!' : 'Batch Complete'}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className={completed ? 'text-green-700' : 'text-blue-700'}>
                    Successfully labeled:
                  </span>
                  <Badge className="bg-green-600">{results.filter(r => r.success).length}</Badge>
                </div>
                {results.filter(r => !r.success).length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-700">Failed:</span>
                    <Badge variant="destructive">{results.filter(r => !r.success).length}</Badge>
                  </div>
                )}
                {!completed && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-blue-700 font-medium">Remaining photos:</span>
                    <Badge variant="outline">{remainingCount}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Results Preview */}
          {results.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-sm font-semibold text-slate-700">Recent Labels:</p>
              {results.slice(-5).reverse().map((result, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs border-b pb-2 last:border-b-0">
                  {result.success ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{result.name}</p>
                        <p className="text-slate-600 line-clamp-1">{result.description}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-red-700">Failed: {result.error}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {currentBatch === 0 && !processing && (
              <>
                <Button variant="outline" onClick={handleExit} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleStart}
                  disabled={unlabeledCount === 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start AI Labeling
                </Button>
              </>
            )}

            {!processing && currentBatch > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleExit}
                  className="flex-1"
                >
                  {completed ? 'Close' : 'Save & Exit'}
                </Button>
                {hasMoreToProcess && (
                  <Button 
                    onClick={handleContinue}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Continue ({Math.min(BATCH_SIZE, remainingCount)} more)
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}