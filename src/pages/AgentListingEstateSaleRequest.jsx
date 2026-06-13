import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import SharedFooter from '@/components/layout/SharedFooter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Home, Users, CheckCircle, Search, ChevronDown,
  ArrowRight, ArrowLeft, Loader, Building2, Phone, Mail, Clock
} from 'lucide-react';
import StepIndicator from '@/components/agent-request/StepIndicator';

const STEPS = ['Location', 'Address', 'Confirm', 'Contact', 'Details'];

export default function AgentListingEstateSaleRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1 & 2: Location
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Step 2: Address search
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const debounceRef = useRef(null);

  // Step 3: Confirm relationship
  const [submitterRelationship, setSubmitterRelationship] = useState('');

  // Step 4: Agent contact
  const [agentInfo, setAgentInfo] = useState({
    first_name: '', last_name: '', email: '', phone: '', brokerage: '',
    preferred_contact_method: 'any', best_contact_time: '', permission_to_share: false
  });

  // Step 5: Timeline
  const [timelineInfo, setTimelineInfo] = useState({
    timeline: '', help_type: '', contents_level: '', seller_situation: '',
    target_closing_date: '', notes: ''
  });

  // Load states on mount
  useEffect(() => {
    setLoadingStates(true);
    base44.functions.invoke('agentListingLookup', { action: 'get_states' })
      .then(r => setStates(r.data?.states || []))
      .finally(() => setLoadingStates(false));
  }, []);

  // Load cities when state changes
  useEffect(() => {
    if (!selectedState) return;
    setLoadingCities(true);
    setCities([]);
    setSelectedCity('');
    base44.functions.invoke('agentListingLookup', { action: 'get_cities', state: selectedState })
      .then(r => setCities(r.data?.cities || []))
      .finally(() => setLoadingCities(false));
  }, [selectedState]);

  // Debounced address search
  useEffect(() => {
    if (query.length < 3 || !selectedState) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await base44.functions.invoke('agentListingLookup', {
        action: 'search', state: selectedState, city: selectedCity, query
      });
      setSearchResults(r.data?.listings || []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, selectedState, selectedCity]);

  const handleSubmit = async () => {
    setError('');
    if (!agentInfo.permission_to_share) { setError('Please check the permission box to proceed.'); return; }
    if (!agentInfo.email) { setError('Agent email is required.'); return; }
    setSubmitting(true);
    const r = await base44.functions.invoke('submitAgentListingToPool', {
      listing_id: selectedListing.id,
      agent_info: agentInfo,
      timeline_info: timelineInfo
    });
    setSubmitting(false);
    if (r.data?.success) {
      navigate('/agent-request/thank-you');
    } else {
      setError(r.data?.error || 'Submission failed. Please try again.');
    }
  };

  const fmtPrice = (v) => v ? `$${Number(v).toLocaleString()}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png"
            alt="EstateSalen"
            className="h-9 w-9 object-contain"
          />
          <span className="font-serif font-bold text-slate-800 text-xl">EstateSalen.com</span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-14 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-sm px-4 py-1">For Real Estate Agents</Badge>
          <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            Does Your Seller Need Help Clearing Out the Home Before Closing?
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            EstateSalen connects real estate agents with local estate sale companies that can help sellers manage
            estate sales, moving sales, downsizing sales, and contents liquidation before the property closes.
          </p>
          <a href="#form-section" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg">
            Add My Listing to the Estate Sale Company Owner Pool <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-slate-400 text-sm">No cost to submit. No obligation. Local operators may reach out if they service the area.</p>
        </div>
      </section>

      {/* What EstateSalen Does */}
      <section className="bg-white px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-6 text-center">What EstateSalen Does</h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-8 leading-relaxed">
            EstateSalen helps connect homeowners, real estate agents, and estate sale companies when a property needs
            to be prepared for sale or closing. Many sellers have furniture, tools, household items, collectibles, and
            years of accumulated belongings they do not want to move, store, donate, or throw away.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { icon: <Home className="w-6 h-6" />, title: 'For the Seller', desc: 'Reduce stress and generate value from items before closing.' },
              { icon: <Users className="w-6 h-6" />, title: 'For the Agent', desc: 'Help your client solve a real problem and potentially earn future leads from local Estate Sale Company Owners.' },
              { icon: <Building2 className="w-6 h-6" />, title: 'For the Operator', desc: 'Receive qualified opportunities from listings with estate sale potential.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-orange-50 rounded-xl p-6 space-y-2">
                <div className="text-orange-500">{icon}</div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-slate-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-6">
            <h3 className="font-semibold text-slate-700 mb-3">A professional estate sale company may be able to help by:</h3>
            <ul className="grid md:grid-cols-2 gap-2">
              {['Sorting and organizing contents', 'Researching and pricing items', 'Marketing the sale', 'Running the sale day', 'Helping reduce cleanout costs', 'Helping the seller prepare the property faster'].map(item => (
                <li key={item} className="flex items-center gap-2 text-slate-600 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-orange-50 px-6 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-8 text-center">How It Works</h2>
          <div className="space-y-4">
            {[
              'Confirm your active listing.',
              'Tell us the approximate timeline.',
              'Choose the best contact method.',
              'EstateSalen matches the listing to Estate Sale Company Owners who service that area.',
              'Interested Estate Sale Company Owners may contact you directly.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                <p className="text-slate-700 pt-1.5">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Important:</strong> EstateSalen does not guarantee that every property will qualify for an estate sale or that every Estate Sale Company Owner will accept the opportunity. This simply places the listing into the operator opportunity pool.
          </div>
        </div>
      </section>

      {/* FORM */}
      <section id="form-section" className="bg-white px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-2 text-center">Add Your Listing</h2>
          <p className="text-slate-500 text-center mb-8">Search your active listing from the PropStream database and submit to the Estate Sale Company Owner pool.</p>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 md:p-8">
            <StepIndicator currentStep={step} steps={STEPS} />

            {/* STEP 1: Location */}
            {step === 1 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-800">Select State & City</h3>
                <div>
                  <Label className="mb-2 block">State *</Label>
                  {loadingStates ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> : (
                    <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 bg-white">
                      <option value="">— Select state —</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {states.length === 0 && !loadingStates && (
                    <p className="text-sm text-slate-400 mt-1">No active listings found. Please check back after listings are imported.</p>
                  )}
                </div>
                {selectedState && (
                  <div>
                    <Label className="mb-2 block">City (optional — narrows search)</Label>
                    {loadingCities ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> : (
                      <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 bg-white">
                        <option value="">— All cities in {selectedState} —</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>
                )}
                <Button onClick={() => setStep(2)} disabled={!selectedState} className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* STEP 2: Address Search */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {selectedCity ? `${selectedCity}, ${selectedState}` : selectedState}
                  <button onClick={() => setStep(1)} className="ml-2 text-blue-500 underline text-xs">change</button>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Search Your Active Listing</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Start typing street address, city, or zip…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="pl-9 h-11"
                    autoFocus
                  />
                  {searching && <Loader className="absolute right-3 top-3 w-4 h-4 animate-spin text-slate-400" />}
                </div>
                {query.length > 0 && query.length < 3 && (
                  <p className="text-xs text-slate-400">Type at least 3 characters to search…</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {searchResults.map(l => (
                      <button key={l.id} onClick={() => { setSelectedListing(l); setStep(3); }}
                        className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors">
                        <p className="font-medium text-slate-800">{l.property_address}</p>
                        <p className="text-sm text-slate-500">{l.city}, {l.state} {l.zip}{l.list_price ? ` · ${fmtPrice(l.list_price)}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
                {query.length >= 3 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No active listings found matching "{query}"</p>
                    <p className="text-xs mt-1">Try a different spelling or check that the listing is imported and active.</p>
                  </div>
                )}
                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </div>
            )}

            {/* STEP 3: Confirm Listing */}
            {step === 3 && selectedListing && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-800">Confirm Your Listing</h3>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-2">
                  <div className="flex items-start gap-3">
                    <Home className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-lg">{selectedListing.property_address}</p>
                      <p className="text-slate-600">{selectedListing.city}, {selectedListing.state} {selectedListing.zip}</p>
                      {selectedListing.list_price && <p className="text-green-600 font-semibold mt-1">List Price: {fmtPrice(selectedListing.list_price)}</p>}
                      {selectedListing.listing_agent_name && <p className="text-slate-500 text-sm mt-1">Agent: {selectedListing.listing_agent_name}{selectedListing.listing_brokerage ? ` · ${selectedListing.listing_brokerage}` : ''}</p>}
                    </div>
                  </div>
                  {selectedListing.agent_submitted_to_pool && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      This listing has already been submitted to the operator pool.
                    </div>
                  )}
                </div>
                <div>
                  <Label className="mb-3 block font-semibold">Is this your listing?</Label>
                  <div className="space-y-2">
                    {[
                      ['yes', 'Yes, this is my listing'],
                      ['behalf', 'I am submitting on behalf of the listing agent'],
                      ['no', 'No, search again'],
                    ].map(([val, label]) => (
                      <label key={val} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                        ${submitterRelationship === val ? 'bg-orange-50 border-orange-300' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <input type="radio" name="relationship" value={val} checked={submitterRelationship === val}
                          onChange={() => { if (val === 'no') { setSelectedListing(null); setQuery(''); setStep(2); } else setSubmitterRelationship(val); }}
                          className="accent-orange-500" />
                        <span className="text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setSelectedListing(null); setQuery(''); setStep(2); }} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!submitterRelationship} className="flex-1 bg-orange-500 hover:bg-orange-600">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Agent Contact */}
            {step === 4 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-800">Your Contact Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">First Name *</Label>
                    <Input value={agentInfo.first_name} onChange={e => setAgentInfo(a => ({ ...a, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Last Name *</Label>
                    <Input value={agentInfo.last_name} onChange={e => setAgentInfo(a => ({ ...a, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block">Agent Email *</Label>
                  <Input type="email" value={agentInfo.email} onChange={e => setAgentInfo(a => ({ ...a, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Agent Phone</Label>
                  <Input type="tel" value={agentInfo.phone} onChange={e => setAgentInfo(a => ({ ...a, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1 block">Brokerage</Label>
                  <Input value={agentInfo.brokerage} onChange={e => setAgentInfo(a => ({ ...a, brokerage: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-2 block">Preferred Contact Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[['email', 'Email', <Mail className="w-4 h-4" />], ['phone', 'Phone', <Phone className="w-4 h-4" />], ['text', 'Text', <Phone className="w-4 h-4" />], ['any', 'Any', <CheckCircle className="w-4 h-4" />]].map(([val, label, icon]) => (
                      <label key={val} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors text-sm
                        ${agentInfo.preferred_contact_method === val ? 'bg-orange-50 border-orange-300 font-semibold' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <input type="radio" name="contact" value={val} checked={agentInfo.preferred_contact_method === val}
                          onChange={() => setAgentInfo(a => ({ ...a, preferred_contact_method: val }))} className="accent-orange-500" />
                        {icon}<span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block">Best Time to Contact</Label>
                  <select value={agentInfo.best_contact_time} onChange={e => setAgentInfo(a => ({ ...a, best_contact_time: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                    <option value="">— Select —</option>
                    {['Morning (8am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–8pm)', 'Anytime', 'Weekdays only', 'Weekends only'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer">
                  <input type="checkbox" checked={agentInfo.permission_to_share}
                    onChange={e => setAgentInfo(a => ({ ...a, permission_to_share: e.target.checked }))}
                    className="mt-0.5 accent-orange-500" />
                  <span className="text-sm text-slate-700">
                    I agree that EstateSalen may share this listing request and my contact information with Estate Sale Company Owners who service this area.
                  </span>
                </label>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={() => setStep(5)}
                    disabled={!agentInfo.first_name || !agentInfo.last_name || !agentInfo.email || !agentInfo.permission_to_share}
                    className="flex-1 bg-orange-500 hover:bg-orange-600">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: Timeline / Details */}
            {step === 5 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-800">Seller & Sale Details</h3>

                <div>
                  <Label className="mb-2 block">Approximate Timeline for Estate Sale Help *</Label>
                  <select value={timelineInfo.timeline} onChange={e => setTimelineInfo(t => ({ ...t, timeline: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                    <option value="">— Select —</option>
                    {['Immediately', 'Within 7 days', 'Within 14 days', 'Within 30 days', '30+ days', 'Not sure yet'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="mb-2 block">Type of Help Needed</Label>
                  <select value={timelineInfo.help_type} onChange={e => setTimelineInfo(t => ({ ...t, help_type: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                    <option value="">— Select —</option>
                    {['Estate sale', 'Moving sale', 'Downsizing sale', 'Cleanout help', 'Not sure yet'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="mb-2 block">Home Contents Level</Label>
                  <select value={timelineInfo.contents_level} onChange={e => setTimelineInfo(t => ({ ...t, contents_level: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                    <option value="">— Select —</option>
                    {['Light', 'Moderate', 'Full house', 'Packed / heavy contents', 'Unknown'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="mb-2 block">Seller Situation</Label>
                  <select value={timelineInfo.seller_situation} onChange={e => setTimelineInfo(t => ({ ...t, seller_situation: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
                    <option value="">— Select —</option>
                    {['Downsizing', 'Relocation', 'Probate / inherited property', 'Senior transition', 'Divorce', 'Pre-listing cleanup', 'Already listed and needs contents removed', 'Other', 'Prefer not to say'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="mb-1 block">Target Real Estate Closing Date (if known)</Label>
                  <Input type="date" value={timelineInfo.target_closing_date} onChange={e => setTimelineInfo(t => ({ ...t, target_closing_date: e.target.value }))} />
                </div>

                <div>
                  <Label className="mb-1 block">Notes for the operator</Label>
                  <textarea value={timelineInfo.notes} onChange={e => setTimelineInfo(t => ({ ...t, notes: e.target.value }))}
                    rows={3} placeholder="Any additional context that would help an Estate Sale Company Owner understand the opportunity…"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 resize-none" />
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button onClick={handleSubmit} disabled={!timelineInfo.timeline || submitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 h-12 font-semibold">
                    {submitting ? <><Loader className="w-4 h-4 animate-spin mr-2" />Submitting…</> : 'Submit Listing to Estate Sale Company Owners'}
                  </Button>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  By submitting, you agree to our terms. EstateSalen does not guarantee operator response. No cost, no obligation.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}