import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, Upload, Save, MapPin, Phone, Globe, Mail,
  Image as ImageIcon, CreditCard, Shield, Star, X, Plus, Users
} from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit/Debit Card' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'square', label: 'Square' },
  { value: 'other', label: 'Other' },
];

const SPECIALTY_OPTIONS = [
  'Antiques', 'Art & Paintings', 'Books & Media', 'China & Porcelain',
  'Clocks & Watches', 'Clothing & Accessories', 'Coins & Currency',
  'Collectibles', 'Electronics', 'Firearms', 'Furniture', 'Garden & Outdoor',
  'Glassware & Crystal', 'Holiday & Seasonal', 'Jewelry', 'Kitchen & Dining',
  'Lighting & Lamps', 'Mid-Century Modern', 'Musical Instruments',
  'Rugs & Textiles', 'Sporting Goods', 'Tools & Hardware', 'Toys & Games',
  'Vehicles', 'Victorian Era', 'Vintage Fashion', 'Wine & Spirits'
];

const SERVICE_OPTIONS = [
  'Full Estate Sales', 'Online-Only Auctions', 'On-Site Auctions',
  'Buyout / Cleanout', 'Moving Sales', 'Estate Appraisals',
  'Consignment', 'Donation Management', 'Photography & Catalog',
  'Staging & Setup', 'Online Listing', 'Senior Transition Services',
  'Business Liquidations', 'Storage Unit Sales'
];

