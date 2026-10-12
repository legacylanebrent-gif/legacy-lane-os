// Template #1 — buyer alert signup (Phase 4C, Parts 22/23/25).
// "Never Miss an Estate Sale": email + optional phone/ZIP/radius/interests.
// Consent is explicit: sale-alerts consent is required (the product itself);
// marketing and SMS consent are separate and never pre-checked. Submits to
// the public buyer signup seam — canonical ConsumerMarketingProfile reuse.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Loader2 } from 'lucide-react';

const INTERESTS = [
  ['furniture', 'Furniture'], ['jewelry', 'Jewelry'], ['vintage', 'Vintage'], ['coins', 'Coins'],
  ['tools', 'Tools'], ['vehicles', 'Vehicles'], ['art', 'Art'], ['collectibles', 'Collectibles'],
  ['designer', 'Designer'], ['electronics', 'Electronics'], ['household', 'Household'], ['other', 'Other']
];

const inputCls = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2';
const inputStyle = { borderColor: 'var(--t1-primary)' };

export default function BuyerSignupForm({ hostname, compact = false }) {
  const [form, setForm] = useState({
    email: '', phone: '', zip_code: '', preferred_radius_miles: 25,
    interests: [], alerts_opt_in: false, marketing_opt_in: false, sms_opt_in: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleInterest = (key) => setForm(f => ({
    ...f,
    interests: f.interests.includes(key) ? f.interests.filter(i => i !== key) : [...f.interests, key]
  }));

  async function submit(e) {
    e.preventDefault();
    if (!form.alerts_opt_in) { setError('Please confirm you would like sale alerts.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('submitBuyerAlertSignup', {
        hostname,
        email: form.email,
        phone: form.phone || null,
        zip_code: form.zip_code || null,
        preferred_radius_miles: Number(form.preferred_radius_miles) || 25,
        interest_categories: form.interests,
        alerts_opt_in: true,
        marketing_opt_in: form.marketing_opt_in === true,
        sms_opt_in: form.sms_opt_in === true,
        request_id: (crypto.randomUUID ? crypto.randomUUID() : `signup-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        source_url: window.location.pathname + window.location.search,
        referrer: document.referrer || null
      });
      if (res.data && res.data.ok) setDone(true);
      else setError('Sorry, something went wrong. Please try again.');
    } catch (errRes) {
      setError('Sorry, something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="rounded-lg border p-5 text-center" style={{ borderColor: 'var(--t1-primary)' }} role="status">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-2" style={{ background: 'var(--t1-primary)' }}><Check className="w-4 h-4 text-white" /></span>
        <p className="font-semibold" style={{ color: 'var(--t1-primary)' }}>You're on the list!</p>
        <p className="text-sm opacity-80 mt-1">We'll let you know about upcoming sales in your area.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" aria-label="Sale alerts signup">
      {!compact && (
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Bell className="w-4 h-4" style={{ color: 'var(--t1-primary)' }} /> Never Miss an Estate Sale</h3>
          <p className="text-sm opacity-80 mt-1">Get alerted about upcoming sales in your area.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Email<input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="email" /></label>
        <label className="text-sm font-medium">Phone (optional)<input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="tel" /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">ZIP code<input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="postal-code" /></label>
        <label className="text-sm font-medium">Travel radius
          <select value={form.preferred_radius_miles} onChange={e => set('preferred_radius_miles', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle}>
            {[10, 25, 50, 100].map(r => <option key={r} value={r}>Within {r} miles</option>)}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium mb-1.5">Interests (optional)</legend>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map(([key, label]) => (
            <button type="button" key={key} onClick={() => toggleInterest(key)} aria-pressed={form.interests.includes(key)}
              className={`text-xs px-2.5 py-1 rounded-full border ${form.interests.includes(key) ? 'text-white' : 'hover:opacity-80'}`}
              style={form.interests.includes(key) ? { background: 'var(--t1-primary)', borderColor: 'var(--t1-primary)' } : { borderColor: 'var(--t1-primary)', color: 'var(--t1-primary)' }}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="text-xs space-y-1 pt-1">
        <label className="flex items-start gap-2"><input type="checkbox" checked={form.alerts_opt_in} onChange={e => set('alerts_opt_in', e.target.checked)} className="mt-0.5" required /><span className="opacity-80">Send me sale alerts for this area</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={form.marketing_opt_in} onChange={e => set('marketing_opt_in', e.target.checked)} className="mt-0.5" /><span className="opacity-80">Also email me occasional updates and promotions</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={form.sms_opt_in} onChange={e => set('sms_opt_in', e.target.checked)} className="mt-0.5" /><span className="opacity-80">Text me sale alerts (message rates may apply)</span></label>
      </fieldset>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={submitting}
        className="w-full px-5 py-2.5 rounded-md font-semibold text-white disabled:opacity-60 hover:opacity-90" style={{ background: 'var(--t1-primary)' }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Get Sale Alerts'}
      </button>
    </form>
  );
}