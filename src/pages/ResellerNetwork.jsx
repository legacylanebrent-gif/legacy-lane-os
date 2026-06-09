import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, ArrowRight, ArrowLeft, Package, ShoppingBag, Truck,
  Users, Bell, MapPin, Star, Loader, ChevronDown, BarChart2
} from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const BUSINESS_TYPES = [
  ['ebay_seller','eBay Seller'], ['antique_dealer','Antique Dealer'], ['auction_company','Auction Company'],
  ['consignment','Consignment Company'], ['furniture_dealer','Furniture Dealer'], ['collectible_buyer','Collectible Buyer'],
  ['estate_buyer','Estate Buyer'], ['cleanout_specialist','Cleanout Specialist'], ['liquidator','Liquidator'],
  ['buyout_company','Buyout Company'], ['vintage_dealer','Vintage Dealer'], ['online_reseller','Online Reseller'], ['other','Other']
];

const LEAD_TYPE_OPTIONS = [
  { val: 'online_reseller', label: 'Online Reseller Leads', desc: 'Sellers want to maximize value privately' },
  { val: 'buyout', label: 'Buyout Leads', desc: 'Sellers want speed — entire contents' },
  { val: 'liquidation', label: 'Liquidation Leads', desc: 'Contents need removal before closing' },
  { val: 'estate_sale_backup', label: 'Estate Sale Backup Leads', desc: 'Properties referred by estate sale companies' },
];

function Check({ children }) {
  return (
    <li className="flex items-start gap-2 text-slate-700 text-sm">
      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{children}
    </li>
  );
}

function SectionTitle({ children, center }) {
  return <h2 className={`text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-6 ${center ? 'text-center' : ''}`}>{children}</h2>;
}

