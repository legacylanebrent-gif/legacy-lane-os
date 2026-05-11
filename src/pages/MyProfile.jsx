import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPageUrl } from '@/utils';
import SharedFooter from '@/components/layout/SharedFooter';
import { Link } from 'react-router-dom';
import {
  User, Building2, Bell, CreditCard, Save, Upload, Check,
  ArrowUpCircle, ArrowDownCircle, Home, Eye, Calendar, ArrowRight,
  ShoppingBag, Share2, MapPin, Globe, Shield, Star,
  Image as ImageIcon, X, Plus, Mail, MessageSquare, Megaphone, Store
} from 'lucide-react';
import SocialMediaTab from '@/components/profile/SocialMediaTab';
import { getSaleDisplayStatus } from '@/components/estate/getSaleDisplayStatus';
import MarketplaceCredentialsTab from '@/components/profile/MarketplaceCredentialsTab';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' }, { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit/Debit Card' }, { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' }, { value: 'zelle', label: 'Zelle' },
  { value: 'cashapp', label: 'Cash App' }, { value: 'stripe', label: 'Stripe' },
  { value: 'square', label: 'Square' }, { value: 'other', label: 'Other' },
];

const SPECIALTY_OPTIONS = [
  'Antiques','Art & Paintings','Books & Media','China & Porcelain','Clocks & Watches',
  'Clothing & Accessories','Coins & Currency','Collectibles','Electronics','Firearms',
  'Furniture','Garden & Outdoor','Glassware & Crystal','Holiday & Seasonal','Jewelry',
  'Kitchen & Dining','Lighting & Lamps','Mid-Century Modern','Musical Instruments',
  'Rugs & Textiles','Sporting Goods','Tools & Hardware','Toys & Games','Vehicles',
  'Victorian Era','Vintage Fashion','Wine & Spirits'
];

