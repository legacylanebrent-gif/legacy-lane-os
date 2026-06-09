import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, ArrowRight, ArrowLeft, Truck, Home, Clock,
  Users, MapPin, Bell, ChevronDown, Loader, Building2
} from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const SERVICES_LIST = [
  ['whole_house','Whole House Cleanouts'], ['partial_house','Partial Cleanouts'], ['garage','Garage Cleanouts'],
  ['basement','Basement Cleanouts'], ['attic','Attic Cleanouts'], ['hoarding','Hoarding Situations'],
  ['estate_cleanout','Estate Cleanouts'], ['foreclosure','Foreclosure Cleanouts'], ['storage_unit','Storage Units'], ['rental_property','Rental Properties']
];

function Check({ children }) {
  return (
    <li className="flex items-start gap-2 text-slate-700 text-sm">
      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{children}
    </li>
  );
}

// ---- REQUEST FORM MODAL ----
function RequestModal({ onClose }) {
  const [form, setForm] = useState({
    property_address: '', city: '', state: '', zip: '',
    agent_name: '', brokerage: '', agent_email: '', agent_phone: '',
    timeline: '', property_condition: '', cleanout_type: '', notes: '',
    permission_to_share: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.property_address || !form.state || !form.agent_email) {
      setError('Property address, state, and email are required.'); return;
    }
    if (!form.permission_to_share) { setError('Please check the permission box.'); return; }
    setSubmitting(true); setError('');
    const r = await base44.functions.invoke('matchCleanoutLead', { ...form, lead_source: 'agent' });
    setSubmitting(false);
    if (r.data?.success) setDone(true);
    else setError(r.data?.error || 'Submission failed. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Submit Cleanout Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">×</button>
        </div>
        <div className="p-6 space-y-5">
          {done ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Request Submitted!</h3>
              <p className="text-slate-600">Your cleanout request has been submitted. Qualified vendors in the area may contact you to schedule an estimate.</p>
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">Close</Button>
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold text-slate-700 mb-3">Property Information</p>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1 block">Property Address *</Label>
                    <Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="mb-1 block">City</Label>
                      <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="mb-1 block">State *</Label>
                      <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block">ZIP</Label>
                    <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-3">Contact Information</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block">Agent Name</Label>
                      <Input value={form.agent_name} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Brokerage</Label>
                      <Input value={form.brokerage} onChange={e => setForm(f => ({ ...f, brokerage: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Email *</Label>
                    <Input type="email" value={form.agent_email} onChange={e => setForm(f => ({ ...f, agent_email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Phone</Label>
                    <Input type="tel" value={form.agent_phone} onChange={e => setForm(f => ({ ...f, agent_phone: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block font-semibold text-slate-700">Timeline</Label>
                <select value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                  <option value="">— Select —</option>
                  {['Immediately', 'Within 7 Days', 'Within 14 Days', 'Within 30 Days', '30+ Days'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <Label className="mb-2 block font-semibold text-slate-700">Property Condition</Label>
                <select value={form.property_condition} onChange={e => setForm(f => ({ ...f, property_condition: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                  <option value="">— Select —</option>
                  {['Light Contents', 'Moderate Contents', 'Heavy Contents', 'Hoarding Situation', 'Unknown'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <Label className="mb-2 block font-semibold text-slate-700">Cleanout Type</Label>
                <select value={form.cleanout_type} onChange={e => setForm(f => ({ ...f, cleanout_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                  <option value="">— Select —</option>
                  {['Whole House', 'Partial House', 'Garage', 'Basement', 'Attic', 'Storage Unit', 'Rental Property', 'Estate Property'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <Label className="mb-1 block font-semibold text-slate-700">Additional Notes</Label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Any details that would help vendors understand the scope…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 resize-none" />
              </div>

              <label className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer">
                <input type="checkbox" checked={form.permission_to_share}
                  onChange={e => setForm(f => ({ ...f, permission_to_share: e.target.checked }))} className="mt-0.5 accent-blue-600" />
                <span className="text-sm text-slate-700">I authorize EstateSalen to share this request with vendors who service this area.</span>
              </label>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 h-12 font-semibold">
                {submitting ? <><Loader className="w-4 h-4 animate-spin mr-2" />Submitting…</> : 'SUBMIT CLEANOUT REQUEST'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- JOIN MODAL ----
function JoinModal({ defaultPlan, onClose }) {
  const [plan, setPlan] = useState(defaultPlan || '');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ business_name: '', contact_name: '', email: '', phone: '', website: '', city: '', state: '', zip: '', services: [], service_states: [] });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggleService = (val) => setForm(f => ({
    ...f, services: f.services.includes(val) ? f.services.filter(x => x !== val) : [...f.services, val]
  }));
  const toggleState = (s) => setForm(f => ({
    ...f, service_states: f.service_states.includes(s) ? f.service_states.filter(x => x !== s) : [...f.service_states, s]
  }));

  const handleSubmit = async () => {
    if (!form.business_name || !form.contact_name || !form.email) { setError('Name and email are required.'); return; }
    setSubmitting(true); setError('');
    const r = await base44.functions.invoke('joinCleanoutNetwork', { ...form, plan });
    setSubmitting(false);
    if (r.data?.success) { setResult(r.data); setStep(3); }
    else setError(r.data?.error || 'Something went wrong.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Join the Cleanout Network</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">×</button>
        </div>
        <div className="p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Choose Membership Level</h3>
              {[
                { val: 'free', label: 'Free Directory Listing', sub: 'Business profile and directory visibility. No leads.', badge: 'FREE' },
                { val: 'network_member', label: 'Cleanout Network Member', sub: 'Lead notifications, territory matching, opportunity dashboard.', badge: 'Paid', highlight: true },
              ].map(({ val, label, sub, badge, highlight }) => (
                <label key={val} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${plan === val ? (highlight ? 'border-green-400 bg-green-50' : 'border-slate-400 bg-slate-50') : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="plan" value={val} checked={plan === val} onChange={() => setPlan(val)} className="mt-1 accent-green-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${highlight ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">{sub}</p>
                  </div>
                </label>
              ))}
              <Button onClick={() => setStep(2)} disabled={!plan} className="w-full bg-green-600 hover:bg-green-700">Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Your Business Details</h3>
              <div>
                <Label className="mb-1 block">Business Name *</Label>
                <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Your Name *</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Phone</Label>
                  <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">State</Label>
                  <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value, service_states: e.target.value ? [e.target.value] : [] }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {plan === 'network_member' && (
                <>
                  <div>
                    <Label className="mb-2 block">Services You Offer</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICES_LIST.map(([val, label]) => (
                        <label key={val} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all
                          ${form.services.includes(val) ? 'border-green-300 bg-green-50 font-semibold' : 'border-slate-200 hover:border-green-200'}`}>
                          <input type="checkbox" checked={form.services.includes(val)} onChange={() => toggleService(val)} className="accent-green-600" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Additional States You Service</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {US_STATES.map(s => (
                        <label key={s} className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer font-medium transition-all
                          ${form.service_states.includes(s) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:border-green-200'}`}>
                          <input type="checkbox" className="hidden" checked={form.service_states.includes(s)} onChange={() => toggleState(s)} />{s}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                  {submitting ? <><Loader className="w-4 h-4 animate-spin mr-2" />Joining…</> : 'Activate Profile'}
                </Button>
              </div>
            </div>
          )}
          {step === 3 && result && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Welcome to the Network!</h3>
              <p className="text-slate-600">{result.message}</p>
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- MAIN PAGE ----
export default function CleanoutNetwork() {
  const [showRequest, setShowRequest] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinPlan, setJoinPlan] = useState('');

  const openJoin = (plan = '') => { setJoinPlan(plan); setShowJoin(true); };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="EstateSalen" className="h-9 w-9 object-contain" />
            <span className="font-serif font-bold text-slate-800 text-xl">EstateSalen.com</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRequest(true)} className="hidden sm:flex">Request Cleanout Help</Button>
            <Button onClick={() => openJoin('network_member')} className="bg-green-600 hover:bg-green-700 text-white">Join Cleanout Network</Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-sm px-4 py-1">Property Cleanout Network</Badge>
          <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            Need the House Emptied Before Closing?<br />
            <span className="text-green-400">Connect With Property Cleanout Professionals.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            EstateSalen helps match homeowners and real estate agents with trusted cleanout companies that can remove unwanted contents and prepare properties for sale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setShowRequest(true)} className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg">
              REQUEST CLEANOUT HELP <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => openJoin('network_member')} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-xl text-lg border border-white/20 transition-colors">
              JOIN CLEANOUT NETWORK
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-2">
            {['Nationwide Coverage', 'Agent Generated Opportunities', 'Estate Sale Referrals', 'Property Cleanouts', 'Pre-Closing Services'].map(item => (
              <span key={item} className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />{item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Not Every Property Needs An Estate Sale */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-6 text-center">Not Every Property Needs An Estate Sale</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 rounded-2xl p-6">
              <p className="font-semibold text-slate-700 mb-3">Some homes contain:</p>
              <ul className="space-y-2">
                {['Damaged furniture', 'Excess clutter', 'Trash accumulation', 'Hoarding situations', 'Low-value contents', 'Leftover contents after an estate sale', 'Rental property contents', 'Foreclosure cleanups', 'Probate cleanouts'].map(s => (
                  <li key={s} className="flex items-center gap-2 text-slate-600 text-sm"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <Truck className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-bold text-slate-800 mb-2">Speed Over Value</h3>
                <p className="text-slate-600 text-sm">In these situations, speed is often more important than resale value. That is where cleanout companies provide tremendous value.</p>
              </div>
              <button onClick={() => setShowRequest(true)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors">
                SUBMIT CLEANOUT REQUEST
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Common Situations */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-8 text-center">Common Situations</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'Probate Properties', desc: 'Family members need the home emptied before sale.' },
              { title: 'Inherited Homes', desc: 'Contents remain but heirs do not want to sort everything.' },
              { title: 'Downsizing', desc: 'Seller wants to move quickly without dealing with belongings.' },
              { title: 'Investor Purchases', desc: 'Property needs to be cleared before renovation begins.' },
              { title: 'Foreclosure & Distressed', desc: 'Fast removal is required before new ownership.' },
              { title: 'Last-Minute Closings', desc: 'Property must be emptied quickly before closing date.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-8 text-center">How It Works</h2>
          <div className="space-y-3">
            {[
              { s: '1', t: 'An agent or homeowner submits a cleanout request', sub: 'Takes less than 2 minutes.' },
              { s: '2', t: 'EstateSalen matches vendors that service the area', sub: 'Based on state, territory, and service type.' },
              { s: '3', t: 'Cleanout companies receive lead notifications', sub: 'Email notification with property details.' },
              { s: '4', t: 'The vendor contacts the agent directly', sub: 'You own the relationship.' },
              { s: '5', t: 'The vendor schedules an estimate and proposes a solution', sub: 'No platform fees on the transaction.' },
            ].map(({ s, t, sub }) => (
              <div key={s} className="flex items-start gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="w-9 h-9 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{s}</div>
                <div>
                  <p className="font-semibold text-slate-800">{t}</p>
                  <p className="text-slate-500 text-sm">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column: Agents + Vendors */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-7 border border-slate-200">
            <Users className="w-7 h-7 text-blue-500 mb-3" />
            <h3 className="text-xl font-bold text-slate-800 mb-3">For Real Estate Agents</h3>
            <p className="text-slate-600 text-sm mb-4 italic">"What do I do with everything that's left?"</p>
            <p className="text-slate-600 text-sm mb-4">Instead of searching for local vendors, submit the opportunity through EstateSalen and allow qualified cleanout companies to respond.</p>
            <ul className="space-y-2 mb-5">
              {['Faster property preparation', 'Less seller stress', 'Faster closings', 'Vendor competition', 'More resources for your clients'].map(f => <Check key={f}>{f}</Check>)}
            </ul>
            <button onClick={() => setShowRequest(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
              SUBMIT CLEANOUT REQUEST
            </button>
          </div>
          <div className="bg-white rounded-2xl p-7 border border-slate-200">
            <Truck className="w-7 h-7 text-green-600 mb-3" />
            <h3 className="text-xl font-bold text-slate-800 mb-3">For Cleanout Companies</h3>
            <p className="text-slate-600 text-sm mb-3">Receive opportunities generated by real estate agents, homeowners, estate sale companies, and probate situations.</p>
            <p className="font-semibold text-slate-700 text-sm mb-2">Lead Types:</p>
            <ul className="space-y-1.5 mb-5">
              {['Whole House Cleanouts', 'Partial Cleanouts', 'Garage Cleanouts', 'Basement & Attic', 'Hoarding Situations', 'Estate & Foreclosure Cleanouts', 'Post-Estate Sale Cleanups'].map(f => <Check key={f}>{f}</Check>)}
            </ul>
            <button onClick={() => openJoin('network_member')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
              JOIN CLEANOUT NETWORK
            </button>
          </div>
        </div>
      </section>

      {/* Membership Plans */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-8 text-center">Membership Levels</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 flex flex-col">
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 self-start mb-3">FREE DIRECTORY LISTING</Badge>
              <div className="text-3xl font-bold text-slate-700 mb-4">$0</div>
              <ul className="space-y-2 flex-1 mb-6">
                <Check>Business profile</Check>
                <Check>Directory visibility</Check>
                <li className="flex items-center gap-2 text-slate-400 text-sm line-through">Lead notifications</li>
                <li className="flex items-center gap-2 text-slate-400 text-sm line-through">Territory matching</li>
                <li className="flex items-center gap-2 text-slate-400 text-sm line-through">Opportunity dashboard</li>
              </ul>
              <button onClick={() => openJoin('free')} className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl transition-colors">
                CREATE FREE PROFILE
              </button>
            </div>
            <div className="bg-white rounded-2xl border-2 border-green-400 p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">RECOMMENDED</div>
              <Badge className="bg-green-100 text-green-700 border-green-200 self-start mb-3">CLEANOUT NETWORK MEMBER</Badge>
              <div className="text-3xl font-bold text-green-600 mb-1">Paid</div>
              <p className="text-slate-400 text-sm mb-4">Contact us for current pricing</p>
              <ul className="space-y-2 flex-1 mb-6">
                {['Territory matching', 'Cleanout lead notifications', 'Agent introductions', 'Opportunity dashboard', 'Lead management', 'Service area controls', 'Activity tracking'].map(f => <Check key={f}>{f}</Check>)}
              </ul>
              <button onClick={() => openJoin('network_member')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors">
                JOIN CLEANOUT NETWORK
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: 'Is this only for estate cleanouts?', a: 'No. The network covers whole-house cleanouts, garage cleanouts, hoarding situations, foreclosures, rental properties, and more.' },
              { q: 'Who submits the leads?', a: 'Real estate agents, homeowners, and estate sale companies submit opportunities through EstateSalen.' },
              { q: 'Are leads exclusive?', a: 'Leads may be sent to multiple qualified vendors in the area. First to respond and schedule an estimate has the advantage.' },
              { q: 'How do I contact the agent?', a: 'The lead notification will contain agent contact information for you to reach out directly.' },
            ].map(({ q, a }) => (
              <details key={q} className="bg-white rounded-xl border border-slate-200 p-5 group">
                <summary className="font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between gap-2">
                  {q} <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <p className="mt-3 text-slate-600 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <h2 className="text-3xl md:text-4xl font-serif font-bold">Every Seller Situation<br /><span className="text-green-400">Has a Solution on EstateSalen</span></h2>
          <p className="text-slate-300 text-lg">Whether it's an estate sale, reseller opportunity, buyout, or cleanout — EstateSalen connects the right professional to every property.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setShowRequest(true)} className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg">
              REQUEST CLEANOUT HELP <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => openJoin('network_member')} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-xl text-lg border border-white/20 transition-colors">
              JOIN CLEANOUT NETWORK
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-500 text-center py-6 text-sm border-t border-slate-800">
        <p>© {new Date().getFullYear()} EstateSalen.com · <a href="/" className="underline hover:text-white">estatesalen.com</a></p>
      </footer>

      {showRequest && <RequestModal onClose={() => setShowRequest(false)} />}
      {showJoin && <JoinModal defaultPlan={joinPlan} onClose={() => setShowJoin(false)} />}
    </div>
  );
}