// ---------- JOIN MODAL ----------
function JoinModal({ defaultPlan, onClose }) {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState(defaultPlan || '');
  const [form, setForm] = useState({ business_name: '', contact_name: '', email: '', phone: '', website: '', city: '', state: '', zip: '', business_type: '', lead_types: [], service_states: [] });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggleLeadType = (val) => setForm(f => ({
    ...f, lead_types: f.lead_types.includes(val) ? f.lead_types.filter(x => x !== val) : [...f.lead_types, val]
  }));

  const handleSubmit = async () => {
    if (!form.business_name || !form.contact_name || !form.email) { setError('Business name, your name, and email are required.'); return; }
    setSubmitting(true); setError('');
    const r = await base44.functions.invoke('joinResellerNetwork', { ...form, plan });
    setSubmitting(false);
    if (r.data?.success) { setResult(r.data); setStep(4); }
    else if (r.data?.already_exists) setError('An account with this email already exists.');
    else setError(r.data?.error || 'Something went wrong. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Join the Reseller Network</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">×</button>
        </div>

        {/* Step dots */}
        <div className="flex gap-2 px-6 pt-4">
          {['Plan','Info','Territories','Done'].map((label, i) => {
            const s = i + 1;
            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mb-1
                  ${s < step ? 'bg-green-500 text-white' : s === step ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {s < step ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs ${s === step ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="p-6 space-y-5">

          {/* STEP 1: Plan */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Choose Your Membership Level</h3>
              {[
                { val: 'free', label: 'Free Directory Member', sub: 'Business profile and directory visibility. No leads.', badge: 'FREE' },
                { val: 'network_member', label: 'Reseller Network Member', sub: 'Lead notifications, territory matching, opportunity dashboard.', badge: 'Paid', highlight: true },
              ].map(({ val, label, sub, badge, highlight }) => (
                <label key={val} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${plan === val ? (highlight ? 'border-orange-400 bg-orange-50' : 'border-slate-400 bg-slate-50') : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="plan" value={val} checked={plan === val} onChange={() => setPlan(val)} className="mt-1 accent-orange-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${highlight ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">{sub}</p>
                  </div>
                </label>
              ))}
              <Button onClick={() => setStep(2)} disabled={!plan} className="w-full bg-orange-500 hover:bg-orange-600">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* STEP 2: Business Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Your Business Information</h3>
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
              <div>
                <Label className="mb-1 block">Phone</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1 block">Website</Label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-2 block">Business Type</Label>
                <select value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                  <option value="">— Select —</option>
                  {BUSINESS_TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              {plan === 'network_member' && (
                <div>
                  <Label className="mb-2 block">Lead Types You Want</Label>
                  <div className="space-y-2">
                    {LEAD_TYPE_OPTIONS.map(({ val, label, desc }) => (
                      <label key={val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${form.lead_types.includes(val) ? 'border-orange-300 bg-orange-50' : 'border-slate-200 hover:border-orange-200'}`}>
                        <input type="checkbox" checked={form.lead_types.includes(val)} onChange={() => toggleLeadType(val)} className="mt-0.5 accent-orange-500" />
                        <div>
                          <span className="font-semibold text-sm text-slate-800">{label}</span>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                <Button onClick={() => setStep(3)} disabled={!form.business_name || !form.contact_name || !form.email}
                  className="flex-1 bg-orange-500 hover:bg-orange-600">Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>
          )}

          {/* STEP 3: Territory */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Your Service Area</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="mb-1 block">City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
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
              <div>
                <Label className="mb-1 block">ZIP Code</Label>
                <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
              </div>
              {plan === 'network_member' && (
                <div>
                  <Label className="mb-2 block">Additional States You Service</Label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {US_STATES.map(s => (
                      <label key={s} className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer font-medium transition-all
                        ${form.service_states.includes(s) ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200'}`}>
                        <input type="checkbox" className="hidden" checked={form.service_states.includes(s)}
                          onChange={() => setForm(f => ({ ...f, service_states: f.service_states.includes(s) ? f.service_states.filter(x => x !== s) : [...f.service_states, s] }))} />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  {submitting ? <><Loader className="w-4 h-4 animate-spin mr-2" />Joining…</> : 'Activate Profile'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 4 && result && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Welcome to the Network!</h3>
              <p className="text-slate-600">{result.message}</p>
              <Button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-600">Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- MAIN PAGE ----------
export default function ResellerNetwork() {
  const [showModal, setShowModal] = useState(false);
  const [defaultPlan, setDefaultPlan] = useState('');

  const openJoin = (plan = '') => { setDefaultPlan(plan); setShowModal(true); };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="EstateSalen" className="h-9 w-9 object-contain" />
            <span className="font-serif font-bold text-slate-800 text-xl">EstateSalen.com</span>
          </div>
          <Button onClick={() => openJoin('network_member')} className="bg-orange-500 hover:bg-orange-600 text-white">Join Reseller Network</Button>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-sm px-4 py-1">Reseller & Buyout Network</Badge>
          <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            Get Access to Inventory Opportunities<br /><span className="text-orange-400">Before Everyone Else</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Join the EstateSalen Reseller & Buyout Network and receive leads from homeowners, real estate agents, and estate sale companies looking to sell contents before closing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => openJoin('network_member')} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg">
              JOIN THE RESELLER NETWORK <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#how-leads-work" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-xl text-lg border border-white/20 transition-colors">
              VIEW HOW LEADS WORK
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-2">
            {['Nationwide Network', 'Agent Generated Opportunities', 'Estate Sale Referrals', 'Online Reseller Opportunities', 'Buyout Opportunities'].map(item => (
              <span key={item} className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />{item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Not Every Seller Wants an Estate Sale */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <SectionTitle center>Not Every Seller Wants an Estate Sale</SectionTitle>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Many homeowners need help selling contents but are not interested in opening their home to the public.
          </p>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 rounded-2xl p-6">
              <p className="font-semibold text-slate-700 mb-3">Common situations include:</p>
              <ul className="space-y-2">
                {['Upcoming real estate closing', 'Relocation', 'Downsizing', 'Probate', 'Inherited property', 'Assisted living transition', 'Time constraints', 'Property already under contract'].map(s => (
                  <li key={s} className="flex items-center gap-2 text-slate-600 text-sm"><span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {[
                { icon: <ShoppingBag className="w-5 h-5" />, label: 'Option 1', title: 'Online Item Sales', desc: 'Items sold through online marketplaces with privacy.' },
                { icon: <Package className="w-5 h-5" />, label: 'Option 2', title: 'Buyout Offers', desc: 'Direct purchase of contents at a negotiated price.' },
                { icon: <Truck className="w-5 h-5" />, label: 'Option 3', title: 'Contents Liquidation', desc: 'Full removal of contents before closing.' },
              ].map(({ icon, label, title, desc }) => (
                <div key={title} className="flex items-start gap-4 bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <div className="text-orange-500 mt-0.5">{icon}</div>
                  <div>
                    <span className="text-xs text-orange-600 font-semibold">{label}</span>
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <p className="text-slate-500 text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Three Opportunity Types */}
      <section className="bg-slate-50 px-6 py-14" id="how-leads-work">
        <div className="max-w-4xl mx-auto">
          <SectionTitle center>Three Opportunity Types</SectionTitle>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <ShoppingBag className="w-7 h-7" />, title: 'Online Reseller Leads',
                desc: 'The seller wants to maximize value but prefers a more private process.',
                items: ['Furniture', 'Collectibles', 'Vintage items', 'Tools', 'Artwork', 'Jewelry', 'Household contents'],
                color: 'blue'
              },
              {
                icon: <Package className="w-7 h-7" />, title: 'Buyout Leads',
                desc: 'The seller wants speed.',
                items: ['Entire house contents', 'Garage contents', 'Storage units', 'Estate cleanouts', 'Time-sensitive situations'],
                color: 'orange'
              },
              {
                icon: <Truck className="w-7 h-7" />, title: 'Liquidation Leads',
                desc: 'The seller simply wants contents removed before closing.',
                items: ['Last-minute moves', 'Investor purchases', 'Probate deadlines', 'Property cleanup'],
                color: 'purple'
              },
            ].map(({ icon, title, desc, items, color }) => {
              const colors = { blue: 'bg-blue-50 border-blue-200 text-blue-600', orange: 'bg-orange-50 border-orange-200 text-orange-600', purple: 'bg-purple-50 border-purple-200 text-purple-600' };
              return (
                <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
                  <h3 className="font-bold text-slate-800">{title}</h3>
                  <p className="text-slate-500 text-sm">{desc}</p>
                  <ul className="space-y-1.5 mt-1">
                    {items.map(i => <Check key={i}>{i}</Check>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Where Do Leads Come From */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <SectionTitle center>Where Do These Leads Come From?</SectionTitle>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: <Users className="w-5 h-5" />, title: 'Real Estate Agents', desc: 'Agents submit active listings where sellers may need help selling contents before closing.' },
              { icon: <Star className="w-5 h-5" />, title: 'Estate Sale Companies', desc: 'Operators refer opportunities that are not a fit for a traditional estate sale.' },
              { icon: <MapPin className="w-5 h-5" />, title: 'Homeowners', desc: 'Consumers request help through EstateSalen directly.' },
              { icon: <BarChart2 className="w-5 h-5" />, title: 'Property Opportunity Matching', desc: 'EstateSalen identifies opportunities through listing and territory systems.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="text-orange-500 mt-0.5">{icon}</div>
                <div>
                  <h3 className="font-semibold text-slate-800">{title}</h3>
                  <p className="text-slate-500 text-sm mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How The Process Works */}
      <section className="bg-orange-50 px-6 py-14">
        <div className="max-w-3xl mx-auto">
          <SectionTitle center>How The Process Works</SectionTitle>
          <div className="space-y-3">
            {[
              { s: '1', t: 'An opportunity enters the EstateSalen platform', sub: 'From agents, operators, homeowners, or listing systems.' },
              { s: '2', t: 'The opportunity is categorized', sub: 'Estate Sale · Online Reseller · Buyout · Liquidation' },
              { s: '3', t: 'Qualified resellers are matched based on territory and preferences', sub: 'Only relevant members in the service area are notified.' },
              { s: '4', t: 'The reseller receives lead information', sub: 'Email notification with property details and contact info.' },
              { s: '5', t: 'The reseller contacts the agent or homeowner directly', sub: 'You own the relationship from here.' },
              { s: '6', t: 'If there is mutual interest, they proceed independently', sub: 'No platform fees on the transaction.' },
            ].map(({ s, t, sub }) => (
              <div key={s} className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{s}</div>
                <div>
                  <p className="font-semibold text-slate-800">{t}</p>
                  <p className="text-slate-500 text-sm">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Should Join */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <SectionTitle center>Who Should Join?</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['eBay Sellers', 'Antique Dealers', 'Auction Companies', 'Consignment Companies', 'Furniture Dealers', 'Collectible Buyers', 'Estate Buyers', 'Cleanout Specialists', 'Liquidators', 'Buyout Companies', 'Vintage Dealers', 'Online Resellers'].map(item => (
              <div key={item} className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Benefits */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <SectionTitle center>Membership Benefits</SectionTitle>
          <div className="grid md:grid-cols-3 gap-6 mb-4">
            {[
              { icon: <Bell className="w-5 h-5" />, title: 'Lead Notifications', desc: 'Receive opportunities in your service area the moment they are submitted.' },
              { icon: <MapPin className="w-5 h-5" />, title: 'Territory Matching', desc: 'Only receive leads that fit your coverage area.' },
              { icon: <Package className="w-5 h-5" />, title: 'Lead Preferences', desc: 'Choose Online Reseller, Buyout, Liquidation, or all opportunity types.' },
              { icon: <Star className="w-5 h-5" />, title: 'Business Profile', desc: 'Appear in the EstateSalen directory for homeowners and agents.' },
              { icon: <BarChart2 className="w-5 h-5" />, title: 'Opportunity Dashboard', desc: 'Track leads and contact status in one place.' },
              { icon: <CheckCircle className="w-5 h-5" />, title: 'Future Features', desc: 'Lead scoring, inventory previews, photo previews, automated territory alerts.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="text-orange-500 mb-2">{icon}</div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <SectionTitle center>Membership Plans</SectionTitle>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 flex flex-col">
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 self-start mb-3">FREE DIRECTORY MEMBER</Badge>
              <div className="text-3xl font-bold text-slate-700 mb-4">$0</div>
              <ul className="space-y-2 flex-1 mb-6">
                <Check>Business profile</Check>
                <Check>Directory visibility</Check>
                <Check>Basic account</Check>
                <li className="flex items-center gap-2 text-slate-400 text-sm line-through">Lead notifications</li>
                <li className="flex items-center gap-2 text-slate-400 text-sm line-through">Territory matching</li>
                <li className="flex items-center gap-2 text-slate-400 text-sm line-through">Opportunity dashboard</li>
              </ul>
              <button onClick={() => openJoin('free')} className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl transition-colors">
                CREATE FREE PROFILE
              </button>
            </div>
            <div className="bg-white rounded-2xl border-2 border-orange-400 p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">RECOMMENDED</div>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 self-start mb-3">RESELLER NETWORK MEMBER</Badge>
              <div className="text-3xl font-bold text-orange-500 mb-1">Paid</div>
              <p className="text-slate-400 text-sm mb-4">Contact us for current pricing</p>
              <ul className="space-y-2 flex-1 mb-6">
                {['Lead notifications', 'Territory matching', 'Opportunity dashboard', 'Agent introductions', 'Buyout opportunities', 'Online reseller opportunities', 'Liquidation opportunities', 'Lead history', 'Lead management'].map(f => <Check key={f}>{f}</Check>)}
              </ul>
              <button onClick={() => openJoin('network_member')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">
                JOIN RESELLER NETWORK
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <SectionTitle center>Frequently Asked Questions</SectionTitle>
          <div className="space-y-3">
            {[
              { q: 'Are leads exclusive?', a: 'Some opportunities may be sent to multiple qualified members depending on the service area.' },
              { q: 'Do I have to accept every lead?', a: 'No. You decide which opportunities fit your business.' },
              { q: 'Who do I contact?', a: 'The lead will contain instructions and contact information provided by the submitting party.' },
              { q: 'Can I choose lead types?', a: 'Yes. Select the categories that fit your business during sign-up or in your profile.' },
              { q: 'Do I need to run estate sales?', a: 'No. This network is specifically designed for resellers, buyers, and liquidators.' },
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
          <h2 className="text-3xl md:text-4xl font-serif font-bold">Turn Your Buying Knowledge Into<br /><span className="text-orange-400">More Opportunities</span></h2>
          <p className="text-slate-300 text-lg">Join the EstateSalen Reseller Network and start receiving inventory opportunities from homeowners, agents, and estate sale companies.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => openJoin('network_member')} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg">
              JOIN THE RESELLER NETWORK <ArrowRight className="w-5 h-5" />
            </button>
            <a href="/claim-business" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-xl text-lg border border-white/20 transition-colors">
              CLAIM BUSINESS PROFILE
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-500 text-center py-6 text-sm border-t border-slate-800">
        <p>© {new Date().getFullYear()} EstateSalen.com · <a href="/" className="underline hover:text-white">estatesalen.com</a></p>
      </footer>

      {showModal && <JoinModal defaultPlan={defaultPlan} onClose={() => setShowModal(false)} />}
    </div>
  );
}