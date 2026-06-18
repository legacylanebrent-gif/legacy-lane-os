import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import SharedFooter from '@/components/layout/SharedFooter';
import { formatPhone } from '@/utils/formatPhone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, Search, ArrowRight, ArrowLeft, Building2, MapPin,
  Users, Zap, Star, Gift, Loader, Phone, Mail, Globe, ChevronDown
} from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const CLAIM_STEPS = ['Find', 'Select', 'Verify', 'Plan', 'Done'];

function Section({ children, className = '' }) {
  return <section className={`px-6 py-14 ${className}`}>{children}</section>;
}
function SectionInner({ children }) {
  return <div className="max-w-4xl mx-auto">{children}</div>;
}
function SectionTitle({ children, center = false }) {
  return <h2 className={`text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-6 ${center ? 'text-center' : ''}`}>{children}</h2>;
}
function Check({ children }) {
  return (
    <li className="flex items-start gap-2 text-slate-700">
      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

export default function ClaimBusiness() {
  const navigate = useNavigate();
  const [claimStep, setClaimStep] = useState(0); // 0 = hidden (page view), 1-5 = modal steps
  const [showModal, setShowModal] = useState(false);

  // Step 1: search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Step 2: selected listing
  const [selectedOp, setSelectedOp] = useState(null);

  // Step 3: verify / contact
  const [contact, setContact] = useState({ name: '', email: '', phone: '', website: '', territory: '' });
  const [verifyError, setVerifyError] = useState('');

  // Step 4: plan choice
  const [planChoice, setPlanChoice] = useState('');

  // Step 5: result
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const openClaim = () => { setShowModal(true); setClaimStep(1); };
  const closeClaim = () => { setShowModal(false); setClaimStep(0); };

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await base44.functions.invoke('searchDirectoryOperators', { query: searchQuery, state: searchState || undefined });
      setSearchResults(r.data?.results || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, searchState]);

  const handleSelectOp = (op) => {
    setSelectedOp(op);
    setContact(c => ({
      ...c,
      website: op.website_url || op.website || '',
      territory: op.city && op.state ? `${op.city}, ${op.state}` : ''
    }));
    setClaimStep(3);
  };

  const handleVerify = () => {
    if (!contact.name || !contact.email) { setVerifyError('Name and email are required.'); return; }
    setVerifyError('');
    setClaimStep(4);
  };

  const handleSubmit = async () => {
    if (!planChoice) return;
    setSubmitting(true);
    setSubmitError('');
    const r = await base44.functions.invoke('claimDirectoryListing', {
      operator_id: selectedOp.id,
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone,
      contact_website: contact.website,
      territories: contact.territory ? [contact.territory] : [],
      plan_choice: planChoice
    });
    setSubmitting(false);
    if (r.data?.success) {
      setSubmitResult(r.data);
      setClaimStep(5);
    } else if (r.data?.already_claimed) {
      setSubmitError('This listing has already been claimed. If you are the owner, please contact support@estatesalen.com.');
    } else {
      setSubmitError(r.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="EstateSalen" className="h-9 w-9 object-contain" />
            <span className="font-serif font-bold text-slate-800 text-xl">EstateSalen.com</span>
          </div>
          <Button onClick={openClaim} className="bg-orange-500 hover:bg-orange-600 text-white">Claim My Business</Button>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-sm px-4 py-1">For Estate Sale Companies</Badge>
          <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            Your Business Is Already Listed.<br />
            <span className="text-orange-400">Now Turn It Into a Lead Generation Machine.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            EstateSalen already includes over 7,700 estate sale companies across the United States.
            Claim your business profile, receive estate sale opportunities from local real estate agents,
            and discover how EstateSalen helps operators grow faster while saving hours on every sale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={openClaim} className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg">
              CLAIM MY BUSINESS <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#leads-section" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors border border-white/20">
              SHOW ME AVAILABLE LEADS
            </a>
          </div>
          {/* Trust Bar */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {['7,700+ Estate Sale Companies Listed', 'Nationwide Coverage', 'Real Estate Agent Referral Network', 'Inventory + Marketing + POS Platform'].map(item => (
              <div key={item} className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />{item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why operators Are Joining */}
      <Section className="bg-white">
        <SectionInner>
          <SectionTitle center>Why operators Are Joining EstateSalen</SectionTitle>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Most estate sale directories help people find your sales. EstateSalen helps people find your company. But that's only the beginning.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: <Users className="w-6 h-6" />, title: 'Generate More Seller Opportunities', desc: 'Receive referrals from real estate agents with sellers who need estate sale help before closing.' },
              { icon: <Zap className="w-6 h-6" />, title: 'Save Time on Every Sale', desc: 'AI pricing, inventory management, automated marketing, and a complete estate sale POS system.' },
              { icon: <Star className="w-6 h-6" />, title: 'Build Recurring Business Systems', desc: 'VIP buyer lists, referral tracking, and business dashboards so you always know your numbers.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-2xl p-6 space-y-3">
                <div className="text-orange-500">{icon}</div>
                <h3 className="font-bold text-slate-800">{title}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <p className="font-semibold text-slate-700 mb-3">EstateSalen was built to help operators:</p>
            <ul className="grid md:grid-cols-2 gap-2">
              {['Generate more seller opportunities', 'Receive referrals from real estate agents', 'Save time preparing sales', 'Price inventory faster', 'Create marketing automatically', 'Manage customer lists', 'Run VIP pre-sales', 'Process checkout and reporting', 'Build recurring business systems'].map(item => (
                <Check key={item}>{item}</Check>
              ))}
            </ul>
            <p className="mt-4 text-slate-700 font-medium">This isn't simply another directory. It's a complete operating system for estate sale companies.</p>
          </div>
        </SectionInner>
      </Section>

      {/* The Problem */}
      <Section className="bg-slate-50">
        <SectionInner>
          <SectionTitle center>The Problem Most operators Face</SectionTitle>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <p className="font-semibold text-slate-700 mb-4">You spend money on:</p>
              <ul className="space-y-2">
                {['Advertising', 'Social media', 'Signs', 'Printing', 'Websites', 'Marketing tools', 'Administrative work'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-slate-600 text-sm">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <p className="font-semibold text-slate-700 mb-4">Yet most operators still rely heavily on:</p>
              <ul className="space-y-3">
                {['Word of mouth', 'Referrals', 'Chance inquiries', 'Inconsistent lead flow'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-slate-500">EstateSalen was designed to solve that problem.</p>
            </div>
          </div>
        </SectionInner>
      </Section>

      {/* Agent Leads Section */}
      <Section id="leads-section" className="bg-white">
        <SectionInner>
          <div className="text-center mb-8">
            <Badge className="bg-green-100 text-green-700 border-green-200 mb-3">New Feature</Badge>
            <SectionTitle center>Introducing Agent Generated Estate Sale Leads</SectionTitle>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-8 mb-8">
            <p className="text-slate-300 leading-relaxed mb-4">
              Every day, EstateSalen imports newly listed homes and helps connect real estate agents with estate sale companies.
              When agents believe their sellers may need help, those opportunities are routed to operators who service that territory.
            </p>
            <p className="text-white font-semibold text-lg">
              Instead of waiting for the homeowner to find you — EstateSalen helps put you in front of the agent first.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-slate-700 mb-3">Agents submit listings when sellers need help with:</p>
              <ul className="space-y-2">
                {['Downsizing', 'Probate', 'Inherited properties', 'Senior transitions', 'Moving sales', 'Cleanouts', 'Contents liquidation'].map(item => (
                  <Check key={item}>{item}</Check>
                ))}
              </ul>
            </div>
            <div className="bg-orange-50 rounded-2xl p-6">
              <h3 className="font-bold text-slate-800 mb-2">How It Reaches You</h3>
              <ol className="space-y-2 text-sm text-slate-600">
                {['Agent submits active listing with seller details', 'EstateSalen matches to operators in that territory', 'Estate Sale Company Owner receives lead notification', 'Estate Sale Company Owner contacts agent directly', 'You earn the opportunity to help the seller'].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </SectionInner>
      </Section>

      {/* Participation Plans */}
      <Section className="bg-slate-50">
        <SectionInner>
          <SectionTitle center>Choose Your Participation Level</SectionTitle>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Option 1 */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 flex flex-col">
              <div className="mb-2">
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">OPTION 1</Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-2">Claim Listing + Receive Leads</h3>
              <div className="text-3xl font-bold text-green-600 mt-2 mb-1">FREE</div>
              <p className="text-slate-500 text-sm mb-6">Perfect if you simply want access to opportunities.</p>
              <ul className="space-y-2 flex-1 mb-6">
                {['Claim business listing', 'Update company information', 'Territory matching', 'Receive lead notifications', 'Contact listing agents', 'Basic profile visibility'].map(f => <Check key={f}>{f}</Check>)}
              </ul>
              <button onClick={() => { openClaim(); setPlanChoice('free_lead_access'); }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors">
                CLAIM FREE LISTING
              </button>
            </div>
            {/* Option 2 */}
            <div className="bg-white rounded-2xl border-2 border-orange-400 p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">MOST POPULAR</div>
              <div className="mb-2">
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">OPTION 2</Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-2">Free Trial of Legacy Lane OS</h3>
              <div className="text-3xl font-bold text-orange-500 mt-2 mb-1">Try Free</div>
              <p className="text-slate-500 text-sm mb-6">Try the full platform — no credit card required.</p>
              <ul className="space-y-2 flex-1 mb-6">
                {['Everything in Free Listing', 'Inventory management', 'AI item research', 'AI pricing assistance', 'QR labels', 'Marketing automation', 'Social media creation', 'Email campaigns', 'VIP pre-sale management', 'Estate sale POS system', 'Sales reporting', 'Referral tracking'].map(f => <Check key={f}>{f}</Check>)}
              </ul>
              <button onClick={() => { openClaim(); setPlanChoice('free_trial'); }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">
                START FREE TRIAL
              </button>
            </div>
          </div>
        </SectionInner>
      </Section>

      {/* What Makes EstateSalen Different */}
      <Section className="bg-white">
        <SectionInner>
          <SectionTitle center>What Makes EstateSalen Different?</SectionTitle>
          <p className="text-center text-slate-500 mb-8">Most directories help advertise sales. EstateSalen helps run your business.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Inventory Management', desc: 'Research and price items faster with AI-powered assistance.' },
              { title: 'AI Marketing', desc: 'Generate social posts, emails, and promotional content automatically.' },
              { title: 'VIP Buyer System', desc: 'Capture and market to repeat buyers who love your sales.' },
              { title: 'Estate Sale POS', desc: 'Check out customers and generate complete sales reports.' },
              { title: 'Referral Opportunities', desc: 'Connect with real estate agents and sellers in your territory.' },
              { title: 'Business Dashboard', desc: 'Know exactly what is happening inside your company at all times.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-gradient-to-br from-slate-50 to-orange-50 rounded-xl p-5 border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>

      {/* How Claiming Works */}
      <Section className="bg-slate-50">
        <SectionInner>
          <SectionTitle center>How Claiming Your Business Works</SectionTitle>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Find your company listing', desc: 'Search by name and state from our database of 7,700+ companies.' },
              { step: '2', title: 'Verify ownership', desc: 'Confirm your contact information and territory.' },
              { step: '3', title: 'Update your information', desc: 'Add current contact details, website, and service area.' },
              { step: '4', title: 'Select your territories', desc: 'Choose which counties and cities you actively service.' },
              { step: '5', title: 'Choose your plan', desc: 'Free lead access or full platform free trial.' },
              { step: '6', title: 'Start receiving opportunities', desc: 'Get notified when agent-submitted leads match your area.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-xl p-5 border border-slate-200 flex gap-4">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{step}</div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-1">{title}</h3>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>

      {/* FAQ */}
      <Section className="bg-white">
        <SectionInner>
          <SectionTitle center>Frequently Asked Questions</SectionTitle>
          <div className="max-w-2xl mx-auto space-y-4">
            {[
              { q: 'Do I have to subscribe?', a: 'No. You can simply claim your listing and receive lead opportunities at no cost.' },
              { q: 'How much does it cost to claim my business?', a: 'Claiming your directory profile is free.' },
              { q: 'Can I upgrade later?', a: 'Yes. Estate Sale Company Owners can upgrade at any time from their dashboard.' },
              { q: 'How are leads generated?', a: 'EstateSalen connects agents, homeowners, and Estate Sale Company Owners through our nationwide platform and referral network.' },
              { q: 'Am I obligated to accept every lead?', a: 'No. You decide which opportunities fit your business.' },
            ].map(({ q, a }) => (
              <details key={q} className="bg-slate-50 rounded-xl border border-slate-200 p-5 group">
                <summary className="font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between gap-2">
                  {q} <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <p className="mt-3 text-slate-600 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </SectionInner>
      </Section>

      {/* Final CTA */}
      <Section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <SectionInner>
          <div className="text-center space-y-5">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Your Business May Already Be Listed.<br /><span className="text-orange-400">Claim It Today.</span></h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">Start receiving opportunities, improve your visibility, and discover how EstateSalen can help grow your estate sale business.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={openClaim} className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg">
                CLAIM MY BUSINESS <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => { openClaim(); setPlanChoice('free_trial'); }} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-xl text-lg border border-white/20 transition-colors">
                START FREE TRIAL
              </button>
            </div>
            <p className="text-slate-400 text-sm">No credit card required to claim your listing. Free trial available for qualified operators.</p>
          </div>
        </SectionInner>
      </Section>

      <SharedFooter />

      {/* CLAIM MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Claim Your Business Listing</h2>
              <button onClick={closeClaim} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            {/* Step indicators */}
            <div className="flex gap-1 px-6 pt-4">
              {CLAIM_STEPS.map((label, i) => {
                const s = i + 1;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mb-1
                      ${s < claimStep ? 'bg-green-500 text-white' : s === claimStep ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {s < claimStep ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                    </div>
                    <span className={`text-xs ${s === claimStep ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>{label}</span>
                  </div>
                );
              })}
            </div>

            <div className="p-6 space-y-5">

              {/* STEP 1: Search */}
              {claimStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">Search Your Company Name</h3>
                  <div>
                    <Label className="mb-1 block">State (optional, narrows search)</Label>
                    <select value={searchState} onChange={e => setSearchState(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                      <option value="">— All States —</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input placeholder="Type company name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-11" autoFocus />
                    {searching && <Loader className="absolute right-3 top-3 w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                  {searchQuery.length >= 2 && searchResults.length > 0 && (
                    <p className="text-xs text-slate-400">Found {searchResults.length} results — select yours below →</p>
                  )}
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-sm text-slate-400">No results found. Try a different spelling.</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {searchResults.map(op => (
                        <button key={op.id} onClick={() => { setSelectedOp(op); setClaimStep(2); }}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors">
                          <p className="font-semibold text-slate-800">{op.company_name}</p>
                          <p className="text-sm text-slate-500">{op.city}, {op.state}{op.claimed_listing ? ' · Already Claimed' : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Confirm */}
              {claimStep === 2 && selectedOp && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">Is This Your Company?</h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">{selectedOp.company_name}</p>
                        <p className="text-slate-600 text-sm">{selectedOp.city}, {selectedOp.state}{selectedOp.zip_code ? ` ${selectedOp.zip_code}` : ''}</p>
                        {selectedOp.phone && <p className="text-slate-500 text-sm mt-1"><Phone className="w-3 h-3 inline mr-1" />{formatPhone(selectedOp.phone)}</p>}
                        {(selectedOp.website_url || selectedOp.website) && <p className="text-slate-500 text-sm"><Globe className="w-3 h-3 inline mr-1" />{selectedOp.website_url || selectedOp.website}</p>}
                        {selectedOp.claimed_listing && <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-200 text-xs">Already Claimed</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setClaimStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Search Again</Button>
                    <Button onClick={() => handleSelectOp(selectedOp)} className="flex-1 bg-orange-500 hover:bg-orange-600">
                      Yes, This Is Mine <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Verify */}
              {claimStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">Verify Ownership</h3>
                  <p className="text-sm text-slate-500">Confirm your details so we can verify you are associated with {selectedOp?.company_name}.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block">Your Name *</Label>
                      <Input value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Company</Label>
                      <Input value={selectedOp?.company_name || ''} disabled className="bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block">Your Email *</Label>
                    <Input type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Your Phone</Label>
                    <Input type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Website</Label>
                    <Input value={contact.website} onChange={e => setContact(c => ({ ...c, website: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Primary Service Territory (city, state)</Label>
                    <Input value={contact.territory} onChange={e => setContact(c => ({ ...c, territory: e.target.value }))} placeholder="e.g. Newark, NJ" />
                  </div>
                  {verifyError && <p className="text-red-600 text-sm">{verifyError}</p>}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setClaimStep(2)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                    <Button onClick={handleVerify} className="flex-1 bg-orange-500 hover:bg-orange-600">Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </div>
                </div>
              )}

              {/* STEP 4: Plan */}
              {claimStep === 4 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">Choose Your Plan</h3>
                  {[
                    { val: 'free_lead_access', label: 'Free Lead Access', sub: 'Claim listing, receive lead notifications, contact agents. Free forever.', badge: 'FREE' },
                    { val: 'free_trial', label: 'Free Trial of Legacy Lane OS', sub: 'Full platform access — inventory, AI pricing, marketing, POS, and more.', badge: '14-Day Trial' },
                  ].map(({ val, label, sub, badge }) => (
                    <label key={val} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${planChoice === val ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-200'}`}>
                      <input type="radio" name="plan" value={val} checked={planChoice === val} onChange={() => setPlanChoice(val)} className="mt-1 accent-orange-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{label}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{badge}</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">{sub}</p>
                      </div>
                    </label>
                  ))}
                  {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setClaimStep(3)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                    <Button onClick={handleSubmit} disabled={!planChoice || submitting} className="flex-1 bg-orange-500 hover:bg-orange-600">
                      {submitting ? <><Loader className="w-4 h-4 animate-spin mr-2" />Activating…</> : 'Activate Profile'}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 5: Done */}
              {claimStep === 5 && submitResult && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Your Profile Is Active!</h3>
                  <p className="text-slate-600">{submitResult.message}</p>
                  {submitResult.plan === 'free_trial' && submitResult.trial_end && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-slate-700">
                      <Gift className="w-4 h-4 text-orange-500 inline mr-1" />
                      Your free trial is active until <strong>{new Date(submitResult.trial_end).toLocaleDateString()}</strong>.
                    </div>
                  )}
                  <div className="space-y-2 pt-2">
                    <Button onClick={() => { closeClaim(); navigate('/OperatorDashboard'); }} className="w-full bg-orange-500 hover:bg-orange-600">
                      Go to My Dashboard
                    </Button>
                    <Button variant="outline" onClick={closeClaim} className="w-full">Close</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}