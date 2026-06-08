import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2 } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

function scoreAndLevel(data) {
  let score = 0;
  if (data.has_real_estate) score += 30;
  if (data.needs_estate_sale) score += 25;
  if (data.needs_realtor) score += 25;
  if (data.wants_cash_offer) score += 20;
  if (data.urgency_level === 'within_30_days') score += 20;
  if (data.phone) score += 10;
  if (data.needs_probate_help) score += 15;
  const level = score >= 80 ? 'urgent' : score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score, level };
}

export default function SELeadCTA({ sourceUrl = '', sourcePageType = '', defaultState = '', lifeEventType = 'estate_settlement', ctaTitle = 'Get Connected with Local Experts', ctaDesc = "Tell us about your situation and we'll connect you with estate sale companies, realtors, and other trusted professionals in your area — for free." }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    state: defaultState, county: '', zip_code: '',
    has_real_estate: false, needs_estate_sale: false,
    needs_realtor: false, wants_cash_offer: false,
    needs_probate_help: false, needs_cleanout: false,
    urgency_level: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggle = (k) => setForm(p => ({ ...p, [k]: !p[k] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { score, level } = scoreAndLevel(form);
    await base44.entities.EstateTransitionLead.create({
      ...form,
      life_event_type: lifeEventType,
      lead_score: score,
      lead_level: level,
      source_url: sourceUrl,
      source_page_type: sourcePageType,
      crm_status: 'new'
    });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-green-800 mb-2">Thank You!</h3>
        <p className="text-green-700 text-sm">We've received your information and will connect you with the right local professionals shortly.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-1">{ctaTitle}</h3>
      <p className="text-sm text-slate-600 mb-5">{ctaDesc}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">First Name *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} required className="h-9" /></div>
          <div><Label className="text-xs">Last Name</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className="h-9" /></div>
          <div><Label className="text-xs">Phone</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="h-9" /></div>
          <div>
            <Label className="text-xs">State *</Label>
            <Select value={form.state} onValueChange={v => set('state', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="State..." /></SelectTrigger>
              <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">ZIP Code</Label><Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className="h-9" /></div>
        </div>
        <div>
          <Label className="text-xs mb-2 block">What do you need help with?</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'has_real_estate', l: 'There is real estate involved' },
              { k: 'needs_estate_sale', l: 'Need an estate sale' },
              { k: 'needs_cleanout', l: 'Need a cleanout' },
              { k: 'needs_realtor', l: 'Need a realtor' },
              { k: 'wants_cash_offer', l: 'Want a cash offer' },
              { k: 'needs_probate_help', l: 'Need probate guidance' },
            ].map(({ k, l }) => (
              <label key={k} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-white border border-slate-200 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <input type="checkbox" checked={form[k]} onChange={() => toggle(k)} className="rounded" />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">How urgent is your situation?</Label>
          <Select value={form.urgency_level} onValueChange={v => set('urgency_level', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="within_30_days">Within 30 days</SelectItem>
              <SelectItem value="1_to_3_months">1–3 months</SelectItem>
              <SelectItem value="3_to_6_months">3–6 months</SelectItem>
              <SelectItem value="no_rush">No rush</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Get Free Help & Referrals'}
        </Button>
        <p className="text-xs text-slate-400 text-center">Free service. No obligation.</p>
      </form>
    </div>
  );
}