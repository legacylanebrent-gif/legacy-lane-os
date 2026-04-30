import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2, Copy, Check, Upload, X, ChevronDown, ChevronUp, Sparkles, Tag, ImageIcon,
} from 'lucide-react';

const SECTIONS = [
  { key: 'facebook_long',        label: '📘 Facebook Post (Long)',        group: 'Social Media' },
  { key: 'facebook_short',       label: '📘 Facebook Post (Short)',       group: 'Social Media' },
  { key: 'instagram_caption',    label: '📸 Instagram Caption',           group: 'Social Media' },
  { key: 'instagram_reel_script',label: '🎬 Instagram Reel Script',       group: 'Social Media' },
  { key: 'email_blast',          label: '📧 Email Blast',                 group: 'Email & SMS' },
  { key: 'sms_reminder',         label: '📱 SMS Reminders (3-Pack)',      group: 'Email & SMS' },
  { key: 'blog_post',            label: '✍️ Blog Post (SEO)',              group: 'Content' },
  { key: 'featured_item_spotlight', label: '⭐ Featured Item Spotlight',  group: 'Content' },
  { key: 'day_before_reminder',  label: '📅 Day-Before Reminder',         group: 'Sale Timeline' },
  { key: 'morning_of_post',      label: '🌅 Morning-Of Post',             group: 'Sale Timeline' },
  { key: 'final_day_post',       label: '🚨 Final-Day Urgency Post',      group: 'Sale Timeline' },
  { key: 'everything_must_go',   label: '🔥 Everything Must Go',          group: 'Sale Timeline' },
  { key: 'post_sale_thank_you',  label: '🙏 Post-Sale Thank You',         group: 'After Sale' },
  { key: 'review_request',       label: '⭐ Review Request',              group: 'After Sale' },
  { key: 'referral_request',     label: '🤝 Referral Request',            group: 'After Sale' },
];

const GROUPS = ['Social Media', 'Email & SMS', 'Content', 'Sale Timeline', 'After Sale'];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md px-2 py-1 transition-all"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function SectionCard({ section, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
      >
        <span className="text-xs font-medium text-slate-200">{section.label}</span>
        <div className="flex items-center gap-2">
          {content && !open && <CopyButton text={content} />}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>
      {open && content && (
        <div className="bg-slate-900 px-3 py-3">
          <div className="flex justify-end mb-2">
            <CopyButton text={content} />
          </div>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{content}</pre>
        </div>
      )}
      {open && !content && (
        <div className="bg-slate-900 px-3 py-3 text-xs text-slate-500 italic">Content not generated for this section.</div>
      )}
    </div>
  );
}

