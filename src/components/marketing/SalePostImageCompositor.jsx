import React, { useRef, useEffect, useState } from 'react';
import { Loader2, Download, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POST_CONFIGS = [
  {
    name: 'Early Line / VIP Post',
    headline: 'DOORS OPEN EARLY',
    subheadline: 'VIP ACCESS',
    cta: 'BE FIRST IN LINE',
    headlineColor: '#ffffff',
    subheadlineColor: '#fbbf24',
    ctaColor: '#fbbf24',
    gradientTop: 'rgba(0,0,0,0.82)',
    gradientBottom: 'rgba(0,0,0,0.88)',
  },
  {
    name: "What's Inside? Curiosity Post",
    headline: "WHAT'S INSIDE?",
    subheadline: '',
    cta: 'SEE EVERYTHING →',
    headlineColor: '#ffffff',
    subheadlineColor: '#ffffff',
    ctaColor: '#ffffff',
    gradientTop: 'rgba(0,0,0,0.72)',
    gradientBottom: 'rgba(0,0,0,0.78)',
  },
  {
    name: 'Final Countdown Post',
    headline: 'LAST CHANCE',
    subheadline: 'FINAL DAY',
    cta: 'ENDS TODAY',
    headlineColor: '#ffffff',
    subheadlineColor: '#fca5a5',
    ctaColor: '#ef4444',
    gradientTop: 'rgba(0,0,0,0.80)',
    gradientBottom: 'rgba(100,0,0,0.90)',
  },
];

// Platform dimensions: [width, height, label]
const PLATFORMS = [
  { key: 'facebook_feed', label: 'Facebook Feed', width: 1200, height: 628 },
  { key: 'instagram_square', label: 'Instagram Square', width: 1080, height: 1080 },
  { key: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
];

function compositeImage(imgSrc, config, saleTitle, saleLocation, W, H) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Center-crop fill
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const offsetX = (W - drawW) / 2;
      const offsetY = (H - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Top gradient — covers top 40%
      const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.40);
      topGrad.addColorStop(0, config.gradientTop);
      topGrad.addColorStop(0.7, 'rgba(0,0,0,0.2)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, H);

      // Bottom gradient — covers bottom 38%
      const botGrad = ctx.createLinearGradient(0, H * 0.62, 0, H);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(0.3, 'rgba(0,0,0,0.3)');
      botGrad.addColorStop(1, config.gradientBottom);
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 0, W, H);

      const drawText = (text, x, y, color, font) => {
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      };

      // Scale font sizes relative to shortest dimension
      const base = Math.min(W, H);

      // Headline (top zone)
      drawText(config.headline, W / 2, H * 0.17, config.headlineColor,
        `bold ${base * 0.11}px Impact, Arial Black, sans-serif`);

      // Subheadline
      if (config.subheadline) {
        drawText(config.subheadline, W / 2, H * 0.265, config.subheadlineColor,
          `bold ${base * 0.075}px Impact, Arial Black, sans-serif`);
      }

      // Sale title pill badge
      const subtitle = [saleTitle, saleLocation].filter(Boolean).join(' · ');
      if (subtitle) {
        const fontSize = base * 0.036;
        ctx.font = `600 ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        const textW = ctx.measureText(subtitle).width;
        const pillX = W / 2 - textW / 2 - 14;
        const pillY = H * 0.78;
        const pillH = fontSize * 1.6;
        const pillW = textW + 28;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 6);
        ctx.fill();
        drawText(subtitle, W / 2, H * 0.818, 'rgba(255,255,255,0.92)',
          `600 ${fontSize}px Arial, sans-serif`);
      }

      // CTA (bottom)
      drawText(config.cta, W / 2, H * 0.945, config.ctaColor,
        `bold ${base * 0.115}px Impact, Arial Black, sans-serif`);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imgSrc;
  });
}

export default function SalePostImageCompositor({ saleTitle, saleLocation, referenceImages, onSave, saving, saved }) {
  // dataUrls[postIndex][platformKey] = dataUrl
  const [dataUrls, setDataUrls] = useState({});
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
      const results = {};
      await Promise.all(
        POST_CONFIGS.map(async (config, i) => {
          const imgSrc = referenceImages[i % referenceImages.length];
          results[i] = {};
          await Promise.all(
            PLATFORMS.map(async (platform) => {
              const dataUrl = await compositeImage(imgSrc, config, saleTitle, saleLocation, platform.width, platform.height);
              results[i][platform.key] = dataUrl;
            })
          );
        })
      );
      setDataUrls(results);
    } catch (err) {
      setError('Failed to composite images. The photos may not allow cross-origin access.');
    }
    setLoading(false);
  };

  const handleDownload = (postIndex, platformKey) => {
    const url = dataUrls[postIndex]?.[platformKey];
    if (!url) return;
    const platform = PLATFORMS.find(p => p.key === platformKey);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${POST_CONFIGS[postIndex].name.replace(/\s+/g, '_')}_${platform.label.replace(/\s+/g, '_')}.jpg`;
    a.click();
  };

  const allPlatformDataUrls = (postIndex) => {
    const entry = dataUrls[postIndex];
    if (!entry) return null;
    const result = {};
    PLATFORMS.forEach(p => { if (entry[p.key]) result[p.key] = entry[p.key]; });
    return Object.keys(result).length === PLATFORMS.length ? result : null;
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-500">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-indigo-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Compositing {POST_CONFIGS.length * PLATFORMS.length} platform images...
        </div>
      )}

      {POST_CONFIGS.map((config, postIndex) => (
        <div key={postIndex} className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">{config.name}</p>
            {allPlatformDataUrls(postIndex) && (
              <Button
                size="sm"
                onClick={() => onSave(postIndex, allPlatformDataUrls(postIndex))}
                disabled={saving === postIndex || saved[postIndex]}
                className={`text-xs h-7 ${saved[postIndex] ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
              >
                {saved[postIndex]
                  ? <><CheckCircle2 className="w-3 h-3 mr-1" />Saved All</>
                  : saving === postIndex
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><Save className="w-3 h-3 mr-1" />Save All Platforms</>}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((platform) => {
              const url = dataUrls[postIndex]?.[platform.key];
              // Display at fixed preview height, correct aspect ratio
              const aspectClass = platform.key === 'facebook_feed'
                ? 'aspect-[1200/628]'
                : platform.key === 'instagram_story'
                  ? 'aspect-[9/16]'
                  : 'aspect-square';

              return (
                <div key={platform.key} className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-medium text-center">{platform.label}</p>
                  <p className="text-[9px] text-slate-400 text-center">{platform.width}×{platform.height}</p>
                  <div className={`rounded overflow-hidden border border-slate-200 bg-slate-100 ${aspectClass}`}>
                    {url
                      ? <img src={url} alt={platform.label} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                        </div>
                    }
                  </div>
                  {url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(postIndex, platform.key)}
                      className="w-full text-[10px] h-6"
                    >
                      Download
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}