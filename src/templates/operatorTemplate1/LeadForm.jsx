// Template #1 lead form (Parts 30-33/35) — maps to the ONE canonical
// WebsiteLead entity via the public ingest service. Server derives
// tenant/company from the hostname; consent is EXPLICIT checkbox-only;
// NO VIP/offers/rewards expansion in Phase 3D.1.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const CONSENT_LABELS = {
  marketing_opt_in: 'Email me about upcoming sales and updates',
  sms_opt_in: 'Text me about upcoming sales (message rates may apply)'
};

export default function LeadForm({ leadType, hostname, sales = [], fixedSale = null }) {
  const [form, setForm] = useState({ contact_first_name: '', contact_last_name: '', contact_email: '', contact_phone: '', message: '', sale: fixedSale ? (fixedSale.public_id || fixedSale.title) : '', marketing_opt_in: false, sms_opt_in: false });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('submitPublicWebsiteLead', {
        hostname,
        lead_type: leadType,
        sale: fixedSale ? (fixedSale.public_id || null) : (form.sale || null),
        contact_first_name: form.contact_first_name,
        contact_last_name: form.contact_last_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        message: form.message,
        marketing_opt_in: form.marketing_opt_in === true,
        sms_opt_in: form.sms_opt_in === true,
        source_url: window.location.pathname + window.location.search,
        referrer: document.referrer || null
      });
      if (res.data && res.data.ok) setDone(true);
      else setError('Sorry, something went wrong. Please try again.');
    } catch (errRes) {
      const code = errRes.response && errRes.response.data && errRes.response.data.error && errRes.response.data.error.code;
      setError(code === 'sale_not_found'
        ? 'That sale is not available on this website.'
        : 'Sorry, something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }} role="status">
        <p className="font-semibold" style={{ color: 'var(--t1-primary)' }}>Thank you!</p>
        <p className="text-sm opacity-80 mt-1">Your message has been received. We will be in touch soon.</p>
      </div>
    );
  }

  const inputCls = 'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2';
  const inputStyle = { borderColor: 'var(--t1-primary)' };

  return (
    <form onSubmit={submit} className="space-y-3" aria-label={`${leadType.replace(/_/g, ' ')} form`}>
      {!fixedSale && leadType === 'sale_question' && (
        <label className="block text-sm font-medium">
          Sale
          <select value={form.sale} onChange={e => set('sale', e.target.value)} required className={`${inputCls} mt-1`} style={inputStyle}>
            <option value="">Select a sale…</option>
            {sales.map(s => <option key={s.public_id} value={s.website_slug || s.public_id}>{s.title}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">First name
          <input value={form.contact_first_name} onChange={e => set('contact_first_name', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="given-name" />
        </label>
        <label className="block text-sm font-medium">Last name
          <input value={form.contact_last_name} onChange={e => set('contact_last_name', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="family-name" />
        </label>
      </div>
      <label className="block text-sm font-medium">Email
        <input type="email" required value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">Phone
        <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} autoComplete="tel" />
      </label>
      <label className="block text-sm font-medium">Message
        <textarea required rows={4} value={form.message} onChange={e => set('message', e.target.value)} className={`${inputCls} mt-1`} style={inputStyle} />
      </label>
      <fieldset className="text-xs space-y-1 pt-1">
        <legend className="font-medium mb-1">Stay informed (optional)</legend>
        {Object.entries(CONSENT_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-start gap-2">
            <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} className="mt-0.5" />
            <span className="opacity-80">{label}</span>
          </label>
        ))}
      </fieldset>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={submitting}
        className="px-5 py-2.5 rounded-md font-semibold text-white disabled:opacity-60 hover:opacity-90"
        style={{ background: 'var(--t1-primary)' }}>
        {submitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}