import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

const LIFE_EVENT_TYPES = [
  { value: 'probate', label: 'Probate / Estate Settlement' },
  { value: 'inherited_home', label: 'Inherited Property' },
  { value: 'downsizing', label: 'Downsizing' },
  { value: 'senior_transition', label: 'Senior / Assisted Living Transition' },
  { value: 'divorce', label: 'Divorce' },
  { value: 'relocation', label: 'Relocation / Moving' },
  { value: 'estate_settlement', label: 'General Estate Settlement' },
  { value: 'bankruptcy', label: 'Bankruptcy' },
  { value: 'foreclosure', label: 'Foreclosure' },
  { value: 'other', label: 'Other' },
];

const RELATIONSHIP_TYPES = [
  { value: 'executor', label: 'Executor / Administrator' },
  { value: 'heir', label: 'Heir / Beneficiary' },
  { value: 'spouse', label: 'Surviving Spouse' },
  { value: 'child', label: 'Adult Child' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'trustee', label: 'Trustee' },
  { value: 'owner', label: 'Property Owner' },
  { value: 'other', label: 'Other' },
];

const URGENCY_LEVELS = [
  { value: 'within_30_days', label: 'Within 30 days' },
  { value: '1_to_3_months', label: '1–3 months' },
  { value: '3_to_6_months', label: '3–6 months' },
  { value: '6_plus_months', label: '6+ months' },
  { value: 'no_rush', label: 'No rush / planning ahead' },
];

const SERVICE_NEEDS = [
  { key: 'has_real_estate', label: 'There is real estate involved' },
  { key: 'has_personal_property_to_sell', label: 'Personal property / belongings to sell' },
  { key: 'needs_probate_help', label: 'Probate guidance' },
  { key: 'needs_estate_sale', label: 'Estate sale service' },
  { key: 'needs_cleanout', label: 'Cleanout / junk removal' },
  { key: 'needs_realtor', label: 'Realtor to sell the property' },
  { key: 'wants_cash_offer', label: 'Investor cash offer' },
  { key: 'needs_attorney_resource', label: 'Attorney referral' },
];

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '',
  state: '', county: '', city: '', zip_code: '', property_address: '',
  life_event_type: '', relationship_to_estate: '',
  has_real_estate: false, has_personal_property_to_sell: false,
  needs_probate_help: false, needs_estate_sale: false,
  needs_cleanout: false, needs_realtor: false,
  wants_cash_offer: false, needs_attorney_resource: false,
  urgency_level: '', estimated_home_value: '', estimated_contents_value: '', notes: '',
};

