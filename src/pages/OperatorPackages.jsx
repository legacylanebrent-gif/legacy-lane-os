import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Star, ArrowLeft } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import OperatorTestimonials from '@/components/operators/OperatorTestimonials';
import LeadTestimonialBanner from '@/components/operators/LeadTestimonialBanner';
import DonationDocUploadModal from '@/components/operators/DonationDocUploadModal';

export default function OperatorPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('estate_sale_operator');
  const [showDonationDocModal, setShowDonationDocModal] = useState(false);
  const [pendingDonationPkg, setPendingDonationPkg] = useState(null);

  const PRICING_TABS = [
    { key: 'estate_sale_operator', label: 'Estate Sale Co' },
    { key: 'real_estate_agent', label: 'Agents' },
    { key: 'vendor', label: 'Vendors' },
    { key: 'consignor', label: 'Consignors' },
    { key: 'biz_in_a_box', label: 'Biz in a Box' },
    { key: 'diy_seller', label: 'DIY Sale' },
    { key: 'reseller', label: 'Resellers' },
  ];

  useEffect(() => {
    loadPackages(activeTab);
    processPostSignup();
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  // Open donation doc upload modal when returning from login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const donationPkgId = params.get('show_donation_doc');
    if (!donationPkgId) return;
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      try {
        const pkg = await base44.entities.SubscriptionPackage.get(donationPkgId);
        if (pkg) {
          setPendingDonationPkg(pkg);
          setShowDonationDocModal(true);
        }
      } catch (err) {
        console.error('Error loading donation package for doc upload:', err);
      }
    });
  }, []);

  const loadPackages = async (tab = activeTab) => {
    try {
      const data = await base44.entities.SubscriptionPackage.list();
      const operatorPackages = data.filter(pkg => {
        const accountType = pkg.data?.account_type || pkg.account_type;
        const isActive = pkg.data?.is_active !== false && pkg.is_active !== false;
        return accountType === tab && isActive;
      });
      
      // Sort by tier level (starter → growth → professional → elite)
      const tierOrder = { starter: 0, growth: 1, professional: 2, elite: 3, basic: 0, pro: 2, premium: 3 };
      operatorPackages.sort((a, b) => {
        const tierA = tierOrder[a.data?.tier_level || a.tier_level] ?? 99;
        const tierB = tierOrder[b.data?.tier_level || b.tier_level] ?? 99;
        return tierA - tierB;
      });
      
      setPackages(operatorPackages);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      basic: 'bg-slate-100 text-slate-700',
      pro: 'bg-blue-100 text-blue-700',
      premium: 'bg-orange-100 text-orange-700'
    };
    return colors[tier] || 'bg-slate-100 text-slate-700';
  };

  const processPostSignup = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return;

      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const pkgId = params.get('pkg');
      const accountType = params.get('type') || 'estate_sale_operator';

      const isDonation = params.get('donation') === '1';

      if (pkgId && isDonation) {
        // Donation partners must upload non-profit docs before account is activated.
        // Redirect back to this page with a flag to open the doc upload modal.
        const redirectUrl = `${window.location.pathname}?show_donation_doc=${pkgId}${ref ? `&ref=${ref}` : ''}`;
        window.location.href = redirectUrl;
        return;
      }

      if (pkgId) {
        const user = await base44.auth.me();
        
        // Update user to the selected account type (pre-qualifies them for onboarding)
        await base44.auth.updateMe({
          primary_account_type: accountType,
          selected_package: pkgId,
          subscription_tier: 'basic'
        });

        // Create referral if ref code exists
        if (ref) {
          try {
            await base44.functions.invoke('createReferral', { 
              referralCode: ref 
            });
          } catch (refError) {
            console.error('Error creating referral:', refError);
          }
        }

        // Clear params and redirect to dashboard
        window.history.replaceState({}, '', window.location.pathname);
        window.location.href = createPageUrl('Dashboard');
      }
    } catch (error) {
      console.error('Error processing post-signup:', error);
    }
  };

  const isDonationPackage = (pkgData) => (pkgData.package_name || '').toLowerCase().includes('donation');

  const handleSignUp = async (pkg) => {
    const pkgData = pkg.data || pkg;
    const accountType = pkgData.account_type || activeTab;

    // Donation partners must upload non-profit status docs before completing signup
    if (isDonationPackage(pkgData)) {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        let returnUrl = `${window.location.pathname}?pkg=${pkg.id}&type=${accountType}&donation=1`;
        if (ref) returnUrl += `&ref=${ref}`;
        base44.auth.redirectToLogin(returnUrl);
      } else {
        setPendingDonationPkg(pkg);
        setShowDonationDocModal(true);
      }
      return;
    }

    try {
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const pkgId = pkg.id;
        
        // Build return URL with package, account type, and ref info
        let returnUrl = `${window.location.pathname}?pkg=${pkgId}&type=${accountType}`;
        if (ref) {
          returnUrl += `&ref=${ref}`;
        }
        
        base44.auth.redirectToLogin(returnUrl);
      } else {
        // Already authenticated, process immediately
        const user = await base44.auth.me();
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');

        // Check if this is a downgrade (existing business user moving to a lower tier)
        const TIER_ORDER_LOCAL = { starter: 0, basic: 0, growth: 1, professional: 2, pro: 2, premium: 3, elite: 3 };
        const userRank = TIER_ORDER_LOCAL[user.subscription_tier] ?? -1;
        const pkgRank = TIER_ORDER_LOCAL[pkgData.tier_level] ?? -1;
        const isBusinessUser = user.primary_account_type && 
          user.primary_account_type !== 'consumer' && 
          user.primary_account_type !== 'user';
        const isDowngrade = isBusinessUser && userRank > pkgRank && pkgData.account_type !== 'biz_in_a_box';

        if (isDowngrade) {
          // Pro-rate: downgrade takes effect on next billing cycle date
          // User keeps current plan access until then
          const currentPeriodEnd = user.current_period_end || user.subscription_end_date;
          let effectiveDate;
          if (currentPeriodEnd) {
            effectiveDate = new Date(currentPeriodEnd);
          } else {
            // Default to end of current monthly billing cycle (30 days from now)
            effectiveDate = new Date();
            effectiveDate.setDate(effectiveDate.getDate() + 30);
          }

          await base44.auth.updateMe({
            pending_downgrade: {
              target_tier: pkgData.tier_level,
              target_package: pkg.id,
              target_account_type: accountType,
              effective_date: effectiveDate.toISOString(),
              requested_at: new Date().toISOString(),
            }
          });

          alert(`Your downgrade to ${pkgData.package_name} will take effect on ${effectiveDate.toLocaleDateString()}. ` +
                `You'll keep full access to your current plan until then, and the price difference will be pro-rated on your next billing cycle.`);
          window.location.href = createPageUrl('Dashboard');
        } else {
          const isUpgrade = isBusinessUser && userRank >= 0 && userRank < pkgRank && pkgData.account_type !== 'biz_in_a_box';

          if (isUpgrade) {
            // Pro-rated upgrade: create Wix checkout session with pro-rated charge + new subscription
            try {
              const response = await base44.functions.invoke('create-checkout', {
                product: 'subscription_upgrade',
                package_id: pkg.id,
              });
              if (response.data?.redirectUrl) {
                window.location.href = response.data.redirectUrl;
              } else {
                throw new Error('No redirect URL returned');
              }
            } catch (upgradeError) {
              console.error('Error creating upgrade checkout:', upgradeError);
              alert('There was an error processing your upgrade. Please try again.');
            }
          } else {
            // New signup — process immediately
            await base44.auth.updateMe({
              primary_account_type: accountType,
              selected_package: pkg.id,
              subscription_tier: pkgData.tier_level
            });

            // Create referral if ref exists
            if (ref) {
              try {
                await base44.functions.invoke('createReferral', { 
                  referralCode: ref 
                });
              } catch (refError) {
                console.error('Error creating referral:', refError);
              }
            }
            
            window.location.href = createPageUrl('Dashboard');
          }
        }
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      alert('There was an error. Please try again.');
    }
  };

  const handleDonationDocComplete = async (docUrl) => {
    const pkg = pendingDonationPkg;
    const pkgData = pkg?.data || pkg;
    const accountType = pkgData?.account_type || 'vendor';
    try {
      await base44.auth.updateMe({
        primary_account_type: accountType,
        selected_package: pkg.id,
        subscription_tier: pkgData?.tier_level || 'starter',
        nonprofit_doc_url: docUrl,
        nonprofit_doc_uploaded_at: new Date().toISOString()
      });

      // Create referral if ref exists
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        try {
          await base44.functions.invoke('createReferral', { referralCode: ref });
        } catch (refError) {
          console.error('Error creating referral:', refError);
        }
      }

      window.history.replaceState({}, '', window.location.pathname);
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Error completing donation signup:', error);
      alert('There was an error saving your information. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const isExistingBusinessUser = isAuthenticated && currentUser && 
    currentUser.primary_account_type && 
    currentUser.primary_account_type !== 'consumer' && 
    currentUser.primary_account_type !== 'user';

  const TIER_ORDER = { starter: 0, basic: 0, growth: 1, professional: 2, pro: 2, premium: 3, elite: 3 };
  const getTierRank = (tier) => TIER_ORDER[tier] ?? -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Select the subscription package that best fits your business — whether you run estate sales, 
            serve as a vendor or consignor, resell inventory, represent clients as an agent, or start 
            your own Legacy Lane estate sale co with our Business-in-a-Box
          </p>

          {/* Account Type Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {PRICING_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setLoading(true);
                  loadPackages(tab.key);
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Billing Toggle — hidden on Operator tab (shown below testimonial instead) */}
          {activeTab !== 'estate_sale_operator' && (
            <div className="flex items-center justify-center gap-4">
              <span className={`text-lg font-medium ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-orange-600"
              />
              <span className={`text-lg font-medium ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
                Annual
              </span>
              {isAnnual && (
                <Badge className="bg-green-600 text-white ml-2">Save up to 10%</Badge>
              )}
            </div>
          )}
        </div>

        {/* Lead Testimonial Banner — Operators only */}
        {activeTab === 'estate_sale_operator' && <LeadTestimonialBanner />}

        {/* Billing Toggle — Operators only, shown below testimonial */}
        {activeTab === 'estate_sale_operator' && (
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className={`text-lg font-medium ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-orange-600"
            />
            <span className={`text-lg font-medium ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Annual
            </span>
            {isAnnual && (
              <Badge className="bg-green-600 text-white ml-2">Save up to 10%</Badge>
            )}
          </div>
        )}

        {/* Packages Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {packages.map(pkg => {
            const pkgData = pkg.data || pkg;
            const price = isAnnual && pkgData.annual_price 
              ? (pkgData.annual_price / 12).toFixed(2)
              : pkgData.monthly_price;
            const billingAmount = isAnnual && pkgData.annual_price
              ? pkgData.annual_price
              : pkgData.monthly_price;
            const savings = isAnnual && pkgData.annual_price
              ? (pkgData.monthly_price * 12 - pkgData.annual_price).toFixed(0)
              : 0;

            // Detect if Google Lens API is included in this package
            const hasGoogleLensApi = 
              (pkgData.allowed_features || []).includes('serpapi') ||
              (pkgData.features || []).some(f => 
                typeof f === 'string' && (f.toLowerCase().includes('serp') || f.toLowerCase().includes('google lens'))
              );
            const isFreeTier = (pkgData.tier_level === 'basic' || pkgData.tier_level === 'starter') && 
              (pkgData.monthly_price === 0 || pkgData.monthly_price == null);

            // Determine button action based on user's current tier vs this package
            let buttonAction = 'signup';
            let buttonText = 'Sign Up Now';
            if (pkgData.account_type === 'biz_in_a_box') {
              buttonAction = 'get_started';
              buttonText = 'Get Started';
            } else if (isExistingBusinessUser) {
              const userRank = getTierRank(currentUser.subscription_tier);
              const pkgRank = getTierRank(pkgData.tier_level);
              if (userRank === pkgRank && currentUser.primary_account_type === activeTab) {
                buttonAction = 'current';
                buttonText = 'Current Plan';
              } else if (userRank > pkgRank) {
                buttonAction = 'downgrade';
                buttonText = 'Downgrade';
              } else {
                buttonAction = 'upgrade';
                buttonText = 'Upgrade';
              }
            }

            return (
              <Card 
                key={pkg.id} 
                className={`relative ${pkgData.featured ? 'border-2 border-orange-500 shadow-xl scale-105' : 'border border-slate-200'}`}
              >
                {pkgData.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-600 text-white px-4 py-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                <Badge className={`${getTierColor(pkgData.tier_level)} w-fit mx-auto mb-4`}>
                 {pkgData.tier_level}
                </Badge>
                <CardTitle className="text-3xl mb-2">{pkgData.package_name}</CardTitle>
                {pkgData.package_name === 'Elite' && (
                 <div className="mb-3">
                    <Badge className="bg-purple-600 text-white text-xs px-2 py-1 w-fit mx-auto block">
                      ⭐ Featured on Company Finder
                    </Badge>
                  </div>
                 )}
                <p className="text-slate-600 text-sm">{pkgData.description}</p>
                </CardHeader>

                <CardContent>
                  {/* Pricing */}
                  <div className="text-center mb-6 pb-6 border-b">
                    {pkgData.account_type === 'estate_sale_operator' && pkgData.monthly_price !== 0 && pkgData.monthly_price != null && (
                      <div className="mb-2">
                        <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                          14-Day Free Trial Available
                        </Badge>
                      </div>
                    )}

                    {pkgData.account_type === 'biz_in_a_box' ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-4xl font-bold text-slate-900">${pkgData.biz_in_a_box_setup_fee?.toLocaleString() || '0'}</div>
                          <div className="text-sm text-slate-600">One-Time Investment</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-900">${pkgData.biz_in_a_box_monthly_year1 || '0'}/mo</div>
                          <div className="text-sm text-slate-600">Monthly Fee (Year 1)</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-900">{pkgData.biz_in_a_box_revenue_share || '0'}%</div>
                          <div className="text-sm text-slate-600">Royalty Fee</div>
                        </div>
                      </div>
                    ) : pkgData.pricing_model === 'per_item' ? (
                      <div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold text-slate-900">${pkgData.per_item_price}</span>
                          <span className="text-slate-600">/item</span>
                        </div>
                        {pkgData.platform_fee_percentage && (
                          <p className="text-sm text-slate-600 mt-2">
                            + {pkgData.platform_fee_percentage}% platform fee
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold text-slate-900">${price}</span>
                          <span className="text-slate-600">/mo</span>
                        </div>
                        {pkgData.account_type === 'estate_sale_operator' && (
                          <p className="text-sm text-slate-500 mt-1">after 14-day trial</p>
                        )}
                        {pkgData.per_item_price != null && (
                          <p className="text-sm text-slate-600 mt-1">
                            + ${pkgData.per_item_price} per sale listing
                          </p>
                        )}
                        {pkgData.per_lead_price != null && (
                          <p className="text-sm text-slate-600 mt-1">
                            + ${pkgData.per_lead_price} per lead
                          </p>
                        )}
                        {pkgData.referral_fee_percentage && (
                          <p className="text-sm text-slate-600 mt-1">
                            + {pkgData.referral_fee_percentage}% referral fee per closed client
                          </p>
                        )}
                        {isAnnual && pkgData.annual_price && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-slate-600">
                              Billed ${billingAmount} annually
                            </p>
                            {savings > 0 && (
                              <p className="text-sm text-green-600 font-semibold">
                                Save ${savings} per year
                              </p>
                            )}
                          </div>
                        )}
                        {!isAnnual && (
                          <p className="text-sm text-slate-600 mt-2">
                            Billed ${billingAmount} monthly
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Limits */}
                  {pkgData.limits && (
                    <div className="space-y-3 mb-6">
                      {Object.entries(pkgData.limits).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <span className="font-semibold text-slate-700 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-slate-600 ml-1">{value}</span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Google Lens API limit notice */}
                  {hasGoogleLensApi && (
                    <div className={`mb-6 p-3 rounded-lg text-sm ${
                      isFreeTier 
                        ? 'bg-amber-50 border border-amber-200 text-amber-800' 
                        : 'bg-slate-50 border border-slate-200 text-slate-600'
                    }`}>
                      <p className="font-semibold flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Google Lens API Searches: Limited to 50 per month
                      </p>
                      {isFreeTier && (
                        <p className="mt-1 text-amber-700">
                          On the free plan, Google Lens search is capped at 50 searches to keep things sustainable. 
                          Upgrade anytime for higher limits.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Features */}
                  {pkgData.features && pkgData.features.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {pkgData.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Start Free Trial Button — Operators only, not for existing business users upgrading */}
                  {pkgData.account_type === 'estate_sale_operator' && !isExistingBusinessUser && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                      onClick={() => handleSignUp(pkg)}
                    >
                      Start Free Trial
                    </Button>
                  )}
                  
                  {/* Sign Up / Upgrade / Downgrade Button */}
                  <Button
                    className={`w-full ${pkgData.account_type !== 'biz_in_a_box' && buttonAction !== 'current' ? 'mt-3' : ''} ${
                      buttonAction === 'current'
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : buttonAction === 'downgrade'
                          ? 'bg-slate-600 hover:bg-slate-700 text-white'
                          : pkgData.featured 
                            ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    size="lg"
                    disabled={buttonAction === 'current'}
                    onClick={() => handleSignUp(pkg)}
                  >
                    {buttonText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {packages.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">No packages available at this time.</p>
          </div>
        )}

        {/* Trust Section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">
            Top 3 plans include 24/7 AI support, tickets and a 30-day money-back guarantee
          </p>
          <p className="text-sm text-slate-500">
            Need help choosing? <a href="#" className="text-orange-600 hover:underline">Contact our team</a>
          </p>
        </div>

        {/* Testimonials */}
        <OperatorTestimonials accountType={activeTab} />
      </div>

      <SharedFooter />

      <DonationDocUploadModal
        open={showDonationDocModal}
        onClose={() => { setShowDonationDocModal(false); setPendingDonationPkg(null); }}
        onComplete={handleDonationDocComplete}
      />
    </div>
  );
}