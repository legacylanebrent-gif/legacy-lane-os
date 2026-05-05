import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, CheckCircle2, Zap, Save, ImageIcon, ChevronRight, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SalePostImageCompositor from './SalePostImageCompositor';

const POST_NAMES = ['Early Line / VIP Post', "What's Inside? Curiosity Post", 'Final Countdown Post'];

export default function AISaleMarketingPackage({ sale, open, onClose, modelOverride, onSaved }) {
  const [step, setStep] = useState('pick'); // 'pick' | 'loading' | 'result'
  const [selectedImages, setSelectedImages] = useState([]);
  const selectedImagesRef = useRef([]);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPosts, setSavedPosts] = useState({});
  const [showCompositor, setShowCompositor] = useState(false);
  const [savingImageIndex, setSavingImageIndex] = useState(null);
  const [savedImages, setSavedImages] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setStep('pick');
      setResult(null);
      setSavedPosts({});
      setShowCompositor(false);
      setSavedImages({});
      setSelectedImages([]);
      selectedImagesRef.current = [];
    }
  }, [open, modelOverride]);

  const modelLabel = modelOverride === 'gpt_5_5' ? 'GPT-5.5' : 'Claude';
  const saleImages = (sale?.images || sale?.photos || []).map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean);

  const toggleImage = (url) => {
    setSelectedImages(prev => {
      const next = prev.includes(url) ? prev.filter(u => u !== url) : prev.length < 5 ? [...prev, url] : prev;
      selectedImagesRef.current = next;
      return next;
    });
  };

  const buildPrompt = () => {
    const featuredItems = sale?.featured_items || [];
    const imgList = selectedImages.length > 0
      ? selectedImages.join(', ')
      : 'No images selected — describe ideal visuals based on typical estate sale content';

    return `You are the Legacy Lane AI Coach, an expert in estate sale marketing, buyer psychology, and local demand generation.

Your task is to automatically generate a COMPLETE promotional package for a specific estate sale using the operator's real data, images, and branding.

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

Operator-Selected Sale Images (USE THESE as the primary visual assets):
${imgList}

Featured Items: ${featuredItems.length > 0 ? featuredItems.join(', ') : 'General household, furniture, collectibles, antiques'}

---

## OBJECTIVE

Maximize foot traffic, early line formation, and total sell-through rate.
This is performance marketing for a time-sensitive event. NOT generic branding.

---

## PART 1: IMAGE ASSIGNMENT

From the operator-selected images above, recommend which specific image URL to use for each post and why.

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

---

## PART 3: IMAGE DESIGN SPECS

For each post:
- Which operator image to use as background (reference by URL or describe)
- Overlay text (exact wording)
- Recommended visual enhancements
- Logo placement

---

## PART 4: AI IMAGE GENERATION PROMPTS

For each post, write a ready-to-use AI image generation prompt that incorporates the background style of the selected images and the overlay copy.

---

## PART 5: BOOST STRATEGY

Suggest best posting times, ad spend recommendations, and one quick tip for the operator.

---

## TONE: Confident, clear, action-driven, local-market aware. Everything tailored to THIS specific sale.`;
  };

  const handleGenerate = async () => {
    setStep('loading');
    setResult(null);
    setSavedPosts({});
    try {
      const prompt = buildPrompt();
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: modelOverride || 'claude_sonnet_4_6',
        ...(selectedImages.length > 0 ? { file_urls: selectedImages.slice(0, 5) } : {}),
      });
      setResult(res);
      setStep('result');
    } catch (err) {
      setResult('Error generating marketing package: ' + err.message);
      setStep('result');
    }
  };

  const extractImagePrompts = (text) => {
    if (!text || typeof text !== 'string') return [];
    const prompts = [];
    const lines = text.split('\n');
    let capturing = false;
    let currentPrompt = '';
    let promptCount = 0;

    for (const line of lines) {
      if (/ai image (generation )?prompt/i.test(line)) {
        if (currentPrompt.trim() && promptCount < 3) {
          prompts.push({ name: POST_NAMES[promptCount], prompt: currentPrompt.trim() });
          promptCount++;
        }
        capturing = true;
        currentPrompt = '';
      } else if (capturing) {
        if (/^#+\s/.test(line) && !/ai image/i.test(line)) capturing = false;
        else if (line.trim()) currentPrompt += ' ' + line.trim();
      }
    }
    if (currentPrompt.trim() && promptCount < 3) {
      prompts.push({ name: POST_NAMES[promptCount], prompt: currentPrompt.trim() });
    }

    if (prompts.length === 0) {
      const base = `Estate sale promotional social media image for "${sale?.title || 'Estate Sale'}" in ${sale?.location || 'local area'}`;
      return [
        { name: POST_NAMES[0], prompt: `${base}. Urgency theme, bold "DOORS OPEN EARLY" text overlay, dramatic lighting, estate items in background, high contrast.` },
        { name: POST_NAMES[1], prompt: `${base}. Curiosity theme, "WHAT'S INSIDE?" bold text overlay, collage of antiques and collectibles, warm inviting colors.` },
        { name: POST_NAMES[2], prompt: `${base}. Final countdown theme, "LAST CHANCE" bold red text overlay, urgency, estate sale items, dramatic lighting.` },
      ];
    }
    return prompts;
  };



  const handleSaveCompositorImage = async (index, dataUrl) => {
    if (!sale) return;
    setSavingImageIndex(index);
    try {
      // Convert dataUrl to blob and upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `post_${index + 1}.jpg`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const POST_NAMES = ['Early Line / VIP Post', "What's Inside? Curiosity Post", 'Final Countdown Post'];
      await base44.entities.MarketingTask.create({
        task_type: 'estate_sale',
        sale_id: sale.id,
        sale_title: sale.title,
        title: `[AI-${modelLabel}] ${POST_NAMES[index]}`,
        description: `Composited social media post image for ${sale.title}`,
        category: 'social_media',
        status: 'pending',
        image_url: file_url,
        notes: `Canvas-composited image by ${modelLabel}`,
      });
      setSavedImages(prev => ({ ...prev, [index]: true }));
      if (onSaved) onSaved();
    } catch (err) {
      alert('Failed to save image: ' + err.message);
    }
    setSavingImageIndex(null);
  };

  const parseSections = (text) => {
    const lines = text.split('\n');
    const sections = [[], [], []];
    let currentSection = -1;
    for (const line of lines) {
      if (/(?:post\s*1|early line|vip post)/i.test(line) && /^#+/.test(line)) currentSection = 0;
      else if (/(?:post\s*2|what.?s inside|curiosity)/i.test(line) && /^#+/.test(line)) currentSection = 1;
      else if (/(?:post\s*3|final countdown|last chance)/i.test(line) && /^#+/.test(line)) currentSection = 2;
      if (currentSection >= 0) sections[currentSection].push(line);
    }
    return sections;
  };

  const handleSavePost = async (index) => {
    if (!result || !sale) return;
    setSaving(true);
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    const sections = parseSections(text);
    const boostSection = text.match(/(?:boost strategy|part 5)([\s\S]*?)(?:$)/i)?.[1] || '';
    const sectionText = sections[index].join('\n').trim() || `Post ${index + 1}: AI-generated marketing post for ${sale.title}`;

    try {
      await base44.entities.MarketingTask.create({
        task_type: 'estate_sale',
        sale_id: sale.id,
        sale_title: sale.title,
        title: `[AI-${modelLabel}] ${POST_NAMES[index]}`,
        description: sectionText.slice(0, 2000),
        category: 'social_media',
        status: 'pending',
        notes: `AI-generated by ${modelLabel} | ${boostSection.slice(0, 400)}`,
      });
      setSavedPosts(prev => ({ ...prev, [index]: true }));
      if (onSaved) onSaved();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const handleSaveAll = async () => {
    for (let i = 0; i < 3; i++) {
      if (!savedPosts[i]) await handleSavePost(i);
    }
  };



  const allSaved = [0, 1, 2].every(i => savedPosts[i]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
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
            Generate a complete promotional package for <strong>{sale?.title}</strong>.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* STEP 1: Image Picker */}
          {step === 'pick' && (
            <div className="p-5 space-y-5">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-purple-800 mb-1">Step 1: Choose Sale Images to Use</h3>
                <p className="text-xs text-purple-600">Select up to 5 photos from your sale. These will be used as background context for generating your post images. If you skip, the AI will create visuals from scratch.</p>
              </div>

              {/* Scrollable image grid */}
              <div className="overflow-y-auto max-h-64 rounded-xl border border-slate-200 bg-slate-50 p-2">
                {saleImages.length > 0 ? (
                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-1.5">
                    {saleImages.map((url, i) => {
                      const selected = selectedImages.includes(url);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleImage(url)}
                          className={`relative rounded overflow-hidden aspect-square border-2 transition-all flex-shrink-0 ${selected ? 'border-purple-500 shadow-md' : 'border-transparent hover:border-slate-400'}`}
                        >
                          <img
                            src={url}
                            alt={`Sale photo ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            width={80}
                            height={80}
                          />
                          {selected && (
                            <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No sale photos found. The AI will create visuals from scratch.</p>
                  </div>
                )}
              </div>

              {selectedImages.length > 0 && (
                <p className="text-xs text-purple-600 font-medium">{selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleGenerate}
                  className={`flex-1 h-12 font-bold text-white ${modelOverride === 'gpt_5_5' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Package with {modelLabel}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Loading */}
          {step === 'loading' && (
            <div className="py-16 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <div className="text-center">
                <p className="text-slate-700 font-semibold">AI Coach ({modelLabel}) is building your marketing package...</p>
                <p className="text-sm text-slate-400 mt-1">Analyzing sale data, crafting posts, designing specs</p>
                <p className="text-xs text-amber-600 mt-2">This process can take up to 10 mins to complete. Thanks for your patience.</p>
              </div>
              {['Reviewing sale details & images...', 'Crafting scroll-stopping headlines...', 'Building image design specs...', 'Writing AI image prompts...', 'Finalizing boost strategy...'].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Result */}
          {step === 'result' && result && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-700 border-green-200">✓ Package Ready — {modelLabel}</Badge>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(typeof result === 'string' ? result : ''); setCopied(true); setTimeout(() => setCopied(false), 2500); }} className="text-xs">
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy All</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStep('pick')} className="text-xs text-slate-500">← Change Images</Button>
                  <Button size="sm" variant="outline" onClick={handleGenerate} className="text-xs text-slate-500">Regenerate</Button>
                </div>
              </div>

              {/* Post Images Section — Canvas Compositor */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-indigo-800">Post Images</p>
                    {selectedImages.length > 0 ? (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs text-indigo-600">Using {selectedImages.length} reference photo{selectedImages.length > 1 ? 's' : ''}:</span>
                        {selectedImages.map((url, i) => (
                          <img key={i} src={url} alt={`ref ${i+1}`} className="w-7 h-7 rounded object-cover border border-indigo-300" loading="lazy" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-indigo-500 mt-0.5">No sale images selected — go back to select photos</p>
                    )}
                  </div>
                  {selectedImages.length > 0 && !showCompositor && (
                    <Button size="sm" onClick={() => setShowCompositor(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex-shrink-0">
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5" />Build Post Images
                    </Button>
                  )}
                </div>

                {showCompositor && selectedImages.length > 0 && (
                  <SalePostImageCompositor
                    saleTitle={sale?.title || 'Estate Sale'}
                    saleLocation={sale?.property_address?.city || sale?.location || ''}
                    referenceImages={selectedImages}
                    onSave={handleSaveCompositorImage}
                    saving={savingImageIndex}
                    saved={savedImages}
                  />
                )}
              </div>

              {/* Save All Posts */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={saving || allSaved}
                  className={`text-xs text-white ${allSaved ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                    : allSaved ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />All 3 Posts Saved!</>
                    : <><Save className="w-3.5 h-3.5 mr-1.5" />Save All 3 Posts to Campaigns</>}
                </Button>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      onClick={() => handleSavePost(i)}
                      disabled={saving || savedPosts[i]}
                      className={`text-xs px-2 py-1 rounded border transition-all ${savedPosts[i] ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-slate-600 border-slate-300 hover:border-amber-400'}`}
                    >
                      {savedPosts[i] ? '✓' : `Save #${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full text output */}
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