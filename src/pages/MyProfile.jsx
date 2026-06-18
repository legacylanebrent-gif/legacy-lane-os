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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPageUrl } from '@/utils';
import SharedFooter from '@/components/layout/SharedFooter';
import { Link } from 'react-router-dom';
import {
  User, Building2, Bell, CreditCard, Save, Upload, Check, Target,
  ArrowUpCircle, ArrowDownCircle, Home, Eye, Calendar, ArrowRight,
  ShoppingBag, Share2, MapPin, Globe, Shield, Star, Crosshair,
  Image as ImageIcon, X, Plus, Mail, MessageSquare, Megaphone, Store,
  Users, FileText, BarChart2, Send, Landmark
} from 'lucide-react';
import SocialMediaTab from '@/components/profile/SocialMediaTab';
import { getSaleDisplayStatus } from '@/components/estate/getSaleDisplayStatus';
import MarketplaceCredentialsTab from '@/components/profile/MarketplaceCredentialsTab';
import InteractiveTerritorySelector from '@/components/profile/InteractiveTerritorySelector';
import LocationRequiredCard from '@/components/profile/LocationRequiredCard';
import BuyerPrefsTab from '@/components/profile/BuyerPrefsTab';

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
  'Staging & Setup','Online Listing',
  'Senior Transition Services','Business Liquidations'
];

// Vendor service specializations
const VENDOR_SERVICE_CATEGORIES = [
  { key: 'cleanout', label: 'Estate Cleanout', description: 'Full/partial home cleanout, junk removal, hauling' },
  { key: 'staging', label: 'Home Staging', description: 'Furniture staging, styling, setup for sale' },
  { key: 'moving', label: 'Moving & Packing', description: 'Local/long-distance moves, packing services' },
  { key: 'storage', label: 'Storage Solutions', description: 'POD delivery, storage unit management' },
  { key: 'donations', label: 'Donation Pickup', description: 'Charitable donation coordination and hauling' },
  { key: 'hauling', label: 'Junk Hauling', description: 'General debris, furniture, appliance removal' },
  { key: 'dumpster', label: 'Dumpster Rental', description: 'Roll-off dumpster delivery and pickup' },
  { key: 'shredding', label: 'Document Shredding', description: 'On-site or off-site secure document destruction' },
  { key: 'appraisal', label: 'Appraisal Services', description: 'Personal property appraisals for insurance/estate' },
  { key: 'photography', label: 'Photography', description: 'Estate sale, real estate, inventory photography' },
  { key: 'senior_moving', label: 'Senior Move Management', description: 'Specialized senior relocation and transition help' },
  { key: 'biohazard', label: 'Biohazard / Hoarding', description: 'Specialized hoarding cleanout, biohazard remediation' },
];

// Reseller business types
const RESELLER_BUSINESS_TYPES = [
  'eBay Seller','Etsy Seller','Amazon Seller','Antique Dealer','Auction Company',
  'Consignment Shop','Furniture Dealer','Collectibles Buyer','Estate Buyer',
  'Liquidator','Buyout Company','Vintage Dealer','Online Reseller','Other'
];

