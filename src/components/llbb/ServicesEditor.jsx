// Services manager (Phase 4B — Part 12). Starter service library (enable any
// mix, never forced), custom services, per-service presentation config
// including dedicated pages with controlled SEO slugs.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor, SERVICE_LIBRARY, uploadStudioImage } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export default function ServicesEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [sv, setSv] = useState(() => {
    const src = (settings && settings.services) || {};
    return { headline: src.headline || '', intro: src.intro || '', items: Array.isArray(src.items) ? src.items.map(it => ({ ...it })) : [] };
  });
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const set = (k, v) => setSv(s => ({ ...s, [k]: v }));

  const existingKeys = new Set((sv.items || []).map(it => it.library_key).filter(Boolean));

  // Chapter 7 P1 — the canonical OperatorService catalog feeds the website:
  // the operator defines a service once; the website can explain it. Existing
  // website content is never overwritten — only catalog services not yet
  // present are added.
  const importFromCatalog = async () => {
    try {
      const user = await base44.auth.me();
      const catalog = await base44.entities.OperatorService.filter({ operator_id: user.id, enabled: true });
      const existingIds = new Set((sv.items || []).map(it => it.catalog_service_id).filter(Boolean));
      const additions = (catalog || []).filter(s => !existingIds.has(s.id)).map(s => ({
        catalog_service_id: s.id,
        library_key: `catalog_${s.id}`,
        title: s.display_name,
        description: s.public_description || s.description || '',
        enabled: true,
        show_on_homepage: true,
        dedicated_page: false,
        seo_slug: slugify(s.display_name),
      }));
      if (additions.length) {
        set('items', [...(sv.items || []), ...additions]);
      } else {
        alert('All enabled catalog services are already on the website.');
      }
    } catch (e) {
      alert('Could not load your service catalog: ' + e.message);
    }
  };
  const addStarter = (st) => set('items', [...(sv.items || []), { ...st, library_key: st.key, enabled: true, show_on_homepage: true, dedicated_page: false, seo_slug: slugify(st.title), description: st.description || '' }]);
  const addCustom = () => set('items', [...(sv.items || []), { title: '', description: '', enabled: true, show_on_homepage: true, dedicated_page: false, seo_slug: '' }]);

  const uploadImage = async (idx, file) => {
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setUploadingIdx(idx);
    try {
      const url = await uploadStudioImage(file);
      set('items', (sv.items || []).map((it, i) => i === idx ? { ...it, image_url: url } : it));
    } catch (e) { /* save shows state */ }
    setUploadingIdx(null);
  };

  const slugTaken = (slug, idx) => (sv.items || []).some((it, i) => i !== idx && it.seo_slug === slug);
  const hasDuplicates = (sv.items || []).some((it, i) => it.dedicated_page !== false && it.seo_slug && slugTaken(it.seo_slug, i));

  return (
    <div className="space-y-4">
      <SectionCard title="Services Page" description="Enabled services appear on the website. Enable only what you actually offer — the mix is entirely yours.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Headline"><Input value={sv.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Our Services" /></Field>
          <Field label="Intro"><Input value={sv.intro} onChange={(e) => set('intro', e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Starter Services" description="Professional starting points — add any of them, then edit to fit your business.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SERVICE_LIBRARY.map(st => {
            const added = existingKeys.has(st.key);
            return (
              <div key={st.key} className={`rounded-lg border p-3 ${added ? 'border-green-200 bg-green-50/50' : 'border-slate-200'}`}>
                <div className="text-sm font-medium text-slate-900">{st.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{st.description}</div>
                <Button size="sm" variant="outline" className="mt-2 w-full" disabled={added} onClick={() => addStarter(st)}>
                  {added ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Added</> : <><Plus className="w-3.5 h-3.5 mr-1" /> Add</>}
                </Button>
              </div>
            );
          })}
        </div>
        <Button variant="outline" onClick={addCustom}><Plus className="w-4 h-4 mr-2" /> Add Custom Service</Button>
      </SectionCard>

      <SectionCard title="Your Services" description="Reorder, edit, enable/disable, and configure dedicated pages. Disabled services never render.">
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={importFromCatalog}><Plus className="w-3.5 h-3.5" /> Import from my Service Catalog</Button>
        </div>
        {hasDuplicates && <p className="text-sm text-red-600">Two services share the same page link — page links must be unique.</p>}
        <ItemListEditor items={sv.items} onChange={(items) => set('items', items)}
          fields={[
            { key: 'title', label: 'Title' }, { key: 'enabled', label: 'Enabled', type: 'bool' },
            { key: 'description', label: 'Short Description', type: 'textarea', full: true },
            { key: 'long_description', label: 'Dedicated Page Overview', type: 'textarea', rows: 4, full: true },
            { key: 'icon', label: 'Icon' },
            { key: 'show_on_homepage', label: 'Show on Homepage', type: 'bool' },
            { key: 'dedicated_page', label: 'Dedicated Page Enabled', type: 'bool' },
            { key: 'seo_slug', label: 'Page Link (from title)', placeholder: 'estate-sales' },
            { key: 'cta_label', label: 'CTA Text' }, { key: 'cta_link', label: 'CTA Link' },
            { key: 'image_url', label: 'Image', type: 'media_url', full: false }
          ]}
          addLabel="Add Service" emptyText="No services yet — add starters above." />
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={() => saver.save({ services: sv }, 'services')} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}