import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { createResizedImageDataUrl, createThumbnailDataUrl } from '@/utils/imageOptimizer';

export default function ImageImportModal({ open, existingImages, onComplete }) {
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState('select'); // select | uploading | done
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const accumulatedRef = useRef([]);
  const abortRef = useRef(false);

  const isHeic = (file) => {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    return ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;
    setFiles(selected);
    setErrors([]);
  };

  const uploadSingleImage = async (file) => {
    // HEIC files: upload raw
    if (isHeic(file)) {
      const result = await base44.integrations.Core.UploadFile({ file });
      return {
        url: result.file_url,
        thumbnail_url: result.file_url,
        name: '',
        description: ''
      };
    }

    // Resize, then upload sequentially to avoid rate limits
    const [resizedDataUrl, thumbDataUrl] = await Promise.all([
      createResizedImageDataUrl(file, 800),
      createThumbnailDataUrl(file)
    ]);
    const [resizedBlob, thumbBlob] = await Promise.all([
      (await fetch(resizedDataUrl)).blob(),
      (await fetch(thumbDataUrl)).blob()
    ]);
    const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });
    const thumbFile = new File([thumbBlob], `thumb_${file.name}`, { type: 'image/jpeg' });

    // Sequential uploads with a small stagger to avoid rate limits
    const originalResult = await base44.integrations.Core.UploadFile({ file: resizedFile });
    await new Promise(r => setTimeout(r, 400));
    const thumbResult = await base44.integrations.Core.UploadFile({ file: thumbFile });

    return {
      url: originalResult.file_url,
      thumbnail_url: thumbResult.file_url,
      name: '',
      description: ''
    };
  };

  const uploadWithRetry = async (file, maxRetries = 3) => {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await uploadSingleImage(file);
      } catch (e) {
        lastError = e;
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = 2000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  };

  const handleStartUpload = async () => {
    if (files.length === 0) return;
    setStep('uploading');
    setErrors([]);
    abortRef.current = false;

    const STAGGER_MS = 1000;  // between individual images
    const BATCH_DELAY_MS = 7000;  // between batches of 10
    const BATCH_SIZE = 10;
    let accumulatedImages = [...(existingImages || [])];
    accumulatedRef.current = accumulatedImages;
    const failedFiles = [];
    setProgress({ current: 0, total: files.length });

    try {
      // First pass: upload all images with retry
      for (let i = 0; i < files.length; i++) {
        if (abortRef.current) break;
        const file = files[i];
        setProgress({ current: i + 1, total: files.length });

        try {
          const img = await uploadWithRetry(file, 2);
          accumulatedImages.push(img);
          accumulatedRef.current = [...accumulatedImages];
        } catch (e) {
          failedFiles.push({ file, index: i });
          setErrors(prev => [...prev, `${file.name}: ${e.message}`]);
        }

        // Stagger between images (skip last)
        if (i < files.length - 1 && !abortRef.current) {
          await new Promise(r => setTimeout(r, STAGGER_MS));
        }

        // Extra delay every batch
        if ((i + 1) % BATCH_SIZE === 0 && i < files.length - 1 && !abortRef.current) {
          await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
      }

      // Second pass: retry failed files with longer backoff
      if (failedFiles.length > 0 && !abortRef.current) {
        setIsRetrying(true);
        const retryTotal = failedFiles.length;
        setProgress(prev => ({ ...prev, total: files.length + retryTotal }));
        let retried = 0;

        for (let r = 0; r < failedFiles.length; r++) {
          if (abortRef.current) break;
          const { file, index } = failedFiles[r];
          setProgress({ current: files.length + r + 1, total: files.length + retryTotal });

          // Remove the error for this file since we're retrying
          setErrors(prev => prev.filter(e => !e.startsWith(`${file.name}:`)));

          try {
            // Backoff before retry
            await new Promise(r => setTimeout(r, 5000));
            const img = await uploadWithRetry(file, 3);
            accumulatedImages.push(img);
            accumulatedRef.current = [...accumulatedImages];
            retried++;
          } catch (finalErr) {
            setErrors(prev => [...prev, `${file.name}: ${finalErr.message} (retry failed)`]);
          }
        }
      }

      if (!abortRef.current) {
        setStep('done');
      }
    } catch (e) {
      setErrors(prev => [...prev, `Fatal error: ${e.message}`]);
    }
  };

  const handleDone = () => {
    onComplete(accumulatedRef.current);
    setFiles([]);
    setStep('select');
    setErrors([]);
    setIsRetrying(false);
    accumulatedRef.current = [];
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">
              {step === 'select' ? 'Import Photos' : step === 'uploading' ? 'Uploading...' : 'Import Complete'}
            </h2>
          </div>
          {step !== 'uploading' && (
            <button onClick={step === 'done' ? handleDone : () => onComplete(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Select photos to add to your sale. HEIC photos from iPhone will be uploaded as-is.
                All other formats will be resized for optimal web display.
              </p>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="modal-file-upload"
                />
                <label htmlFor="modal-file-upload" className="cursor-pointer block">
                  <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Choose Files</p>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-700">{files.length} file(s) selected</p>
                  <div className="mt-1 max-h-32 overflow-auto">
                    {files.slice(0, 10).map((f, i) => (
                      <p key={i} className="text-xs text-slate-500 truncate">{f.name}</p>
                    ))}
                    {files.length > 10 && <p className="text-xs text-slate-400">...and {files.length - 10} more</p>}
                  </div>
                </div>
              )}
              <Button
                onClick={handleStartUpload}
                disabled={files.length === 0}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Start Import ({files.length} photos)
              </Button>
            </div>
          )}

          {step === 'uploading' && (
            <div className="space-y-5">
              <div className="text-center">
                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                <p className="text-sm text-slate-600 mt-3">
                  {progress.current} of {progress.total} photos {isRetrying ? 'retried' : 'uploaded'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isRetrying
                    ? 'Retrying failed photos with longer delays...'
                    : 'Please don\'t close this window — your photos are being processed in batches'}
                </p>
              </div>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">{errors.length} error(s)</span>
                  </div>
                  <div className="max-h-24 overflow-auto">
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">All photos imported</p>
                <p className="text-sm text-slate-600 mt-1">
                  {accumulatedRef.current.length} photo(s) total — your data is ready
                </p>
              </div>
              {errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                  <p className="text-xs font-medium text-amber-700 mb-1">{errors.length} file(s) skipped due to errors</p>
                  <div className="max-h-20 overflow-auto">
                    {errors.map((err, i) => (
                      <p key={i} className="text-xs text-amber-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={handleDone}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Done — Save to Sale
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}