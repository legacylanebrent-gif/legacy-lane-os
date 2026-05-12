import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Send, Loader2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

export default function AgentApplicationForm() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', brokerage: '', licenseState: '',
    citiesRequested: '', countyRequested: '', interestedIn: '',
    monthlyBudget: '', avgSalePrice: '', closedLastYear: '',
    hasEstateSaleRelationships: '', whyShouldBeConsidered: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [countyStatus, setCountyStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const debounceRef = useRef(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const checkCountyAvailability = async (county) => {
    const trimmed = county.trim();
    if (!trimmed) { setCountyStatus(null); return; }
    setCountyStatus('checking');
    // Search OperatorTerritoryProfile records where service_counties contains this county
    const all = await base44.entities.OperatorTerritoryProfile.list();
    const claimed = all.some(profile =>
      (profile.service_counties || []).some(c =>
        c.toLowerCase() === trimmed.toLowerCase()
      )
    );
    setCountyStatus(claimed ? 'taken' : 'available');
  };

  const handleCountyChange = (val) => {
    set('countyRequested', val);
    setCountyStatus(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => checkCountyAvailability(val), 700);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real implementation, this would call a backend function
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h3 className="text-3xl font-serif font-bold text-white mb-4">Application Received</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Thank you for applying. Our team will review your territory request and reach out within 2–3 business days to discuss next steps and territory availability.
        </p>
      </div>
    );
  }

  const inputClass = "w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-orange-400 transition-colors";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Agent Name *</label>
          <input required className={inputClass} placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Email Address *</label>
          <input required type="email" className={inputClass} placeholder="you@yourbrokerage.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Phone Number *</label>
          <input required type="tel" className={inputClass} placeholder="(555) 000-0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Brokerage Name *</label>
          <input required className={inputClass} placeholder="Your brokerage" value={form.brokerage} onChange={e => set('brokerage', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>License State *</label>
          <select required className={inputClass} value={form.licenseState} onChange={e => set('licenseState', e.target.value)}>
            <option value="">Select state</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Interested In *</label>
          <select required className={inputClass} value={form.interestedIn} onChange={e => set('interestedIn', e.target.value)}>
            <option value="">Select option</option>
            <option value="preferred">Preferred Agent (Monthly Fee)</option>
            <option value="exclusive">Exclusive Territory Owner (Buy-In)</option>
            <option value="unsure">Not Sure — Want to Learn More</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Cities Requested *</label>
          <input required className={inputClass} placeholder="e.g. Orlando, Kissimmee, Winter Park" value={form.citiesRequested} onChange={e => set('citiesRequested', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>County Requested</label>
          <div className="relative">
            <input
              className={inputClass}
              placeholder="e.g. Orange County"
              value={form.countyRequested}
              onChange={e => handleCountyChange(e.target.value)}
            />
            {countyStatus === 'checking' && (
              <div className="mt-2 flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking availability…
              </div>
            )}
            {countyStatus === 'available' && (
              <div className="mt-2 flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                This county appears to be available!
              </div>
            )}
            {countyStatus === 'taken' && (
              <div className="mt-2 flex items-center gap-2 text-orange-400 text-xs font-medium">
                <XCircle className="w-3.5 h-3.5" />
                This county may already be claimed. You can still apply — our team will review.
              </div>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass}>Current Monthly Marketing Budget</label>
          <select className={inputClass} value={form.monthlyBudget} onChange={e => set('monthlyBudget', e.target.value)}>
            <option value="">Select range</option>
            <option value="under500">Under $500</option>
            <option value="500-1000">$500 – $1,000</option>
            <option value="1000-2500">$1,000 – $2,500</option>
            <option value="2500-5000">$2,500 – $5,000</option>
            <option value="over5000">Over $5,000</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Average Sale Price in Your Market</label>
          <input type="number" className={inputClass} placeholder="e.g. 375000" value={form.avgSalePrice} onChange={e => set('avgSalePrice', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Listings Closed Last 12 Months</label>
          <input type="number" className={inputClass} placeholder="e.g. 12" value={form.closedLastYear} onChange={e => set('closedLastYear', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Do You Have Estate Sale Company Relationships?</label>
          <select className={inputClass} value={form.hasEstateSaleRelationships} onChange={e => set('hasEstateSaleRelationships', e.target.value)}>
            <option value="">Select</option>
            <option value="yes_active">Yes — Active relationships</option>
            <option value="yes_some">Yes — A few informal connections</option>
            <option value="no_open">No — But open to building them</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Why Should You Be Considered for This Territory? *</label>
        <textarea
          required
          rows={5}
          className={inputClass}
          placeholder="Tell us about your market expertise, why this territory matters to you, your experience with life-transition sellers, and any relevant background..."
          value={form.whyShouldBeConsidered}
          onChange={e => set('whyShouldBeConsidered', e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 text-lg flex items-center justify-center gap-2">
        <Send className="w-5 h-5" />
        Submit Territory Application
      </Button>

      <p className="text-slate-500 text-xs text-center leading-relaxed">
        By submitting this application you acknowledge that you have read and understand the referral fee structure, territory access model, and compliance requirements outlined on this page. Final terms will be provided separately.
      </p>
    </form>
  );
}