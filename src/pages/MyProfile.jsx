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
import { Link } from 'react-router-dom';
import {
  User, Building2, Bell, CreditCard, Save, Upload, Check,
  ArrowUpCircle, ArrowDownCircle, Home, Eye, Calendar, ArrowRight,
  ShoppingBag, Share2, MapPin, Phone, Globe, Shield, Star,
  Image as ImageIcon, X, Plus
} from 'lucide-react';
import SocialMediaTab from '@/components/profile/SocialMediaTab';
import MarketplaceCredentialsTab from '@/components/profile/MarketplaceCredentialsTab';

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

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [packages, setPackages] = useState([]);
  const [estateSales, setEstateSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [uploading, setUploading] = useState({});
  const [newCounty, setNewCounty] = useState('');
  const [newCity, setNewCity] = useState('');

  const [profileData, setProfileData] = useState({
    full_name: '', email: '', phone: '', address_zip: '',
    early_sign_in_default: true,
  });

  const [bizForm, setBizForm] = useState({
    company_name: '', company_tagline: '', company_description: '',
    phone: '', phone_secondary: '', company_email: '', website_url: '',
    business_address_street: '', business_address_city: '',
    business_address_state: '', business_address_zip: '',
    years_in_business: '', founded_year: '', license_number: '',
    insurance_verified: false, bonded: false, commission_rate: '',
    minimum_sale_value: '', service_radius_miles: '',
    service_states: [], service_counties: [], service_cities: [],
    specialties: [], services_offered: [],
    payment_methods_accepted: ['cash'],
    venmo_username: '', paypal_email: '', zelle_phone_or_email: '',
    cashapp_tag: '', stripe_account_id: '', square_location_id: '',
    logo_dark: '', logo_light: '', profile_image_url: '', venmo_qr_code: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_new_leads: true, email_new_messages: true,
    email_sale_reminders: true, email_marketing_updates: false,
    sms_new_leads: false, sms_new_messages: true, sms_sale_reminders: true
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      setProfileData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address_zip: userData.address_zip || '',
        early_sign_in_default: userData.early_sign_in_default !== false,
      });

      setBizForm(prev => ({
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

      if (userData.notification_settings) {
        setNotificationSettings(prev => ({ ...prev, ...userData.notification_settings }));
      }

      const subscriptions = await base44.entities.Subscription.filter({ user_id: userData.id });
      if (subscriptions.length > 0) setSubscription(subscriptions[0]);

      const accountType = userData.primary_account_type;
      if (accountType) {
        const pkgs = await base44.entities.SubscriptionPackage.filter({ account_type: accountType, is_active: true });
        setPackages(pkgs.sort((a, b) => ({ basic: 1, pro: 2, premium: 3 }[a.tier_level] - { basic: 1, pro: 2, premium: 3 }[b.tier_level])));
      }

      const userAccountType = userData.primary_account_type || 'consumer';
      const isConsumer = ['consumer','executor','home_seller','buyer','downsizer','diy_seller','consignor'].includes(userAccountType) || !userAccountType;
      const isTeamRole = ['team_admin','team_member','team_marketer'].includes(userAccountType);
      if (!isConsumer) {
        const operatorId = isTeamRole ? userData.operator_id : userData.id;
        if (operatorId) {
          const sales = await base44.entities.EstateSale.filter({ operator_id: operatorId });
          setEstateSales(sales);
        }
      }

      const userPurchases = await base44.entities.Transaction.filter({ created_by: userData.email });
      setPurchases(userPurchases);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(profileData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBiz = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(bizForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ notification_settings: notificationSettings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert('Failed to update notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBizForm(prev => ({ ...prev, [field]: file_url }));
      await base44.auth.updateMe({ [field]: file_url });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(prev => ({ ...prev, profile_image_url: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData(prev => ({ ...prev, profile_image_url: file_url }));
      setBizForm(prev => ({ ...prev, profile_image_url: file_url }));
      await base44.auth.updateMe({ profile_image_url: file_url });
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setUploading(prev => ({ ...prev, profile_image_url: false }));
    }
  };

  const toggleArrayItem = (field, value) => {
    setBizForm(prev => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const addTag = (field, value, clear) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBizForm(prev => ({ ...prev, [field]: [...new Set([...(prev[field] || []), trimmed])] }));
    clear('');
  };

  const removeTag = (field, value) => {
    setBizForm(prev => ({ ...prev, [field]: (prev[field] || []).filter(v => v !== value) }));
  };

  const getTierColor = (tier) => ({
    basic: 'bg-slate-100 text-slate-700 border-slate-300',
    pro: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    premium: 'bg-orange-100 text-orange-700 border-orange-300'
  }[tier] || 'bg-slate-100 text-slate-700');

  const LogoUploader = ({ field, label, darkBg }) => (
    <div className={`rounded-xl p-5 border-2 border-dashed ${darkBg ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
      <p className={`text-sm font-semibold mb-3 ${darkBg ? 'text-slate-200' : 'text-slate-700'}`}>{label}</p>
      {bizForm[field] ? (
        <div className="relative inline-block">
          <img src={bizForm[field]} alt={label} className={`h-20 object-contain rounded-lg ${darkBg ? 'bg-slate-700 p-2' : 'bg-white p-2 border'}`} />
          <button onClick={() => setBizForm(prev => ({ ...prev, [field]: '' }))}
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
          <span><Upload className="w-3 h-3 mr-1" />{uploading[field] ? 'Uploading...' : 'Upload'}</span>
        </Button>
        <input type="file" accept="image/*" className="hidden"
          onChange={e => handleUpload(field, e.target.files[0])} disabled={uploading[field]} />
      </label>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const accountType = user?.primary_account_type || 'consumer';
  const isConsumerType = ['consumer','executor','home_seller','buyer','downsizer','diy_seller','consignor'].includes(accountType) || !accountType;

  const tabCount = isConsumerType ? 2 : 9;

  return (
    <div className="p-6 lg:p-8 pb-32 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Profile</h1>
        <p className="text-slate-600">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`flex flex-wrap gap-1 h-auto max-w-5xl`}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {!isConsumerType && <TabsTrigger value="branding">Branding</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="company">Company</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="territory">Territory</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="services">Services</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="payments">Payments</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="sales">My Sales</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="subscription">Subscription</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="social" className="flex items-center gap-1"><Share2 className="w-3 h-3" />Social</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="etsy">🧶 Etsy</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="ebay">🛍️ eBay</TabsTrigger>}
        </TabsList>

        {/* ── PROFILE TAB ── */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={bizForm.profile_image_url || profileData.profile_image_url} />
                  <AvatarFallback className="bg-orange-600 text-white text-3xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Upload className="w-4 h-4 mr-2" />{uploading.profile_image_url ? 'Uploading...' : 'Upload Photo'}</span>
                    </Button>
                  </Label>
                  <input id="image-upload" type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG or GIF. Max 5MB</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={profileData.full_name} onChange={e => setProfileData({ ...profileData, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={profileData.email} disabled className="bg-slate-50" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input value={profileData.address_zip} onChange={e => setProfileData({ ...profileData, address_zip: e.target.value })} placeholder="12345" maxLength="5" />
                </div>
              </div>

              {!isConsumerType && (
                <div className="flex items-center justify-between border rounded-lg p-4 bg-slate-50">
                  <div>
                    <Label className="text-base font-medium">Early Sign-In Default</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Default setting for early sign-in on all new sales. You can override per sale.</p>
                  </div>
                  <Switch
                    checked={profileData.early_sign_in_default !== false}
                    onCheckedChange={checked => setProfileData({ ...profileData, early_sign_in_default: checked })}
                  />
                </div>
              )}

              <Button onClick={handleSaveProfile} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* My Purchases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />My Purchases</div>
                <Link to={createPageUrl('MyPurchases')}>
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">View All <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700">{purchases.length}</div>
                      <div className="text-sm text-slate-600">Total Purchases</div>
                    </div>
                    <div className="text-center p-4 bg-cyan-50 rounded-lg">
                      <div className="text-2xl font-bold text-cyan-700">${purchases.reduce((sum, p) => sum + (p.price * p.quantity || 0), 0).toFixed(0)}</div>
                      <div className="text-sm text-slate-600">Total Spent</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700">{purchases.reduce((sum, p) => sum + (p.quantity || 0), 0)}</div>
                      <div className="text-sm text-slate-600">Items Bought</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {purchases.slice(0, 3).map(purchase => (
                      <div key={purchase.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{purchase.item_name}</div>
                            <div className="text-xs text-slate-500">{new Date(purchase.created_date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">${(purchase.price * purchase.quantity).toFixed(2)}</div>
                          <div className="text-xs text-slate-500">{purchase.quantity}x @ ${purchase.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl('MyPurchases')}>
                    <Button variant="outline" className="w-full">View All Purchases <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No purchases recorded yet</p>
                  <Link to={createPageUrl('RecordPurchase')}>
                    <Button className="bg-orange-600 hover:bg-orange-700"><ShoppingBag className="w-4 h-4 mr-2" />Record Your First Purchase</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {!isConsumerType && (
                    <div className="flex items-center justify-between">
                      <div><Label className="text-base">New Leads</Label><p className="text-sm text-slate-500">Get notified when new leads come in</p></div>
                      <Switch checked={notificationSettings.email_new_leads} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, email_new_leads: v })} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div><Label className="text-base">New Messages</Label><p className="text-sm text-slate-500">Get notified about new messages</p></div>
                    <Switch checked={notificationSettings.email_new_messages} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, email_new_messages: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-base">Sale Reminders</Label><p className="text-sm text-slate-500">Reminders about upcoming sales</p></div>
                    <Switch checked={notificationSettings.email_sale_reminders} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, email_sale_reminders: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-base">Marketing Updates</Label><p className="text-sm text-slate-500">News, tips, and special offers</p></div>
                    <Switch checked={notificationSettings.email_marketing_updates} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, email_marketing_updates: v })} />
                  </div>
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">SMS Notifications</h3>
                <div className="space-y-4">
                  {!isConsumerType && (
                    <div className="flex items-center justify-between">
                      <div><Label className="text-base">New Leads</Label><p className="text-sm text-slate-500">Text alerts for new leads</p></div>
                      <Switch checked={notificationSettings.sms_new_leads} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, sms_new_leads: v })} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div><Label className="text-base">New Messages</Label><p className="text-sm text-slate-500">Text alerts for messages</p></div>
                    <Switch checked={notificationSettings.sms_new_messages} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, sms_new_messages: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-base">Sale Reminders</Label><p className="text-sm text-slate-500">SMS reminders about sales</p></div>
                    <Switch checked={notificationSettings.sms_sale_reminders} onCheckedChange={v => setNotificationSettings({ ...notificationSettings, sms_sale_reminders: v })} />
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveNotifications} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BRANDING TAB ── */}
        {!isConsumerType && (
          <TabsContent value="branding" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5" />Company Logos</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <LogoUploader field="logo_dark" label="Dark Logo (for light backgrounds)" darkBg={false} />
                <LogoUploader field="logo_light" label="Light Logo (for dark backgrounds)" darkBg={true} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Company Name & Tagline</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Company Name *</Label>
                  <Input value={bizForm.company_name} onChange={e => setBizForm({ ...bizForm, company_name: e.target.value })} placeholder="Legacy Lane Estate Sales" />
                </div>
                <div>
                  <Label>Tagline / Slogan</Label>
                  <Input value={bizForm.company_tagline} onChange={e => setBizForm({ ...bizForm, company_tagline: e.target.value })} placeholder="Honoring Your Legacy, One Sale at a Time" />
                </div>
                <div>
                  <Label>Company Description</Label>
                  <Textarea value={bizForm.company_description} onChange={e => setBizForm({ ...bizForm, company_description: e.target.value })} rows={5} placeholder="Tell customers about your company..." />
                  <p className="text-xs text-slate-500 mt-1">{bizForm.company_description.length} characters</p>
                </div>
                <Button onClick={handleSaveBiz} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── COMPANY TAB ── */}
        {!isConsumerType && (
          <TabsContent value="company" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Business Address</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Street Address</Label>
                  <Input value={bizForm.business_address_street} onChange={e => setBizForm({ ...bizForm, business_address_street: e.target.value })} placeholder="123 Main Street" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Label>City</Label>
                    <Input value={bizForm.business_address_city} onChange={e => setBizForm({ ...bizForm, business_address_city: e.target.value })} placeholder="Springfield" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <select value={bizForm.business_address_state} onChange={e => setBizForm({ ...bizForm, business_address_state: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                      <option value="">Select</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input value={bizForm.business_address_zip} onChange={e => setBizForm({ ...bizForm, business_address_zip: e.target.value })} placeholder="62701" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" />Contact Information</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div><Label>Primary Phone</Label><Input value={bizForm.phone} onChange={e => setBizForm({ ...bizForm, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
                <div><Label>Secondary Phone</Label><Input value={bizForm.phone_secondary} onChange={e => setBizForm({ ...bizForm, phone_secondary: e.target.value })} placeholder="(555) 987-6543" /></div>
                <div><Label>Business Email</Label><Input value={bizForm.company_email} onChange={e => setBizForm({ ...bizForm, company_email: e.target.value })} placeholder="info@yourcompany.com" type="email" /></div>
                <div><Label>Website</Label><Input value={bizForm.website_url} onChange={e => setBizForm({ ...bizForm, website_url: e.target.value })} placeholder="https://yourcompany.com" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Credentials & Business Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>License Number</Label><Input value={bizForm.license_number} onChange={e => setBizForm({ ...bizForm, license_number: e.target.value })} placeholder="State license #" /></div>
                  <div><Label>Years in Business</Label><Input type="number" value={bizForm.years_in_business} onChange={e => setBizForm({ ...bizForm, years_in_business: e.target.value })} placeholder="10" /></div>
                  <div><Label>Year Founded</Label><Input type="number" value={bizForm.founded_year} onChange={e => setBizForm({ ...bizForm, founded_year: e.target.value })} placeholder="2010" /></div>
                  <div><Label>Standard Commission Rate (%)</Label><Input type="number" value={bizForm.commission_rate} onChange={e => setBizForm({ ...bizForm, commission_rate: e.target.value })} placeholder="35" /></div>
                  <div><Label>Minimum Sale Value ($)</Label><Input type="number" value={bizForm.minimum_sale_value} onChange={e => setBizForm({ ...bizForm, minimum_sale_value: e.target.value })} placeholder="5000" /></div>
                </div>
                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={bizForm.insurance_verified} onCheckedChange={v => setBizForm({ ...bizForm, insurance_verified: v })} />
                    <span className="text-sm font-medium">Insured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={bizForm.bonded} onCheckedChange={v => setBizForm({ ...bizForm, bonded: v })} />
                    <span className="text-sm font-medium">Bonded</span>
                  </label>
                </div>
                <Button onClick={handleSaveBiz} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── TERRITORY TAB ── */}
        {!isConsumerType && (
          <TabsContent value="territory" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Service States</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {US_STATES.map(s => (
                    <button key={s} type="button" onClick={() => toggleArrayItem('service_states', s)}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-all ${bizForm.service_states.includes(s) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'}`}>{s}</button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Service Counties</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={newCounty} onChange={e => setNewCounty(e.target.value)} placeholder="Add a county..."
                    onKeyDown={e => { if (e.key === 'Enter') { addTag('service_counties', newCounty, setNewCounty); e.preventDefault(); } }} />
                  <Button type="button" variant="outline" onClick={() => addTag('service_counties', newCounty, setNewCounty)}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bizForm.service_counties.map(county => (
                    <Badge key={county} variant="secondary" className="gap-1 pr-1">{county}
                      <button onClick={() => removeTag('service_counties', county)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Service Cities / Towns</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Add a city or town..."
                    onKeyDown={e => { if (e.key === 'Enter') { addTag('service_cities', newCity, setNewCity); e.preventDefault(); } }} />
                  <Button type="button" variant="outline" onClick={() => addTag('service_cities', newCity, setNewCity)}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bizForm.service_cities.map(city => (
                    <Badge key={city} variant="secondary" className="gap-1 pr-1">{city}
                      <button onClick={() => removeTag('service_cities', city)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <Label>Max Travel Radius (miles)</Label>
                  <Input type="number" className="max-w-xs mt-1" value={bizForm.service_radius_miles} onChange={e => setBizForm({ ...bizForm, service_radius_miles: e.target.value })} placeholder="50" />
                </div>
                <Button onClick={handleSaveBiz} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── SERVICES TAB ── */}
        {!isConsumerType && (
          <TabsContent value="services" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle>Services Offered</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                      <Checkbox checked={bizForm.services_offered.includes(s)} onCheckedChange={() => toggleArrayItem('services_offered', s)} />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle><Star className="w-4 h-4 inline mr-1" />Specialties</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {SPECIALTY_OPTIONS.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                      <Checkbox checked={bizForm.specialties.includes(s)} onCheckedChange={() => toggleArrayItem('specialties', s)} />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
                <Button onClick={handleSaveBiz} disabled={saving} className="bg-orange-600 hover:bg-orange-700 mt-4">
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── PAYMENTS TAB ── */}
        {!isConsumerType && (
          <TabsContent value="payments" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Default Payment Methods Accepted</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">Select all payment methods your business accepts. These will be the default for all your items.</p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                      <Checkbox checked={bizForm.payment_methods_accepted.includes(opt.value)} onCheckedChange={() => toggleArrayItem('payment_methods_accepted', opt.value)} />
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
                  <div><Label>Venmo Username</Label><Input value={bizForm.venmo_username} onChange={e => setBizForm({ ...bizForm, venmo_username: e.target.value })} placeholder="@YourVenmo" /></div>
                  <div><Label>PayPal Email</Label><Input value={bizForm.paypal_email} onChange={e => setBizForm({ ...bizForm, paypal_email: e.target.value })} placeholder="paypal@email.com" type="email" /></div>
                  <div><Label>Zelle Phone or Email</Label><Input value={bizForm.zelle_phone_or_email} onChange={e => setBizForm({ ...bizForm, zelle_phone_or_email: e.target.value })} placeholder="(555) 123-4567 or email" /></div>
                  <div><Label>Cash App Tag</Label><Input value={bizForm.cashapp_tag} onChange={e => setBizForm({ ...bizForm, cashapp_tag: e.target.value })} placeholder="$YourCashTag" /></div>
                  <div><Label>Stripe Account ID</Label><Input value={bizForm.stripe_account_id} onChange={e => setBizForm({ ...bizForm, stripe_account_id: e.target.value })} placeholder="acct_xxxxxxxxxxxx" /></div>
                  <div><Label>Square Location ID</Label><Input value={bizForm.square_location_id} onChange={e => setBizForm({ ...bizForm, square_location_id: e.target.value })} placeholder="Square location ID" /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Venmo QR Code</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-500">Upload your Venmo QR code to display at checkout.</p>
                {bizForm.venmo_qr_code && (
                  <div className="flex justify-center">
                    <img src={bizForm.venmo_qr_code} alt="Venmo QR" className="w-48 h-48 object-contain border-2 border-slate-200 rounded-lg p-3 bg-white" />
                  </div>
                )}
                <div className="flex gap-3">
                  <label className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span><Upload className="w-4 h-4 mr-2" />{uploading.venmo_qr_code ? 'Uploading...' : bizForm.venmo_qr_code ? 'Change QR Code' : 'Upload QR Code'}</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload('venmo_qr_code', e.target.files[0])} disabled={uploading.venmo_qr_code} />
                  </label>
                  {bizForm.venmo_qr_code && (
                    <Button variant="ghost" className="text-red-600" onClick={() => setBizForm({ ...bizForm, venmo_qr_code: '' })}>Remove</Button>
                  )}
                </div>
                <Button onClick={handleSaveBiz} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── MY SALES TAB ── */}
        {!isConsumerType && (
          <TabsContent value="sales" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Home className="w-5 h-5" />My Estate Sales</CardTitle></CardHeader>
              <CardContent>
                {estateSales.length > 0 ? (
                  <div className="space-y-4">
                    {estateSales.map(sale => (
                      <Link key={sale.id} to={createPageUrl('MySales')} className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-2">{sale.title}</h3>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                              {sale.property_address?.city && <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{sale.property_address.city}, {sale.property_address.state}</div>}
                              {sale.sale_dates?.[0]?.date && <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(sale.sale_dates[0].date).toLocaleDateString()}</div>}
                              <div className="flex items-center gap-1"><Eye className="w-4 h-4" />{sale.views || 0} views</div>
                            </div>
                          </div>
                          <Badge className={sale.status === 'active' ? 'bg-green-100 text-green-700' : sale.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : sale.status === 'completed' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}>{sale.status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">You haven't created any estate sales yet</p>
                    <Button asChild className="bg-orange-600 hover:bg-orange-700"><Link to={createPageUrl('MySales')}>Create Your First Sale</Link></Button>
                  </div>
                )}
              </CardContent>
            </Card>
            {estateSales.length > 0 && subscription && (
              <Card className="bg-gradient-to-br from-orange-50 to-cyan-50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Sale Performance Summary</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div><div className="text-2xl font-bold text-slate-900">{estateSales.length}</div><div className="text-sm text-slate-600">Total Sales</div></div>
                    <div><div className="text-2xl font-bold text-cyan-700">{estateSales.reduce((sum, s) => sum + (s.views || 0), 0)}</div><div className="text-sm text-slate-600">Total Views</div></div>
                    <div><div className="text-2xl font-bold text-green-700">${estateSales.reduce((sum, s) => sum + (s.actual_revenue || 0), 0).toLocaleString()}</div><div className="text-sm text-slate-600">Total Revenue</div></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── SUBSCRIPTION TAB ── */}
        {!isConsumerType && (
          <TabsContent value="subscription" className="space-y-6 mt-6">
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
                      <div className="text-sm text-slate-600">per {subscription.billing_period === 'monthly' ? 'month' : subscription.billing_period === 'annually' ? 'year' : subscription.billing_period}</div>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600"><Check className="w-4 h-4 text-green-600" />Status: <Badge variant="outline" className="text-green-600">{subscription.status}</Badge></div>
                    {subscription.renewal_date && <div className="flex items-center gap-2 text-slate-600"><Check className="w-4 h-4 text-green-600" />Renews on {new Date(subscription.renewal_date).toLocaleDateString()}</div>}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Available Plans</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {packages.map(pkg => {
                    const isCurrentPlan = subscription?.tier === pkg.tier_level;
                    return (
                      <Card key={pkg.id} className={`relative ${isCurrentPlan ? 'border-2 border-orange-500' : ''}`}>
                        {isCurrentPlan && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-600">Current Plan</Badge>}
                        <CardContent className="p-6">
                          <div className="text-center mb-4">
                            <Badge className={getTierColor(pkg.tier_level)}>{pkg.tier_level}</Badge>
                            <h3 className="text-xl font-bold text-slate-900 mt-2 mb-1">{pkg.package_name}</h3>
                            <p className="text-sm text-slate-600 mb-4">{pkg.description}</p>
                            <div className="text-3xl font-bold text-slate-900 mb-1">${pkg.monthly_price}</div>
                            <div className="text-sm text-slate-600">per month</div>
                            {pkg.annual_price && <div className="text-xs text-cyan-600 mt-1">${pkg.annual_price}/year (save ${(pkg.monthly_price * 12 - pkg.annual_price).toFixed(0)})</div>}
                          </div>
                          <div className="space-y-2 mb-6">
                            {pkg.features?.slice(0, 5).map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" /><span className="text-slate-600">{feature}</span></div>
                            ))}
                            {pkg.features?.length > 5 && <p className="text-xs text-slate-500">+{pkg.features.length - 5} more features</p>}
                          </div>
                          {!isCurrentPlan && (
                            <Button className="w-full" variant={pkg.tier_level === 'premium' ? 'default' : 'outline'}>
                              {subscription && pkg.tier_level === 'premium' ? <><ArrowUpCircle className="w-4 h-4 mr-2" />Upgrade</> : subscription && pkg.tier_level === 'basic' ? <><ArrowDownCircle className="w-4 h-4 mr-2" />Downgrade</> : 'Select Plan'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {packages.length === 0 && <p className="text-center text-slate-500 py-8">No subscription packages available at this time.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── SOCIAL MEDIA TAB ── */}
        {!isConsumerType && <TabsContent value="social" className="mt-6"><SocialMediaTab user={user} /></TabsContent>}

        {/* ── ETSY TAB ── */}
        {!isConsumerType && <TabsContent value="etsy" className="mt-6"><MarketplaceCredentialsTab platform="etsy" /></TabsContent>}

        {/* ── EBAY TAB ── */}
        {!isConsumerType && <TabsContent value="ebay" className="mt-6"><MarketplaceCredentialsTab platform="ebay" /></TabsContent>}
      </Tabs>
    </div>
  );
}