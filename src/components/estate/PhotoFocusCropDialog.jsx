import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Crop } from 'lucide-react';

/** A selection must cover at least this share of the photo's width and height. */
const MIN_SHARE = 0.04;

/**
 * Isolate one item in a photo before it is re-analyzed, the way Google Lens lets
 * you crop to a single object. Dragging a box keeps only that area: the crop is
 * uploaded and becomes the image the analysis reads, so a shelf of items can be
 * read one item at a time. Choosing the whole photo clears any earlier crop.
 */
export default function PhotoFocusCropDialog({ open, photo, busy, onClose, onConfirm }) {
  const [box, setBox] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (open) return;
    setBox(null);
    setError('');
    setWorking(false);
    dragRef.current = null;
  }, [open]);

  const point = event => {
    const bounds = stageRef.current.getBoundingClientRect();
    return {
      x: Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width),
      y: Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height),
    };
  };

  const start = event => {
    if (working || !imgRef.current) return;
    event.preventDefault();
    const at = point(event);
    dragRef.current = { x0: at.x, y0: at.y };
    setBox({ x0: at.x, y0: at.y, x1: at.x, y1: at.y });
    stageRef.current.setPointerCapture?.(event.pointerId);
  };

  const move = event => {
    if (!dragRef.current) return;
    event.preventDefault();
    const at = point(event);
    setBox({ x0: dragRef.current.x0, y0: dragRef.current.y0, x1: at.x, y1: at.y });
  };

  const end = () => { dragRef.current = null; };

  const area = box ? {
    left: Math.min(box.x0, box.x1),
    top: Math.min(box.y0, box.y1),
    width: Math.abs(box.x1 - box.x0),
    height: Math.abs(box.y1 - box.y0),
  } : null;

  const image = imgRef.current;
  const selected = !!area && !!image
    && area.width >= image.clientWidth * MIN_SHARE
    && area.height >= image.clientHeight * MIN_SHARE;

  const analyzeArea = async () => {
    if (!selected || working) return;
    setWorking(true);
    setError('');
    try {
      const scaleX = image.naturalWidth / image.clientWidth;
      const scaleY = image.naturalHeight / image.clientHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(area.width * scaleX));
      canvas.height = Math.max(1, Math.round(area.height * scaleY));
      canvas.getContext('2d').drawImage(
        image,
        Math.round(area.left * scaleX), Math.round(area.top * scaleY), canvas.width, canvas.height,
        0, 0, canvas.width, canvas.height,
      );
      const blob = await new Promise((resolve, reject) => canvas.toBlob(
        value => (value ? resolve(value) : reject(new Error('The cropped area could not be created.'))),
        'image/jpeg', 0.92,
      ));
      const { file_url } = await base44.integrations.Core.UploadPublicFile({
        file: new File([blob], 'focus-area.jpg', { type: 'image/jpeg' }),
      });
      onConfirm?.({
        url: file_url,
        x: Number((area.left / image.clientWidth).toFixed(3)),
        y: Number((area.top / image.clientHeight).toFixed(3)),
        w: Number((area.width / image.clientWidth).toFixed(3)),
        h: Number((area.height / image.clientHeight).toFixed(3)),
      });
    } catch (e) {
      setError(e?.message || 'The cropped area could not be prepared.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!value && !working) onClose?.(); }}>
      <DialogContent className="max-w-lg p-4">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-1.5">
            <Crop className="w-4 h-4 text-cyan-700" /> Analyze one item in this photo
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Drag a box around the single item you want read. Only that area is analyzed, so the other items in the photo are left out.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-100">
          <div
            ref={stageRef}
            className="relative select-none cursor-crosshair"
            style={{ touchAction: 'none' }}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <img
              ref={imgRef}
              src={photo?.url}
              crossOrigin="anonymous"
              alt=""
              draggable={false}
              className="block w-full h-auto"
            />
            {area && area.width > 0 && area.height > 0 && (
              <div
                className="absolute border-2 border-cyan-500 bg-cyan-400/20 pointer-events-none"
                style={{ left: area.left, top: area.top, width: area.width, height: area.height }}
              />
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          {selected
            ? `Selected area: ${Math.round((area.width / image.clientWidth) * 100)}% of the photo's width.`
            : 'Drag across the photo to select the item. A small box around the object works best.'}
        </p>

        {error && <p className="text-[11px] text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={busy || working}
            onClick={() => onConfirm?.(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-[11px] font-medium text-slate-700 disabled:opacity-50"
          >
            Whole photo
          </button>
          <button
            type="button"
            disabled={!selected || busy || working}
            onClick={analyzeArea}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-cyan-600 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {working ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crop className="w-3 h-3" />}
            {working ? 'Preparing the crop…' : 'Analyze this area'}
          </button>
          <button
            type="button"
            disabled={working}
            onClick={() => onClose?.()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white text-[11px] font-medium text-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}