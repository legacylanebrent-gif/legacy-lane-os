import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Heart, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export default function SavedItemsGallery({ sales }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxSale, setLightboxSale] = useState(null);
  // bump this to force re-render after localStorage change
  const [version, setVersion] = useState(0);

  const removeSavedImage = useCallback((e, saleId, imageIdx) => {
    e.stopPropagation();
    const stored = localStorage.getItem(`savedImages_${saleId}`);
    if (!stored) return;
    const indices = JSON.parse(stored).filter(i => i !== imageIdx);
    if (indices.length === 0) {
      localStorage.removeItem(`savedImages_${saleId}`);
    } else {
      localStorage.setItem(`savedImages_${saleId}`, JSON.stringify(indices));
    }
    setVersion(v => v + 1);
  }, []);

  // Aggregate saved images from localStorage across all followed sales
  const savedItems = [];
  sales.forEach(sale => {
    const stored = localStorage.getItem(`savedImages_${sale.id}`);
    if (!stored || !sale.images?.length) return;
    const indices = JSON.parse(stored);
    indices.forEach(idx => {
      const img = sale.images[idx];
      if (img) {
        savedItems.push({
          sale,
          imageIdx: idx,
          url: img?.url || img,
          name: img?.name || null,
          description: img?.description || null,
        });
      }
    });
  });

  const openLightbox = (item) => {
    // Collect all images from that sale's saved items
    const saleItems = savedItems.filter(i => i.sale.id === item.sale.id);
    const currentPos = saleItems.findIndex(i => i.imageIdx === item.imageIdx);
    setLightboxImages(saleItems);
    setLightboxIdx(currentPos >= 0 ? currentPos : 0);
    setLightboxSale(item.sale);
    setLightboxOpen(true);
  };

  const prev = () => setLightboxIdx(i => (i === 0 ? lightboxImages.length - 1 : i - 1));
  const next = () => setLightboxIdx(i => (i === lightboxImages.length - 1 ? 0 : i + 1));

  if (savedItems.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Heart className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="font-medium text-slate-500 text-sm">No saved photos yet</p>
        <p className="text-xs mt-1">Open a sale's gallery and heart photos to save them here</p>
      </div>
    );
  }

  const currentImg = lightboxImages[lightboxIdx];

  return (
    <>
      {/* Gallery grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {savedItems.map((item) => (
          <div
            key={`${item.sale.id}-${item.imageIdx}`}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all group"
          >
            <button
              onClick={() => openLightbox(item)}
              className="w-full h-full"
            >
              <img
                src={item.url}
                alt={item.name || item.sale.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
            {/* Always-visible unfavorite button */}
            <button
              onClick={(e) => removeSavedImage(e, item.sale.id, item.imageIdx)}
              className="absolute top-1 right-1 bg-white/90 rounded-full p-1 hover:bg-red-50 hover:scale-110 transition-all shadow-sm"
              title="Remove from saved"
            >
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-2 text-right">{savedItems.length} saved photo{savedItems.length !== 1 ? 's' : ''}</p>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
          <div className="relative flex items-center justify-center min-h-[400px] group">
            {currentImg && (
              <img
                src={currentImg.url}
                alt={currentImg.name || lightboxSale?.title}
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}

            {lightboxImages.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors">
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}

            {/* Caption */}
            {currentImg && (currentImg.name || currentImg.description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2">
                {currentImg.name && <p className="text-white text-sm font-semibold">{currentImg.name}</p>}
                {currentImg.description && <p className="text-white/80 text-xs">{currentImg.description}</p>}
              </div>
            )}

            {/* Sale link */}
            {lightboxSale && (
              <div className="absolute top-3 left-3">
                <Link
                  to={createPageUrl('EstateSaleDetail') + '?id=' + lightboxSale.id}
                  onClick={() => setLightboxOpen(false)}
                >
                  <Badge className="bg-white/90 text-slate-800 hover:bg-white text-xs gap-1 cursor-pointer">
                    <ExternalLink className="w-2.5 h-2.5" />
                    {lightboxSale.title}
                  </Badge>
                </Link>
              </div>
            )}

            <div className="absolute bottom-3 right-3 text-white/60 text-xs">
              {lightboxIdx + 1} / {lightboxImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}