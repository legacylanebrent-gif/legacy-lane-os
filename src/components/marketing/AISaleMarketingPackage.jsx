import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, CheckCircle2, Zap, Save, ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AISaleMarketingPackage({ sale, open, onClose, modelOverride }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Reset state when modal opens with a new model
  useEffect(() => {
    if (open) {
      setResult(null);
      setSavedCount(0);
      setGeneratedImages([]);
    }
  }, [open, modelOverride]);

  const modelLabel = modelOverride === 'gpt_5_5' ? 'GPT-5.5' : 'Claude';

  const buildPrompt = () => {
    const images = sale?.photos?.map(p => p.url || p).filter(Boolean) || [];
    const featuredItems = sale?.featured_items || [];

    return `You are the Legacy Lane AI Coach, an expert in estate sale marketing, buyer psychology, and local demand generation.

Your task is to automatically generate a COMPLETE promotional package for a specific estate sale using the operator's real data, images, and branding.

This is a ONE-CLICK action triggered by the operator. Everything must be ready to post.

---

## INPUT DATA

Operator Profile:
- Company Name: ${user?.company_name || sale?.company_name || 'Legacy Lane Partner'}
- City/Primary Market: ${user?.city || sale?.city || sale?.location || 'Local Market'}

Sale Details:
- Sale Title: ${sale?.title || 'Estate Sale'}
- Location: ${sale?.location || sale?.address || 'See listing'}
- Dates: ${sale?.start_date ? `${sale.start_date}${sale.end_date ? ' – ' + sale.end_date : ''}` : 'See listing'}
- Times: ${sale?.start_time || '8:00 AM'} – ${sale?.end_time || '3:00 PM'}
- Sale Type: ${sale?.sale_type || sale?.type || 'Estate Sale'}

Assets:
- Sale Images: ${images.length > 0 ? images.slice(0, 5).join(', ') : 'No images provided — describe based on typical estate sale content'}
- Featured Items: ${featuredItems.length > 0 ? featuredItems.join(', ') : 'Not specified — assume general household, furniture, collectibles'}

---

## OBJECTIVE

Maximize foot traffic, early line formation, and total sell-through rate.
This is performance marketing for a time-sensitive event. NOT generic branding.

---

## PART 1: SELECT BEST IMAGES

From the provided images (or describe ideal image use if none provided), intelligently recommend:
- 1 image best suited for urgency/line formation
- 1 image best suited for curiosity (variety or high-value items)
- 1 image best suited for final reminder

---

## PART 2: CREATE 3 HIGH-CONVERTING POSTS

Generate:
1. EARLY LINE / VIP POST
2. "WHAT'S INSIDE?" CURIOSITY POST
3. FINAL COUNTDOWN POST

For EACH post include:
- Headline (large, scroll-stopping)
- Subheadline
- Caption (platform-ready, with strong CTA)
- Psychological trigger used
- Intended buyer type (reseller, collector, bargain hunter)

All posts must reference the REAL location and emphasize urgency.

---

## PART 3: IMAGE DESIGN SPECS

For each post, provide:
- Overlay text (exact wording)
- Layout description
- Recommended visual enhancements (dark overlay, text shadow, badges like "1 DAY ONLY")
- Where to place the company logo

---

## PART 4: AI IMAGE GENERATION PROMPTS

For each post, write a ready-to-use AI image generation prompt that:
- Describes the background image style
- Includes the exact text overlay copy
- Specifies logo placement
- Keeps layout clean and high-converting

---

## PART 5: READY-TO-POST FORMAT

Output all 3 posts in clean sections with: Copy | Image Spec | Design Instructions | AI Image Prompt

---

## PART 6: BOOST STRATEGY

At the end, suggest:
- Best times to post based on the sale timeline
- Whether to boost with small ad spend
- One quick tip for the operator

---

## TONE & STYLE
- Confident, clear, action-driven
- Local-market aware
- Focused on RESULTS (buyers, turnout, sell-through)

CRITICAL: Everything must feel tailored to THIS specific sale. No generic content.`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setGeneratedImages([]);
    setSavedCount(0);
    try {
      const prompt = buildPrompt();
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: modelOverride || 'claude_sonnet_4_6',
      });
      setResult(res);
    } catch (err) {
      setResult('Error generating marketing package: ' + err.message);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(typeof result === 'string' ? result : JSON.stringify(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Extract image prompts from the result text
  const extractImagePrompts = (text) => {
    if (!text || typeof text !== 'string') return [];
    const prompts = [];
    // Match lines that look like AI image generation prompts (after "AI Image Prompt" headers)
    const sections = text.split(/#+\s*/);
    const postNames = ['Early Line / VIP Post', 'What\'s Inside? Curiosity Post', 'Final Countdown Post'];
    
    // Simple extraction: find lines after "AI Image Prompt" or "AI Image Generation Prompt"
    const lines = text.split('\n');
    let capturing = false;
    let currentPrompt = '';
    let promptCount = 0;
    
    for (const line of lines) {
      if (/ai image (generation )?prompt/i.test(line)) {
        if (currentPrompt.trim() && promptCount < 3) {
          prompts.push({ name: postNames[promptCount] || `Post ${promptCount + 1}`, prompt: currentPrompt.trim() });
          promptCount++;
        }
        capturing = true;
        currentPrompt = '';
      } else if (capturing) {
        if (/^#+\s/.test(line) && !/ai image/i.test(line)) {
          capturing = false;
        } else if (line.trim()) {
          currentPrompt += ' ' + line.trim();
        }
      }
    }
    if (currentPrompt.trim() && promptCount < 3) {
      prompts.push({ name: postNames[promptCount] || `Post ${promptCount + 1}`, prompt: currentPrompt.trim() });
    }
    
    // Fallback: just generate 3 generic prompts from sale data
    if (prompts.length === 0) {
      const base = `Estate sale promotional social media image for "${sale?.title || 'Estate Sale'}" in ${sale?.location || 'local area'}`;
      return [
        { name: 'Early Line / VIP Post', prompt: `${base}. Urgency theme, bold "DOORS OPEN EARLY" text overlay, dramatic lighting, crowd excitement vibe, vintage estate items visible in background, high contrast.` },
        { name: 'What\'s Inside? Curiosity Post', prompt: `${base}. Curiosity theme, "WHAT'S INSIDE?" bold text overlay, collage of antiques furniture collectibles, warm inviting colors, treasure hunt feel.` },
        { name: 'Final Countdown Post', prompt: `${base}. Final countdown theme, "LAST CHANCE" bold red text overlay, urgency, clock or timer visual element, estate sale items, dramatic lighting.` },
      ];
    }
    return prompts;
  };

  const handleGenerateImages = async () => {
    if (!result) return;
    setGeneratingImages(true);
    const imagePrompts = extractImagePrompts(typeof result === 'string' ? result : JSON.stringify(result));
    const images = [];
    for (const { name, prompt } of imagePrompts.slice(0, 3)) {
      try {
        const res = await base44.integrations.Core.GenerateImage({
          prompt: prompt.slice(0, 900), // stay within limits
        });
        images.push({ name, url: res.url, prompt });
      } catch (err) {
        images.push({ name, url: null, error: err.message, prompt });
      }
    }
    setGeneratedImages(images);
    setGeneratingImages(false);
  };

  // Parse the result text into 3 post objects and save as MarketingTask records
  const handleSaveToCampaigns = async () => {
    if (!result || !sale) return;
    setSaving(true);
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    const postNames = ['Early Line / VIP Post', "What's Inside? Curiosity Post", 'Final Countdown Post'];
    
    // Split by numbered post sections
    const postSections = [];
    const splitPatterns = [
      /(?=###?\s*(?:POST\s*)?1[:.]\s*EARLY LINE)/i,
      /(?=###?\s*(?:POST\s*)?2[:.]\s*"?WHAT'?S INSIDE)/i,
      /(?=###?\s*(?:POST\s*)?3[:.]\s*FINAL COUNTDOWN)/i,
    ];
    
    // Simple split: divide the full text into 3 roughly equal post sections
    // Look for the post blocks
    const lines = text.split('\n');
    let sections = [[], [], []];
    let currentSection = -1;
    
    for (const line of lines) {
      if (/(?:post\s*1|early line|vip post)/i.test(line) && /^#+/.test(line)) currentSection = 0;
      else if (/(?:post\s*2|what.?s inside|curiosity)/i.test(line) && /^#+/.test(line)) currentSection = 1;
      else if (/(?:post\s*3|final countdown|last chance)/i.test(line) && /^#+/.test(line)) currentSection = 2;
      if (currentSection >= 0 && currentSection <= 2) sections[currentSection].push(line);
    }
    
    const boostSection = text.match(/(?:boost strategy|part 6)([\s\S]*?)(?:$)/i)?.[1] || '';

    let count = 0;
    for (let i = 0; i < 3; i++) {
      const sectionText = sections[i].join('\n').trim() || `Post ${i + 1}: AI-generated marketing post for ${sale.title}`;
      const imageUrl = generatedImages[i]?.url || null;
      
      try {
        await base44.entities.MarketingTask.create({
          task_type: 'estate_sale',
          sale_id: sale.id,
          sale_title: sale.title,
          title: `[AI-${modelLabel}] ${postNames[i]}`,
          description: sectionText.slice(0, 2000),
          category: 'social_media',
          status: 'pending',
          notes: `AI-generated by ${modelLabel} | ${imageUrl ? 'Image generated' : 'No image yet'} | ${boostSection.slice(0, 300)}`,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        });
        count++;
      } catch (err) {
        console.error('Error saving post', i, err);
      }
    }
    
    setSavedCount(count);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            AI Marketing Package
            <Badge className={`text-xs ml-1 ${modelOverride === 'gpt_5_5' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
              {modelLabel}
            </Badge>
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Generate a complete promotional package — 3 posts, image specs, and boost strategy — tailored to <strong>{sale?.title}</strong>.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {!result && !loading && (
            <div className="py-10 flex flex-col items-center gap-5 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                <Zap className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">One-Click Marketing Package</h3>
                <p className="text-sm text-slate-500 max-w-md">
                  The AI Coach will analyze your sale details and generate 3 high-converting social posts, image design specs, AI image prompts, and a boost strategy — all tailored to this specific sale.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                {['3 Ready-to-Post Captions', 'Image Overlay Specs', 'AI Image Prompts', 'Boost Strategy', 'Timing Tips'].map(f => (
                  <span key={f} className="px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-purple-700">{f}</span>
                ))}
              </div>
              <Button
                onClick={handleGenerate}
                className={`font-bold px-8 h-12 text-sm text-white ${modelOverride === 'gpt_5_5' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with {modelLabel}
              </Button>
            </div>
          )}

          {loading && (
            <div className="py-16 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <div className="text-center">
                <p className="text-slate-700 font-semibold">AI Coach ({modelLabel}) is building your marketing package...</p>
                <p className="text-sm text-slate-400 mt-1">Analyzing sale data, crafting posts, designing specs</p>
              </div>
              {['Reviewing sale details & location...', 'Crafting scroll-stopping headlines...', 'Building image design specs...', 'Writing AI image prompts...', 'Finalizing boost strategy...'].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {step}
                </div>
              ))}
            </div>
          )}

          {result && !loading && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-700 border-green-200">✓ Package Ready — {modelLabel}</Badge>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs border-slate-300">
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy All</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setResult(null); setGeneratedImages([]); setSavedCount(0); }} className="text-xs border-slate-300 text-slate-500">
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Generated images strip */}
              {generatedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {generatedImages.map((img, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      {img.url ? (
                        <img src={img.url} alt={img.name} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center text-xs text-red-400 p-2 text-center">
                          Failed: {img.error}
                        </div>
                      )}
                      <div className="p-2 text-xs text-slate-600 font-medium truncate">{img.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleGenerateImages}
                  disabled={generatingImages}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {generatingImages
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating Images...</>
                    : <><ImageIcon className="w-3.5 h-3.5 mr-1.5" />{generatedImages.length > 0 ? 'Regenerate Images' : 'Generate Images (3 Posts)'}</>}
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveToCampaigns}
                  disabled={saving || savedCount > 0}
                  className={`text-xs text-white ${savedCount > 0 ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {saving
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                    : savedCount > 0
                    ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{savedCount} Posts Saved to Campaigns</>
                    : <><Save className="w-3.5 h-3.5 mr-1.5" />Save 3 Posts to Campaigns</>}
                </Button>
              </div>

              <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-p:text-slate-700 prose-strong:text-slate-800 prose-li:text-slate-700 bg-slate-50 rounded-xl border border-slate-200 p-5">
                <ReactMarkdown>{typeof result === 'string' ? result : JSON.stringify(result)}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-3 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-400">Review all content before posting. Adjust details as needed.</p>
          <Button variant="ghost" onClick={onClose} className="text-slate-500 text-sm">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}