export default function OperatorProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState({});
  const [newCounty, setNewCounty] = useState('');
  const [newCity, setNewCity] = useState('');

  const [form, setForm] = useState({
    company_name: '',
    company_tagline: '',
    company_description: '',
    phone: '',
    phone_secondary: '',
    company_email: '',
    website_url: '',
    business_address_street: '',
    business_address_city: '',
    business_address_state: '',
    business_address_zip: '',
    years_in_business: '',
    founded_year: '',
    license_number: '',
    insurance_verified: false,
    bonded: false,
    commission_rate: '',
    minimum_sale_value: '',
    service_radius_miles: '',
    service_states: [],
    service_counties: [],
    service_cities: [],
    specialties: [],
    services_offered: [],
    payment_methods_accepted: ['cash'],
    venmo_username: '',
    paypal_email: '',
    zelle_phone_or_email: '',
    cashapp_tag: '',
    stripe_account_id: '',
    square_location_id: '',
    logo_dark: '',
    logo_light: '',
    profile_image_url: '',
    venmo_qr_code: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setForm(prev => ({
        ...prev,
        company_name: userData.company_name || '',
        company_tagline: userData.company_tagline || '',
        company_description: userData.company_description || '',
        phone: userData.phone || '',
        phone_secondary: userData.phone_secondary || '',
        company_email: userData.company_email || '',
        website_url: userData.website_url || userData.company_website || '',
        business_address_street: userData.business_address_street || '',
        business_address_city: userData.business_address_city || '',
        business_address_state: userData.business_address_state || '',
        business_address_zip: userData.business_address_zip || '',
        years_in_business: userData.years_in_business || '',
        founded_year: userData.founded_year || '',
        license_number: userData.license_number || '',
        insurance_verified: userData.insurance_verified || false,
        bonded: userData.bonded || false,
        commission_rate: userData.commission_rate || '',
        minimum_sale_value: userData.minimum_sale_value || '',
        service_radius_miles: userData.service_radius_miles || '',
        service_states: userData.service_states || [],
        service_counties: userData.service_counties || [],
        service_cities: userData.service_cities || [],
        specialties: userData.specialties || [],
        services_offered: userData.services_offered || [],
        payment_methods_accepted: userData.payment_methods_accepted || ['cash'],
        venmo_username: userData.venmo_username || '',
        paypal_email: userData.paypal_email || '',
        zelle_phone_or_email: userData.zelle_phone_or_email || '',
        cashapp_tag: userData.cashapp_tag || '',
        stripe_account_id: userData.stripe_account_id || '',
        square_location_id: userData.square_location_id || '',
        logo_dark: userData.logo_dark || '',
        logo_light: userData.logo_light || '',
        profile_image_url: userData.profile_image_url || '',
        venmo_qr_code: userData.venmo_qr_code || '',
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, [field]: file_url }));
      await base44.auth.updateMe({ [field]: file_url });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const toggleArrayItem = (field, value) => {
    setForm(prev => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
      };
    });
  };

  const addTag = (field, value, clear) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setForm(prev => ({
      ...prev,
      [field]: [...new Set([...(prev[field] || []), trimmed])]
    }));
    clear('');
  };

  const removeTag = (field, value) => {
    setForm(prev => ({ ...prev, [field]: (prev[field] || []).filter(v => v !== value) }));
  };

  const LogoUploader = ({ field, label, darkBg }) => (
    <div className={`rounded-xl p-5 border-2 border-dashed ${darkBg ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
      <p className={`text-sm font-semibold mb-3 ${darkBg ? 'text-slate-200' : 'text-slate-700'}`}>{label}</p>
      {form[field] ? (
        <div className="relative inline-block">
          <img src={form[field]} alt={label} className={`h-20 object-contain rounded-lg ${darkBg ? 'bg-slate-700 p-2' : 'bg-white p-2 border'}`} />
          <button onClick={() => setForm(prev => ({ ...prev, [field]: '' }))}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-center h-20 rounded-lg ${darkBg ? 'bg-slate-700' : 'bg-white border border-slate-200'}`}>
          <ImageIcon className={`w-8 h-8 ${darkBg ? 'text-slate-500' : 'text-slate-300'}`} />
        </div>
      )}
      <label className="mt-3 block cursor-pointer">
        <Button variant="outline" size="sm" asChild className={darkBg ? 'border-slate-500 text-slate-200' : ''}>
          <span>
            <Upload className="w-3 h-3 mr-1" />
            {uploading[field] ? 'Uploading...' : 'Upload'}
          </span>
        </Button>
        <input type="file" accept="image/*" className="hidden"
          onChange={e => handleUpload(field, e.target.files[0])}
          disabled={uploading[field]} />
      </label>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-64 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900">Operator Profile</h1>
          <p className="text-slate-600 mt-1">Manage your business profile, branding, and payment settings</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700 gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="territory">Territory</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* ── BRANDING ── */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Company Logos</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <LogoUploader field="logo_dark" label="Dark Logo (for light backgrounds)" darkBg={false} />
              <LogoUploader field="logo_light" label="Light Logo (for dark backgrounds)" darkBg={true} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Profile / Headshot Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {form.profile_image_url
                  ? <img src={form.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                  : <Building2 className="w-10 h-10 text-slate-300" />}
              </div>
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span><Upload className="w-4 h-4 mr-2" />{uploading.profile_image_url ? 'Uploading...' : 'Upload Photo'}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => handleUpload('profile_image_url', e.target.files[0])}
                  disabled={uploading.profile_image_url} />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Name & Tagline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Legacy Lane Estate Sales" />
              </div>
              <div>
                <Label>Tagline / Slogan</Label>
                <Input value={form.company_tagline} onChange={e => setForm({ ...form, company_tagline: e.target.value })} placeholder="Honoring Your Legacy, One Sale at a Time" />
              </div>
              <div>
                <Label>Company Description</Label>
                <Textarea value={form.company_description} onChange={e => setForm({ ...form, company_description: e.target.value })}
                  rows={5} placeholder="Tell customers about your company, your approach, and what makes you unique..." />
                <p className="text-xs text-slate-500 mt-1">{form.company_description.length} characters</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMPANY ── */}
        <TabsContent value="company" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Business Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Street Address</Label>
                <Input value={form.business_address_street} onChange={e => setForm({ ...form, business_address_street: e.target.value })} placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Label>City</Label>
                  <Input value={form.business_address_city} onChange={e => setForm({ ...form, business_address_city: e.target.value })} placeholder="Springfield" />
                </div>
                <div>
                  <Label>State</Label>
                  <select value={form.business_address_state} onChange={e => setForm({ ...form, business_address_state: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option value="">Select</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input value={form.business_address_zip} onChange={e => setForm({ ...form, business_address_zip: e.target.value })} placeholder="62701" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" /> Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Primary Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label>Secondary Phone</Label>
                <Input value={form.phone_secondary} onChange={e => setForm({ ...form, phone_secondary: e.target.value })} placeholder="(555) 987-6543" />
              </div>
              <div>
                <Label>Business Email</Label>
                <Input value={form.company_email} onChange={e => setForm({ ...form, company_email: e.target.value })} placeholder="info@yourcompany.com" type="email" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://yourcompany.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Credentials & Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>License Number</Label>
                  <Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} placeholder="State license #" />
                </div>
                <div>
                  <Label>Years in Business</Label>
                  <Input type="number" value={form.years_in_business} onChange={e => setForm({ ...form, years_in_business: e.target.value })} placeholder="10" />
                </div>
                <div>
                  <Label>Year Founded</Label>
                  <Input type="number" value={form.founded_year} onChange={e => setForm({ ...form, founded_year: e.target.value })} placeholder="2010" />
                </div>
                <div>
                  <Label>Standard Commission Rate (%)</Label>
                  <Input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} placeholder="35" />
                </div>
                <div>
                  <Label>Minimum Sale Value ($)</Label>
                  <Input type="number" value={form.minimum_sale_value} onChange={e => setForm({ ...form, minimum_sale_value: e.target.value })} placeholder="5000" />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.insurance_verified} onCheckedChange={v => setForm({ ...form, insurance_verified: v })} />
                  <span className="text-sm font-medium">Insured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.bonded} onCheckedChange={v => setForm({ ...form, bonded: v })} />
                  <span className="text-sm font-medium">Bonded</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TERRITORY ── */}
        <TabsContent value="territory" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Service States</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {US_STATES.map(s => (
                  <button key={s} type="button"
                    onClick={() => toggleArrayItem('service_states', s)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                      form.service_states.includes(s)
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                    }`}>{s}</button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Counties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newCounty} onChange={e => setNewCounty(e.target.value)}
                  placeholder="Add a county..." onKeyDown={e => { if (e.key === 'Enter') { addTag('service_counties', newCounty, setNewCounty); e.preventDefault(); } }} />
                <Button type="button" variant="outline" onClick={() => addTag('service_counties', newCounty, setNewCounty)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.service_counties.map(county => (
                  <Badge key={county} variant="secondary" className="gap-1 pr-1">
                    {county}
                    <button onClick={() => removeTag('service_counties', county)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Cities / Towns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newCity} onChange={e => setNewCity(e.target.value)}
                  placeholder="Add a city or town..." onKeyDown={e => { if (e.key === 'Enter') { addTag('service_cities', newCity, setNewCity); e.preventDefault(); } }} />
                <Button type="button" variant="outline" onClick={() => addTag('service_cities', newCity, setNewCity)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.service_cities.map(city => (
                  <Badge key={city} variant="secondary" className="gap-1 pr-1">
                    {city}
                    <button onClick={() => removeTag('service_cities', city)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="mt-4">
                <Label>Max Travel Radius (miles)</Label>
                <Input type="number" className="max-w-xs mt-1" value={form.service_radius_miles}
                  onChange={e => setForm({ ...form, service_radius_miles: e.target.value })} placeholder="50" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SERVICES ── */}
        <TabsContent value="services" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-2">
                {SERVICE_OPTIONS.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                    <Checkbox checked={form.services_offered.includes(s)} onCheckedChange={() => toggleArrayItem('services_offered', s)} />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><Star className="w-4 h-4 inline mr-1" />Specialties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SPECIALTY_OPTIONS.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                    <Checkbox checked={form.specialties.includes(s)} onCheckedChange={() => toggleArrayItem('specialties', s)} />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PAYMENTS ── */}
        <TabsContent value="payments" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Default Payment Methods Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">Select all payment methods your business accepts. These will be the default for all your items, but you can override per item when listing.</p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <Checkbox
                      checked={form.payment_methods_accepted.includes(opt.value)}
                      onCheckedChange={() => toggleArrayItem('payment_methods_accepted', opt.value)}
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment Account Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Venmo Username</Label>
                  <Input value={form.venmo_username} onChange={e => setForm({ ...form, venmo_username: e.target.value })} placeholder="@YourVenmo" />
                </div>
                <div>
                  <Label>PayPal Email</Label>
                  <Input value={form.paypal_email} onChange={e => setForm({ ...form, paypal_email: e.target.value })} placeholder="paypal@email.com" type="email" />
                </div>
                <div>
                  <Label>Zelle Phone or Email</Label>
                  <Input value={form.zelle_phone_or_email} onChange={e => setForm({ ...form, zelle_phone_or_email: e.target.value })} placeholder="(555) 123-4567 or email" />
                </div>
                <div>
                  <Label>Cash App Tag</Label>
                  <Input value={form.cashapp_tag} onChange={e => setForm({ ...form, cashapp_tag: e.target.value })} placeholder="$YourCashTag" />
                </div>
                <div>
                  <Label>Stripe Account ID</Label>
                  <Input value={form.stripe_account_id} onChange={e => setForm({ ...form, stripe_account_id: e.target.value })} placeholder="acct_xxxxxxxxxxxx" />
                </div>
                <div>
                  <Label>Square Location ID</Label>
                  <Input value={form.square_location_id} onChange={e => setForm({ ...form, square_location_id: e.target.value })} placeholder="Square location ID" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Venmo QR Code</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">Upload your Venmo QR code to display at checkout so customers can scan and pay easily.</p>
              {form.venmo_qr_code && (
                <div className="flex justify-center">
                  <img src={form.venmo_qr_code} alt="Venmo QR" className="w-48 h-48 object-contain border-2 border-slate-200 rounded-lg p-3 bg-white" />
                </div>
              )}
              <div className="flex gap-3">
                <label className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span><Upload className="w-4 h-4 mr-2" />{uploading.venmo_qr_code ? 'Uploading...' : form.venmo_qr_code ? 'Change QR Code' : 'Upload QR Code'}</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleUpload('venmo_qr_code', e.target.files[0])}
                    disabled={uploading.venmo_qr_code} />
                </label>
                {form.venmo_qr_code && (
                  <Button variant="ghost" className="text-red-600" onClick={() => setForm({ ...form, venmo_qr_code: '' })}>Remove</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}