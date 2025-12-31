import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Star, ArrowLeft } from 'lucide-react';

export default function OperatorPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    loadPackages();
    processPostSignup();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await base44.entities.SubscriptionPackage.list();
      const operatorPackages = data.filter(pkg => {
        const accountType = pkg.data?.account_type || pkg.account_type;
        const isActive = pkg.data?.is_active !== false && pkg.is_active !== false;
        return accountType === 'estate_sale_operator' && isActive;
      });
      
      // Sort by tier
      operatorPackages.sort((a, b) => {
        const tierOrder = { basic: 1, pro: 2, premium: 3 };
        const tierA = a.data?.tier_level || a.tier_level;
        const tierB = b.data?.tier_level || b.tier_level;
        return tierOrder[tierA] - tierOrder[tierB];
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

      if (pkgId) {
        const user = await base44.auth.me();
        
        // Update user to operator account type
        await base44.auth.updateMe({
          primary_account_type: 'estate_sale_operator',
          selected_package: pkgId,
          subscription_tier: 'basic'
        });

        // Create referral if ref code exists
        if (ref) {
          try {
            const users = await base44.asServiceRole.entities.User.list();
            const referrer = users.find(u => u.id.slice(0, 8).toUpperCase() === ref);
            
            if (referrer) {
              await base44.asServiceRole.entities.Referral.create({
                referrer_id: referrer.id,
                referrer_name: referrer.full_name,
                referrer_email: referrer.email,
                referred_user_id: user.id,
                referred_user_name: user.full_name,
                referred_user_email: user.email,
                account_type: 'estate_sale_operator',
                status: 'converted',
                referral_code: ref
              });

              // Create connection for the referrer
              await base44.asServiceRole.entities.Connection.create({
                account_owner_id: referrer.id,
                account_owner_type: 'estate_sale_operator',
                connected_user_id: user.id,
                connected_user_name: user.full_name,
                connected_user_email: user.email,
                connection_type: 'referral',
                source: 'operator_signup'
              });
            }
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

  const handleSignUp = async (pkg) => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const pkgId = pkg.id;
        
        // Build return URL with package and ref info
        let returnUrl = `${window.location.pathname}?pkg=${pkgId}`;
        if (ref) {
          returnUrl += `&ref=${ref}`;
        }
        
        base44.auth.redirectToLogin(returnUrl);
      } else {
        // Already authenticated, process immediately
        const user = await base44.auth.me();
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        
        await base44.auth.updateMe({
          primary_account_type: 'estate_sale_operator',
          selected_package: pkg.id,
          subscription_tier: pkg.data?.tier_level || pkg.tier_level
        });

        // Create referral if ref exists
        if (ref) {
          try {
            const users = await base44.asServiceRole.entities.User.list();
            const referrer = users.find(u => u.id.slice(0, 8).toUpperCase() === ref);
            
            if (referrer) {
              await base44.asServiceRole.entities.Referral.create({
                referrer_id: referrer.id,
                referrer_name: referrer.full_name,
                referrer_email: referrer.email,
                referred_user_id: user.id,
                referred_user_name: user.full_name,
                referred_user_email: user.email,
                account_type: 'estate_sale_operator',
                status: 'converted',
                referral_code: ref
              });

              await base44.asServiceRole.entities.Connection.create({
                account_owner_id: referrer.id,
                account_owner_type: 'estate_sale_operator',
                connected_user_id: user.id,
                connected_user_name: user.full_name,
                connected_user_email: user.email,
                connection_type: 'referral',
                source: 'operator_signup'
              });
            }
          } catch (refError) {
            console.error('Error creating referral:', refError);
          }
        }
        
        window.location.href = createPageUrl('Dashboard');
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      alert('There was an error. Please try again.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-slate-900">Legacy Lane</h1>
                <p className="text-xs text-orange-600">Estate Sale Operators</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back Home</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Select the subscription package that best fits your estate sale business needs
          </p>

          {/* Billing Toggle */}
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
        </div>

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
                  <p className="text-slate-600 text-sm">{pkgData.description}</p>
                </CardHeader>

                <CardContent>
                  {/* Pricing */}
                  <div className="text-center mb-6 pb-6 border-b">
                    <div className="mb-2">
                      <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                        FREE 1 Month Trial
                      </Badge>
                    </div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-slate-900">${price}</span>
                      <span className="text-slate-600">/mo</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">after trial period</p>
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

                  {/* Sign Up Button */}
                  <Button
                    className={`w-full ${
                      pkgData.featured 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                    size="lg"
                    onClick={() => handleSignUp(pkg)}
                  >
                    Sign Up Now
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
            All plans include 24/7 support and a 30-day money-back guarantee
          </p>
          <p className="text-sm text-slate-500">
            Need help choosing? <a href="#" className="text-orange-600 hover:underline">Contact our team</a>
          </p>
        </div>
      </div>
    </div>
  );
}