import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';

/**
 * Photo field used when publishing a cleanout or donation request.
 * Photos carried over from the sale stay in place, and the operator can
 * upload from their device or take a new photo right there — what is left
 * at the property rarely matches the original sale photos.
 */
export default function PhotoAttachField({ photos = [], onAdd, onRemove, hint }) {
  const [uploading, setUploading] = useState(false);
  const galleryInput = useRef(null);
  const cameraInput = useRef(null);

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      onAdd(urls);
    } catch (err) {
      alert('Failed to upload photos: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
          </div>
        ) : (
          <>
            <ImagePlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">
              {hint || 'Sale photos stay below — add any new photos of what is left at the property'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button type="button" variant="outline" size="sm" onClick={() => galleryInput.current?.click()}>
                <ImagePlus className="w-4 h-4 mr-2" /> Upload Photos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => cameraInput.current?.click()}>
                <Camera className="w-4 h-4 mr-2" /> Take Photo
              </Button>
            </div>
            <input
              ref={galleryInput}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleChange}
            />
          </>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {photos.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label={`Remove photo ${idx + 1}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}