export default function EstateTransitionLeadForm({
  sourceUrl = '',
  sourcePageType = '',
  defaultState = '',
  defaultLifeEventType = '',
  defaultNeedsMap = {},
  ctaTitle = 'Get Connected with Local Experts',
  ctaDesc = "Tell us about your situation and we'll connect you with the right local professionals — for free.",
  compact = false,
  onSuccess = null,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, state: defaultState, life_event_type: defaultLifeEventType, ...defaultNeedsMap });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [submittedLead, setSubmittedLead] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggle = (k) => setForm(p => ({ ...p, [k]: !p[k] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Build lead payload
    const payload = {
      ...form,
      estimated_home_value: form.estimated_home_value ? parseFloat(form.estimated_home_value) : undefined,
      estimated_contents_value: form.estimated_contents_value ? parseFloat(form.estimated_contents_value) : undefined,
      source_url: sourceUrl || window.location.pathname,
      source_page_type: sourcePageType || 'direct',
      crm_status: 'new',
      lead_score: 0,
      lead_level: 'low',
    };

    // Score the lead
    const scoreRes = await base44.functions.invoke('scoreEstateTransitionLead', { lead: payload });
    payload.lead_score = scoreRes.data?.score || 0;
    payload.lead_level = scoreRes.data?.level || 'low';

    // Save
    const saved = await base44.entities.EstateTransitionLead.create(payload);
    setSubmittedLead(saved);

    // Route + Email sequence in parallel (automation also fires on create, these are belt-and-suspenders)
    await Promise.all([
      base44.functions.invoke('routeEstateTransitionLead', {
        lead_id: saved.id,
        state: form.state,
        county: form.county,
        zip_code: form.zip_code,
        life_event_type: form.life_event_type,
        needs_estate_sale: form.needs_estate_sale,
        needs_realtor: form.needs_realtor,
        needs_cleanout: form.needs_cleanout,
        wants_cash_offer: form.wants_cash_offer,
        has_real_estate: form.has_real_estate,
        lead_level: payload.lead_level,
        email: form.email,
      }),
      base44.functions.invoke('sendEstateTransitionEmailSequence', {
        lead_id: saved.id,
        send_immediately: true,
      }),
    ]);

    setSubmitted(true);
    setLoading(false);
    if (onSuccess) onSuccess(saved);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="text-center mb-5">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-green-800 mb-1">We've Got Your Information</h3>
          <p className="text-green-700 text-sm">Thank you, {submittedLead?.first_name}. We'll connect you with the right local professionals shortly.</p>
          <p className="text-xs text-green-600 mt-1">Check your email — your estate settlement checklist is on its way.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <a href="/estate-checklist" className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-3 text-sm font-medium text-slate-800 hover:bg-green-50 transition-colors">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> View your estate checklist
          </a>
          <a href="/estate-settlement-planner" className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-3 text-sm font-medium text-slate-800 hover:bg-green-50 transition-colors">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> Open estate settlement planner
          </a>
          <a href="/estate-sale-companies" className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-3 text-sm font-medium text-slate-800 hover:bg-green-50 transition-colors">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> Find estate sale companies
          </a>
          <a href="/probate-realtors" className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-3 text-sm font-medium text-slate-800 hover:bg-green-50 transition-colors">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> Find a probate realtor
          </a>
        </div>
        <p className="text-xs text-slate-400 text-center">Free service. No obligation. EstateSalen does not provide legal or financial advice. Consult a licensed attorney for legal guidance.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
      {ctaTitle && <h3 className="text-xl font-bold text-slate-900 mb-1">{ctaTitle}</h3>}
      {ctaDesc && <p className="text-sm text-slate-600 mb-5">{ctaDesc}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Contact Info */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your Contact Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">First Name *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} required className="h-9 mt-1" /></div>
            <div><Label className="text-xs">Last Name</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} className="h-9 mt-1" /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className="h-9 mt-1" /></div>
            <div><Label className="text-xs">Phone</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="h-9 mt-1" /></div>
          </div>
        </div>

        {/* Situation */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your Situation</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">Life Event *</Label>
              <Select value={form.life_event_type} onValueChange={v => set('life_event_type', v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{LIFE_EVENT_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Your Role</Label>
              <Select value={form.relationship_to_estate} onValueChange={v => set('relationship_to_estate', v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{RELATIONSHIP_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block">What do you need help with?</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_NEEDS.map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2 text-xs cursor-pointer rounded-lg px-2.5 py-2 border transition-colors ${form[key] ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={form[key]} onChange={() => toggle(key)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Property Location</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">State *</Label>
              <Select value={form.state} onValueChange={v => set('state', v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="State..." /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">County</Label><Input value={form.county} onChange={e => set('county', e.target.value)} className="h-9 mt-1" placeholder="e.g. Monmouth" /></div>
            <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => set('city', e.target.value)} className="h-9 mt-1" /></div>
            <div><Label className="text-xs">ZIP Code</Label><Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className="h-9 mt-1" /></div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <Label className="text-xs">How urgent is your situation?</Label>
          <Select value={form.urgency_level} onValueChange={v => set('urgency_level', v)}>
            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select timeline..." /></SelectTrigger>
            <SelectContent>{URGENCY_LEVELS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Optional extras */}
        {!compact && (
          <div>
            <button type="button" onClick={() => setShowOptional(p => !p)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
              {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showOptional ? 'Hide' : 'Add'} optional details (property address, estimated values, notes)
            </button>
            {showOptional && (
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                <div><Label className="text-xs">Property Address</Label><Input value={form.property_address} onChange={e => set('property_address', e.target.value)} className="h-9 mt-1" placeholder="Street address" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Est. Home Value ($)</Label><Input type="number" value={form.estimated_home_value} onChange={e => set('estimated_home_value', e.target.value)} className="h-9 mt-1" placeholder="e.g. 350000" /></div>
                  <div><Label className="text-xs">Est. Contents Value ($)</Label><Input type="number" value={form.estimated_contents_value} onChange={e => set('estimated_contents_value', e.target.value)} className="h-9 mt-1" placeholder="e.g. 15000" /></div>
                </div>
                <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1 h-20 text-sm" placeholder="Anything else you'd like us to know..." /></div>
              </div>
            )}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold h-11">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Get Free Help & Referrals →'}
        </Button>
        <p className="text-xs text-slate-400 text-center">Free service. No obligation. We do not sell your information.</p>
      </form>
    </div>
  );
}