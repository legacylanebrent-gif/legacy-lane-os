// Branding Studio (Phase 4B — Part 4). Logo/favicon upload, curated color
// palettes + per-token color pickers, curated typography, safe design presets,
// and USE RECOMMENDED DESIGN with confirmation. Presets write controlled
// branding tokens — never separate templates.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, DESIGN_PRESETS, RECOMMENDED_PRESET_KEY, TYPOGRAPHY_OPTIONS, COLOR_PALETTES, uploadStudioImage } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Sparkles, X } from 'lucide-react';

const COLOR_FIELDS = [
  ['primary_color', 'Primary'], ['secondary_color', 'Secondary'], ['accent_color', 'Accent'],
  ['background_color', 'Background'], ['text_color', 'Text']
];
const FONT_KEYS = ['heading_font_family', 'body_font_family'];

export default function BrandingStudio({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [b, setB] = useState(() => {
    const src = (settings && settings.branding) || {};
    const out = {};
    for (const k of [...COLOR_FIELDS.map(f => f[0]), ...FONT_KEYS, 'logo_url', 'favicon_url', 'alternate_logo_url', 'design_preset']) out[k] = src[k] || '';
    return out;
  });
  const [uploading, setUploading] = useState(null); // 'logo' | 'favicon' | null
  const [uploadErr, setUploadErr] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'preset:<key>' | 'recommended' | null
  const [presetApplied, setPresetApplied] = useState(null);

  const isCustomized = () => COLOR_FIELDS.some(([k]) => b[k] && (!DESIGN_PRESETS.classic.branding[k] || b[k] !== DESIGN_PRESETS.classic.branding[k]))
    || (b.heading_font_family && b.heading_font_family !== DESIGN_PRESETS.classic.branding.heading_font_family);

  const save = (extra) => saver.save({ branding: { ...b, ...extra } }, 'branding');

  const handleUpload = async (which, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadErr('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadErr('Image must be under 5 MB.'); return; }
    setUploadErr(null); setUploading(which);
    try {
      const url = await uploadStudioImage(file);
      const patch = { ...b, [which === 'logo' ? 'logo_url' : 'favicon_url']: url };
      setB(patch);
      await saver.save({ branding: patch }, 'branding');
    } catch (e) {
      setUploadErr('Upload failed — please try again.');
    }
    setUploading(null);
  };

  const applyPreset = (key) => {
    const patch = { ...b, ...DESIGN_PRESETS[key].branding, design_preset: key };
    setB(patch); setPresetApplied(key); setConfirmAction(null);
    saver.save({ branding: patch }, 'branding');
  };

  const useRecommended = () => {
    if (isCustomized()) { setConfirmAction('recommended'); return; }
    applyPreset(RECOMMENDED_PRESET_KEY);
  };

  const fontSelect = (k, label) => {
    const current = TYPOGRAPHY_OPTIONS.find(o => o.value === b[k]);
    return (
      <Field label={label}>
        <Select value={current ? current.key : (b[k] ? 'custom' : 'none')}
          onValueChange={(key) => { const o = TYPOGRAPHY_OPTIONS.find(x => x.key === key); if (o) { setB(s => ({ ...s, [k]: o.value })); } }}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Template default</SelectItem>
            {TYPOGRAPHY_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            {b[k] && !current && <SelectItem value="custom">Custom (current)</SelectItem>}
          </SelectContent>
        </Select>
      </Field>
    );
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Logo & Favicon" description="Shown in the website header, footer and browser tab. Square logos render best; PNG or JPG under 5 MB.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-slate-700">Logo</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-16 h-16 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                {b.logo_url ? <img src={b.logo_url} alt="Logo preview" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">None</span>}
              </div>
              <div className="space-y-1.5">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
                    {uploading === 'logo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload logo
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload('logo', e.target.files && e.target.files[0])} />
                </label>
                {b.logo_url && <button onClick={() => setB(s => ({ ...s, logo_url: '' }))} className="text-xs text-red-500 hover:underline flex items-center gap-1"><X className="w-3 h-3" />Remove</button>}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm text-slate-700">Favicon</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                {b.favicon_url ? <img src={b.favicon_url} alt="Favicon preview" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-slate-400">None</span>}
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
                  {uploading === 'favicon' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload favicon
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload('favicon', e.target.files && e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
        {uploadErr && <p className="text-sm text-red-600">{uploadErr}</p>}
      </SectionCard>

      <SectionCard title="Design Presets" description="Safe, professionally designed starting points. Applying a preset updates colors and fonts only — your content is untouched.">
        <div className="grid sm:grid-cols-4 gap-3">
          {Object.entries(DESIGN_PRESETS).map(([key, p]) => (
            <button key={key} onClick={() => setConfirmAction(`preset:${key}`)}
              className={`text-left rounded-lg border p-3 transition-colors ${b.design_preset === key ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex gap-1 mb-2">
                {[p.branding.primary_color, p.branding.accent_color, p.branding.secondary_color].map(c => <span key={c} className="w-4 h-4 rounded-full border border-slate-200" style={{ background: c }} />)}
              </div>
              <div className="font-semibold text-sm text-slate-900" style={{ fontFamily: p.branding.heading_font_family }}>{p.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={useRecommended}><Sparkles className="w-4 h-4 mr-2" /> Use Recommended Design</Button>
          {presetApplied && <span className="text-sm text-green-600">Applied: {DESIGN_PRESETS[presetApplied].label}</span>}
        </div>
        {confirmAction && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
            <p className="text-amber-800">
              {confirmAction === 'recommended'
                ? 'Use the recommended design? Your current custom colors and fonts will be replaced.'
                : `Apply the ${DESIGN_PRESETS[confirmAction.split(':')[1]].label} preset? Current colors and fonts will be replaced.`}
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => confirmAction === 'recommended' ? applyPreset(RECOMMENDED_PRESET_KEY) : applyPreset(confirmAction.split(':')[1])}>Yes, apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Colors" description="Pick visually, or paste an exact hex code. Palettes apply a complete, tested combination.">
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTES.map(p => (
            <button key={p.key} onClick={() => setB(s => ({ ...s, ...p.colors }))}
              className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
              <span className="flex gap-0.5">
                {[p.colors.primary_color, p.colors.accent_color, p.colors.secondary_color].map(c => <span key={c} className="w-3 h-3 rounded-full border border-slate-200" style={{ background: c }} />)}
              </span>
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {COLOR_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <div className="flex items-center gap-2">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(b[k] || '') ? b[k] : '#ffffff'} onChange={(e) => setB(s => ({ ...s, [k]: e.target.value }))} className="w-9 h-9 rounded border border-slate-200 cursor-pointer p-0.5" aria-label={label} />
                <Input value={b[k] || ''} onChange={(e) => setB(s => ({ ...s, [k]: e.target.value }))} placeholder="#0f766e" className="flex-1" />
              </div>
            </Field>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Typography" description="A curated set of professional pairings — no font hunting required.">
        <div className="grid sm:grid-cols-2 gap-4">
          {fontSelect('heading_font_family', 'Heading Font')}
          {fontSelect('body_font_family', 'Body Font')}
        </div>
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={() => save()} saving={saver.saving} saved={saver.saved} error={saver.error} note="Color/font changes apply to the preview after save." />
      </div>
    </div>
  );
}