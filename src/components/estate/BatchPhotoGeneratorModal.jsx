import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BatchPhotoGeneratorModal({ 
  open, 
  onClose, 
  images, 
  onPhotosUpdated, 
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
      loadBatch();
      setError(null);
    }
  }, [open]);

  const loadBatch = () => {
    const start = currentBatchIndex;
    const end = Math.min(start + BATCH_SIZE, images.length);
    setBatch(images.slice(start, end));
    setResults([]);
  };

  const generateBatch = async () => {
    setProcessing(true);
    setError(null);
    const generatedResults = [];

    try {
      for (let i = 0; i < batch.length; i++) {
        const image = batch[i];
        const actualIndex = currentBatchIndex + i;

        try {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this image and provide:
1. A concise title (3-5 words) for an estate sale listing
2. A brief description (1-2 sentences) suitable for buyers

Image URL: ${image.url}

Format as JSON: {"title": "...", "description": "..."}`,
            add_context_from_internet: false,
            file_urls: [image.url],
            response_json_schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          });

          const updatedPhoto = {
            ...image,
            name: response.title,
            description: response.description
          };

          generatedResults.push({
            index: actualIndex,
            photo: updatedPhoto,
            status: 'success'
          });

          // Auto-save the photo
          await onPhotosUpdated(actualIndex, updatedPhoto);
        } catch (err) {
          console.error('Error generating for image', i, err);
          generatedResults.push({
            index: actualIndex,
            photo: image,
            status: 'error',
            error: err.message
          });
        }

        // Update results in real-time
        setResults([...generatedResults]);

        // Delay between API calls
        if (i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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
      setCurrentBatchIndex(nextIndex);
      loadBatch();
    } else {
      onClose();
    }
  };

  const isAllDone = currentBatchIndex + BATCH_SIZE >= images.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Photo Titles & Descriptions</DialogTitle>
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

          {results.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto bg-slate-50 rounded-lg p-4">
              {results.map((result) => (
                <div key={result.index} className="flex gap-3 items-start text-sm">
                  {result.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    {result.status === 'success' ? (
                      <div>
                        <div className="font-medium text-slate-900 truncate">{result.photo.name}</div>
                        <div className="text-slate-600 text-xs mt-1">{result.photo.description}</div>
                      </div>
                    ) : (
                      <div className="text-red-600">Photo {result.index + 1}: {result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {!processing && results.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>Ready to generate titles and descriptions for {batch.length} photos</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Done for now
            </Button>
            {!processing && results.length === 0 ? (
              <Button 
                onClick={generateBatch} 
                disabled={processing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Generate Batch
              </Button>
            ) : (
              !processing && (
                <Button 
                  onClick={handleNextBatch}
                  disabled={processing || results.some(r => r.status === 'error')}
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