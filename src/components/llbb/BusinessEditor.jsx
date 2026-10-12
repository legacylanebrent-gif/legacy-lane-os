// Business Profile editor (Phase 4B — Part 3). Structured presentation fields.
// Edits NEVER write back to canonical Company data; fields that fall back to
// Company show an "Imported from Company" hint.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, commaList } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function BusinessEditor({ websiteTenantId, settings, company, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [top, setTop] = useState({
    display_business_name: (settings && settings.display_business_name) || '',
    tagline: (settings && settings.tagline) || '',
    site_title: (settings && settings.site_title) || ''
  });
  const [biz, setBiz] = useState(() => {
    const b = (settings && settings.business) || {};
    return {
      short_description: b.short_description || '', long_description: b.long_description || '',
      year_founded: b.year_founded || '', years_experience: b.years_experience || '',
      owner_name: b.owner_name || '', business_type_label: b.business_type_label || '',
      primary_city: b.primary_city || '', primary_county: b.primary_county || '',
      cities_served: commaList.from(b.cities_served), counties_served: commaList.from(b.counties_served),
      states_served: commaList.from(b.states_served), service_area_notes: b.service_area_notes || '',
      show_address: b.show_address === true
    };
  });

  const save = () => saver.save({
    display_business_name: top.display_business_name, tagline: top.tagline, site_title: top.site_title,
    business: { ...biz, cities_served: commaList.to(biz.cities_served), counties_served: commaList.to(biz.counties_served), states_served: commaList.to(biz.states_served) }
  }, 'business');

  const setT = (k, v) => setTop(s => ({ ...s, [k]: v }));
  const setB = (k, v) => setBiz(s => ({ ...s, [k]: v }));

  return (
    <div className="space-y-4">
      <SectionCard title="Identity" description="How the business is named and described on the website.">
        <Field label="Business Name on Website" required hint={company ? `Imported from Company: ${company.display_name || company.legal_name} — edits here are a website override only.` : undefined}>
          <Input value={top.display_business_name} onChange={(e) => setT('display_business_name', e.target.value)} />
        </Field>
        <Field label="Tagline"><Input value={top.tagline} onChange={(e) => setT('tagline', e.target.value)} /></Field>
        <Field label="Site Title" hint="Browser tab title. Falls back to the business name."><Input value={top.site_title} onChange={(e) => setT('site_title', e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Short Description"><Input value={biz.short_description} onChange={(e) => setB('short_description', e.target.value)} /></Field>
          <Field label="Public Business Type" hint="e.g. Estate Sale Company"><Input value={biz.business_type_label} onChange={(e) => setB('business_type_label', e.target.value)} /></Field>
        </div>
        <Field label="Long Description" hint="Paragraphs separated by blank lines."><Textarea rows={5} value={biz.long_description} onChange={(e) => setB('long_description', e.target.value)} /></Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Year Founded"><Input value={biz.year_founded} onChange={(e) => setB('year_founded', e.target.value)} /></Field>
          <Field label="Years of Experience" hint="e.g. 15+ years"><Input value={biz.years_experience} onChange={(e) => setB('years_experience', e.target.value)} /></Field>
          <Field label="Owner / Founder Name"><Input value={biz.owner_name} onChange={(e) => setB('owner_name', e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Service Geography" description={company ? `Seeded from Company where available (Company: ${[company.city, company.state].filter(Boolean).join(', ') || 'not set'}).` : undefined}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primary City"><Input value={biz.primary_city} onChange={(e) => setB('primary_city', e.target.value)} /></Field>
          <Field label="Primary County"><Input value={biz.primary_county} onChange={(e) => setB('primary_county', e.target.value)} /></Field>
        </div>
        <Field label="Cities Served" hint="Comma-separated"><Input value={biz.cities_served} onChange={(e) => setB('cities_served', e.target.value)} /></Field>
        <Field label="Counties Served" hint="Comma-separated"><Input value={biz.counties_served} onChange={(e) => setB('counties_served', e.target.value)} /></Field>
        <Field label="States Served" hint="Comma-separated"><Input value={biz.states_served} onChange={(e) => setB('states_served', e.target.value)} /></Field>
        <Field label="Service Area Notes"><Textarea rows={3} value={biz.service_area_notes} onChange={(e) => setB('service_area_notes', e.target.value)} /></Field>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm text-slate-700">Show full address publicly</Label>
            <p className="text-xs text-slate-400">When off, only the city/state line displays (Contact settings control the displayed line).</p>
          </div>
          <Switch checked={biz.show_address} onCheckedChange={(v) => setB('show_address', v)} />
        </div>
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={save} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}