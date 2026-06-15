import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Scan, X } from 'lucide-react';
import { getImageSrc } from '@/utils/imageOptimizer';

export default function DeepSearchProgressModal({ open, currentIndex, totalCount, images, imageThumbnails }) {
  if (!open) return null;

  const image = currentIndex >= 0 && currentIndex < images.length ? images[currentIndex] : null;
  const pct = totalCount > 0 ? Math.round((currentIndex + 1) / totalCount * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Scan className="w-5 h-5 text-purple-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Deep Search Running</h3>
            <p className="text-xs text-slate-500">AI is identifying and pricing each item</p>
          </div>
        </div>

        {image && (
          <div className="bg-slate-100 rounded-xl overflow-hidden">
            <img
              src={getImageSrc(image, 200, { imageThumbnails, index: currentIndex })}
              alt={`Processing image ${currentIndex + 1}`}
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-purple-700">
              Image {currentIndex + 1} of {totalCount}
            </span>
            <span className="text-slate-500">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-slate-400 text-center">
            Searching the web for pricing data — this may take a while
          </p>
        </div>

        <p className="text-xs text-purple-600 bg-purple-50 rounded-lg p-3 text-center">
          <strong>Tip:</strong> Keep this tab open. The search will save results automatically every 10 images.
        </p>
      </div>
    </div>
  );
}