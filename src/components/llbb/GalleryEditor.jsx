// Gallery editor (Phase 4B — Part 15). Tenant presentation gallery, separate
// from canonical Estate Sale inventory. Add from the Media Library or upload
// directly; captions, alt text, categories, visibility and ordering.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor, GALLERY_CATEGORIES, uploadStudioImage } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Images, X } from 'lucide-react';

export default function GalleryEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [g, setG] = useState(() => {
    const src = (settings && settings.gallery) || {};
    return {
      headline: src.headline || '', intro: src.intro || '',
      items: (Array.isArray(src.items) ? src.items : []).map(it => ({ ...it, visible: it.visible !== false }))
    };
  });
  const [library, setLibrary] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setG(s => ({ ...s, [k]: v }));

  const usedUrls = new Set((g.items || []).map(it => it.image_url).filter(Boolean));

  const loadLibrary = async () => {
    try {
      const r = await base44.functions.invoke('websiteMediaAdmin', { action: 'list', website_tenant_id: websiteTenantId });
      setLibrary((r.data && r.data.media) || []);
    } catch (e) { setLibrary([]); }
  };
  useEffect(() => { if (pickerOpen) loadLibrary(); }, [pickerOpen]);

  const addFromLibrary = (m) => {
    set('items', [...(g.items || []), { image_url: m.url, media_id: m.id, caption: m.caption || '', alt_text: m.alt_text || '', category: 'gallery', visible: true }]);
    setPickerOpen(false);
  };

  const uploadDirect = async (file) => {
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    try {
      const url = await uploadStudioImage(file);
      set('items', [...(g.items || []), { image_url: url, caption: '', alt_text: '', category: 'gallery', visible: true }]);
    } catch (e) { /* save surfaces state */ }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Gallery" description="Presentation gallery for your website — separate from estate sale inventory.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Headline"><Input value={g.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Gallery" /></Field>
          <Field label="Intro"><Input value={g.intro} onChange={(e) => set('intro', e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(o => !o)}><Images className="w-3.5 h-3.5 mr-1" /> {pickerOpen ? 'Close library' : 'Add from Media Library'}</Button>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload image
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadDirect(e.target.files && e.target.files[0])} />
          </label>
        </div>
        {pickerOpen && (
          <div className="border border-slate-200 rounded-md p-3">
            {!library ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {library.filter(m => m.visible !== false).map(m => (
                  <button key={m.id} disabled={usedUrls.has(m.url)} onClick={() => addFromLibrary(m)}
                    className={`relative rounded border overflow-hidden ${usedUrls.has(m.url) ? 'opacity-30 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-slate-900'}`}>
                    <img src={m.url} alt={m.alt_text || ''} className="w-full h-16 object-cover" />
                    {usedUrls.has(m.url) && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white bg-slate-900/60">Added</span>}
                  </button>
                ))}
                {library.filter(m => m.visible !== false).length === 0 && <p className="col-span-5 text-sm text-slate-400">Library is empty — upload in the Media Library panel or directly here.</p>}
              </div>
            )}
          </div>
        )}
        <ItemListEditor items={g.items} onChange={(items) => set('items', items)}
          fields={[
            { key: 'thumb', label: '', type: 'thumb', full: true },
            { key: 'caption', label: 'Caption' }, { key: 'alt_text', label: 'Alt Text (accessibility)' },
            { key: 'category', label: 'Category', type: 'category' }, { key: 'visible', label: 'Visible', type: 'bool' }
          ]}
          addLabel="Add Gallery Item" emptyText="No gallery items yet. Optional — galleries never block launch." />
      </SectionCard>
      <div className="max-w-3xl">
        <SaveBar onSave={() => saver.save({ gallery: g }, 'gallery')} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}