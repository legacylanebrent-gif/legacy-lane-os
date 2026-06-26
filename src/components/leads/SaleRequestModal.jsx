import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ArrowLeft, ArrowRight, MapPin, Building2, Users } from 'lucide-react';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export default function SaleRequestModal({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [selectedState, setSelectedState] = useState('');
  const [counties, setCounties] = useState([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [companyCount, setCompanyCount] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    property_address: '',
    source: 'website',
    situation: 'rather_not_say',
    home_size: '',
    gated_community: false,
    sales_allowed: '',
    amount_to_sell: '',
    home_on_market: '',
    service_type: [],
    items_to_sell: [],
    timeline: '',
    notes: '',
    score: 75
  });

  useEffect(() => {
    if (!selectedState || step !== 2) return;
    setLoadingCounties(true);
    base44.entities.HousioTerritory.filter({ state: selectedState, is_active: true })
      .then(records => {
        const unique = [...new Map(records.map(r => [r.county, r])).values()]
          .sort((a, b) => a.county.localeCompare(b.county));
        setCounties(unique);
      })
      .catch(() => setCounties([]))
      .finally(() => setLoadingCounties(false));
  }, [selectedState, step]);

  useEffect(() => {
    if (!selectedState || !selectedCounty || step !== 3) return;
    setLoadingCompanies(true);
    base44.entities.FutureEstateOperator.filter({ state: selectedState })
      .then(records => {
        const raw = selectedCounty.replace(/\s+County$/i, '');
        const matched = records.filter(r => 
          (r.geocoded_county || r.county || '').toLowerCase().includes(raw.toLowerCase())
        );
        setCompanyCount(matched.length);
      })
      .catch(() => setCompanyCount(0))
      .finally(() => setLoadingCompanies(false));
  }, [selectedState, selectedCounty, step]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.Lead.create({
        source: formData.source,
        source_details: 'Estate sale request via website',
        intent: 'estate_sale',
        situation: formData.situation || 'standard',
        property_address: formData.property_address,
        property_state: selectedState,
        property_county: selectedCounty,
        home_size: formData.home_size,
        gated_community: formData.gated_community,
        sales_allowed: formData.sales_allowed,
        amount_to_sell: formData.amount_to_sell,
        home_on_market: formData.home_on_market === 'yes',
        service_type: formData.service_type,
        items_to_sell: formData.items_to_sell,
        timeline: formData.timeline,
        score: parseInt(formData.score),
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        notes: formData.notes
      });
      const names = formData.contact_name.split(' ');
      await base44.entities.Contact.create({
        first_name: names[0],
        last_name: names.slice(1).join(' ') || names[0],
        display_name: formData.contact_name,
        email: formData.contact_email,
        phone: formData.contact_phone,
        lead_source: 'website',
        situation: formData.situation || 'standard',
        notes: formData.notes
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSubmitted(false);
    setSelectedState('');
    setSelectedCounty('');
    setCounties([]);
    setCompanyCount(null);
    setFormData({
      contact_name: '', contact_email: '', contact_phone: '', property_address: '',
      source: 'website', situation: 'rather_not_say', home_size: '',
      gated_community: false, sales_allowed: '', amount_to_sell: '',
      home_on_market: '', service_type: [], items_to_sell: [], timeline: '', notes: '', score: 75
    });
    onClose();
  };

  const stateName = US_STATES.find(s => s.code === selectedState)?.name || selectedState;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col [&>button]:hidden">
        {/* Custom close button */}
        <button onClick={handleClose} className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 z-10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Fixed header */}
        <div className="flex-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">
              {submitted ? 'Request Received!' : 
                step <= 2 ? 'Find Estate Sale Companies Near You' : 'Submit Estate Sale Request'}
            </DialogTitle>
          </DialogHeader>
          {!submitted && (
            <div className="flex items-center gap-2 mb-4 mt-2">
              {[1, 2, 3, 4].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    s < step ? 'bg-green-500 text-white' : 
                    s === step ? 'bg-cyan-600 text-white' : 
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-green-500' : 'bg-slate-200'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-8">
          {submitted ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Request Received!</h3>
              <p className="text-slate-600 mb-2">
                We found <span className="font-semibold text-cyan-600">{companyCount}</span> estate sale companies 
                in {selectedCounty}, {stateName} that may be able to help.
              </p>
              <p className="text-slate-600 mb-6">
                They will review your request and reach out to you within 24-48 hours.
              </p>
              <Button onClick={handleClose} className="bg-cyan-600 hover:bg-cyan-700">Close</Button>
            </div>
          ) : (
            <>
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <MapPin className="w-12 h-12 mx-auto text-cyan-600 mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900">Where is the property located?</h3>
                    <p className="text-slate-500 text-sm">Select your state to find local estate sale companies</p>
                  </div>
                  <Label className="text-base">State</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="Choose your state..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px] overflow-y-auto">
                      {US_STATES.map(s => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep(2)} disabled={!selectedState} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="flex flex-col h-full">
                  <div className="flex-none">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-cyan-600" />
                      <span className="text-slate-600">{stateName}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Which county?</h3>
                    <p className="text-slate-500 text-sm mb-3">Select the county where the property is located</p>
                  </div>
                  
                  {/* Scrollable county grid */}
                  <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                    {loadingCounties ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-pulse text-slate-500">Loading counties...</div>
                      </div>
                    ) : counties.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {counties.map(t => (
                          <button
                            key={t.county}
                            onClick={() => setSelectedCounty(t.county)}
                            className={`text-left p-4 rounded-lg border transition-all ${
                              selectedCounty === t.county
                                ? 'border-cyan-600 bg-cyan-50 ring-2 ring-cyan-200'
                                : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">{t.county}</div>
                            {t.zip_codes_json?.length > 0 && (
                              <div className="text-xs text-slate-500 mt-1">
                                {t.zip_codes_json.length} ZIP{t.zip_codes_json.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No counties available for this state yet. Try another state.
                      </div>
                    )}
                  </div>

                  {/* Fixed nav at bottom */}
                  <div className="flex-none flex justify-between pt-3 border-t">
                    <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!selectedCounty} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-cyan-600" />
                    <span className="text-slate-600">{selectedCounty}, {stateName}</span>
                  </div>
                  {loadingCompanies ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full mx-auto mb-4" />
                      <p className="text-slate-500">Searching for estate sale companies...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className={`w-16 h-16 mx-auto mb-4 ${companyCount > 0 ? 'text-cyan-600' : 'text-slate-300'}`} />
                      {companyCount > 0 ? (
                        <>
                          <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">
                            {companyCount} Estate Sale {companyCount === 1 ? 'Company' : 'Companies'} Available
                          </h3>
                          <p className="text-slate-600 mb-6">
                            There {companyCount === 1 ? 'is' : 'are'}{' '}
                            <span className="font-semibold text-cyan-600">{companyCount}</span>{' '}
                            estate sale {companyCount === 1 ? 'company' : 'companies'} listed that may be able to help.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">No Companies Listed Yet</h3>
                          <p className="text-slate-600 mb-6">
                            We're expanding daily. Submit your request and we'll find the closest available companies.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(4)} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Requesting companies in</span>
                      <p className="font-semibold text-slate-900">{selectedCounty}, {stateName}</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Your Name *</Label>
                        <Input id="name" value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} placeholder="John Doe" required />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input id="phone" type="tel" value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} placeholder="(555) 123-4567" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} placeholder="john@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="address">Property Address *</Label>
                      <Input id="address" value={formData.property_address} onChange={(e) => setFormData({...formData, property_address: e.target.value})} placeholder="123 Main St, City, State ZIP" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Situation</Label>
                        <Select value={formData.situation} onValueChange={(v) => setFormData({...formData, situation: v})}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rather_not_say">I'd Rather Not Say</SelectItem>
                            <SelectItem value="probate">Probate</SelectItem>
                            <SelectItem value="divorce">Divorce</SelectItem>
                            <SelectItem value="downsizing">Downsizing</SelectItem>
                            <SelectItem value="relocation">Relocation</SelectItem>
                            <SelectItem value="foreclosure">Foreclosure</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="estate">Estate</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Timeline</Label>
                        <Select value={formData.timeline} onValueChange={(v) => setFormData({...formData, timeline: v})}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="1_3_months">1-3 Months</SelectItem>
                            <SelectItem value="3_6_months">3-6 Months</SelectItem>
                            <SelectItem value="6_12_months">6-12 Months</SelectItem>
                            <SelectItem value="exploring">Just Exploring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Size of Home</Label>
                        <Select value={formData.home_size} onValueChange={(v) => setFormData({...formData, home_size: v})}>
                          <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-2_bedroom">1-2 Bedroom House</SelectItem>
                            <SelectItem value="3-4_bedroom">3-4 Bedroom House</SelectItem>
                            <SelectItem value="5+_bedroom">5+ Bedroom House</SelectItem>
                            <SelectItem value="apartment_condo">Apartment or Condo</SelectItem>
                            <SelectItem value="storefront_business">Storefront or Business</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>How much is to be sold?</Label>
                        <Select value={formData.amount_to_sell} onValueChange={(v) => setFormData({...formData, amount_to_sell: v})}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All (90-100%)</SelectItem>
                            <SelectItem value="most">Most (50-90%)</SelectItem>
                            <SelectItem value="some">Some (&lt;50%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="gated_community" checked={formData.gated_community}
                          onChange={(e) => setFormData({...formData, gated_community: e.target.checked, sales_allowed: ''})}
                          className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500" />
                        <Label htmlFor="gated_community" className="cursor-pointer">Gated Community?</Label>
                      </div>
                      {formData.gated_community && (
                        <div>
                          <Label>Are in-person sales allowed?</Label>
                          <Select value={formData.sales_allowed} onValueChange={(v) => setFormData({...formData, sales_allowed: v})}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="unsure">Unsure</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Is the home currently on the market?</Label>
                      <Select value={formData.home_on_market} onValueChange={(v) => setFormData({...formData, home_on_market: v})}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>What type of service are you interested in?</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg bg-slate-50">
                        {['Full Service', 'Sale Only', 'Estate + Real Estate Sale'].map(option => (
                          <div key={option} className="flex items-center space-x-2">
                            <input type="checkbox" id={`service_${option}`} checked={formData.service_type.includes(option)}
                              onChange={(e) => { if (e.target.checked) setFormData({...formData, service_type: [...formData.service_type, option]}); else setFormData({...formData, service_type: formData.service_type.filter(s => s !== option)}); }}
                              className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500" />
                            <Label htmlFor={`service_${option}`} className="cursor-pointer text-sm">{option}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>What will you be selling?</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg bg-slate-50 max-h-[400px] overflow-y-auto">
                        {['Furniture','Antiques','Collectibles','Jewelry','Art & Paintings','China & Glassware','Crystal','Silver & Silverware','Books','Vintage Clothing','Tools','Garden & Outdoor','Kitchen & Dining','Appliances','Electronics','Linens & Bedding','Decorative Items','Rugs & Carpets','Lamps & Lighting','Musical Instruments','Sports Equipment','Toys & Games','Holiday Decorations','Records & Vinyl','Coins & Stamps','Watches & Clocks','Pottery & Ceramics','Vintage Electronics','Luggage & Trunks','Sewing & Crafts'].map(item => (
                          <div key={item} className="flex items-center space-x-2">
                            <input type="checkbox" id={`item_${item}`} checked={formData.items_to_sell.includes(item)}
                              onChange={(e) => { if (e.target.checked) setFormData({...formData, items_to_sell: [...formData.items_to_sell, item]}); else setFormData({...formData, items_to_sell: formData.items_to_sell.filter(i => i !== item)}); }}
                              className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500" />
                            <Label htmlFor={`item_${item}`} className="cursor-pointer text-sm">{item}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Additional Notes</Label>
                      <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Tell us about your estate sale needs..." rows={3} />
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setStep(3)} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                      <Button type="submit" disabled={loading} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                        {loading ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}