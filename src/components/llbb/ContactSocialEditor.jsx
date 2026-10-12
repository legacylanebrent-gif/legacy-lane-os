// Contact & Social editor (Phase 4B — Part 16). Contact presentation
// (canonical Company values seed via the use_company toggles) + social links
// with https validation. Invalid social URLs are rejected before save
// (server sanitizes too — defense in depth).
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const SOCIAL_FIELDS = [
  ['facebook', 'Facebook URL'], ['instagram', 'Instagram URL'], ['tiktok', 'TikTok URL'],
  ['youtube', 'YouTube URL'], ['pinterest', 'Pinterest URL'], ['linkedin', 'LinkedIn URL'],
  ['twitter', 'X / Twitter URL']
];

export default function ContactSocialEditor({ websiteTenantId, settings, company, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [c, setC] = useState(() => {
    const src = (settings && settings.contact) || {};
    return {
      use_company_phone: src.use_company_phone !== false,
      phone_display: src.phone_display || '',
      sms_number: src.sms_number || '',
      use_company_email: src.use_company_email !== false,
      email_display: src.email_display || '',
      inquiry_email: src.inquiry_email || '',
      mailing_address: src.mailing_address || '',
      address_display: src.address_display || '',
      show_address: src.show_address !== false,
      business_hours: src.business_hours || '',
      contact_cta_label: src.contact_cta_label || ''
    };
  });
  const [so, setSo] = useState(() => {
    const src = (settings && settings.social) || {};
    const out = {};
    for (const [k] of SOCIAL_FIELDS) out[k] = src[k] || '';
    return out;
  });
  const [urlError, setUrlError] = useState(null);
  const setCv = (k, v) => setC(s => ({ ...s, [k]: v }));
  const setSv = (k, v) => setSo(s => ({ ...s, [k]: v }));

  const save = () => {
    const invalid = Object.entries(so).filter(([, v]) => v && !/^https:\/\/\S+$/i.test(v.trim()));
    if (invalid.length > 0) {
      setUrlError(`Social links must be full https addresses (e.g. https://facebook.com/yourpage). Check: ${invalid.map(([k]) => k).join(', ')}.`);
      return;
    }
    setUrlError(null);
    saver.save({ contact: c, social: so }, 'contact');
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Contact" description={company ? `Company phone: ${company.phone || 'not set'} · Company email: ${company.email || 'not set'} — used automatically unless you override.` : undefined}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm text-slate-700">Use Company phone</Label>
            <Switch checked={c.use_company_phone} onCheckedChange={(v) => setCv('use_company_phone', v)} />
          </div>
          {!c.use_company_phone && (
            <Field label="Public Phone" required={false}><Input value={c.phone_display} onChange={(e) => setCv('phone_display', e.target.value)} /></Field>
          )}
          <Field label="Text / SMS Number" hint="Only if different from the public phone"><Input value={c.sms_number} onChange={(e) => setCv('sms_number', e.target.value)} /></Field>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm text-slate-700">Use Company email</Label>
            <Switch checked={c.use_company_email} onCheckedChange={(v) => setCv('use_company_email', v)} />
          </div>
          {!c.use_company_email && (
            <Field label="Public Email"><Input value={c.email_display} onChange={(e) => setCv('email_display', e.target.value)} /></Field>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Inquiry Email" hint="Displayed for lead inquiries when set"><Input value={c.inquiry_email} onChange={(e) => setCv('inquiry_email', e.target.value)} /></Field>
            <Field label="Contact CTA Label"><Input value={c.contact_cta_label} onChange={(e) => setCv('contact_cta_label', e.target.value)} placeholder="Request a Free Consultation" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Address Display" hint="City/state line or full address"><Input value={c.address_display} onChange={(e) => setCv('address_display', e.target.value)} /></Field>
            <Field label="Mailing Address" hint="If different from the business address"><Input value={c.mailing_address} onChange={(e) => setCv('mailing_address', e.target.value)} /></Field>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm text-slate-700">Show address on the website</Label>
            <Switch checked={c.show_address} onCheckedChange={(v) => setCv('show_address', v)} />
          </div>
          <Field label="Business Hours" hint="One line per entry, e.g. Mon–Fri 9am–5pm"><Textarea rows={3} value={c.business_hours} onChange={(e) => setCv('business_hours', e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Social Links" description="Networks without a configured value never render on the website.">
        <div className="grid sm:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <Input value={so[k]} onChange={(e) => setSv(k, e.target.value)} placeholder={`https://${k === 'twitter' ? 'x' : k}.com/yourpage`} />
            </Field>
          ))}
        </div>
        {urlError && <p className="text-sm text-red-600">{urlError}</p>}
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={save} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}