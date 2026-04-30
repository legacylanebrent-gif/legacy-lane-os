import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Loader2, Copy, Download, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const STEPS = {
  CONFIRM_SALE: 'confirm_sale',
  FEATURED_ITEMS: 'featured_items',
  CONFIRM_TONE: 'confirm_tone',
  GENERATE: 'generate',
  REVIEW_CONTENT: 'review_content',
  SAVE: 'save',
};

const CONTENT_TYPES = [
  { value: 'facebook_post', label: 'Facebook Post' },
  { value: 'instagram_post', label: 'Instagram Post' },
  { value: 'email_blast', label: 'Email Blast' },
  { value: 'sms', label: 'SMS Campaign' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'video_script', label: 'Video Script' },
  { value: 'image_prompt', label: 'Image Prompt' },
  { value: 'complete_package', label: 'Complete Package (All 7)' },
];

export default function GuidedContentFlow({ user, onClose, onContentSaved }) {
  const [step, setStep] = useState(STEPS.CONFIRM_SALE);
  const [saleDetails, setSaleDetails] = useState({
    title: '',
    address: '',
    dates: '',
    featured_items: '',
  });
  const [tone, setTone] = useState({
    voice_tone: 'professional',
    language_tone: 'warm',
  });
  const [contentType, setContentType] = useState('complete_package');
  const [generatedContent, setGeneratedContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rewriteIndex, setRewriteIndex] = useState(null);
  const [rewritePrompt, setRewritePrompt] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [step, generatedContent, loading]);

  const handleConfirmSale = () => {
    if (!saleDetails.title.trim()) {
      alert('Please enter sale title');
      return;
    }
    setStep(STEPS.FEATURED_ITEMS);
  };

  const handleConfirmItems = () => {
    setStep(STEPS.CONFIRM_TONE);
  };

  const handleGenerateContent = async () => {
    setLoading(true);
    try {
      const prompt = `Generate ${contentType === 'complete_package' ? 'a complete 7-piece' : 'a'} content package for this estate sale:

Sale Title: ${saleDetails.title}
Address: ${saleDetails.address}
Dates: ${saleDetails.dates}
Featured Items: ${saleDetails.featured_items || 'Not specified'}

Tone: ${tone.voice_tone} voice, ${tone.language_tone} language

${contentType !== 'complete_package' ? `Content Type: ${CONTENT_TYPES.find(c => c.value === contentType)?.label}` : ''}

Generate compelling, platform-optimized content that drives traffic and creates urgency.`;

      const res = await base44.functions.invoke('aiCoach', {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o',
        ai_mode: 'content_generation',
        voice_preferences: { voice_tone: tone.voice_tone, language_tone: tone.language_tone },
      });

      // Parse response into content pieces
      const pieces = parseContentResponse(res.data.reply, contentType);
      setGeneratedContent(pieces);
      setStep(STEPS.REVIEW_CONTENT);
    } catch (err) {
      alert('Error generating content: ' + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const parseContentResponse = (response, type) => {
    // Split by markdown headers (##) to extract content pieces
    const sections = response.split(/##\s+/).filter(s => s.trim());
    
    const pieces = sections.map((section, idx) => {
      const lines = section.split('\n');
      const name = lines[0].trim() || `Content Piece ${idx + 1}`;
      const content = lines.slice(1).join('\n').trim();
      
      return {
        id: `piece_${idx}`,
        name,
        type: type === 'complete_package' ? inferType(name) : type,
        content,
        word_count: content.split(/\s+/).length,
        approved: false,
      };
    });

    return pieces;
  };

  const inferType = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('facebook')) return 'facebook_post';
    if (lower.includes('instagram')) return 'instagram_post';
    if (lower.includes('email')) return 'email_blast';
    if (lower.includes('sms')) return 'sms';
    if (lower.includes('blog')) return 'blog_post';
    if (lower.includes('video')) return 'video_script';
    if (lower.includes('image')) return 'image_prompt';
    return 'complete_package';
  };

  const handleRewrite = async (index) => {
    if (!rewritePrompt.trim()) return;
    
    setRewriteIndex(null);
    setLoading(true);
    
    try {
      const piece = generatedContent[index];
      const prompt = `Rewrite this content: "${rewritePrompt}"\n\nOriginal:\n${piece.content}`;
      
      const res = await base44.functions.invoke('aiCoach', {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        ai_mode: 'content_generation',
      });

      const updated = [...generatedContent];
      updated[index] = {
        ...updated[index],
        content: res.data.reply,
        word_count: res.data.reply.split(/\s+/).length,
      };
      setGeneratedContent(updated);
      setRewritePrompt('');
    } catch (err) {
      alert('Error rewriting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleApprove = (index) => {
    const updated = [...generatedContent];
    updated[index].approved = !updated[index].approved;
    setGeneratedContent(updated);
  };

  const handleSaveContent = async () => {
    if (generatedContent.every(p => !p.approved)) {
      alert('Please approve at least one content piece');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.ContentHistory.create({
        operator_id: user.id,
        content_type: contentType,
        content_pieces: generatedContent.filter(p => p.approved).map(p => ({
          name: p.name,
          type: p.type,
          content: p.content,
          word_count: p.word_count,
        })),
        sale_details: {
          address: saleDetails.address,
          dates: saleDetails.dates.split(',').map(d => d.trim()),
          featured_items: saleDetails.featured_items.split(',').map(i => i.trim()),
        },
        tone_preferences: tone,
        status: 'draft',
        ai_model_used: 'gpt-4o',
        credits_used: 0,
      });

      alert('Content saved to Content History!');
      if (onContentSaved) onContentSaved();
      onClose();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadAsText = () => {
    const text = generatedContent
      .filter(p => p.approved)
      .map(p => `# ${p.name}\n\n${p.content}`)
      .join('\n\n---\n\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `content_${saleDetails.title.replace(/\s+/g, '_')}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Content Creation Flow</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">
        
        {/* Step 1: Confirm Sale */}
        {step === STEPS.CONFIRM_SALE && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Step 1: Confirm Sale Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Sale Title *</label>
                <Input
                  value={saleDetails.title}
                  onChange={e => setSaleDetails({ ...saleDetails, title: e.target.value })}
                  placeholder="e.g., Estate Sale in Bergen County"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Address</label>
                <Input
                  value={saleDetails.address}
                  onChange={e => setSaleDetails({ ...saleDetails, address: e.target.value })}
                  placeholder="Street address or city/state"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Sale Dates</label>
                <Input
                  value={saleDetails.dates}
                  onChange={e => setSaleDetails({ ...saleDetails, dates: e.target.value })}
                  placeholder="e.g., Saturday & Sunday, May 5-6"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                />
              </div>
              <Button
                onClick={handleConfirmSale}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Next: Featured Items
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Featured Items */}
        {step === STEPS.FEATURED_ITEMS && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Step 2: Featured Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Featured Items (comma-separated)</label>
                <Textarea
                  value={saleDetails.featured_items}
                  onChange={e => setSaleDetails({ ...saleDetails, featured_items: e.target.value })}
                  placeholder="e.g., Vintage furniture, antique artwork, collectible dishes"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-500 min-h-24"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(STEPS.CONFIRM_SALE)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmItems}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Next: Tone
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm Tone */}
        {step === STEPS.CONFIRM_TONE && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Step 3: Content Tone & Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Voice Tone</label>
                <Select value={tone.voice_tone} onValueChange={v => setTone({ ...tone, voice_tone: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="professional" className="text-slate-200">Professional</SelectItem>
                    <SelectItem value="warm" className="text-slate-200">Warm & Friendly</SelectItem>
                    <SelectItem value="luxury" className="text-slate-200">Luxury/Premium</SelectItem>
                    <SelectItem value="practical" className="text-slate-200">Practical & Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Language Tone</label>
                <Select value={tone.language_tone} onValueChange={v => setTone({ ...tone, language_tone: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="formal" className="text-slate-200">Formal</SelectItem>
                    <SelectItem value="casual" className="text-slate-200">Casual</SelectItem>
                    <SelectItem value="warm" className="text-slate-200">Warm & Emotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Content Type</label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CONTENT_TYPES.map(ct => (
                      <SelectItem key={ct.value} value={ct.value} className="text-slate-200">
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(STEPS.FEATURED_ITEMS)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateContent}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Content'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Edit Content */}
        {step === STEPS.REVIEW_CONTENT && (
          <>
            <div className="sticky top-0 bg-slate-950 pb-2">
              <div className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-slate-300">{generatedContent.filter(p => p.approved).length} of {generatedContent.length} approved</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={downloadAsText} className="text-slate-300 hover:text-white">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {generatedContent.map((piece, idx) => (
              <Card key={piece.id} className={`bg-slate-900 border-slate-700 ${piece.approved ? 'border-green-600' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <button
                        onClick={() => toggleApprove(idx)}
                        className={`mt-1 p-1 rounded-lg transition-colors ${piece.approved ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div className="flex-1">
                        <CardTitle className="text-white text-sm">{piece.name}</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">{piece.word_count} words</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(piece.content)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-slate-300 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-600">
                    <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {piece.content}
                    </ReactMarkdown>
                  </div>

                  {rewriteIndex !== idx && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRewriteIndex(idx)}
                      className="w-full"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Rewrite
                    </Button>
                  )}

                  {rewriteIndex === idx && (
                    <div className="space-y-2">
                      <Input
                        value={rewritePrompt}
                        onChange={e => setRewritePrompt(e.target.value)}
                        placeholder="e.g., Make it shorter, Add urgency, Change tone"
                        className="bg-slate-800 border-slate-600 text-white placeholder-slate-500 text-xs"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRewriteIndex(null); setRewritePrompt(''); }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRewrite(idx)}
                          disabled={loading || !rewritePrompt.trim()}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Rewrite'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button
                onClick={() => { setStep(STEPS.CONFIRM_TONE); setGeneratedContent([]); }}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveContent}
                disabled={loading || generatedContent.every(p => !p.approved)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Save to Content History
              </Button>
            </div>
          </>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}