const SERVICE_OPTIONS = [
  'Full Estate Sales','Online-Only Auctions','On-Site Auctions','Buyout / Cleanout',
  'Moving Sales','Estate Appraisals','Consignment','Donation Management',
  'Photography & Catalog','Staging & Setup','Online Listing',
  'Senior Transition Services','Business Liquidations','Storage Unit Sales'
];

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [packages, setPackages] = useState([]);
  const [estateSales, setEstateSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [marketplaceTab, setMarketplaceTab] = useState('social');
  const [uploading, setUploading] = useState({});
  const [newCounty, setNewCounty] = useState('');
  const [newCity, setNewCity] = useState('');

  const [form, setForm] = useState({
    // personal
    full_name: '', email: '', phone: '', address_zip: '',
    early_sign_in_default: true,
    // business / branding
    company_name: '', company_tagline: '', company_description: '',
    phone_secondary: '', company_email: '', website_url: '',
    business_address_street: '', business_address_city: '',
    business_address_state: '', business_address_zip: '',
    years_in_business: '', founded_year: '', license_number: '',
    insurance_verified: false, bonded: false,
    commission_rate: '', minimum_sale_value: '',
    // territory
    service_radius_miles: '', service_states: [],
    service_counties: [], service_cities: [],
    specialties: [], services_offered: [],
    // payments
    payment_methods_accepted: ['cash'],
    venmo_username: '', paypal_email: '', zelle_phone_or_email: '',
    cashapp_tag: '', stripe_account_id: '', square_location_id: '',
    // media
    logo_dark: '', logo_light: '', profile_image_url: '', venmo_qr_code: '',
  });

  const [notifications, setNotifications] = useState({
    email_new_leads: true, email_new_messages: true,
    email_sale_reminders: true, email_marketing_updates: false,
    sms_new_leads: false, sms_new_messages: true, sms_sale_reminders: true
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      setForm(prev => ({
        ...prev,
        full_name: u.full_name || '', email: u.email || '',
        phone: u.phone || '', address_zip: u.address_zip || '',
        early_sign_in_default: u.early_sign_in_default !== false,
        company_name: u.company_name || '', company_tagline: u.company_tagline || '',
        company_description: u.company_description || '',
        phone_secondary: u.phone_secondary || '', company_email: u.company_email || '',
        website_url: u.website_url || u.company_website || '',
        business_address_street: u.business_address_street || '',
        business_address_city: u.business_address_city || '',
        business_address_state: u.business_address_state || '',
        business_address_zip: u.business_address_zip || '',
        years_in_business: u.years_in_business || '', founded_year: u.founded_year || '',
        license_number: u.license_number || '',
        insurance_verified: u.insurance_verified || false, bonded: u.bonded || false,
        commission_rate: u.commission_rate || '', minimum_sale_value: u.minimum_sale_value || '',
        service_radius_miles: u.service_radius_miles || '',
        service_states: u.service_states || [], service_counties: u.service_counties || [],
        service_cities: u.service_cities || [], specialties: u.specialties || [],
        services_offered: u.services_offered || [],
        payment_methods_accepted: u.payment_methods_accepted || ['cash'],
        venmo_username: u.venmo_username || '', paypal_email: u.paypal_email || '',
        zelle_phone_or_email: u.zelle_phone_or_email || '',
        cashapp_tag: u.cashapp_tag || '', stripe_account_id: u.stripe_account_id || '',
        square_location_id: u.square_location_id || '',
        logo_dark: u.logo_dark || '', logo_light: u.logo_light || '',
        profile_image_url: u.profile_image_url || '', venmo_qr_code: u.venmo_qr_code || '',
      }));
      if (u.notification_settings) setNotifications(prev => ({ ...prev, ...u.notification_settings }));

      const [subs, pkgs, purchases] = await Promise.all([
        base44.entities.Subscription.filter({ user_id: u.id }),
        u.primary_account_type ? base44.entities.SubscriptionPackage.filter({ account_type: u.primary_account_type, is_active: true }) : Promise.resolve([]),
        base44.entities.Transaction.filter({ created_by: u.email }),
      ]);

      if (subs.length) setSubscription(subs[0]);
      setPackages(pkgs.sort((a, b) => ({ basic: 1, pro: 2, premium: 3 }[a.tier_level] - { basic: 1, pro: 2, premium: 3 }[b.tier_level])));
      setPurchases(purchases);

      const acct = u.primary_account_type || 'consumer';
      const isConsumer = ['consumer','executor','home_seller','buyer','downsizer','diy_seller','consignor'].includes(acct) || !acct;
      const isTeam = ['team_admin','team_member','team_marketer'].includes(acct);
      if (!isConsumer) {
        const opId = isTeam ? u.operator_id : u.id;
        if (opId) setEstateSales(await base44.entities.EstateSale.filter({ operator_id: opId }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ ...form, notification_settings: notifications });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert('Failed to save: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading(p => ({ ...p, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, [field]: file_url }));
      await base44.auth.updateMe({ [field]: file_url });
    } catch (e) { alert('Upload failed'); }
    finally { setUploading(p => ({ ...p, [field]: false })); }
  };

  const toggleArr = (field, value) =>
    setForm(p => ({ ...p, [field]: (p[field] || []).includes(value) ? p[field].filter(v => v !== value) : [...(p[field] || []), value] }));

  const addTag = (field, value, clear) => {
    const t = value.trim(); if (!t) return;
    setForm(p => ({ ...p, [field]: [...new Set([...(p[field] || []), t])] }));
    clear('');
  };
  const removeTag = (field, value) => setForm(p => ({ ...p, [field]: p[field].filter(v => v !== value) }));

  const getTierColor = (tier) => ({ basic: 'bg-slate-100 text-slate-700', pro: 'bg-cyan-100 text-cyan-700', premium: 'bg-orange-100 text-orange-700' }[tier] || 'bg-slate-100 text-slate-700');

  const SaveBtn = ({ label = 'Save Changes' }) => (
    <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
      <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : label}
    </Button>
  );

  const LogoUploader = ({ field, label, darkBg }) => (
    <div className={`rounded-xl p-5 border-2 border-dashed ${darkBg ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
      <p className={`text-sm font-semibold mb-3 ${darkBg ? 'text-slate-200' : 'text-slate-700'}`}>{label}</p>
      {form[field] ? (
        <div className="relative inline-block">
          <img src={form[field]} alt={label} className={`h-20 object-contain rounded-lg ${darkBg ? 'bg-slate-700 p-2' : 'bg-white p-2 border'}`} />
          <button onClick={() => setForm(p => ({ ...p, [field]: '' }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-center h-20 rounded-lg ${darkBg ? 'bg-slate-700' : 'bg-white border border-slate-200'}`}>
          <ImageIcon className={`w-8 h-8 ${darkBg ? 'text-slate-500' : 'text-slate-300'}`} />
        </div>
      )}
      <label className="mt-3 block cursor-pointer">
        <Button variant="outline" size="sm" asChild className={darkBg ? 'border-slate-500 text-slate-200 mt-2' : 'mt-2'}>
          <span><Upload className="w-3 h-3 mr-1" />{uploading[field] ? 'Uploading...' : 'Upload'}</span>
        </Button>
        <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(field, e.target.files[0])} disabled={uploading[field]} />
      </label>
    </div>
  );

  if (loading) return (
    <div className="p-8 animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-1/4" />
      <div className="h-96 bg-slate-200 rounded" />
    </div>
  );

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const acct = user?.primary_account_type || 'consumer';
  const isConsumer = ['consumer','executor','home_seller','buyer','downsizer','diy_seller','consignor'].includes(acct) || !acct;
  const isReseller = acct === 'reseller';

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 pb-32 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account, business settings, and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto w-full mb-6 justify-start bg-transparent p-0">
          <TabsTrigger value="account" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Account</TabsTrigger>
          {!isConsumer && <TabsTrigger value="business" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Business</TabsTrigger>}
          {!isConsumer && !isReseller && <TabsTrigger value="territory" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Territory & Services</TabsTrigger>}
          {!isConsumer && !isReseller && <TabsTrigger value="payments" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Payments</TabsTrigger>}
          {!isConsumer && !isReseller && <TabsTrigger value="sales" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">My Sales</TabsTrigger>}
          {!isConsumer && !isReseller && <TabsTrigger value="marketplace" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Social & Marketplaces</TabsTrigger>}
          {!isConsumer && isReseller && subscription?.tier === 'pro' && <TabsTrigger value="marketplace" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Social & Marketplaces</TabsTrigger>}
          {!isConsumer && <TabsTrigger value="subscription" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Subscription</TabsTrigger>}
        </TabsList>

        {/* ─────────────── ACCOUNT TAB ─────────────── */}
        <TabsContent value="account" className="space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 flex-shrink-0">
                  <AvatarImage src={form.profile_image_url} />
                  <AvatarFallback className="bg-orange-600 text-white text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Upload className="w-4 h-4 mr-2" />{uploading.profile_image_url ? 'Uploading...' : 'Change Photo'}</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload('profile_image_url', e.target.files[0])} />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG or GIF. Max 5MB</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={form.email} disabled className="bg-slate-50" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" /></div>
                <div><Label>ZIP Code</Label><Input value={form.address_zip} onChange={e => setForm(p => ({ ...p, address_zip: e.target.value }))} placeholder="12345" maxLength="5" /></div>
              </div>

            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notifications</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Email col */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Email</h4>
                  </div>
                  <div className="space-y-3">
                    {!isConsumer && (
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">New Leads</Label>
                        <Switch checked={notifications.email_new_leads} onCheckedChange={v => setNotifications(p => ({ ...p, email_new_leads: v }))} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">New Messages</Label>
                      <Switch checked={notifications.email_new_messages} onCheckedChange={v => setNotifications(p => ({ ...p, email_new_messages: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Sale Reminders</Label>
                      <Switch checked={notifications.email_sale_reminders} onCheckedChange={v => setNotifications(p => ({ ...p, email_sale_reminders: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Marketing</Label>
                      <Switch checked={notifications.email_marketing_updates} onCheckedChange={v => setNotifications(p => ({ ...p, email_marketing_updates: v }))} />
                    </div>
                  </div>
                </div>
                {/* SMS col */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">SMS / Text</h4>
                  </div>
                  <div className="space-y-3">
                    {!isConsumer && (
                      <div className="flex items-center justify-between">
                        <Label className="font-normal">New Leads</Label>
                        <Switch checked={notifications.sms_new_leads} onCheckedChange={v => setNotifications(p => ({ ...p, sms_new_leads: v }))} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">New Messages</Label>
                      <Switch checked={notifications.sms_new_messages} onCheckedChange={v => setNotifications(p => ({ ...p, sms_new_messages: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Sale Reminders</Label>
                      <Switch checked={notifications.sms_sale_reminders} onCheckedChange={v => setNotifications(p => ({ ...p, sms_sale_reminders: v }))} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Purchases summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />My Purchases</div>
                <Link to={createPageUrl('MyPurchases')}>
                  <Button variant="ghost" size="sm" className="text-orange-600">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-orange-50 rounded-lg"><div className="text-xl font-bold text-orange-700">{purchases.length}</div><div className="text-xs text-slate-500">Purchases</div></div>
                    <div className="text-center p-3 bg-cyan-50 rounded-lg"><div className="text-xl font-bold text-cyan-700">${purchases.reduce((s, p) => s + (p.price * p.quantity || 0), 0).toFixed(0)}</div><div className="text-xs text-slate-500">Total Spent</div></div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg"><div className="text-xl font-bold text-purple-700">{purchases.reduce((s, p) => s + (p.quantity || 0), 0)}</div><div className="text-xs text-slate-500">Items</div></div>
                  </div>
                  <div className="space-y-2">
                    {purchases.slice(0, 3).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div><p className="text-sm font-medium">{p.item_name}</p><p className="text-xs text-slate-400">{new Date(p.created_date).toLocaleDateString()}</p></div>
                        <div className="text-right"><p className="font-semibold text-green-600 text-sm">${(p.price * p.quantity).toFixed(2)}</p><p className="text-xs text-slate-400">{p.quantity}x @ ${p.price}</p></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm mb-3">No purchases recorded yet</p>
                  <Link to={createPageUrl('RecordPurchase')}><Button size="sm" className="bg-orange-600 hover:bg-orange-700">Record First Purchase</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reseller Application — show based on state */}
          {acct === 'reseller' ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800 text-sm">Reseller Account Active</p>
                <p className="text-xs text-green-600">You have full reseller access including buyout opportunities and the reseller dashboard.</p>
              </div>
              <Badge className="ml-auto bg-green-600 text-white">Approved</Badge>
            </div>
          ) : isConsumer && user?.reseller_application_submitted ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-blue-900">Reseller Application</h3>
                      <Badge className="bg-blue-500 text-white text-xs">Pending Review</Badge>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your application has been submitted and is currently under review. Our team will upgrade your account within 1–2 business days.
                    </p>
                    {user?.reseller_application_date && (
                      <p className="text-xs text-blue-500 mt-2">Submitted {new Date(user.reseller_application_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isConsumer ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">Become a Reseller</h3>
                    <p className="text-sm text-amber-700 mb-3">
                      Resellers get access to estate sale buyout opportunities, early access to bulk lots, and a dedicated reseller dashboard. Apply to upgrade your account today.
                    </p>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                      onClick={async () => {
                        const confirmed = window.confirm('Apply to become a Reseller? Our team will review your application and upgrade your account within 1–2 business days.');
                        if (!confirmed) return;
                        try {
                          await base44.auth.updateMe({ reseller_application_submitted: true, reseller_application_date: new Date().toISOString() });
                          await base44.functions.invoke('notifyAdminsOfApplication', {
                            applicant_user_id: user?.id,
                            applicant_name: user?.full_name,
                            applicant_email: user?.email,
                            application_type: 'reseller',
                            details: null,
                          });
                          await base44.entities.Notification.create({
                            user_id: user?.id,
                            type: 'system',
                            title: '✅ Reseller Application Received',
                            message: 'Your application to become a Reseller has been submitted. Our team will review it and be in touch within 1–2 business days.',
                            link_to_page: 'MyProfile',
                            read: false,
                          });
                          setUser(prev => ({ ...prev, reseller_application_submitted: true, reseller_application_date: new Date().toISOString() }));
                          alert('✅ Application submitted! Our team will review it and be in touch within 1–2 business days.');
                        } catch (e) {
                          alert('Something went wrong. Please try again.');
                        }
                      }}
                    >
                      <Store className="w-4 h-4" />
                      Apply to Become a Reseller
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <SaveBtn label="Save Account" />
        </TabsContent>

        {/* ─────────────── BUSINESS TAB ─────────────── */}
        {!isConsumer && (
          <TabsContent value="business" className="space-y-6">
            {/* Branding */}
            <Card>

              <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5" />Branding</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid md:grid-cols-2 gap-6">
                  <LogoUploader field="logo_dark" label="Logo (light bg)" darkBg={false} />
                  <LogoUploader field="logo_light" label="Logo (dark bg)" darkBg={true} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Legacy Lane Estate Sales" /></div>
                  <div><Label>Tagline / Slogan</Label><Input value={form.company_tagline} onChange={e => setForm(p => ({ ...p, company_tagline: e.target.value }))} placeholder="Honoring Your Legacy..." /></div>
                </div>
                <div>
                  <Label>Company Description</Label>
                  <Textarea value={form.company_description} onChange={e => setForm(p => ({ ...p, company_description: e.target.value }))} rows={4} placeholder="Tell customers about your company..." />
                  <p className="text-xs text-slate-400 mt-1">{form.company_description.length} characters</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Address */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Contact & Address</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Primary Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" /></div>
                  <div><Label>Secondary Phone</Label><Input value={form.phone_secondary} onChange={e => setForm(p => ({ ...p, phone_secondary: e.target.value }))} placeholder="(555) 987-6543" /></div>
                  <div><Label>Business Email</Label><Input value={form.company_email} onChange={e => setForm(p => ({ ...p, company_email: e.target.value }))} placeholder="info@company.com" type="email" /></div>
                  <div><Label>Website</Label><Input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://yourcompany.com" /></div>
                </div>
                <div className="pt-2 border-t">
                  <Label className="text-slate-600 text-xs uppercase tracking-wide mb-3 block">Business Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-4"><Input value={form.business_address_street} onChange={e => setForm(p => ({ ...p, business_address_street: e.target.value }))} placeholder="Street Address" /></div>
                    <div className="md:col-span-2"><Input value={form.business_address_city} onChange={e => setForm(p => ({ ...p, business_address_city: e.target.value }))} placeholder="City" /></div>
                    <div>
                      <select value={form.business_address_state} onChange={e => setForm(p => ({ ...p, business_address_state: e.target.value }))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                        <option value="">State</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><Input value={form.business_address_zip} onChange={e => setForm(p => ({ ...p, business_address_zip: e.target.value }))} placeholder="ZIP" /></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credentials & Early Sign-In — not shown to resellers */}
            {!isReseller && (
              <>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Credentials & Business Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div><Label>License #</Label><Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} placeholder="State license" /></div>
                      <div><Label>Years in Business</Label><Input type="number" value={form.years_in_business} onChange={e => setForm(p => ({ ...p, years_in_business: e.target.value }))} placeholder="10" /></div>
                      <div><Label>Year Founded</Label><Input type="number" value={form.founded_year} onChange={e => setForm(p => ({ ...p, founded_year: e.target.value }))} placeholder="2010" /></div>
                      <div><Label>Commission Rate (%)</Label><Input type="number" value={form.commission_rate} onChange={e => setForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="35" /></div>
                      <div><Label>Min. Sale Value ($)</Label><Input type="number" value={form.minimum_sale_value} onChange={e => setForm(p => ({ ...p, minimum_sale_value: e.target.value }))} placeholder="5000" /></div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.insurance_verified} onCheckedChange={v => setForm(p => ({ ...p, insurance_verified: v }))} /><span className="text-sm font-medium">Insured</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.bonded} onCheckedChange={v => setForm(p => ({ ...p, bonded: v }))} /><span className="text-sm font-medium">Bonded</span></label>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Early Sign-In Default</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Enable Early Sign-In by Default</p>
                        <p className="text-xs text-slate-500 mt-0.5">Auto-enable early sign-in for new sales you create</p>
                      </div>
                      <Switch checked={form.early_sign_in_default !== false} onCheckedChange={v => setForm(p => ({ ...p, early_sign_in_default: v }))} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <SaveBtn label="Save Business Profile" />
          </TabsContent>
        )}

        {/* ─────────────── TERRITORY & SERVICES TAB ─────────────── */}
        {!isConsumer && !isReseller && (
          <TabsContent value="territory" className="space-y-6">
            {/* States */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Service Area</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="mb-2 block text-slate-600">States</Label>
                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                    {US_STATES.map(s => (
                      <button key={s} type="button" onClick={() => toggleArr('service_states', s)}
                        className={`px-1.5 py-1 rounded text-xs font-medium border transition-all ${form.service_states.includes(s) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5 pt-2 border-t">
                  <div>
                    <Label className="mb-2 block text-slate-600">Counties</Label>
                    <div className="flex gap-2 mb-2">
                      <Input value={newCounty} onChange={e => setNewCounty(e.target.value)} placeholder="Add county..." onKeyDown={e => { if (e.key === 'Enter') { addTag('service_counties', newCounty, setNewCounty); e.preventDefault(); } }} />
                      <Button type="button" variant="outline" size="sm" onClick={() => addTag('service_counties', newCounty, setNewCounty)}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.service_counties.map(c => (
                        <Badge key={c} variant="secondary" className="gap-1 pr-1 text-xs">{c}<button onClick={() => removeTag('service_counties', c)}><X className="w-3 h-3" /></button></Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-slate-600">Cities / Towns</Label>
                    <div className="flex gap-2 mb-2">
                      <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Add city..." onKeyDown={e => { if (e.key === 'Enter') { addTag('service_cities', newCity, setNewCity); e.preventDefault(); } }} />
                      <Button type="button" variant="outline" size="sm" onClick={() => addTag('service_cities', newCity, setNewCity)}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.service_cities.map(c => (
                        <Badge key={c} variant="secondary" className="gap-1 pr-1 text-xs">{c}<button onClick={() => removeTag('service_cities', c)}><X className="w-3 h-3" /></button></Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Max Travel Radius (miles)</Label>
                  <Input type="number" className="max-w-xs mt-1" value={form.service_radius_miles} onChange={e => setForm(p => ({ ...p, service_radius_miles: e.target.value }))} placeholder="50" />
                </div>
              </CardContent>
            </Card>

            {/* Services + Specialties side by side */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Services Offered</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {SERVICE_OPTIONS.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50">
                        <Checkbox checked={form.services_offered.includes(s)} onCheckedChange={() => toggleArr('services_offered', s)} />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-1"><Star className="w-4 h-4" />Specialties</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {SPECIALTY_OPTIONS.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50">
                        <Checkbox checked={form.specialties.includes(s)} onCheckedChange={() => toggleArr('specialties', s)} />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <SaveBtn label="Save Territory & Services" />
          </TabsContent>
        )}

        {/* ─────────────── PAYMENTS TAB ─────────────── */}
        {!isConsumer && !isReseller && (
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Accepted Payment Methods</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                      <Checkbox checked={form.payment_methods_accepted.includes(opt.value)} onCheckedChange={() => toggleArr('payment_methods_accepted', opt.value)} />
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
                  <div><Label>Venmo Username</Label><Input value={form.venmo_username} onChange={e => setForm(p => ({ ...p, venmo_username: e.target.value }))} placeholder="@YourVenmo" /></div>
                  <div><Label>PayPal Email</Label><Input value={form.paypal_email} onChange={e => setForm(p => ({ ...p, paypal_email: e.target.value }))} placeholder="paypal@email.com" type="email" /></div>
                  <div><Label>Zelle Phone or Email</Label><Input value={form.zelle_phone_or_email} onChange={e => setForm(p => ({ ...p, zelle_phone_or_email: e.target.value }))} placeholder="(555) 123-4567 or email" /></div>
                  <div><Label>Cash App Tag</Label><Input value={form.cashapp_tag} onChange={e => setForm(p => ({ ...p, cashapp_tag: e.target.value }))} placeholder="$YourCashTag" /></div>
                  <div><Label>Stripe Account ID</Label><Input value={form.stripe_account_id} onChange={e => setForm(p => ({ ...p, stripe_account_id: e.target.value }))} placeholder="acct_xxxxxxxxxxxx" /></div>
                  <div><Label>Square Location ID</Label><Input value={form.square_location_id} onChange={e => setForm(p => ({ ...p, square_location_id: e.target.value }))} placeholder="Square location ID" /></div>
                </div>
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Venmo QR Code</Label>
                  <div className="flex items-start gap-5">
                    {form.venmo_qr_code && (
                      <img src={form.venmo_qr_code} alt="Venmo QR" className="w-28 h-28 object-contain border rounded-lg p-2 bg-white" />
                    )}
                    <div>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span><Upload className="w-4 h-4 mr-2" />{uploading.venmo_qr_code ? 'Uploading...' : form.venmo_qr_code ? 'Change QR' : 'Upload QR Code'}</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload('venmo_qr_code', e.target.files[0])} disabled={uploading.venmo_qr_code} />
                      </label>
                      {form.venmo_qr_code && <Button variant="ghost" size="sm" className="text-red-500 ml-2" onClick={() => setForm(p => ({ ...p, venmo_qr_code: '' }))}>Remove</Button>}
                      <p className="text-xs text-slate-400 mt-1">Displayed at checkout for customers to scan</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SaveBtn label="Save Payment Settings" />
          </TabsContent>
        )}

        {/* ─────────────── MY SALES TAB ─────────────── */}
        {!isConsumer && !isReseller && (
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Home className="w-5 h-5" />My Estate Sales</CardTitle></CardHeader>
              <CardContent>
                {estateSales.length > 0 ? (
                  <>
                    {subscription && (
                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-r from-orange-50 to-cyan-50 rounded-lg">
                        <div className="text-center"><div className="text-xl font-bold">{estateSales.length}</div><div className="text-xs text-slate-500">Total Sales</div></div>
                        <div className="text-center"><div className="text-xl font-bold text-cyan-700">{estateSales.reduce((s, x) => s + (x.views || 0), 0)}</div><div className="text-xs text-slate-500">Views</div></div>
                        <div className="text-center"><div className="text-xl font-bold text-green-700">${estateSales.reduce((s, x) => s + (x.actual_revenue || 0), 0).toLocaleString()}</div><div className="text-xs text-slate-500">Revenue</div></div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {estateSales.map(sale => (
                        <Link key={sale.id} to={createPageUrl('MySales')} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-sm">{sale.title}</p>
                            <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                              {sale.property_address?.city && <span><MapPin className="w-3 h-3 inline mr-0.5" />{sale.property_address.city}, {sale.property_address.state}</span>}
                              {sale.sale_dates?.[0]?.date && <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(sale.sale_dates[0].date).toLocaleDateString()}</span>}
                              <span><Eye className="w-3 h-3 inline mr-0.5" />{sale.views || 0}</span>
                            </div>
                          </div>
                          {(() => { const ds = getSaleDisplayStatus(sale); return <Badge className={ds === 'active' ? 'bg-green-100 text-green-700' : ds === 'upcoming' ? 'bg-blue-100 text-blue-700' : ds === 'completed' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}>{ds}</Badge>; })()}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Home className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm mb-3">No estate sales yet</p>
                    <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700"><Link to={createPageUrl('MySales')}>Create First Sale</Link></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─────────────── SOCIAL & MARKETPLACES TAB ─────────────── */}
        {!isConsumer && (!isReseller || subscription?.tier === 'pro') && (
          <TabsContent value="marketplace" className="space-y-4">
            <div className="flex gap-2 border-b pb-3">
              {['social','etsy','ebay'].map(t => (
                <button key={t} onClick={() => setMarketplaceTab(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${marketplaceTab === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {t === 'social' ? 'Social Media' : t === 'etsy' ? '🧶 Etsy' : '🛍️ eBay'}
                </button>
              ))}
            </div>
            {marketplaceTab === 'social' && <SocialMediaTab user={user} />}
            {marketplaceTab === 'etsy' && <MarketplaceCredentialsTab platform="etsy" />}
            {marketplaceTab === 'ebay' && <MarketplaceCredentialsTab platform="ebay" />}
          </TabsContent>
        )}

        {/* ─────────────── SUBSCRIPTION TAB ─────────────── */}
        {!isConsumer && (
          <TabsContent value="subscription" className="space-y-4">
            {subscription && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Check className="w-5 h-5 text-green-600" />Current Plan</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">{subscription.plan_type.replace(/_/g, ' ').replace(/\boperator\b/gi, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())}</h3>
                      <Badge className={getTierColor(subscription.tier)}>{subscription.tier.replace(/\b\w/g, c => c.toUpperCase())} Tier</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900">${subscription.price}</div>
                      <div className="text-sm text-slate-500">per {subscription.billing_period === 'monthly' ? 'month' : 'year'}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" />Status: <Badge variant="outline" className="text-green-600">{subscription.status}</Badge></div>
                    {subscription.renewal_date && <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" />Renews {new Date(subscription.renewal_date).toLocaleDateString()}</div>}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>Available Plans</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {packages.map(pkg => {
                    const isCurrent = subscription?.tier === pkg.tier_level;
                    return (
                      <Card key={pkg.id} className={`relative ${isCurrent ? 'border-2 border-orange-500' : ''}`}>
                        {isCurrent && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600">Current Plan</Badge>}
                        <CardContent className="p-5">
                          <div className="text-center mb-4">
                            <Badge className={getTierColor(pkg.tier_level)}>{pkg.tier_level}</Badge>
                            <h3 className="text-lg font-bold mt-2 mb-1">{pkg.package_name}</h3>
                            <p className="text-xs text-slate-500 mb-3">{pkg.description}</p>
                            <div className="text-2xl font-bold">${pkg.monthly_price}</div>
                            <div className="text-xs text-slate-500">per month</div>
                            {pkg.annual_price && <div className="text-xs text-cyan-600 mt-1">${pkg.annual_price}/yr</div>}
                          </div>
                          <div className="space-y-1.5 mb-4">
                            {pkg.features?.slice(0, 5).map((f, i) => <div key={i} className="flex gap-2 text-xs"><Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" /><span className="text-slate-600">{f}</span></div>)}
                            {pkg.features?.length > 5 && <p className="text-xs text-slate-400">+{pkg.features.length - 5} more</p>}
                          </div>
                          {!isCurrent && (
                            <Button size="sm" className="w-full" variant={pkg.tier_level === 'premium' ? 'default' : 'outline'}>
                              {subscription && pkg.tier_level === 'premium' ? <><ArrowUpCircle className="w-3.5 h-3.5 mr-1" />Upgrade</> : subscription && pkg.tier_level === 'basic' ? <><ArrowDownCircle className="w-3.5 h-3.5 mr-1" />Downgrade</> : 'Select Plan'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {packages.length === 0 && <p className="text-center text-slate-500 py-8">No subscription packages available.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      </div>
      <SharedFooter />
    </div>
  );
}