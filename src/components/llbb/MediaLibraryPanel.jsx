// Media Library (Phase 4B — Part 5). Tenant-scoped presentation assets.
// Upload → public storage (website rendering requires publicly fetchable
// images) → registered via the tenant-scoped websiteMediaAdmin seam. Logo and
// Hero placement buttons write the certified settings — never media internals.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSectionSaver, SectionCard, uploadStudioImage, MEDIA_CATEGORIES } from '@/components/llbb/editorKit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Trash2, Eye, EyeOff, ImagePlus, Crown, Maximize } from 'lucide-react';

export default function MediaLibraryPanel({ websiteTenantId, settings, onSaved }) {
  const [media, setMedia] = useState(null);
  const [category, setCategory] = useState('gallery');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingErr, setLoadingErr] = useState(null);
  const saver = useSectionSaver(websiteTenantId, onSaved);

  const load = async () => {
    setLoadingErr(null);
    try {
      const r = await base44.functions.invoke('websiteMediaAdmin', { action: 'list', website_tenant_id: websiteTenantId });
      setMedia((r.data && r.data.media) || []);
    } catch (e) { setLoadingErr('Could not load the media library.'); }
  };
  useEffect(() => { load(); }, [websiteTenantId]);

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    setError(null); setUploading(true);
    try {
      const url = await uploadStudioImage(file);
      await base44.functions.invoke('websiteMediaAdmin', {
        action: 'add', website_tenant_id: websiteTenantId, url,
        category, file_name: file.name, visible: true
      });
      await load();
    } catch (e) {
      setError('Upload failed — please try again.');
    }
    setUploading(false);
  };

  const patch = async (id, data) => {
    try {
      await base44.functions.invoke('websiteMediaAdmin', { action: 'update', website_tenant_id: websiteTenantId, id, ...data });
      await load();
    } catch (e) { setError('Could not update this image.'); }
  };
  const remove = async (id) => {
    try {
      await base44.functions.invoke('websiteMediaAdmin', { action: 'delete', website_tenant_id: websiteTenantId, id });
      await load();
    } catch (e) { setError('Could not remove this image.'); }
  };
  const setAs = async (m, which) => {
    if (which === 'logo') await saver.save({ branding: { logo_url: m.url } }, 'branding');
    else await saver.save({ homepage: { hero_image_url: m.url } }, 'homepage');
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Media Library" description="Website presentation images. Live websites need publicly fetchable images, so uploads use permanent public links; the library itself is private to this website's team. Logo, hero, gallery and profile images can all live here.">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="space-y-1">
            <Label className="text-sm text-slate-700">Category for upload</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDIA_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="cursor-pointer sm:mt-5">
            <span className="inline-flex items-center gap-2 text-sm font-medium border border-slate-200 rounded-md px-4 py-2.5 hover:bg-slate-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload images
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files && e.target.files[0])} />
          </label>
          <span className="text-xs text-slate-400 sm:mt-5">PNG or JPG, under 5 MB. Landscape images suit heroes; square suits logos.</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loadingErr && <p className="text-sm text-red-600">{loadingErr}</p>}
      </SectionCard>

      {media && media.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No images yet — upload your logo or hero photo to start.</p>
        </div>
      )}

      {media && media.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          {media.map(m => (
            <div key={m.id} className={`bg-white border rounded-lg overflow-hidden ${m.visible ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
              <img src={m.url} alt={m.alt_text || m.file_name || 'Media'} className="w-full h-36 object-cover bg-slate-50" loading="lazy" />
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 capitalize">{m.category}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => patch(m.id, { visible: !m.visible })} aria-label={m.visible ? 'Archive' : 'Restore'}>
                      {m.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Delete this image permanently?')) remove(m.id); }} aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </div>
                <Input value={m.caption || ''} placeholder="Caption" onChange={(e) => setMedia(cur => cur.map(x => x.id === m.id ? { ...x, caption: e.target.value } : x))}
                  onBlur={(e) => patch(m.id, { caption: e.target.value })} className="text-sm" />
                <Input value={m.alt_text || ''} placeholder="Alt text (accessibility)" onChange={(e) => setMedia(cur => cur.map(x => x.id === m.id ? { ...x, alt_text: e.target.value } : x))}
                  onBlur={(e) => patch(m.id, { alt_text: e.target.value })} className="text-sm" />
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAs(m, 'logo')}><Crown className="w-3 h-3 mr-1" /> Set as Logo</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAs(m, 'hero')}><Maximize className="w-3 h-3 mr-1" /> Set as Hero</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {saver.error && <p className="text-sm text-red-600 max-w-3xl">{saver.error}</p>}
    </div>
  );
}