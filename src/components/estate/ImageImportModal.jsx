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

  const handleStartUpload = async () => {
    if (files.length === 0) return;
    setStep('uploading');
    setErrors([]);
    abortRef.current = false;

    const BATCH_SIZE = 10;
    const DELAY_MS = 5000;
    let accumulatedImages = [...(existingImages || [])];
    accumulatedRef.current = accumulatedImages;

    try {
      for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
        if (abortRef.current) break;
        const batchFiles = files.slice(batchStart, batchStart + BATCH_SIZE);
        const batchImages = [];

        for (let j = 0; j < batchFiles.length; j++) {
          if (abortRef.current) break;
          const file = batchFiles[j];
          const globalIndex = batchStart + j;
          setProgress({ current: globalIndex + 1, total: files.length });

          // HEIC files: upload raw
          if (isHeic(file)) {
            try {
              const result = await base44.integrations.Core.UploadFile({ file });
              batchImages.push({
                url: result.file_url,
                thumbnail_url: result.file_url,
                name: '',
                description: ''
              });
            } catch (e) {
              setErrors(prev => [...prev, `${file.name}: ${e.message}`]);
            }
            continue;
          }

          try {
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

            const [originalResult, thumbResult] = await Promise.all([
              base44.integrations.Core.UploadFile({ file: resizedFile }),
              base44.integrations.Core.UploadFile({ file: thumbFile })
            ]);

            batchImages.push({
              url: originalResult.file_url,
              thumbnail_url: thumbResult.file_url,
              name: '',
              description: ''
            });
          } catch (resizeErr) {
            // Fallback: upload original
            try {
              const result = await base44.integrations.Core.UploadFile({ file });
              batchImages.push({
                url: result.file_url,
                thumbnail_url: result.file_url,
                name: '',
                description: ''
              });
            } catch (fallbackErr) {
              setErrors(prev => [...prev, `${file.name}: ${fallbackErr.message}`]);
            }
          }
        }

        accumulatedImages = [...accumulatedImages, ...batchImages];
        accumulatedRef.current = accumulatedImages;

        if (batchStart + BATCH_SIZE < files.length && !abortRef.current) {
          await new Promise(r => setTimeout(r, DELAY_MS));
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
                  {progress.current} of {progress.total} photos uploaded
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Please don't close this window — your photos are being processed in batches
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