// Reseller inventory interest categories
const RESELLER_INTEREST_CATEGORIES = [
  'Furniture','Jewelry','Antiques','Art','Collectibles','Electronics',
  'Clothing & Accessories','Books & Media','China & Porcelain','Glassware',
  'Tools & Hardware','Sporting Goods','Toys & Games','Musical Instruments',
  'Coins & Currency','Rugs & Textiles','Kitchen & Dining','Whole-House Buyouts',
  'Partial Lots','Individual Items'
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
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam && ['account','buyer_prefs','estate_sales','business','territory','sales','payments','marketplace','agent_tools','vendor_services','vendor_leads','reseller_prefs','reseller_leads','dealer_profile','subscription'].includes(tabParam) ? tabParam : 'account');
  const [marketplaceTab, setMarketplaceTab] = useState('social');
  const [uploading, setUploading] = useState({});
  const [newCounty, setNewCounty] = useState('');
  const [newCity, setNewCity] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  const [form, setForm] = useState({
    // personal
    full_name: '', email: '', phone: '', business_phone: '', address_zip: '',
    early_sign_in_default: true,
    // business / branding
    company_name: '', company_tagline: '', company_description: '',
    phone_secondary: '', business_phone_2: '', company_email: '', website_url: '',
    business_address_street: '', business_address_city: '',
    business_address_state: '', business_address_zip: '',
    founded_year: '', license_number: '',
    insurance_verified: false, bonded: false,
    commission_rate: '',
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
    // vendor
    vendor_service_categories: [],
    // reseller
    reseller_business_type: [], reseller_inventory_interests: [],
    reseller_min_purchase: '', reseller_max_purchase: '', reseller_buys_whole_house: false,
    reseller_founded_year: '',
    // collector dealer
    collector_dealer_business_type: '', collector_dealer_specialties: [],
    store_name: '', store_address_geocoded: null,
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
        phone: u.phone || '', business_phone: u.business_phone || u.phone || '', address_zip: u.address_zip || '',
        early_sign_in_default: u.early_sign_in_default !== false,
        company_name: u.company_name || '', company_tagline: u.company_tagline || '',
        company_description: u.company_description || '',
        phone_secondary: u.phone_secondary || '', business_phone_2: u.business_phone_2 || u.phone_secondary || '',         company_email: u.company_email || u.email || '',
        website_url: u.website_url || u.company_website || '',
        business_address_street: u.business_address_street || '',
        business_address_city: u.business_address_city || '',
        business_address_state: u.business_address_state || '',
        business_address_zip: u.business_address_zip || '',
        founded_year: u.founded_year || '',
        license_number: u.license_number || '',
        insurance_verified: u.insurance_verified || false, bonded: u.bonded || false,
        commission_rate: u.commission_rate || '',
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
        vendor_service_categories: u.vendor_service_categories || [],
        reseller_business_type: u.reseller_business_type || [],
        reseller_inventory_interests: u.reseller_inventory_interests || [],
        reseller_min_purchase: u.reseller_min_purchase || '',
        reseller_max_purchase: u.reseller_max_purchase || '',
        reseller_buys_whole_house: u.reseller_buys_whole_house || false,
        reseller_founded_year: u.reseller_founded_year || '',
        collector_dealer_business_type: u.collector_dealer_business_type || '',
        collector_dealer_specialties: u.collector_dealer_specialties || [],
        store_name: u.store_name || '',
        store_address_geocoded: u.store_address_geocoded || null,
      }));
      if (u.notification_settings) setNotifications(prev => ({ ...prev, ...u.notification_settings }));

      const [subs, pkgs, purchases] = await Promise.all([
        base44.entities.Subscription.filter({ user_id: u.id }),
        u.primary_account_type ? base44.entities.SubscriptionPackage.filter({ account_type: u.primary_account_type, is_active: true }) : Promise.resolve([]),
        base44.entities.Transaction.filter({ created_by: u.email }),
      ]);

      if (subs.length) setSubscription(subs[0]);
      const tierOrder = { starter: 0, basic: 0, growth: 1, professional: 2, pro: 2, elite: 3, premium: 3 };
      setPackages(pkgs.sort((a, b) => {
        const tierA = tierOrder[a.data?.tier_level || a.tier_level] ?? 99;
        const tierB = tierOrder[b.data?.tier_level || b.tier_level] ?? 99;
        return tierA - tierB;
      }));
      setPurchases(purchases);

      const acct = u.primary_account_type || 'consumer';
      const isConsumer = ['consumer','executor','home_seller','buyer','downsizer','diy_seller','consignor'].includes(acct) || !acct;
      const isTeam = ['team_admin','team_member','team_marketer'].includes(acct);
      const isOperatorAcct = acct === 'estate_sale_operator';
      if (!isConsumer) {
        const opId = isTeam ? u.operator_id : u.id;
        if (opId && isOperatorAcct) setEstateSales(await base44.entities.EstateSale.filter({ operator_id: opId }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const wasPhoneEmpty = !user?.phone && !user?.phone_number;
      await base44.auth.updateMe({ ...form, notification_settings: notifications });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Auto-award phone verification reward if phone was just added
      if (wasPhoneEmpty && form.phone && form.phone.trim()) {
        try {
          const res = await base44.functions.invoke('completeRewardAction', {
            action_id: 'phone_verified',
            notes: 'Phone verified via profile',
          });
          if (res.data?.success) {
            alert(res.data.message);
          }
        } catch (e) { /* silent — reward not critical */ }
      }
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

  const getTierColor = (tier) => ({
    starter: 'bg-slate-100 text-slate-700',
    basic: 'bg-slate-100 text-slate-700',
    growth: 'bg-purple-100 text-purple-700',
    professional: 'bg-blue-100 text-blue-700',
    pro: 'bg-blue-100 text-blue-700',
    elite: 'bg-orange-100 text-orange-800',
    premium: 'bg-orange-100 text-orange-700',
  }[tier] || 'bg-slate-100 text-slate-700');

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
  const isAgentOperator = acct === 'agent_operator';
  const isOperator = acct === 'estate_sale_operator' || isAgentOperator;
  const isAgent = acct === 'real_estate_agent' || isAgentOperator;
  const isVendor = acct === 'vendor';
  // operators on Professional or Elite tiers get reseller features included
  const activeTierForReseller = (user?.subscription_tier || subscription?.tier || '').toLowerCase();
  const operatorHasResellerAccess = isOperator && ['professional', 'elite', 'growth'].includes(activeTierForReseller);
  const isReseller = acct === 'reseller' || operatorHasResellerAccess;
  const isCollectorDealer = acct === 'collector_dealer';

  // Collector dealer specialty options
  const DEALER_SPECIALTY_OPTIONS = [
    'Antiques', 'Fine Art', 'Paintings', 'Sculpture', 'Prints & Lithographs',
    'Furniture', 'Jewelry', 'Watches', 'Silver & Silverware',
    'China & Porcelain', 'Glassware & Crystal', 'Rugs & Textiles',
    'Mid-Century Modern', 'Art Deco', 'Victorian Era',
    'Coins & Currency', 'Stamps', 'Collectibles', 'Military Memorabilia',
    'Books & Rare Manuscripts', 'Toys & Vintage Games', 'Musical Instruments',
    'Lighting & Lamps', 'Clocks', 'Cameras & Photography', 'Wine & Spirits'
  ];

  const COLLECTOR_DEALER_TYPES = [
    'Antique Dealer', 'Art Dealer', 'Collector Dealer', 'Gallery Owner',
    'Auction House', 'Vintage Dealer', 'Estate Buyer', 'Other'
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 pb-32 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">
          {isConsumer
            ? 'Manage your account, estate sale preferences, and notifications'
            : `Manage your ${acct.replace(/_/g, ' ')} account, business settings, and preferences`
          }
        </p>
        {!isConsumer && (
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${isAgentOperator ? 'bg-gradient-to-r from-orange-100 to-cyan-100 text-slate-800 border border-orange-300' : 'bg-orange-100 text-orange-700'}`}>
            {isAgentOperator ? '⚡ Agent + Operator' : acct.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto w-full mb-6 justify-start bg-transparent p-0">
          {/* ── Universal tabs — all users ── */}
          <TabsTrigger value="account" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Account</TabsTrigger>
          <TabsTrigger value="estate_sales" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Estate Sales</TabsTrigger>
          <TabsTrigger value="buyer_prefs" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">ISO Wanted Items</TabsTrigger>
          {/* ── Role-specific tabs ── */}
          {!isConsumer && <TabsTrigger value="business" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">
            {isAgentOperator ? 'Business Profile' : isAgent ? 'Agent Profile' : isReseller ? 'Business' : isVendor ? 'Vendor Profile' : 'Business'}
          </TabsTrigger>}
          {!isConsumer && <TabsTrigger value="territory" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">{isReseller ? 'Service Area' : 'Service Area (Estate Sales)'}</TabsTrigger>}
          {isVendor && <TabsTrigger value="vendor_services" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Services</TabsTrigger>}
          {isVendor && <TabsTrigger value="vendor_leads" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">My Leads</TabsTrigger>}
          {isReseller && <TabsTrigger value="reseller_prefs" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Reseller Buying</TabsTrigger>}
          {isReseller && <TabsTrigger value="reseller_leads" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">My Leads</TabsTrigger>}
          {isCollectorDealer && <TabsTrigger value="dealer_profile" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Dealer Profile</TabsTrigger>}
          {isOperator && <TabsTrigger value="payments" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Payments</TabsTrigger>}
          {isOperator && <TabsTrigger value="sales" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">My Sales</TabsTrigger>}
          {(isOperator || (isReseller && subscription?.tier === 'pro')) && <TabsTrigger value="marketplace" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Social & Marketplaces</TabsTrigger>}
          {isAgent && <TabsTrigger value="agent_tools" className="rounded-md border border-input bg-muted px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">Agent Tools</TabsTrigger>}
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
                <div><Label>Personal Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" /></div>
                <div><Label>ZIP Code</Label><Input value={form.address_zip} onChange={e => setForm(p => ({ ...p, address_zip: e.target.value }))} placeholder="12345" maxLength="5" /></div>
              </div>
            </CardContent>
          </Card>

          {/* Location — required for non-consumer users to appear in searches */}
          {!isConsumer && (!user?.location?.lat || !user?.location?.lng) && (
            <LocationRequiredCard
              user={user}
              form={form}
              setForm={setForm}
              onLocationSaved={(loc) => setUser(prev => ({ ...prev, location: loc }))}
            />
          )}

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

          {/* ── Agent + Estate Sale Company Owner Upgrade CTA ── */}
          {(isOperator && !isAgentOperator) && (
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-orange-50 to-cyan-50 border border-orange-200 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 mb-1">Are you also a Real Estate Agent?</h3>
                <p className="text-sm text-slate-600 mb-3">Upgrade to the combined <strong>Agent + Estate Sale Company Owner</strong> role to unlock RE listing pipeline, referral deal management, agent partnerships, and a bundled subscription — all in one account.</p>
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-cyan-600 hover:from-orange-600 hover:to-cyan-700 text-white gap-2"
                  onClick={() => setConfirmModal({
                    open: true,
                    title: 'Upgrade to Agent + Operator?',
                    message: 'This unlocks all features from both roles — RE listing pipeline, referral deal management, agent partnerships, and a bundled subscription. Contact support to adjust pricing.',
                    onConfirm: async () => {
                      setConfirmModal(p => ({ ...p, open: false }));
                      await base44.auth.updateMe({ previous_account_type: acct, agent_operator_upgrade_date: new Date().toISOString(), primary_account_type: 'agent_operator' });
                      await base44.functions.invoke('notifyAdminsOfApplication', { applicant_user_id: user?.id, applicant_name: user?.full_name, applicant_email: user?.email, application_type: 'agent_operator_upgrade', details: `Upgraded from ${acct}` });
                      alert('✅ Role upgraded! Please refresh the page to see your new combined dashboard.');
                    }
                  })}>
                  <Users className="w-4 h-4" /> Upgrade to Agent + operator
                </Button>
              </div>
            </div>
          )}
          {(isAgent && !isAgentOperator && acct !== 'estate_sale_operator') && (
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-cyan-50 to-orange-50 border border-cyan-200 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 mb-1">Do you also run an estate sale company?</h3>
                <p className="text-sm text-slate-600 mb-3">Upgrade to the combined <strong>Agent + Estate Sale Company Owner</strong> role to run estate sales, manage inventory, accept bookings, and keep your agent tools — all under one subscription.</p>
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-orange-600 hover:from-cyan-600 hover:to-orange-700 text-white gap-2"
                  onClick={() => setConfirmModal({
                    open: true,
                    title: 'Upgrade to Agent + Operator?',
                    message: 'This unlocks all Estate Sale Company Owner features — run estate sales, manage inventory, accept bookings — while keeping your agent tools under one subscription.',
                    onConfirm: async () => {
                      setConfirmModal(p => ({ ...p, open: false }));
                      await base44.auth.updateMe({ previous_account_type: acct, agent_operator_upgrade_date: new Date().toISOString(), primary_account_type: 'agent_operator' });
                      await base44.functions.invoke('notifyAdminsOfApplication', { applicant_user_id: user?.id, applicant_name: user?.full_name, applicant_email: user?.email, application_type: 'agent_operator_upgrade', details: `Upgraded from ${acct}` });
                      alert('✅ Role upgraded! Please refresh the page to see your new combined dashboard.');
                    }
                  })}>
                  <Building2 className="w-4 h-4" /> Upgrade to Agent + Estate Sale Company Owner
                </Button>
              </div>
            </div>
          )}
          {isAgentOperator && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-cyan-50 border border-orange-300 rounded-xl">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">⚡ Agent + Estate Sale Company Owner — Combined Role Active</p>
                <p className="text-xs text-slate-600">You have full access to both Estate Sale Company Owner and real estate agent tools under one account.</p>
              </div>
              <Badge className="ml-auto bg-gradient-to-r from-orange-500 to-cyan-500 text-white border-0">Active</Badge>
            </div>
          )}

          {/* Reseller included with Estate Sale Company Owner plan banner */}
          {operatorHasResellerAccess && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-purple-800 text-sm">✅ Reseller Features Included in Your Plan</p>
                <p className="text-xs text-purple-600">Your {subscription?.tier} plan includes full reseller network access, buyout matching, inventory interests, and Pack-Up event tools.</p>
              </div>
              <Badge className="ml-auto bg-purple-600 text-white capitalize">{subscription?.tier}</Badge>
            </div>
          )}

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
                      onClick={() => setConfirmModal({
                        open: true,
                        title: 'Apply to Become a Reseller?',
                        message: 'Our team will review your application and upgrade your account within 1–2 business days.',
                        onConfirm: async () => {
                          setConfirmModal(p => ({ ...p, open: false }));
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
                        }
                      })}
                    >
                      <Store className="w-4 h-4" />
                      Apply to Become a Reseller
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Collector Dealer Application — for consumers */}
          {acct === 'collector_dealer' ? (
            <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Landmark className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-purple-800 text-sm">Collector Dealer Account Active</p>
                <p className="text-xs text-purple-600">You have full dealer access including ISO wanted item matching, estate sale discovery, and store profile.</p>
              </div>
              <Badge className="ml-auto bg-purple-600 text-white">Approved</Badge>
            </div>
          ) : isConsumer && user?.dealer_application_submitted ? (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-purple-900">Collector Dealer Application</h3>
                      <Badge className="bg-purple-500 text-white text-xs">Pending Review</Badge>
                    </div>
                    <p className="text-sm text-purple-700">
                      Your application has been submitted and is currently under review. Our team will upgrade your account within 1–2 business days.
                    </p>
                    {user?.dealer_application_date && (
                      <p className="text-xs text-purple-500 mt-2">Submitted {new Date(user.dealer_application_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isConsumer ? (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 mb-1">Become a Collector Dealer</h3>
                    <p className="text-sm text-purple-700 mb-3">
                      Antique, art, and collector dealers get access to the ISO Wanted Items matching system — find exactly what you're hunting for across every estate sale. Plus: a store profile, geocoded address, and direct messaging with estate sale operators.
                    </p>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                      onClick={() => setConfirmModal({
                        open: true,
                        title: 'Apply to Become a Collector Dealer?',
                        message: 'Our team will review your application and upgrade your account within 1–2 business days.',
                        onConfirm: async () => {
                          setConfirmModal(p => ({ ...p, open: false }));
                          try {
                            await base44.auth.updateMe({ dealer_application_submitted: true, dealer_application_date: new Date().toISOString() });
                            await base44.functions.invoke('notifyAdminsOfApplication', {
                              applicant_user_id: user?.id,
                              applicant_name: user?.full_name,
                              applicant_email: user?.email,
                              application_type: 'collector_dealer',
                              details: null,
                            });
                            await base44.entities.Notification.create({
                              user_id: user?.id,
                              type: 'system',
                              title: 'Collector Dealer Application Received',
                              message: 'Your application to become a Collector Dealer has been submitted. Our team will review it and be in touch within 1–2 business days.',
                              link_to_page: 'MyProfile',
                              read: false,
                            });
                            setUser(prev => ({ ...prev, dealer_application_submitted: true, dealer_application_date: new Date().toISOString() }));
                          } catch (e) {
                            alert('Something went wrong. Please try again.');
                          }
                        }
                      })}
                    >
                      <Landmark className="w-4 h-4" />
                      Apply to Become a Collector Dealer
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
            {/* View Public Business Profile */}
            <Link to={createPageUrl(`BusinessProfile?id=${user?.id}`)} target="_blank" className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
              <Eye className="w-4 h-4" /> View Your Public Business Page <ArrowRight className="w-3 h-3" />
            </Link>

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
                  <div><Label>Business Phone</Label><Input value={form.business_phone} onChange={e => setForm(p => ({ ...p, business_phone: e.target.value }))} placeholder="(555) 123-4567" /></div>
                  <div><Label>Alternate Business Phone</Label><Input value={form.business_phone_2} onChange={e => setForm(p => ({ ...p, business_phone_2: e.target.value }))} placeholder="(555) 987-6543" /></div>
                  <div><Label>Business Email <span className="text-slate-400 font-normal">(shown publicly)</span></Label><Input value={form.company_email} onChange={e => setForm(p => ({ ...p, company_email: e.target.value }))} placeholder="info@company.com" type="email" /></div>
                  <div><Label>Website</Label><Input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://yourcompany.com" /></div>
                </div>
                <div className="pt-2 border-t">
                  <Label className="text-slate-600 text-xs uppercase tracking-wide mb-1 block">Business Address</Label>
                  <p className="text-xs text-slate-400 mb-3">Street address is optional — city, state, and ZIP are used for Google Maps linking.</p>
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

            {/* Estate Sale Company Owner-specific credentials */}
            {isOperator && (
              <>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Estate Sale Business Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div><Label>License #</Label><Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} placeholder="State license" /></div>
                      <div><Label>Year Founded</Label><Input type="number" value={form.founded_year} onChange={e => setForm(p => ({ ...p, founded_year: e.target.value }))} placeholder="2010" /></div>
                      <div><Label>Commission Rate (%)</Label><Input type="number" value={form.commission_rate} onChange={e => setForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="35" /><p className="text-xs text-slate-400 mt-1">Default commission applied to new sales unless overridden per sale.</p></div>

                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.insurance_verified} onCheckedChange={v => setForm(p => ({ ...p, insurance_verified: v }))} /><span className="text-sm font-medium">Insured</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.bonded} onCheckedChange={v => setForm(p => ({ ...p, bonded: v }))} /><span className="text-sm font-medium">Bonded</span></label>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Early Sign In List Default</CardTitle></CardHeader>
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

            {/* Agent-specific credentials */}
            {isAgent && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Real Estate License & Credentials</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div><Label>License Number</Label><Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} placeholder="RE License #" /></div>
                    <div>
                      <Label>License State</Label>
                      <select value={form.business_address_state} onChange={e => setForm(p => ({ ...p, business_address_state: e.target.value }))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1">
                        <option value="">Select State</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><Label>Years in Business</Label><Input type="number" value={form.years_in_business} onChange={e => setForm(p => ({ ...p, years_in_business: e.target.value }))} placeholder="10" /></div>
                    <div className="md:col-span-3"><Label>Brokerage Name</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Keller Williams, RE/MAX, etc." /></div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.insurance_verified} onCheckedChange={v => setForm(p => ({ ...p, insurance_verified: v }))} /><span className="text-sm font-medium">E&O Insured</span></label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vendor-specific credentials */}
            {isVendor && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Vendor Business Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div><Label>Years in Business</Label><Input type="number" value={form.years_in_business} onChange={e => setForm(p => ({ ...p, years_in_business: e.target.value }))} placeholder="5" /></div>
                    <div><Label>Year Founded</Label><Input type="number" value={form.founded_year} onChange={e => setForm(p => ({ ...p, founded_year: e.target.value }))} placeholder="2015" /></div>
                    <div><Label>License #</Label><Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} placeholder="Optional" /></div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.insurance_verified} onCheckedChange={v => setForm(p => ({ ...p, insurance_verified: v }))} /><span className="text-sm font-medium">Insured</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.bonded} onCheckedChange={v => setForm(p => ({ ...p, bonded: v }))} /><span className="text-sm font-medium">Bonded / Licensed</span></label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collector Dealer-specific credentials */}
            {isCollectorDealer && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5" />Dealer Business Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Store / Gallery Name</label>
                      <Input value={form.store_name} onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))} placeholder="Main Street Antiques" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Dealer Type</label>
                      <select value={form.collector_dealer_business_type} onChange={e => setForm(p => ({ ...p, collector_dealer_business_type: e.target.value }))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                        <option value="">Select type...</option>
                        {COLLECTOR_DEALER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><Label>Years in Business</Label><Input type="number" value={form.years_in_business} onChange={e => setForm(p => ({ ...p, years_in_business: e.target.value }))} placeholder="5" /></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reseller-specific credentials */}
            {isReseller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" />Reseller Business Details</CardTitle>
                  <p className="text-sm text-slate-500">Tell us about your reseller business. Choose from the options below.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Business Type (select all that apply)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RESELLER_BUSINESS_TYPES.map(t => (
                        <label key={t} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${(form.reseller_business_type || []).includes(t) ? 'border-orange-500 bg-orange-50 font-medium' : 'border-slate-200 hover:border-slate-300'}`}>
                          <Checkbox checked={(form.reseller_business_type || []).includes(t)} onCheckedChange={() => toggleArr('reseller_business_type', t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><Label>Year Started Reselling</Label><Input type="number" value={form.reseller_founded_year} onChange={e => setForm(p => ({ ...p, reseller_founded_year: e.target.value }))} placeholder="2020" /></div>
                </CardContent>
              </Card>
            )}

            {/* Services + Specialties — Estate Sale Company Owner only */}
            {isOperator && (
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
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-1"><Star className="w-4 h-4" />Specialties</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={() => {
                        const allChecked = SPECIALTY_OPTIONS.every(s => form.specialties.includes(s));
                        setForm(p => ({ ...p, specialties: allChecked ? [] : [...SPECIALTY_OPTIONS] }));
                      }}
                    >
                      {SPECIALTY_OPTIONS.every(s => form.specialties.includes(s)) ? 'Uncheck All' : 'Check All'}
                    </Button>
                  </CardHeader>
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
            )}

            <SaveBtn label="Save Business Profile" />
          </TabsContent>
        )}

        {/* ─────────────── SERVICE AREA TAB ─────────────── */}
        <TabsContent value="territory" className="space-y-6">
          {acct === 'reseller' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" />National Coverage</CardTitle>
                <p className="text-sm text-slate-500">As a reseller, your buying reach is national — all estate sale operators across the country can see you and match you with opportunities. No geographic limits apply.</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 text-sm">All 50 States + DC</p>
                    <p className="text-xs text-green-600">Your profile is visible nationwide. Any estate sale company in any state can see and send you buyout or lot opportunities.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <InteractiveTerritorySelector form={form} setForm={setForm} />
          )}

          {/* Max Radius */}
          <Card>
            <CardContent className="pt-5">
              <Label>Max Travel Radius (miles)</Label>
              <Input type="number" className="max-w-xs mt-1" value={form.service_radius_miles} onChange={e => setForm(p => ({ ...p, service_radius_miles: e.target.value }))} placeholder="50" />
            </CardContent>
          </Card>

          <SaveBtn label="Save Service Area" />
        </TabsContent>

        {/* ─────────────── PAYMENTS TAB ─────────────── */}
        {!isConsumer && !(acct === 'reseller') && (
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
        {isOperator && (
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
        {(isOperator || (isReseller && subscription?.tier === 'pro')) && (
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

        {/* ─────────────── AGENT TOOLS TAB ─────────────── */}
        {isAgent && (
          <TabsContent value="agent_tools" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Agent Tools & Partnerships</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">Quick links to your agent-specific tools and dashboards.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link to="/AgentDashboard">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center"><BarChart2 className="w-5 h-5 text-orange-600" /></div>
                      <div><p className="font-semibold text-sm">Agent Dashboard</p><p className="text-xs text-slate-500">Leads, commissions & activity</p></div>
                    </div>
                  </Link>
                  <Link to="/AgentOperatorPortal">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-cyan-600" /></div>
                      <div><p className="font-semibold text-sm">Estate Sale Company Owner Partnerships</p><p className="text-xs text-slate-500">Connect with operators</p></div>
                    </div>
                  </Link>
                  <Link to="/AgentPartnerships">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center"><Send className="w-5 h-5 text-purple-600" /></div>
                      <div><p className="font-semibold text-sm">Agent Partnerships</p><p className="text-xs text-slate-500">Co-op referral network</p></div>
                    </div>
                  </Link>
                  <Link to="/ReferralDealPipeline">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-green-600" /></div>
                      <div><p className="font-semibold text-sm">Referral Deal Pipeline</p><p className="text-xs text-slate-500">Track & manage referral deals</p></div>
                    </div>
                  </Link>
                  <Link to="/ReferralDashboard">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center"><Globe className="w-5 h-5 text-blue-600" /></div>
                      <div><p className="font-semibold text-sm">Referral Dashboard</p><p className="text-xs text-slate-500">Earnings & referral history</p></div>
                    </div>
                  </Link>
                  <Link to="/JoinReferralExchange">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center"><Share2 className="w-5 h-5 text-amber-600" /></div>
                      <div><p className="font-semibold text-sm">Join Referral Exchange</p><p className="text-xs text-slate-500">Expand your partner network</p></div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Agent bio/description */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Agent Bio</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Professional Bio</Label>
                  <Textarea value={form.company_description} onChange={e => setForm(p => ({ ...p, company_description: e.target.value }))} rows={5} placeholder="Tell Estate Sale Company Owners and families about your experience with probate, senior transitions, inherited properties..." />
                  <p className="text-xs text-slate-400 mt-1">{(form.company_description || '').length} characters</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Avg. Sale Price (homes you represent)</Label><Input type="number" value={form.commission_rate} onChange={e => setForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="450000" /></div>
                  <div><Label>Referral Fee % (for Estate Sale Company Owners)</Label><Input type="number" value={form.minimum_sale_value} onChange={e => setForm(p => ({ ...p, minimum_sale_value: e.target.value }))} placeholder="25" /></div>
                </div>
              </CardContent>
            </Card>
            <SaveBtn label="Save Agent Profile" />
          </TabsContent>
        )}

        {/* ─────────────── VENDOR SERVICES & AREA TAB ─────────────── */}
        {isVendor && (
          <TabsContent value="vendor_services" className="space-y-6">
            {/* Service Specializations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" />Service Specializations</CardTitle>
                <p className="text-sm text-slate-500">Select every type of service your business provides. This determines which leads get matched to you.</p>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {VENDOR_SERVICE_CATEGORIES.map(cat => (
                    <label key={cat.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.vendor_service_categories.includes(cat.key) ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <Checkbox className="mt-0.5" checked={form.vendor_service_categories.includes(cat.key)} onCheckedChange={() => toggleArr('vendor_service_categories', cat.key)} />
                      <div>
                        <p className="font-semibold text-sm">{cat.label}</p>
                        <p className="text-xs text-slate-500">{cat.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Service Area */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Service Area</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="mb-2 block text-slate-600">States Covered</Label>
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
                      {form.service_counties.map(c => <Badge key={c} variant="secondary" className="gap-1 pr-1 text-xs">{c}<button onClick={() => removeTag('service_counties', c)}><X className="w-3 h-3" /></button></Badge>)}
                    </div>
                  </div>
                  <div>
                    <Label>Max Travel Radius (miles)</Label>
                    <Input type="number" className="mt-1" value={form.service_radius_miles} onChange={e => setForm(p => ({ ...p, service_radius_miles: e.target.value }))} placeholder="30" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <SaveBtn label="Save Services & Area" />
          </TabsContent>
        )}

        {/* ─────────────── VENDOR LEADS TAB ─────────────── */}
        {isVendor && (
          <TabsContent value="vendor_leads" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />My Cleanout Leads</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-500">Leads matched to your service area and specializations appear in your leads dashboard.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/AdminCleanoutLeads" className="flex-1">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-orange-600" /></div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Cleanout Leads Dashboard</p>
                        <p className="text-xs text-slate-500">View and manage all matched cleanout requests</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                  <p className="text-xs font-semibold text-slate-600 mb-1">How lead matching works</p>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                    <li>Leads are matched to vendors based on service area (state, county, radius)</li>
                    <li>Your selected service specializations determine lead type eligibility</li>
                    <li>Enable lead notifications in the <strong>Account</strong> tab to get alerts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─────────────── RESELLER BUYING PREFERENCES TAB ─────────────── */}
        {isReseller && (
          <TabsContent value="reseller_prefs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Inventory Interests</CardTitle>
                <p className="text-sm text-slate-500">Tell us what you buy — this determines which estate sale buyout and lot opportunities get matched to you.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RESELLER_INTEREST_CATEGORIES.map(cat => (
                    <label key={cat} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${form.reseller_inventory_interests.includes(cat) ? 'border-orange-500 bg-orange-50 font-medium' : 'border-slate-200 hover:border-slate-300'}`}>
                      <Checkbox checked={form.reseller_inventory_interests.includes(cat)} onCheckedChange={() => toggleArr('reseller_inventory_interests', cat)} />
                      {cat}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" />Purchase Range & Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Min Purchase ($)</Label><Input type="number" value={form.reseller_min_purchase} onChange={e => setForm(p => ({ ...p, reseller_min_purchase: e.target.value }))} placeholder="500" /></div>
                  <div><Label>Max Purchase ($)</Label><Input type="number" value={form.reseller_max_purchase} onChange={e => setForm(p => ({ ...p, reseller_max_purchase: e.target.value }))} placeholder="25000" /></div>
                </div>
                <div>
                  <Label className="mb-2 block text-slate-600">Service States</Label>
                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                    {US_STATES.map(s => (
                      <button key={s} type="button" onClick={() => toggleArr('service_states', s)}
                        className={`px-1.5 py-1 rounded text-xs font-medium border transition-all ${form.service_states.includes(s) ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border cursor-pointer">
                  <Checkbox checked={form.reseller_buys_whole_house} onCheckedChange={v => setForm(p => ({ ...p, reseller_buys_whole_house: v }))} />
                  <div>
                    <p className="text-sm font-semibold">I buy whole-house lots / full buyouts</p>
                    <p className="text-xs text-slate-500">Check this to receive buyout opportunity leads</p>
                  </div>
                </label>
              </CardContent>
            </Card>
            <SaveBtn label="Save Buying Preferences" />
          </TabsContent>
        )}

        {/* ─────────────── RESELLER LEADS TAB ─────────────── */}
        {isReseller && (
          <TabsContent value="reseller_leads" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />My Reseller Leads</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-500">Buyout opportunities and reseller leads matched to your preferences appear in your dashboard.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/ResellerDashboard" className="flex-1">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><Store className="w-5 h-5 text-orange-600" /></div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Reseller Dashboard</p>
                        <p className="text-xs text-slate-500">Browse buyout opportunities, lots & leads</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                  <Link to="/ResellerNetwork" className="flex-1">
                    <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all">
                      <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-cyan-600" /></div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Reseller Network</p>
                        <p className="text-xs text-slate-500">Connect with operators & explore inventory</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                  <p className="text-xs font-semibold text-slate-600 mb-1">How lead matching works</p>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                    <li>Leads are matched based on your inventory interests and service states</li>
                    <li>Whole-house buyout leads only go to resellers with that preference enabled</li>
                    <li>Enable lead notifications in the <strong>Account</strong> tab for instant alerts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─────────────── ESTATE SALES TAB ─────────────── */}
        <TabsContent value="estate_sales" className="space-y-6">
          {/* Consumer / Buyer links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Home className="w-5 h-5" />Find Estate Sales</CardTitle>
              <p className="text-sm text-slate-500">Browse upcoming sales, plan your route, and manage your favorites.</p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link to="/"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><Home className="w-5 h-5 text-orange-600" /></div><div><p className="font-semibold text-sm">Browse Estate Sales</p><p className="text-xs text-slate-500">Find upcoming sales near you</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/RoutePlanner"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0"><MapPin className="w-5 h-5 text-cyan-600" /></div><div><p className="font-semibold text-sm">Route Planner</p><p className="text-xs text-slate-500">Plan your weekend sale route</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/FavoriteCompanies"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><Star className="w-5 h-5 text-purple-600" /></div><div><p className="font-semibold text-sm">Favorite Companies</p><p className="text-xs text-slate-500">Follow your favorite estate sale companies</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/MyEarlySignIns"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="w-5 h-5 text-green-600" /></div><div><p className="font-semibold text-sm">My Early Sign-Ins</p><p className="text-xs text-slate-500">View your sign-in list reservations</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/MyPurchases"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-5 h-5 text-amber-600" /></div><div><p className="font-semibold text-sm">My Estate Sale Purchases</p><p className="text-xs text-slate-500">Track items you've bought at estate sales</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/RecordPurchase"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Plus className="w-5 h-5 text-slate-600" /></div><div><p className="font-semibold text-sm">Record a Purchase</p><p className="text-xs text-slate-500">Log an item you bought to earn rewards</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
              </div>
            </CardContent>
          </Card>

          {/* My Purchases summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />My Estate Sale Purchases</div>
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

          {/* Estate Sale Company Owner-specific estate sale actions */}
          {isOperator && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Manage My Sales</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link to="/MySales"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><Home className="w-5 h-5 text-orange-600" /></div><div><p className="font-semibold text-sm">My Sales Dashboard</p><p className="text-xs text-slate-500">Manage all your estate sales</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                  <Link to="/OperatorDashboard"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0"><BarChart2 className="w-5 h-5 text-cyan-600" /></div><div><p className="font-semibold text-sm">Estate Sale Company Owner Dashboard</p><p className="text-xs text-slate-500">Analytics, leads & performance</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                  <Link to="/SaleConversionPipeline"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-green-600" /></div><div><p className="font-semibold text-sm">Sale Conversion Pipeline</p><p className="text-xs text-slate-500">Track leads to signed contracts</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent estate sale tools */}
          {isAgent && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Agent Estate Sale Tools</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link to="/agent-request"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><Send className="w-5 h-5 text-orange-600" /></div><div><p className="font-semibold text-sm">Submit Estate Sale Request</p><p className="text-xs text-slate-500">Refer a client listing to the Estate Sale Company Owner pool</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                  <Link to="/PropstreamREListings"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-cyan-600" /></div><div><p className="font-semibold text-sm">RE Listing Pipeline</p><p className="text-xs text-slate-500">View and score estate sale opportunities</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reseller estate sale tools */}
          {isReseller && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" />Reseller Estate Sale Tools</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link to="/ResellerNetwork"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><Store className="w-5 h-5 text-orange-600" /></div><div><p className="font-semibold text-sm">Reseller Network</p><p className="text-xs text-slate-500">Connect with operators & find buyout lots</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                  <Link to="/ResellerDashboard"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0"><BarChart2 className="w-5 h-5 text-cyan-600" /></div><div><p className="font-semibold text-sm">Reseller Dashboard</p><p className="text-xs text-slate-500">Leads, lots & buyout opportunities</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vendor estate sale tools */}
          {isVendor && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Vendor Estate Sale Tools</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Link to="/AdminCleanoutLeads"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-orange-600" /></div><div><p className="font-semibold text-sm">My Cleanout Leads</p><p className="text-xs text-slate-500">Leads matched to your service area</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                  <Link to="/cleanout-network"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 cursor-pointer transition-all"><div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-cyan-600" /></div><div><p className="font-semibold text-sm">Cleanout Network</p><p className="text-xs text-slate-500">Browse estate cleanout opportunities</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education & Resources for all */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" />Learn & Explore</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link to="/learn"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all"><div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Globe className="w-5 h-5 text-slate-600" /></div><div><p className="font-semibold text-sm">Estate Sale University</p><p className="text-xs text-slate-500">Guides, tips & how-to articles</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/estate-checklist"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all"><div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-slate-600" /></div><div><p className="font-semibold text-sm">Estate Checklist</p><p className="text-xs text-slate-500">Step-by-step estate transition checklists</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/probate"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all"><div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Shield className="w-5 h-5 text-slate-600" /></div><div><p className="font-semibold text-sm">Probate Guide</p><p className="text-xs text-slate-500">State-by-state probate information</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
                <Link to="/estate-settlement-planner"><div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all"><div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="w-5 h-5 text-slate-600" /></div><div><p className="font-semibold text-sm">Settlement Planner</p><p className="text-xs text-slate-500">Plan the full estate settlement process</p></div><ArrowRight className="w-4 h-4 text-slate-400 ml-auto" /></div></Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── COLLECTOR DEALER PROFILE TAB ─────────────── */}
        {isCollectorDealer && (
          <TabsContent value="dealer_profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5" />Dealer Profile & Specialties</CardTitle>
                <p className="text-sm text-slate-500">Tell buyers and estate sale operators what you specialize in. This helps match you with relevant sales.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Store / Gallery Name</Label>
                    <Input value={form.store_name} onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))} placeholder="Main Street Antiques" />
                  </div>
                  <div>
                    <Label>Dealer Type</Label>
                    <select value={form.collector_dealer_business_type} onChange={e => setForm(p => ({ ...p, collector_dealer_business_type: e.target.value }))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1">
                      <option value="">Select type...</option>
                      {COLLECTOR_DEALER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Buying Specialties</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DEALER_SPECIALTY_OPTIONS.map(s => (
                      <label key={s} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${form.collector_dealer_specialties.includes(s) ? 'border-purple-500 bg-purple-50 font-medium' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Checkbox checked={form.collector_dealer_specialties.includes(s)} onCheckedChange={() => toggleArr('collector_dealer_specialties', s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Store Address Summary */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Store Location
                    </p>
                    {form.business_address_street ? (
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600">{form.business_address_street}</p>
                        <p className="text-sm text-slate-600">{form.business_address_city}, {form.business_address_state} {form.business_address_zip}</p>
                        {form.store_address_geocoded ? (
                          <Badge className="bg-green-100 text-green-700 mt-1 gap-1">
                            <MapPin className="w-3 h-3" /> Geocoded on map
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" className="mt-2 gap-1"
                            onClick={async () => {
                              try {
                                const res = await base44.functions.invoke('geocodeDealerAddress', {
                                  street: form.business_address_street,
                                  city: form.business_address_city,
                                  state: form.business_address_state,
                                  zip: form.business_address_zip,
                                });
                                setForm(p => ({ ...p, store_address_geocoded: res.data }));
                              } catch (e) { alert('Geocoding failed'); }
                            }}>
                            <MapPin className="w-3 h-3" /> Geocode Address
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Set your business address in the Business tab above to appear on the map.</p>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <SaveBtn label="Save Dealer Profile" />
          </TabsContent>
        )}

        {/* ─────────────── ISO WANTED ITEMS TAB ─────────────── */}
        <TabsContent value="buyer_prefs" className="space-y-6">
          <Card className="bg-gradient-to-r from-orange-50 to-purple-50 border-orange-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Tell us what you're hunting for</h3>
                  <p className="text-sm text-slate-600">
                    Add items to your wanted list below and we'll automatically match them against every new estate sale that gets published. 
                    When a match is found, you'll get a notification — and the sale company will see that a motivated buyer is looking for their items.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <BuyerPrefsTab user={user} />
        </TabsContent>

        {/* ─────────────── SUBSCRIPTION TAB ─────────────── */}
        {!isConsumer && (
          <TabsContent value="subscription" className="space-y-4">
            {/* Current Plan Banner — prefer user.subscription_tier as source of truth */}
            {(user?.subscription_tier || subscription) && (() => {
              const tier = (user?.subscription_tier || subscription?.tier || '').toLowerCase();
              const planName = subscription?.plan_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                || (tier ? tier.replace(/\b\w/g, c => c.toUpperCase()) + ' Plan' : 'Active Plan');
              return (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Check className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-bold text-green-900">{planName}</h3>
                          <Badge className="bg-green-600 text-white">active</Badge>
                        </div>
                        {tier && <Badge className={getTierColor(tier)}>{tier.replace(/\b\w/g, c => c.toUpperCase())} Tier</Badge>}
                      </div>
                      <div className="text-right">
                        {subscription?.price > 0 && <>
                          <div className="text-2xl font-bold text-green-900">${subscription.price}</div>
                          <div className="text-sm text-green-700">per {subscription?.billing_period === 'monthly' ? 'month' : 'year'}</div>
                        </>}
                        {subscription?.renewal_date && <p className="text-xs text-green-600 mt-1">Renews {new Date(subscription.renewal_date).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Available Plans */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Available Plans</h3>
              {packages.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-slate-500">No packages available for your account type.</CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.map(pkg => {
                    const pkgData = pkg.data || pkg;
                    const tierOrder = { starter: 0, basic: 0, growth: 1, professional: 2, pro: 2, elite: 3, premium: 3 };
                    const activeTier = (user?.subscription_tier || subscription?.tier || '').toLowerCase();
                    const currentTierNum = tierOrder[activeTier] ?? -1;
                    const pkgTierNum = tierOrder[pkgData.tier_level] ?? 0;
                    const isCurrent = activeTier === pkgData.tier_level;
                    const isUpgrade = !isCurrent && pkgTierNum > currentTierNum;
                    const isDowngrade = !isCurrent && subscription && pkgTierNum < currentTierNum;

                    return (
                      <Card key={pkg.id} className={`relative flex flex-col ${isCurrent ? 'border-2 border-orange-500' : ''} ${pkgData.featured ? 'ring-2 ring-orange-300' : ''}`}>
                        {isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-orange-600 text-white text-xs px-3">Current Plan</Badge></div>}
                        {pkgData.featured && !isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-slate-800 text-white text-xs px-3">Recommended</Badge></div>}
                        <CardContent className="p-5 flex flex-col flex-1">
                          {/* Header */}
                          <div className="mb-4">
                            <Badge className={getTierColor(pkgData.tier_level) + ' mb-2'}>{pkgData.tier_level}</Badge>
                            <h3 className="text-xl font-bold text-slate-900">{pkgData.package_name}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkgData.description}</p>
                          </div>

                          {/* Pricing */}
                          <div className="py-3 border-t border-b border-slate-100 mb-4">
                            {pkgData.account_type === 'biz_in_a_box' ? (
                              <div className="space-y-1">
                                <div><span className="text-2xl font-bold">${pkgData.biz_in_a_box_setup_fee?.toLocaleString() || 0}</span><span className="text-sm text-slate-500 ml-1">one-time</span></div>
                                <div><span className="text-lg font-semibold">${pkgData.biz_in_a_box_monthly_year1}/mo</span><span className="text-sm text-slate-500 ml-1">Year 1</span></div>
                                <div className="text-sm text-slate-500">{pkgData.biz_in_a_box_revenue_share}% royalty</div>
                              </div>
                            ) : pkgData.pricing_model === 'per_item' ? (
                              <div>
                                {pkgData.monthly_price > 0 && <div><span className="text-2xl font-bold">${pkgData.monthly_price}</span><span className="text-sm text-slate-500 ml-1">/month</span></div>}
                                {pkgData.monthly_price === 0 && <div className="text-2xl font-bold text-green-700">Free</div>}
                                {pkgData.per_item_price > 0 && <div className="text-sm text-slate-500">+ ${pkgData.per_item_price} platform fee per sale</div>}
                                {pkgData.platform_fee_percentage > 0 && <div className="text-sm text-slate-500">+ {pkgData.platform_fee_percentage}% on sold items</div>}
                              </div>
                            ) : (
                              <div>
                                {pkgData.monthly_price === 0
                                  ? <div className="text-2xl font-bold text-green-700">Free</div>
                                  : <div><span className="text-2xl font-bold">${pkgData.monthly_price}</span><span className="text-sm text-slate-500 ml-1">/month</span></div>
                                }
                                {pkgData.annual_price > 0 && pkgData.monthly_price > 0 && (
                                  <div className="text-xs text-cyan-600 mt-0.5">
                                    ${pkgData.annual_price}/yr · save ${Math.round(pkgData.monthly_price * 12 - pkgData.annual_price)}
                                  </div>
                                )}
                                {pkgData.per_item_price > 0 && <div className="text-xs text-slate-500 mt-0.5">+ ${pkgData.per_item_price} per sale listing</div>}
                                {pkgData.per_lead_price > 0 && <div className="text-xs text-slate-500 mt-0.5">+ ${pkgData.per_lead_price} per lead</div>}
                                {pkgData.referral_fee_percentage > 0 && <div className="text-xs text-slate-500 mt-0.5">{pkgData.referral_fee_percentage}% referral fee on closed clients</div>}
                              </div>
                            )}
                          </div>

                          {/* Features */}
                          <div className="space-y-1.5 flex-1 mb-4">
                            {pkgData.features?.slice(0, 6).map((f, i) => (
                              <div key={i} className="flex gap-2 text-xs">
                                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-slate-600">{f}</span>
                              </div>
                            ))}
                            {pkgData.features?.length > 6 && <p className="text-xs text-slate-400 pl-5">+{pkgData.features.length - 6} more features</p>}
                          </div>

                          {/* Limits */}
                          {pkgData.limits && Object.values(pkgData.limits).some(v => v) && (
                            <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-1">
                              {Object.entries(pkgData.limits).map(([k, v]) => v ? (
                                <div key={k} className="flex justify-between text-xs">
                                  <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                                  <span className="font-medium text-slate-700">{v}</span>
                                </div>
                              ) : null)}
                            </div>
                          )}

                          {/* CTA */}
                          {isCurrent ? (
                            <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-700 font-semibold">
                              <Check className="w-4 h-4" /> Your Current Plan
                            </div>
                          ) : (
                            <Button size="sm" className="w-full" variant={isUpgrade ? 'default' : 'outline'}
                              onClick={() => alert('To change your plan, please contact support or visit your billing settings.')}>
                              {isUpgrade ? <><ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />Upgrade</> : isDowngrade ? <><ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" />Downgrade</> : 'Select Plan'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmModal.open} onOpenChange={(open) => setConfirmModal(p => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmModal.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmModal.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmModal(p => ({ ...p, open: false }))}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModal.onConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SharedFooter />
    </div>
  );
}