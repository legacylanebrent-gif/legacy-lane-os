// Template #1 — guided seller inquiry wizard (Phase 4C, Parts 14-18).
// Multi-step: need → property → timeline → details & consent → optional
// photos. Submits to the ONE canonical WebsiteLead via the public ingest
// seam; attribution is derived server-side from the hostname. Consent is
// explicit and never pre-checked. Photos upload to PRIVATE storage
// (UploadPrivateFile) — never into the public Website Media Library.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, X } from 'lucide-react';

const NEEDS = [
  { key: 'estate_sale', label: 'Estate Sale' },
  { key: 'downsizing', label: 'Downsizing' },
  { key: 'cleanout', label: 'Cleanout' },
  { key: 'probate_estate', label: 'Probate Estate' },
  { key: 'moving', label: 'Moving' },
  { key: 'consignment', label: 'Consignment' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'not_sure', label: 'Not Sure Yet' }
];

const TIMELINES = [
  { key: 'asap', label: 'As soon as possible' },
  { key: 'within_30_days', label: 'Within 30 days' },
  { key: '1_to_3_months', label: '1 to 3 months' },
  { key: '3_plus_months', label: '3+ months' },
  { key: 'researching', label: 'Just researching' }
];

const PROPERTY_TYPES = ['single_family', 'condo', 'townhome', 'apartment', 'commercial', 'storage_unit', 'other'];
const OCCUPANCY = ['occupied', 'vacant', 'partially_cleared'];
const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 10;

const inputCls = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2';
const inputStyle = { borderColor: 'var(--t1-primary)' };

