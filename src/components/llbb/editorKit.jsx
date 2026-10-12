// LLBB Setup Studio shared editor kit (Phase 4B).
// Truthful section-save hook (status reflects actual persistence success),
// section card wrapper, generic structured item list editor, and the
// platform-curated design vocabularies (presets, palettes, typography,
// service library, FAQ starters, hero layouts).
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IconBadge from '@/templates/operatorTemplate1/IconBadge';
import { Loader2, Plus, Trash2, Save, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle } from 'lucide-react';

// ── Truthful save hook (Part 26): never shows Saved before persistence —───
// Phase 4D (Part 15): records the settings updated_date as it was when the
// editor opened (baseline fetched once on mount) and sends it with every
// save — a mismatch yields the server's stale_edit 409 and a reload prompt.
export function useSectionSaver(websiteTenantId, onSaved) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const baseline = React.useRef(null);
  React.useEffect(() => {
    let alive = true;
    base44.functions.invoke('websiteTenantSettingsAdmin', {
      action: 'get', website_tenant_id: websiteTenantId
    }).then((res) => {
      if (alive && res.data && res.data.settings && res.data.settings.updated_date) {
        baseline.current = res.data.settings.updated_date;
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [websiteTenantId]);
  const save = async (patch, section) => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const res = await base44.functions.invoke('websiteTenantSettingsAdmin', {
        action: 'update', website_tenant_id: websiteTenantId, settings: patch, section,
        expected_updated_at: baseline.current
      });
      if (res.data && res.data.settings && res.data.settings.updated_date) {
        baseline.current = res.data.settings.updated_date;
      }
      setSaved(true); setSaving(false);
      if (onSaved) onSaved();
      return true;
    } catch (e) {
      const code = e.response && e.response.data && e.response.data.error && e.response.data.error.code;
      if (code === 'stale_edit') setError('This section changed since you opened it. Reload before saving.');
      else setError('Error saving — click Save to retry.');
      setSaving(false);
      return false;
    }
  };
  return { save, saving, saved, error, clearSaved: () => setSaved(false) };
}

export function SaveBar({ onSave, saving, saved, error, note }) {
  return (
    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save
      </Button>
      {saving && <span className="text-sm text-slate-500">Saving…</span>}
      {saved && !saving && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
      {error && <span className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {error}</span>}
      {note && <span className="text-xs text-slate-400">{note}</span>}
    </div>
  );
}

export function SectionCard({ title, description, children, maxWidth }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${maxWidth || 'max-w-3xl'}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="font-heading font-bold text-slate-900">{title}</div>
        {description && <div className="text-sm text-slate-500 mt-0.5">{description}</div>}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

export function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Generic structured item list editor ──────────────────────────────────────
// fields: { key, label, type: text|textarea|bool|icon|thumb, rows?, placeholder? }
export function ItemListEditor({ items, onChange, fields, addLabel = 'Add Item', blank = {}, emptyText }) {
  const list = items || [];
  const setVal = (idx, key, value) => onChange(list.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {list.length === 0 && emptyText && <p className="text-sm text-slate-400">{emptyText}</p>}
      {list.map((it, idx) => (
        <div key={idx} className="border border-slate-200 rounded-md p-3 space-y-3 bg-slate-50/60">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400">#{idx + 1}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => remove(idx)} aria-label="Remove"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
            </div>
          </div>
          {fields.some(f => f.type === 'thumb') && it.image_url && (
            <img src={it.image_url} alt={it.alt_text || ''} className="w-full h-32 object-cover rounded border border-slate-200" />
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map(f => {
              if (f.type === 'thumb') return null; // rendered by the thumbnail block above
              if (f.type === 'bool') {
                return (
                  <div key={f.key} className={`flex items-center justify-between gap-3 ${f.full ? 'sm:col-span-2' : ''}`}>
                    <Label className="text-xs text-slate-500">{f.label}</Label>
                    <Switch checked={it[f.key] !== false && it[f.key] !== undefined ? it[f.key] : f.default !== false} onCheckedChange={(v) => setVal(idx, f.key, v)} />
                  </div>
                );
              }
              if (f.type === 'icon') {
                return (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-slate-500">{f.label}</Label>
                    <Select value={it[f.key] || 'none'} onValueChange={(v) => setVal(idx, f.key, v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No icon</SelectItem>
                        {ICON_OPTIONS.map(o => (
                          <SelectItem key={o.key} value={o.key}>
                            <span className="inline-flex items-center gap-2"><IconBadge icon={o.key} className="w-4 h-4" />{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              if (f.type === 'category') {
                return (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-slate-500">{f.label}</Label>
                    <Select value={it[f.key] || 'other'} onValueChange={(v) => setVal(idx, f.key, v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GALLERY_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              const Comp = f.type === 'textarea' ? Textarea : Input;
              return (
                <div key={f.key} className={`space-y-1 ${f.full ? 'sm:col-span-2' : ''}`}>
                  <Label className="text-xs text-slate-500">{f.label}</Label>
                  <Comp rows={f.type === 'textarea' ? (f.rows || 2) : undefined} value={it[f.key] ?? ''} onChange={(e) => setVal(idx, f.key, e.target.value)} placeholder={f.placeholder} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...list, { ...blank }])}><Plus className="w-3.5 h-3.5" /> {addLabel}</Button>
    </div>
  );
}

export const commaList = { to: (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean), from: (arr) => (arr || []).join(', ') };

// ── Curated design vocabularies (platform-controlled, Part 4) ────────────────
export const DESIGN_PRESETS = {
  classic: { label: 'Classic', description: 'Teal and amber with elegant serif headings', branding: { primary_color: '#0f766e', secondary_color: '#134e4a', accent_color: '#b45309', background_color: '#ffffff', text_color: '#1f2937', heading_font_family: 'Georgia, serif', body_font_family: 'system-ui, -apple-system, sans-serif' } },
  modern: { label: 'Modern', description: 'Clean blue with contemporary sans-serif', branding: { primary_color: '#2563eb', secondary_color: '#0f172a', accent_color: '#0ea5e9', background_color: '#ffffff', text_color: '#1e293b', heading_font_family: "'Helvetica Neue', Arial, sans-serif", body_font_family: "'Helvetica Neue', Arial, sans-serif" } },
  elegant: { label: 'Elegant', description: 'Burgundy and gold, warm and refined', branding: { primary_color: '#7c2d12', secondary_color: '#1c1917', accent_color: '#a16207', background_color: '#fffbeb', text_color: '#292524', heading_font_family: "'Times New Roman', serif", body_font_family: 'Georgia, serif' } },
  bold: { label: 'Bold', description: 'High-contrast charcoal and orange', branding: { primary_color: '#111827', secondary_color: '#374151', accent_color: '#ea580c', background_color: '#ffffff', text_color: '#111827', heading_font_family: "'Arial Black', Arial, sans-serif", body_font_family: 'Arial, sans-serif' } }
};
export const RECOMMENDED_PRESET_KEY = 'classic';

export const TYPOGRAPHY_OPTIONS = [
  { key: 'classic_serif', label: 'Classic / Elegant Serif', value: 'Georgia, serif' },
  { key: 'traditional_serif', label: 'Traditional Serif', value: "'Times New Roman', serif" },
  { key: 'modern_sans', label: 'Modern', value: "'Helvetica Neue', Arial, sans-serif" },
  { key: 'clean_system', label: 'Clean', value: 'system-ui, -apple-system, sans-serif' },
  { key: 'bold_display', label: 'Bold', value: "'Arial Black', Arial, sans-serif" }
];

export const COLOR_PALETTES = [
  { key: 'classic', label: 'Teal & Amber', colors: { primary_color: '#0f766e', secondary_color: '#134e4a', accent_color: '#b45309', background_color: '#ffffff', text_color: '#1f2937' } },
  { key: 'forest', label: 'Forest Green', colors: { primary_color: '#166534', secondary_color: '#14532d', accent_color: '#ca8a04', background_color: '#ffffff', text_color: '#1c1917' } },
  { key: 'navy_gold', label: 'Navy & Gold', colors: { primary_color: '#1e3a8a', secondary_color: '#172554', accent_color: '#b45309', background_color: '#ffffff', text_color: '#1e293b' } },
  { key: 'burgundy', label: 'Burgundy', colors: { primary_color: '#881337', secondary_color: '#4c0519', accent_color: '#a16207', background_color: '#ffffff', text_color: '#292524' } },
  { key: 'slate', label: 'Slate Blue', colors: { primary_color: '#334155', secondary_color: '#1e293b', accent_color: '#0284c7', background_color: '#f8fafc', text_color: '#0f172a' } },
  { key: 'terracotta', label: 'Warm Terracotta', colors: { primary_color: '#c2410c', secondary_color: '#7c2d12', accent_color: '#0891b2', background_color: '#fffbeb', text_color: '#292524' } }
];

export const HERO_LAYOUTS = [
  { key: 'overlay', label: 'Overlay', description: 'Text over a dimmed photo — the classic look' },
  { key: 'centered', label: 'Centered', description: 'Headline centered over the banner' },
  { key: 'text_left', label: 'Text Left / Image Right', description: 'Split hero with the photo beside the text' },
  { key: 'full_background', label: 'Full Background', description: 'Large full-bleed photo with a bold headline' }
];

// Starter services library (Part 12) — enable any mix; never forced.
export const SERVICE_LIBRARY = [
  { key: 'estate_sales', title: 'Estate Sales', description: 'Full-service, professionally managed estate sales.', icon: 'home' },
  { key: 'online_estate_sales', title: 'Online Estate Sales', description: 'Online auctions and virtual estate sale events.', icon: 'search' },
  { key: 'downsizing', title: 'Downsizing', description: 'Right-size your home with a clear, supported plan.', icon: 'package' },
  { key: 'senior_transitions', title: 'Senior Transitions', description: 'Patient, respectful moving support for seniors and families.', icon: 'heart' },
  { key: 'cleanouts', title: 'Cleanouts', description: 'Complete property cleanouts, ready for the next chapter.', icon: 'truck' },
  { key: 'consignment', title: 'Consignment', description: 'Sell select items on consignment with expert marketing.', icon: 'tag' },
  { key: 'valuation', title: 'Valuation / Appraisal', description: 'Professional valuation of contents and collections.', icon: 'search' },
  { key: 'real_estate', title: 'Real Estate Services', description: 'Prepare and market the home alongside the estate sale.', icon: 'briefcase' },
  { key: 'moving_assistance', title: 'Moving Assistance', description: 'Packing, moving and resettling help.', icon: 'truck' },
  { key: 'donation', title: 'Donation Coordination', description: 'We coordinate donation pickups for what remains.', icon: 'heart' },
  { key: 'buyouts', title: 'Buyouts', description: 'One-visit buyouts of remaining contents.', icon: 'dollar' },
  { key: 'probate', title: 'Probate Estate Assistance', description: 'Guided support for executors and trustees.', icon: 'clipboard' }
];

export const WHY_STARTERS = [
  { title: 'Experienced Team', description: 'A seasoned team that manages every detail of the sale.', icon: 'users' },
  { title: 'Full-Service Estate Sales', description: 'From planning to final settlement, everything is handled.', icon: 'check' },
  { title: 'Professional Inventory Management', description: 'Careful cataloging, pricing and presentation of contents.', icon: 'package' },
  { title: 'Local Expertise', description: 'Deep knowledge of the local market and buyers.', icon: 'map' },
  { title: 'Compassionate Service', description: 'Respectful support through life transitions.', icon: 'heart' },
  { title: 'Real Estate Assistance', description: 'Options to prepare and market the home itself.', icon: 'briefcase' }
];

// Starter FAQ (Part 18) — generic, editable, non-claiming copy.
export const FAQ_STARTERS = [
  { question: 'How does an estate sale work?', answer: 'A professional team organizes, prices, markets and runs the sale in the home, then handles settlement with you.' },
  { question: 'How much does an estate sale cost?', answer: 'Most companies work on a percentage of proceeds. Request a consultation for a personalized quote.' },
  { question: 'How long does the process take?', answer: 'Typically a few weeks from the first consultation to the completed sale, depending on the size of the estate.' },
  { question: 'What happens to unsold items?', answer: 'Common options include donation pickup, cleanout, or a buyout of remaining contents.' },
  { question: 'Do I need to clean the home first?', answer: 'No — the team handles preparation. You do not need to clean before the consultation.' },
  { question: 'Do you handle donations?', answer: 'Donation coordination is available. Ask during your consultation.' },
  { question: 'Do you provide cleanout services?', answer: 'Cleanout services are available where offered. See the services page or ask directly.' },
  { question: 'Can you assist with selling the home?', answer: 'Ask about real estate assistance options during your consultation.' },
  { question: 'How far in advance should I call?', answer: 'As early as you can — a few weeks of lead time allows for better planning and marketing.' }
];

export const ICON_OPTIONS = [
  { key: 'users', label: 'Experienced Team' }, { key: 'shield', label: 'Shield / Protected' },
  { key: 'heart', label: 'Compassionate' }, { key: 'star', label: 'Star' },
  { key: 'package', label: 'Inventory' }, { key: 'truck', label: 'Cleanout / Moving' },
  { key: 'tag', label: 'Pricing / Consignment' }, { key: 'camera', label: 'Marketing' },
  { key: 'award', label: 'Award' }, { key: 'phone', label: 'Contact' },
  { key: 'check', label: 'Checkmark' }, { key: 'clock', label: 'Time' },
  { key: 'map', label: 'Local' }, { key: 'key', label: 'Keys' },
  { key: 'briefcase', label: 'Real Estate' }, { key: 'handshake', label: 'Handshake' },
  { key: 'sparkles', label: 'Treasures' }, { key: 'search', label: 'Valuation' },
  { key: 'dollar', label: 'Buyout' }, { key: 'archive', label: 'Storage' },
  { key: 'home', label: 'Estate Sale' }, { key: 'wrench', label: 'Preparation' },
  { key: 'calendar', label: 'Scheduling' }, { key: 'clipboard', label: 'Probate / Process' }
];

export const GALLERY_CATEGORIES = [
  { key: 'past_sales', label: 'Past Sales' }, { key: 'interesting_finds', label: 'Interesting Finds' },
  { key: 'before_after', label: 'Before & After' }, { key: 'homes', label: 'Homes' },
  { key: 'team_at_work', label: 'Team at Work' }, { key: 'success_stories', label: 'Success Stories' },
  { key: 'other', label: 'Other' }
];

export const MEDIA_CATEGORIES = [
  { key: 'logo', label: 'Logo' }, { key: 'hero', label: 'Hero' }, { key: 'company', label: 'Company' },
  { key: 'owner_team', label: 'Owner / Team' }, { key: 'services', label: 'Services' },
  { key: 'gallery', label: 'Gallery' }, { key: 'testimonials', label: 'Testimonials' }, { key: 'other', label: 'Other' }
];

// Navigation manager defaults (Part 20) — controlled template paths only.
export const NAV_DEFAULT_ITEMS = [
  { key: 'home', label: 'Home', path: '/site', visible: true },
  { key: 'sales', label: 'Estate Sales', path: '/site/sales', visible: true },
  { key: 'about', label: 'About', path: '/site/about', visible: false },
  { key: 'services', label: 'Services', path: '/site/services', visible: false },
  { key: 'gallery', label: 'Gallery', path: '/site/gallery', visible: false },
  { key: 'faq', label: 'FAQ', path: '/site/faq', visible: false },
  { key: 'contact', label: 'Contact', path: '/site/contact', visible: true },
  { key: 'legal', label: 'Legal', path: '/site/legal', visible: false }
];

// Simple image upload for studio assets — uses the platform public-storage
// integration (website rendering requires publicly fetchable images).
export async function uploadStudioImage(file) {
  const res = await base44.integrations.Core.UploadPublicFile({ file });
  return res.file_url;
}