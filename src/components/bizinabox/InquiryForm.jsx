import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { COVER_TOPICS } from './content';

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

export default function InquiryForm({ mode = 'call', pathLabel = '', onClose }) {
  const isApply = mode === 'apply';
  const [form, setForm] = useState({
    name: '', email: '', phone: '', market: '', topic: COVER_TOPICS[0], availability: '', message: '', consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await base44.entities.Lead.create({
        source: 'website',
        website_page: 'BizInABox',
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone,
        intent: 'estate_sale',
        notes: [
          isApply ? `Business-in-a-Box application — ${pathLabel}` : 'Business-in-a-Box discovery call request',
          form.market && `Market: ${form.market}`,
          !isApply && `Wants to cover: ${form.topic}`,
          form.availability && `Available: ${form.availability}`,
          form.message && `Notes: ${form.message}`,
        ].filter(Boolean).join(' | '),
      });
      setDone(true);
    } catch (err) {
      setError('We could not send that just now. Please try again.');
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">
          {isApply ? 'Application received' : 'Request received'}
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          {isApply
            ? 'Your application is saved. A short conversation follows, and every commitment is written down before you decide.'
            : "Your request is saved. We'll come back with times for a short, no-obligation conversation."}
        </p>
        {onClose && (
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold text-sm">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {isApply && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
          {pathLabel}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Your name *</label>
          <input required type="text" value={form.name} onChange={set('name')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email *</label>
          <input required type="email" value={form.email} onChange={set('email')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Phone (optional)</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
        </div>
        {isApply ? (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Your market / city *</label>
            <input required type="text" placeholder="City, State" value={form.market} onChange={set('market')} className={inputClass} />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">What would you like to cover?</label>
            <select value={form.topic} onChange={set('topic')} className={inputClass}>
              {COVER_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>
      {!isApply && (
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">When are you generally available?</label>
          <input type="text" placeholder="Weekday mornings, evenings…" value={form.availability} onChange={set('availability')} className={inputClass} />
        </div>
      )}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
          {isApply ? 'Anything else we should know?' : 'Anything else (optional)'}
        </label>
        <textarea rows={3} value={form.message} onChange={set('message')} className={inputClass} />
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
        <input required type="checkbox" checked={form.consent} onChange={set('consent')} className="mt-0.5" />
        <span>I agree to be contacted about this request. *</span>
      </label>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-black rounded-full text-sm uppercase tracking-widest transition-colors"
      >
        {submitting ? 'Sending…' : isApply ? 'Submit application' : 'Request my discovery call'}
      </button>
    </form>
  );
}