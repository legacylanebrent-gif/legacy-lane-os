// Homepage editor (Phase 4B — Parts 6/7/8/9/22). Hero editor with curated
// layout variants, controlled section show/hide/reorder, intro copy, seller
// CTA, Why Choose Us and How It Works structured editors.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor, HERO_LAYOUTS, WHY_STARTERS } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import SectionRegistryListRenderer, { SectionRegistryList } from '@/components/llbb/SectionRegistryList';
import { Wand2 } from 'lucide-react';

const SECTION_LABELS = {
  intro: 'Trust / Introduction', services: 'Services', sales: 'Current Estate Sales',
  why_choose_us: 'Why Choose Us', how_it_works: 'How It Works', testimonials: 'Testimonials',
  service_area: 'Service Area', cta: 'Seller CTA'
};

export default function HomepageEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [h, setH] = useState(() => {
    const src = (settings && settings.homepage) || {};
    return {
      hero_headline: src.hero_headline || '', hero_subheadline: src.hero_subheadline || '',
      hero_image_url: src.hero_image_url || '', hero_layout: src.hero_layout || 'overlay',
      intro_copy: src.intro_copy || '', cta_label: src.cta_label || '', cta_link: src.cta_link || '',
      secondary_cta_text: src.secondary_cta_text || '', secondary_cta_link: src.secondary_cta_link || ''
    };
  });
  const [sections, setSections] = useState(() => SectionRegistryList.init((settings && settings.homepage) || {}, SECTION_LABELS));
  const [wcu, setWcu] = useState(() => {
    const src = (settings && settings.why_choose_us) || {};
    return { headline: src.headline || '', items: Array.isArray(src.items) ? src.items.map(it => ({ ...it })) : [] };
  });
  const [hiw, setHiw] = useState(() => {
    const src = (settings && settings.how_it_works) || {};
    return { headline: src.headline || '', intro: src.intro || '', steps: Array.isArray(src.steps) ? src.steps.map(it => ({ ...it })) : [] };
  });
  const [cta, setCta] = useState(() => {
    const src = (settings && settings.cta) || {};
    return { label: src.label || '', sublabel: src.sublabel || '', link: src.link || '' };
  });

  const save = () => saver.save({
    homepage: { ...h, sections: SectionRegistryList.toPayload(sections) },
    why_choose_us: wcu, how_it_works: hiw, cta
  }, 'homepage');

  return (
    <div className="space-y-4">
      <SectionCard title="Hero" description="The first thing visitors see. Headline and subheadline are required before launch.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Headline" required><Input value={h.hero_headline} onChange={(e) => setH(s => ({ ...s, hero_headline: e.target.value }))} /></Field>
          <Field label="Layout" hint="Preview reflects the layout after save.">
            <Select value={h.hero_layout} onValueChange={(v) => setH(s => ({ ...s, hero_layout: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HERO_LAYOUTS.map(l => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">{(HERO_LAYOUTS.find(l => l.key === h.hero_layout) || {}).description}</p>
          </Field>
        </div>
        <Field label="Subheadline" required><Textarea rows={2} value={h.hero_subheadline} onChange={(e) => setH(s => ({ ...s, hero_subheadline: e.target.value }))} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primary CTA Text"><Input value={h.cta_label} onChange={(e) => setH(s => ({ ...s, cta_label: e.target.value }))} placeholder="View Our Sales" /></Field>
          <Field label="Primary CTA Link" hint="Controlled paths (e.g. /site/sales) or a https link"><Input value={h.cta_link} onChange={(e) => setH(s => ({ ...s, cta_link: e.target.value }))} /></Field>
          <Field label="Secondary CTA Text"><Input value={h.secondary_cta_text} onChange={(e) => setH(s => ({ ...s, secondary_cta_text: e.target.value }))} /></Field>
          <Field label="Secondary CTA Link"><Input value={h.secondary_cta_link} onChange={(e) => setH(s => ({ ...s, secondary_cta_link: e.target.value }))} /></Field>
        </div>
        <Field label="Hero Image URL" hint="Or set one from the Media Library panel."><Input value={h.hero_image_url} onChange={(e) => setH(s => ({ ...s, hero_image_url: e.target.value }))} placeholder="https://…" /></Field>
      </SectionCard>

      <SectionCard title="Homepage Sections" description="Choose which sections appear and in what order. Sections with no content never render, even when visible.">
        <SectionRegistryListRenderer sections={sections} onChange={setSections} labels={SECTION_LABELS} />
      </SectionCard>

      <SectionCard title="Trust / Introduction" description="A short paragraph under the hero.">
        <Field label="Intro Copy"><Textarea rows={4} value={h.intro_copy} onChange={(e) => setH(s => ({ ...s, intro_copy: e.target.value }))} /></Field>
      </SectionCard>

      <SectionCard title="Why Choose Us" description="3–6 value points. Only points you write appear — nothing is claimed automatically.">
        <Field label="Headline"><Input value={wcu.headline} onChange={(e) => setWcu(s => ({ ...s, headline: e.target.value }))} placeholder="Why Choose Us" /></Field>
        {(wcu.items || []).length === 0 && (
          <Button variant="outline" size="sm" onClick={() => setWcu(s => ({ ...s, items: WHY_STARTERS.slice(0, 3).map(x => ({ ...x })) }))}>
            <Wand2 className="w-3.5 h-3.5 mr-1" /> Start with suggestions
          </Button>
        )}
        <ItemListEditor items={wcu.items} onChange={(items) => setWcu(s => ({ ...s, items }))}
          fields={[{ key: 'title', label: 'Title' }, { key: 'icon', label: 'Icon' }, { key: 'description', label: 'Description', type: 'textarea', full: true }]}
          addLabel="Add Value Point" emptyText="No value points yet." />
      </SectionCard>

      <SectionCard title="How It Works" description="Your process, in your words. Rename, edit, reorder, show or hide any step.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Headline"><Input value={hiw.headline} onChange={(e) => setHiw(s => ({ ...s, headline: e.target.value }))} placeholder="How It Works" /></Field>
          <Field label="Intro"><Input value={hiw.intro} onChange={(e) => setHiw(s => ({ ...s, intro: e.target.value }))} /></Field>
        </div>
        <ItemListEditor items={hiw.steps} onChange={(steps) => setHiw(s => ({ ...s, steps }))}
          fields={[{ key: 'title', label: 'Step Title' }, { key: 'visible', label: 'Visible', type: 'bool' }, { key: 'description', label: 'Description', type: 'textarea', full: true }]}
          addLabel="Add Step" emptyText="No steps yet." />
      </SectionCard>

      <SectionCard title="Seller CTA" description="The consultation call-to-action band. Its form connects to your lead inbox (lead engine lands in Phase 4C).">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Headline"><Input value={cta.label} onChange={(e) => setCta(s => ({ ...s, label: e.target.value }))} placeholder="Need Help With an Estate?" /></Field>
          <Field label="Subheadline"><Input value={cta.sublabel} onChange={(e) => setCta(s => ({ ...s, sublabel: e.target.value }))} /></Field>
          <Field label="Button Link"><Input value={cta.link} onChange={(e) => setCta(s => ({ ...s, link: e.target.value }))} placeholder="/site/contact" /></Field>
        </div>
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={save} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}