import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageIcon } from 'lucide-react';

const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'Twitter/X'];

function extractContent(campaign) {
  let headline = campaign.title?.replace(/\[AI-[^\]]+\]\s*/, '') || campaign.title;
  let caption = campaign.description || '';
  const isAI = campaign.title?.startsWith('[AI-');
  if (isAI && campaign.description) {
    const hm = campaign.description.match(/headline[:\s*]+([^\n]+)/i);
    const cm = campaign.description.match(/caption[:\s*]+([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]*)*)/i);
    if (hm) headline = hm[1].trim().replace(/^\*+|\*+$/g, '');
    if (cm) {
      caption = cm[1].trim()
        .replace(/\(Facebook\/Instagram\s*ready\)[:\s]*/gi, '')
        .replace(/\*\*/g, '')
        .replace(/^>\s*/gm, '')
        .replace(/^\s*[-–—]\s*/gm, '')
        .trim()
        .slice(0, 280);
    }
  }
  return { headline, caption };
}

function FacebookMockup({ campaign }) {
  const { headline, caption } = extractContent(campaign);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden max-w-sm mx-auto">
      <div className="bg-[#1877F2] px-3 py-1.5 flex items-center gap-2">
        <span className="text-white text-sm font-bold">f</span>
        <span className="text-white text-xs">Facebook</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">{(campaign.sale_title || 'S')[0]}</div>
        <div>
          <p className="text-xs font-semibold text-slate-800">{campaign.sale_title || 'Estate Sale'}</p>
          <p className="text-[10px] text-slate-400">Sponsored · 🌐</p>
        </div>
      </div>
      <p className="text-xs text-slate-700 px-3 pb-2 leading-relaxed line-clamp-3">{caption || headline}</p>
      <div className="relative">
        {campaign.image_url ? <img src={campaign.image_url} alt="" className="w-full aspect-video object-cover" /> :
          <div className="w-full aspect-video bg-slate-100 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-3">
          <p className="text-white text-xs font-bold line-clamp-2">{headline}</p>
        </div>
      </div>
      <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 flex justify-between text-[10px] text-slate-400">
        <span>👍 Like · 💬 Comment · ↗ Share</span>
        <span className="text-[#1877F2] font-medium">Learn More</span>
      </div>
    </div>
  );
}

function InstagramMockup({ campaign }) {
  const { headline, caption } = extractContent(campaign);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden max-w-sm mx-auto">
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-3 py-1.5 flex items-center gap-2">
        <span className="text-white text-xs font-bold italic">Instagram</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">{(campaign.sale_title || 'S')[0]}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">{(campaign.sale_title || 'estate_sale').toLowerCase().replace(/\s+/g, '_')}</p>
            <p className="text-[10px] text-slate-400">Sponsored</p>
          </div>
        </div>
        <span className="text-slate-400 text-lg">···</span>
      </div>
      {campaign.image_url ? <img src={campaign.image_url} alt="" className="w-full aspect-square object-cover" /> :
        <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center"><ImageIcon className="w-10 h-10 text-purple-200" /></div>}
      <div className="px-3 py-2 space-y-1">
        <div className="flex gap-3 text-base">
          <span>♡</span><span>💬</span><span>✈️</span>
          <span className="ml-auto">🔖</span>
        </div>
        <p className="text-xs text-slate-700"><span className="font-semibold">{(campaign.sale_title || 'Estate Sale').toLowerCase().replace(/\s+/g, '_')}</span> {caption || headline}</p>
        <p className="text-[10px] text-blue-500">#estatesale #antiquesale #{(campaign.sale_title || '').toLowerCase().replace(/\s+/g, '')}</p>
      </div>
    </div>
  );
}

