import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import {
  ArrowLeft, Check, TrendingUp, Briefcase, Star, Network, DollarSign,
  Scale, Calculator, Heart, Truck, SprayCan, Wrench, ShoppingBag,
  Package, Users, Shield, Camera, Clipboard, HardHat, Palette,
  Flower2, Drill, Coins, Store, Gavel, Gem, Building2, Warehouse,
  Container, Ship, PlusCircle
} from 'lucide-react';

// ─── Vendor Categories & Types (aligned to Vendor entity schema) ───
const VENDOR_CATEGORIES = [
  {
    key: 'real_estate_legal',
    label: 'Real Estate & Legal',
    icon: Scale,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    types: [
      { value: 'real_estate_agent', label: 'Real Estate Agent' },
      { value: 'probate_attorney', label: 'Probate Attorney' },
      { value: 'estate_planning_attorney', label: 'Estate Planning Attorney' },
      { value: 'elder_law_attorney', label: 'Elder Law Attorney' },
      { value: 'title_company', label: 'Title Company' },
    ],
  },
  {
    key: 'financial_life_transition',
    label: 'Financial & Life Transition',
    icon: Calculator,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    types: [
      { value: 'mortgage_broker', label: 'Mortgage Broker' },
      { value: 'financial_advisor', label: 'Financial Advisor' },
      { value: 'cpa_tax_strategist', label: 'CPA / Tax Strategist' },
      { value: 'trust_administrator', label: 'Trust Administrator' },
      { value: 'insurance_agent', label: 'Insurance Agent' },
    ],
  },
  {
    key: 'senior_transition',
    label: 'Senior Transition',
    icon: Heart,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    types: [
      { value: 'senior_move_manager', label: 'Senior Move Manager' },
      { value: 'assisted_living_placement', label: 'Assisted Living Placement' },
      { value: 'home_care_agency', label: 'Home Care Agency' },
      { value: 'geriatric_care_manager', label: 'Geriatric Care Manager' },
    ],
  },
  {
    key: 'cleanout_prep',
    label: 'Cleanout & Prep',
    icon: Truck,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    types: [
      { value: 'junk_removal', label: 'Junk Removal' },
      { value: 'cleanout_crew', label: 'Cleanout Crew' },
      { value: 'dumpster_rental', label: 'Dumpster Rental' },
      { value: 'biohazard_cleanup', label: 'Biohazard Cleanup' },
      { value: 'hoarding_cleanup', label: 'Hoarding Cleanup' },
    ],
  },
  {
    key: 'cleaning_staging',
    label: 'Cleaning & Staging',
    icon: SprayCan,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    types: [
      { value: 'deep_cleaning', label: 'Deep Cleaning' },
      { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
      { value: 'odor_removal', label: 'Odor Removal' },
      { value: 'home_stager', label: 'Home Stager' },
    ],
  },
  {
    key: 'light_repair_prep',
    label: 'Light Repair & Prep',
    icon: Wrench,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    types: [
      { value: 'handyman', label: 'Handyman' },
      { value: 'painter', label: 'Painter' },
      { value: 'landscaper', label: 'Landscaper' },
      { value: 'flooring_installer', label: 'Flooring Installer' },
    ],
  },
  {
    key: 'specialty_contractors',
    label: 'Specialty Contractors',
    icon: HardHat,
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    types: [
      { value: 'general_contractor', label: 'General Contractor' },
      { value: 'electrician', label: 'Electrician' },
      { value: 'plumber', label: 'Plumber' },
      { value: 'hvac_technician', label: 'HVAC Technician' },
      { value: 'roofer', label: 'Roofer' },
      { value: 'carpenter', label: 'Carpenter' },
      { value: 'tile_installer', label: 'Tile Installer' },
      { value: 'masonry_brick', label: 'Masonry & Brick' },
      { value: 'window_door_installer', label: 'Window & Door Installer' },
      { value: 'siding_contractor', label: 'Siding Contractor' },
      { value: 'deck_patio_builder', label: 'Deck & Patio Builder' },
      { value: 'kitchen_bath_remodeler', label: 'Kitchen & Bath Remodeler' },
      { value: 'basement_attic_finisher', label: 'Basement & Attic Finisher' },
      { value: 'foundation_repair', label: 'Foundation Repair' },
      { value: 'mold_remediation', label: 'Mold Remediation' },
      { value: 'water_damage_restoration', label: 'Water Damage Restoration' },
      { value: 'fire_damage_restoration', label: 'Fire Damage Restoration' },
      { value: 'fencing_contractor', label: 'Fencing Contractor' },
      { value: 'gutter_installer', label: 'Gutter Installer' },
      { value: 'chimney_sweep_repair', label: 'Chimney Sweep & Repair' },
    ],
  },
  {
    key: 'buyer_facing',
    label: 'Buyers & Resellers',
    icon: ShoppingBag,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    types: [
      { value: 'antique_dealer', label: 'Antique Dealer' },
      { value: 'gold_silver_coins_buyer', label: 'Gold, Silver & Coins Buyer' },
      { value: 'vintage_reseller', label: 'Vintage Reseller' },
      { value: 'consignment_shop', label: 'Consignment Shop' },
      { value: 'auction_house', label: 'Auction House' },
      { value: 'appraiser', label: 'Appraiser' },
    ],
  },
  {
    key: 'moving_logistics',
    label: 'Moving & Logistics',
    icon: Package,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    types: [
      { value: 'moving_company', label: 'Moving Company' },
      { value: 'storage_facility', label: 'Storage Facility' },
      { value: 'pods_container', label: 'PODS / Container' },
      { value: 'shipping_service', label: 'Shipping Service' },
    ],
  },
  {
    key: 'community_donation',
    label: 'Community & Donation',
    icon: Heart,
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    types: [
      { value: 'donation_company', label: 'Donation Pickup Company' },
    ],
  },
];

export default function VendorSignup() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDonationCompany, setIsDonationCompany] = useState(false);

  useEffect(() => {
    checkAuth();
    loadPackages();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = createPageUrl('MyProfile');
    } else {
      base44.auth.redirectToLogin(createPageUrl('VendorSignup'));
    }
  };

  const handleSelectDonation = () => {
    setIsDonationCompany(true);
    if (isAuthenticated) {
      window.location.href = createPageUrl('MyProfile');
    } else {
      base44.auth.redirectToLogin(createPageUrl('VendorSignup'));
    }
  };

  const loadPackages = async () => {
    try {
      const data = await base44.entities.SubscriptionPackage.list();
      const vendorPackages = data.filter(pkg => {
        const acct = pkg.account_type;
        return acct === 'vendor' && pkg.is_active !== false;
      }).sort((a, b) => {
        const tierOrder = { starter: 1, growth: 2, professional: 3, elite: 4 };
        return (tierOrder[a.tier_level] || 1) - (tierOrder[b.tier_level] || 1);
      });
      setPackages(vendorPackages);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      starter: 'bg-slate-100 text-slate-700',
      growth: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      elite: 'bg-amber-100 text-amber-700',
    };
    return colors[tier] || 'bg-slate-100 text-slate-700';
  };

  const benefits = [
    { icon: Briefcase, title: 'Service Listings', description: 'Showcase your services to estate professionals and families' },
    { icon: Network, title: 'Network Access', description: 'Connect with Estate Sale Companies, agents, and homeowners' },
    { icon: Star, title: 'Verified Reviews', description: 'Build your reputation with verified client reviews' },
    { icon: DollarSign, title: 'Lead Generation', description: 'Receive qualified service requests from people who need you' },
    { icon: Shield, title: 'Insurance Verified', description: 'Stand out with verified credentials and insurance badges' },
    { icon: Users, title: 'Direct Matching', description: 'Get matched to estate sale companies actively seeking vendors' },
  ];

  const totalServiceTypes = VENDOR_CATEGORIES.reduce((sum, c) => sum + c.types.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <UniversalHeader user={null} isAuthenticated={false} />

      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back Home</span>
        </Link>
      </div>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4">
            Join Our Vendor Network
          </h1>
          <p className="text-xl text-slate-600 mb-4 max-w-2xl mx-auto">
            Connect with estate sale companies and families navigating life transitions. 
            We cover {totalServiceTypes} service types across 9 categories.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-full">
            <Users className="w-4 h-4" />
            <span>Growing network of trusted professionals nationwide</span>
          </div>
          <div className="mt-8">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white text-lg px-10 py-6 rounded-xl shadow-lg"
            >
              Join the Network — Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Vendor Categories Grid */}
      <section className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-2">
            Services We're Looking For
          </h2>
          <p className="text-slate-500 text-center mb-10">
            {totalServiceTypes} service types across every stage of an estate transition
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VENDOR_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isExpanded = expandedCategory === cat.key;

              return (
                <Card
                  key={cat.key}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isExpanded ? 'ring-2 ring-green-500 shadow-lg' : 'border-slate-200'
                  }`}
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{cat.label}</h3>
                        <span className="text-xs text-slate-400">{cat.types.length} types</span>
                      </div>
                    </div>

                    {/* Expanded view — list all types */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        {cat.types.map((t) => (
                          <div key={t.value} className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            <span className="text-slate-700">{t.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Collapsed preview — show first 3 */}
                    {!isExpanded && (
                      <div className="mt-1 space-y-1">
                        {cat.types.slice(0, 3).map((t) => (
                          <div key={t.value} className="flex items-center gap-2 text-xs">
                            <div className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                            <span className="text-slate-500">{t.label}</span>
                          </div>
                        ))}
                        {cat.types.length > 3 && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            +{cat.types.length - 3} more — click to expand
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Catch-all */}
          <div className="text-center mt-6">
            <Badge variant="outline" className="text-sm py-1.5 px-4 border-slate-300 text-slate-600">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Don't see your service? Select "Other" when signing up
            </Badge>
          </div>

          {/* Free Forever banner for Donation Companies */}
          {expandedCategory === 'community_donation' && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-pink-50 to-green-50 border-2 border-pink-200 rounded-2xl p-8 text-center shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Free Forever for Donation Companies</h3>
                <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                  As a thank you for the work you do in our communities, donation pickup companies get full access to the EstateSalen vendor network at no cost — no subscription fee, ever.
                </p>
                <Badge className="bg-green-600 text-white text-sm py-1.5 px-4 mb-4">$0/month · $0/year · Always Free</Badge>
                <div>
                  <Button
                    onClick={handleSelectDonation}
                    size="lg"
                    className="bg-pink-600 hover:bg-pink-700 text-white text-lg px-8 py-4 rounded-xl shadow-lg"
                  >
                    Join Free as a Donation Company
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Why Join */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-12">
            Why Join EstateSalen?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <b.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-slate-500">{b.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Choose Your Plan</h2>
            <p className="text-slate-600 mb-6">Select the package that fits your business</p>

            <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <Button
                variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingPeriod('monthly')}
                className={billingPeriod === 'monthly' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === 'annual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingPeriod('annual')}
                className={billingPeriod === 'annual' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Annual <Badge className="ml-1.5 bg-green-600 text-xs">Save 20%</Badge>
              </Button>
            </div>
          </div>

          {/* Donation Company Free Forever callout */}
          <div className="max-w-2xl mx-auto mb-8 bg-gradient-to-r from-pink-50 to-green-50 border border-pink-200 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-pink-600" />
              <span className="font-semibold text-slate-800">Donation Pickup Company?</span>
            </div>
            <p className="text-sm text-slate-600">Your account is <strong className="text-green-700">always free</strong> — select "Community & Donation" above to get started at no cost.</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-slate-400">Loading plans...</div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No packages available right now. Check back soon.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {packages.map(pkg => {
                const price = billingPeriod === 'annual' ? pkg.annual_price : pkg.monthly_price;
                const featured = pkg.featured || pkg.tier_level === 'professional';
                return (
                  <Card key={pkg.id} className={`relative ${featured ? 'border-2 border-green-500 shadow-xl' : 'border-slate-200'}`}>
                    {featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-green-600 shadow-md">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <Badge className={`mx-auto ${getTierColor(pkg.tier_level)}`}>
                        {pkg.tier_level}
                      </Badge>
                      <CardTitle className="text-xl mt-3">{pkg.package_name}</CardTitle>
                      <p className="text-sm text-slate-500">{pkg.description}</p>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-slate-900">${price}</span>
                        <span className="text-sm text-slate-500">/{billingPeriod === 'annual' ? 'yr' : 'mo'}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pkg.features?.length > 0 && (
                        <div className="space-y-2">
                          {pkg.features.map((f, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-slate-700">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {pkg.limits && (
                        <div className="text-xs text-slate-400 space-y-0.5 pt-2 border-t border-slate-100">
                          {Object.entries(pkg.limits).map(([k, v]) => (
                            <div key={k}>{k.replace(/_/g, ' ')}: {v}</div>
                          ))}
                        </div>
                      )}
                      <Button
                        onClick={handleGetStarted}
                        className={`w-full mt-4 ${featured ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trust */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-8">Trusted by Professionals</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: 'Quality Leads', desc: 'Get matched with estate sale companies actively seeking your services' },
              { title: 'Build Reputation', desc: 'Grow your business with verified reviews and a professional profile' },
              { title: 'Easy Management', desc: 'Manage bids, clients, and your service profile from one dashboard' },
            ].map((item, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-6 text-center">
                  <Star className="w-6 h-6 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}