function GroupBlock({ groupName, sections, results }) {
  const [open, setOpen] = useState(true);
  const groupSections = sections.filter(s => s.group === groupName);
  const filled = groupSections.filter(s => results[s.key]).length;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <span className="text-xs font-semibold text-orange-400">{groupName}</span>
        <span className="text-xs text-slate-500">{filled}/{groupSections.length} {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-1.5 mt-1">
          {groupSections.map(s => (
            <SectionCard key={s.key} section={s} content={results[s.key]} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalePromotionEngine({ user, isExhausted, onCreditsUsed }) {
  const [form, setForm] = useState({
    sale_title: '',
    sale_city: '',
    sale_address: '',
    sale_dates: '',
    featured_items: '',
    special_notes: '',
  });
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const updateForm = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handlePhotoUpload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const newUrls = [];
    for (const file of Array.from(files).slice(0, 4)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newUrls.push(file_url);
        setPhotoFiles(prev => [...prev, { name: file.name, url: file_url }]);
      } catch (_) {}
    }
    setPhotoUrls(prev => [...prev, ...newUrls]);
    setUploading(false);
  };

  const removePhoto = (url) => {
    setPhotoUrls(prev => prev.filter(u => u !== url));
    setPhotoFiles(prev => prev.filter(f => f.url !== url));
  };

  const generate = async () => {
    if (!form.sale_title || !form.sale_dates) {
      setError('Please enter at least a sale title and dates.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('salePromotionEngine', {
        ...form,
        photo_urls: photoUrls,
        model: 'gpt-4o',
      });
      setResults(res.data.sections || {});
      if (onCreditsUsed) onCreditsUsed();
    } catch (err) {
      const isLimit = err?.response?.status === 402 || err?.response?.data?.error === 'credit_limit_reached';
      setError(isLimit
        ? '🚫 Not enough credits to run the Sale Promotion Engine. Contact your admin.'
        : '⚠️ Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (results) {
    const totalFilled = SECTIONS.filter(s => results[s.key]).length;
    return (
      <div className="flex flex-col h-full">
        {/* Results header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-orange-900/60 to-amber-900/40 border-b border-orange-800/50 px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-orange-300">✦ Sale Promotion Package</p>
              <p className="text-xs text-slate-400 mt-0.5">{totalFilled}/15 pieces generated for "{form.sale_title}"</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResults(null)}
              className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700 h-7"
            >
              New Sale
            </Button>
          </div>
          {/* Progress bar */}
          <div className="mt-2 bg-slate-800 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${(totalFilled / 15) * 100}%` }} />
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">
          {GROUPS.map(group => (
            <GroupBlock key={group} groupName={group} sections={SECTIONS} results={results} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Intro */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="w-10 h-10 mx-auto bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl flex items-center justify-center mb-2 shadow-lg">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-white font-bold text-sm text-center">Sale Promotion Engine</h3>
        <p className="text-slate-400 text-xs text-center mt-0.5">Fill in your sale details and generate all 15 pieces of content in one click.</p>

        {/* What you get */}
        <div className="mt-2 bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 text-xs">
          <p className="text-orange-400 font-semibold mb-1.5">✦ 15 pieces generated:</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-400">
            {SECTIONS.map(s => <p key={s.key}>{s.label}</p>)}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Sale Title *</Label>
          <Input
            value={form.sale_title}
            onChange={e => updateForm('sale_title', e.target.value)}
            placeholder='e.g. "The Henderson Estate Sale"'
            className="bg-slate-800 border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 h-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">City / Neighborhood *</Label>
            <Input
              value={form.sale_city}
              onChange={e => updateForm('sale_city', e.target.value)}
              placeholder="e.g. Montclair, NJ"
              className="bg-slate-800 border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">Address (for signs)</Label>
            <Input
              value={form.sale_address}
              onChange={e => updateForm('sale_address', e.target.value)}
              placeholder="Full address"
              className="bg-slate-800 border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 h-8"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Dates & Times *</Label>
          <Input
            value={form.sale_dates}
            onChange={e => updateForm('sale_dates', e.target.value)}
            placeholder="e.g. Sat May 10 & Sun May 11, 9am–3pm"
            className="bg-slate-800 border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 h-8"
          />
        </div>

        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Featured Items</Label>
          <Textarea
            value={form.featured_items}
            onChange={e => updateForm('featured_items', e.target.value)}
            placeholder="e.g. Victorian bedroom set, Waterford crystal collection, mid-century modern chairs, signed artwork, gold jewelry, vintage watches..."
            className="bg-slate-800 border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 resize-none min-h-[60px]"
            rows={2}
          />
        </div>

        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Special Notes</Label>
          <Input
            value={form.special_notes}
            onChange={e => updateForm('special_notes', e.target.value)}
            placeholder="e.g. Cash & Venmo only. Gated community, ID required."
            className="bg-slate-800 border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 h-8"
          />
        </div>

        {/* Photo upload */}
        <div>
          <Label className="text-xs text-slate-400 mb-1 block">Sale Photos (up to 4) — AI will reference these</Label>
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="border border-dashed border-slate-600 hover:border-orange-500 rounded-xl p-3 text-center cursor-pointer transition-colors bg-slate-800/40 hover:bg-slate-800/70"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Click to upload photos</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handlePhotoUpload(e.target.files)}
          />
          {photoFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {photoFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-300">
                  <ImageIcon className="w-3 h-3 text-orange-400" />
                  <span className="max-w-[80px] truncate">{f.name}</span>
                  <button onClick={() => removePhoto(f.url)} className="text-slate-500 hover:text-red-400 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="flex-shrink-0 border-t border-slate-700 p-3 bg-slate-900">
        <Button
          onClick={generate}
          disabled={loading || isExhausted || !form.sale_title || !form.sale_dates}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-semibold text-sm h-10 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating 15 pieces…</span>
          ) : (
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate Complete Package</span>
          )}
        </Button>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Uses 8,000 credits · Takes ~30 seconds</p>
      </div>
    </div>
  );
}