function TikTokMockup({ campaign }) {
  const { headline, caption } = extractContent(campaign);
  return (
    <div className="bg-black rounded-xl border border-slate-700 shadow overflow-hidden max-w-xs mx-auto relative">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black">
        <span className="text-white text-xs font-bold">TikTok</span>
        <span className="text-white text-xs">Following · <span className="font-bold">For You</span></span>
        <span className="text-white text-xs">🔍</span>
      </div>
      {campaign.image_url ? <img src={campaign.image_url} alt="" className="w-full aspect-[9/16] object-cover" style={{maxHeight: 280}} /> :
        <div className="w-full bg-gradient-to-b from-slate-800 to-black flex items-center justify-center" style={{height: 280}}><ImageIcon className="w-12 h-12 text-slate-600" /></div>}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3">
        <div className="flex items-end justify-between">
          <div className="flex-1 pr-4">
            <p className="text-white text-xs font-semibold">@{(campaign.sale_title || 'estatesale').toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-white text-xs mt-1 line-clamp-2">{caption || headline}</p>
            <p className="text-white/60 text-[10px] mt-1">🎵 Original Sound</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">{(campaign.sale_title || 'S')[0]}</div>
            <div className="text-center text-white text-[10px]"><span className="text-lg">♡</span><br/>24.5K</div>
            <div className="text-center text-white text-[10px]"><span className="text-lg">💬</span><br/>318</div>
            <div className="text-center text-white text-[10px]"><span className="text-lg">↗</span><br/>Share</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInMockup({ campaign }) {
  const { headline, caption } = extractContent(campaign);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden max-w-sm mx-auto">
      <div className="bg-[#0A66C2] px-3 py-1.5 flex items-center gap-2">
        <span className="text-white text-xs font-bold">in</span>
        <span className="text-white text-xs">LinkedIn</span>
      </div>
      <div className="flex items-start gap-2 px-3 py-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">{(campaign.sale_title || 'S')[0]}</div>
        <div>
          <p className="text-xs font-semibold text-slate-800">{campaign.sale_title || 'Estate Sale Company'}</p>
          <p className="text-[10px] text-slate-400">Estate Services · Promoted</p>
          <p className="text-[10px] text-slate-400">🌐 Anyone</p>
        </div>
      </div>
      <p className="text-xs text-slate-700 px-3 pb-3 leading-relaxed line-clamp-4">{caption || headline}</p>
      {campaign.image_url ? <img src={campaign.image_url} alt="" className="w-full aspect-video object-cover" /> :
        <div className="w-full aspect-video bg-slate-100 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>}
      <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 flex justify-between text-[10px] text-slate-400">
        <span>👍 Like · 💬 Comment · 🔁 Repost · ↗ Send</span>
      </div>
    </div>
  );
}

function TwitterMockup({ campaign }) {
  const { headline, caption } = extractContent(campaign);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow overflow-hidden max-w-sm mx-auto">
      <div className="bg-black px-3 py-1.5 flex items-center gap-2">
        <span className="text-white text-xs font-bold">𝕏</span>
        <span className="text-white text-xs">Twitter / X</span>
      </div>
      <div className="flex gap-2 px-3 py-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 flex items-center justify-center text-white font-bold">{(campaign.sale_title || 'S')[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{campaign.sale_title || 'Estate Sale'}</p>
            <span className="text-blue-500 text-xs">✓</span>
            <p className="text-[10px] text-slate-400">· Promoted</p>
          </div>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed line-clamp-3">{caption || headline}</p>
          {campaign.image_url ? <img src={campaign.image_url} alt="" className="w-full rounded-xl mt-2 aspect-video object-cover" /> :
            <div className="w-full rounded-xl mt-2 aspect-video bg-slate-100 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-slate-300" /></div>}
          <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
            <span>💬 12</span><span>🔁 34</span><span>♡ 218</span><span>↗</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCKUP_COMPONENTS = {
  'Facebook': FacebookMockup,
  'Instagram': InstagramMockup,
  'TikTok': TikTokMockup,
  'LinkedIn': LinkedInMockup,
  'Twitter/X': TwitterMockup,
};

const PLATFORM_COLORS = {
  'Facebook': 'bg-[#1877F2] hover:bg-[#1565d8] text-white',
  'Instagram': 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white',
  'TikTok': 'bg-black hover:bg-slate-800 text-white',
  'LinkedIn': 'bg-[#0A66C2] hover:bg-[#0958a8] text-white',
  'Twitter/X': 'bg-black hover:bg-slate-800 text-white',
};

export default function PlatformPreviewModal({ campaign, open, onClose }) {
  const [activePlatform, setActivePlatform] = useState('Facebook');
  const MockupComponent = MOCKUP_COMPONENTS[activePlatform];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Platform Preview</DialogTitle>
          <p className="text-xs text-slate-500">See how this post will look on each platform.</p>
        </DialogHeader>

        {/* Platform selector */}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                activePlatform === p
                  ? PLATFORM_COLORS[p] + ' border-transparent shadow-md'
                  : 'border-slate-200 text-slate-600 bg-white hover:border-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Mockup display */}
        <div className="mt-2 overflow-y-auto max-h-[60vh]">
          {MockupComponent && <MockupComponent campaign={campaign} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}