export default function SellerInquiryForm({ hostname }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    service_requested: '', property_info: {}, timeline: '',
    contact_first_name: '', contact_last_name: '', contact_email: '', contact_phone: '',
    preferred_contact_method: 'any', message: '', marketing_opt_in: false, sms_opt_in: false
  });
  const [photos, setPhotos] = useState([]); // [{uri, name}]
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setProp = (k, v) => setForm(f => ({ ...f, property_info: { ...f.property_info, [k]: v } }));

  const canNext = () => {
    if (step === 0) return !!form.service_requested;
    if (step === 1) return !!(form.property_info.city && form.property_info.state);
    if (step === 2) return !!form.timeline;
    if (step === 3) return !!(form.contact_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email) && form.message.trim());
    return true;
  };

  async function handlePhotos(files) {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files || []).slice(0, room)) {
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setError(`Each photo must be under ${MAX_PHOTO_MB}MB.`); continue; }
      try {
        const up = await base44.integrations.Core.UploadPrivateFile({ file });
        if (up && up.file_uri) setPhotos(p => [...p, { uri: up.file_uri, name: file.name }]);
      } catch (e) {
        setError('One photo could not be uploaded. You can submit without photos.');
      }
    }
    setUploading(false);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('submitPublicWebsiteLead', {
        hostname,
        lead_type: 'seller_inquiry',
        service_requested: form.service_requested,
        property_info: form.property_info,
        timeline: form.timeline,
        preferred_contact_method: form.preferred_contact_method,
        contact_first_name: form.contact_first_name,
        contact_last_name: form.contact_last_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        message: form.message,
        photo_file_uris: photos.map(p => p.uri),
        marketing_opt_in: form.marketing_opt_in === true,
        sms_opt_in: form.sms_opt_in === true,
        source_url: window.location.pathname + window.location.search,
        referrer: document.referrer || null
      });
      if (res.data && res.data.ok) setDone(true);
      else setError('Sorry, something went wrong. Please try again.');
    } catch (e) {
      setError('Sorry, something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--t1-primary)' }} role="status">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3" style={{ background: 'var(--t1-primary)' }}><Check className="w-5 h-5 text-white" /></span>
        <p className="font-semibold" style={{ color: 'var(--t1-primary)' }}>Thank you — we received your request.</p>
        <p className="text-sm opacity-80 mt-1">We will reach out using your preferred contact method.</p>
      </div>
    );
  }

  const stepLabels = ['What you need', 'Property', 'Timeline', 'Your details', 'Photos'];

  return (
    <div aria-label="Estate sale inquiry form">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-5" aria-hidden="true">
        {stepLabels.map((l, i) => (
          <div key={l} className={`h-1 flex-1 rounded-full ${i <= step ? '' : 'bg-slate-200'}`} style={i <= step ? { background: 'var(--t1-primary)' } : null} />
        ))}
      </div>
      <p className="text-xs uppercase tracking-wide opacity-60 mb-2">Step {step + 1} of {stepLabels.length} · {stepLabels[step]}</p>

      {step === 0 && (
        <fieldset>
          <legend className="font-semibold text-lg mb-3">What do you need help with?</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {NEEDS.map(n => (
              <button type="button" key={n.key} onClick={() => set('service_requested', n.key)}
                aria-pressed={form.service_requested === n.key}
                className={`px-3 py-2.5 rounded-md border text-sm text-left transition-colors ${form.service_requested === n.key ? 'text-white' : 'hover:bg-slate-50'}`}
                style={form.service_requested === n.key ? { background: 'var(--t1-primary)', borderColor: 'var(--t1-primary)' } : { borderColor: 'var(--t1-primary)' }}>
                {n.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">About the property</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm font-medium col-span-1">City<input value={form.property_info.city || ''} onChange={e => setProp('city', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} /></label>
            <label className="text-sm font-medium col-span-1">State<input value={form.property_info.state || ''} onChange={e => setProp('state', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} /></label>
            <label className="text-sm font-medium col-span-1">ZIP<input value={form.property_info.zip || ''} onChange={e => setProp('zip', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} /></label>
          </div>
          <label className="block text-sm font-medium">Property type
            <select value={form.property_info.property_type || ''} onChange={e => setProp('property_type', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle}>
              <option value="">Select…</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Approx. size (optional)<input value={form.property_info.approx_size || ''} onChange={e => setProp('approx_size', e.target.value)} placeholder="e.g. 3 bedroom house" className={`${inputCls} mt-1`} style={inputStyle} /></label>
            <label className="block text-sm font-medium">Occupancy
              <select value={form.property_info.occupancy || ''} onChange={e => setProp('occupancy', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle}>
                <option value="">Select…</option>
                {OCCUPANCY.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">General situation (optional)
            <textarea rows={3} value={form.property_info.situation || ''} onChange={e => setProp('situation', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
          </label>
        </div>
      )}

      {step === 2 && (
        <fieldset>
          <legend className="font-semibold text-lg mb-3">When do you need help?</legend>
          <div className="space-y-2">
            {TIMELINES.map(t => (
              <button type="button" key={t.key} onClick={() => set('timeline', t.key)} aria-pressed={form.timeline === t.key}
                className={`w-full px-3 py-2.5 rounded-md border text-sm text-left ${form.timeline === t.key ? 'text-white' : 'hover:bg-slate-50'}`}
                style={form.timeline === t.key ? { background: 'var(--t1-primary)', borderColor: 'var(--t1-primary)' } : { borderColor: 'var(--t1-primary)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Your details</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">First name<input value={form.contact_first_name} onChange={e => set('contact_first_name', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="given-name" /></label>
            <label className="text-sm font-medium">Last name<input value={form.contact_last_name} onChange={e => set('contact_last_name', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="family-name" /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Email<input type="email" required value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="email" /></label>
            <label className="text-sm font-medium">Phone<input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="tel" /></label>
          </div>
          <label className="block text-sm font-medium">Preferred contact method
            <select value={form.preferred_contact_method} onChange={e => set('preferred_contact_method', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle}>
              <option value="any">Any method</option><option value="email">Email</option><option value="phone">Phone call</option><option value="text">Text message</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Anything else we should know?
            <textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} placeholder="Tell us about the home, items, or situation." />
          </label>
          <fieldset className="text-xs space-y-1 pt-1">
            <legend className="font-medium mb-1">Stay informed (optional)</legend>
            <label className="flex items-start gap-2"><input type="checkbox" checked={form.marketing_opt_in} onChange={e => set('marketing_opt_in', e.target.checked)} className="mt-0.5" /><span className="opacity-80">Email me about upcoming sales and updates</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={form.sms_opt_in} onChange={e => set('sms_opt_in', e.target.checked)} className="mt-0.5" /><span className="opacity-80">Text me about upcoming sales (message rates may apply)</span></label>
          </fieldset>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Photos (optional)</h3>
          <p className="text-sm opacity-70">Add up to {MAX_PHOTOS} photos of the property or items. Photos are private — only our team can view them.</p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm cursor-pointer hover:opacity-90" style={{ borderColor: 'var(--t1-primary)', color: 'var(--t1-primary)' }}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Add photos'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotos(e.target.files)} disabled={uploading || photos.length >= MAX_PHOTOS} />
          </label>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <span key={p.uri} className="inline-flex items-center gap-1 text-xs border rounded-md px-2 py-1">
                  {p.name.slice(0, 18)}
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPhotos(arr => arr.filter(x => x.uri !== p.uri))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}

      <div className="flex items-center justify-between mt-5">
        <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-40" style={{ color: 'var(--t1-primary)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="inline-flex items-center gap-1 px-5 py-2.5 rounded-md font-semibold text-white disabled:opacity-50 hover:opacity-90" style={{ background: 'var(--t1-primary)' }}>
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={submitting || uploading}
            className="px-5 py-2.5 rounded-md font-semibold text-white disabled:opacity-60 hover:opacity-90" style={{ background: 'var(--t1-primary)' }}>
            {submitting ? 'Sending…' : 'Send Request'}
          </button>
        )}
      </div>
    </div>
  );
}