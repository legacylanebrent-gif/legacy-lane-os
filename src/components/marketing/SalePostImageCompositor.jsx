import React, { useRef, useEffect, useState } from 'react';
import { Loader2, Download, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POST_CONFIGS = [
  {
    name: 'Early Line / VIP Post',
    headline: 'DOORS OPEN EARLY',
    subheadline: 'VIP ACCESS',
    cta: 'BE FIRST IN LINE',
    topColor: '#000000',
    ctaColor: '#f59e0b',
    gradientTop: 'rgba(0,0,0,0.75)',
    gradientBottom: 'rgba(0,0,0,0.80)',
  },
  {
    name: "What's Inside? Curiosity Post",
    headline: "WHAT'S INSIDE?",
    subheadline: '',
    cta: 'SEE EVERYTHING →',
    topColor: '#ffffff',
    ctaColor: '#ffffff',
    gradientTop: 'rgba(0,0,0,0.55)',
    gradientBottom: 'rgba(0,0,0,0.65)',
  },
  {
    name: 'Final Countdown Post',
    headline: 'LAST CHANCE',
    subheadline: 'FINAL DAY',
    cta: 'ENDS TODAY',
    topColor: '#ffffff',
    ctaColor: '#ef4444',
    gradientTop: 'rgba(80,0,0,0.70)',
    gradientBottom: 'rgba(120,0,0,0.80)',
  },
];

function compositeImage(canvas, imgSrc, config, saleTitle, saleLocation) {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    const SIZE = 600;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Center-crop to square — NEVER rotate
      const scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const offsetX = (SIZE - drawW) / 2;
      const offsetY = (SIZE - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Top gradient
      const topGrad = ctx.createLinearGradient(0, 0, 0, SIZE * 0.45);
      topGrad.addColorStop(0, config.gradientTop);
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Bottom gradient
      const botGrad = ctx.createLinearGradient(0, SIZE * 0.55, 0, SIZE);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(1, config.gradientBottom);
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Headline (top)
      ctx.textAlign = 'center';
      ctx.fillStyle = config.topColor;
      ctx.font = `bold ${SIZE * 0.115}px Impact, Arial Black, sans-serif`;
      ctx.fillText(config.headline, SIZE / 2, SIZE * 0.18);

      // Subheadline
      if (config.subheadline) {
        ctx.font = `bold ${SIZE * 0.09}px Impact, Arial Black, sans-serif`;
        ctx.fillText(config.subheadline, SIZE / 2, SIZE * 0.28);
      }

      // Sale title + location (middle-ish small)
      ctx.font = `${SIZE * 0.038}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const subtitle = [saleTitle, saleLocation].filter(Boolean).join(' · ');
      ctx.fillText(subtitle, SIZE / 2, SIZE * 0.88);

      // CTA (bottom)
      ctx.font = `bold ${SIZE * 0.115}px Impact, Arial Black, sans-serif`;
      ctx.fillStyle = config.ctaColor;
      ctx.fillText(config.cta, SIZE / 2, SIZE * 0.96);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imgSrc;
  });
}

export default function SalePostImageCompositor({ saleTitle, saleLocation, referenceImages, onSave, saving, saved }) {
  const canvasRefs = [useRef(null), useRef(null), useRef(null)];
  const [dataUrls, setDataUrls] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (referenceImages && referenceImages.length > 0) {
      generateAll();
    }
  }, [referenceImages]);

  const generateAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        POST_CONFIGS.map((config, i) => {
          const canvas = canvasRefs[i].current;
          const imgSrc = referenceImages[i % referenceImages.length];
          return compositeImage(canvas, imgSrc, config, saleTitle, saleLocation);
        })
      );
      setDataUrls(results);
    } catch (err) {
      setError('Failed to composite images. The photos may not allow cross-origin access.');
    }
    setLoading(false);
  };

  const handleDownload = (i) => {
    if (!dataUrls[i]) return;
    const a = document.createElement('a');
    a.href = dataUrls[i];
    a.download = `${POST_CONFIGS[i].name.replace(/\s+/g, '_')}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-indigo-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Compositing images...
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {POST_CONFIGS.map((config, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-indigo-200 bg-white">
            <canvas
              ref={canvasRefs[i]}
              className="w-full aspect-square"
              style={{ display: dataUrls[i] ? 'none' : 'block', background: '#e2e8f0' }}
            />
            {dataUrls[i] && (
              <img src={dataUrls[i]} alt={config.name} className="w-full aspect-square object-cover" />
            )}
            <div className="p-2 space-y-1">
              <p className="text-xs font-medium text-slate-700 leading-tight">{config.name}</p>
              {dataUrls[i] && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(i)}
                    variant="outline"
                    className="flex-1 text-xs h-7"
                  >
                    <Download className="w-3 h-3 mr-1" />DL
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSave(i, dataUrls[i])}
                    disabled={saving === i || saved[i]}
                    className={`flex-1 text-xs h-7 ${saved[i] ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
                  >
                    {saved[i] ? <><CheckCircle2 className="w-3 h-3 mr-1" />Saved</> : saving === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}