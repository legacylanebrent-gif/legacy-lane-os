import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, ShoppingBag, Camera, DollarSign, Calendar, MapPin } from 'lucide-react';

export default function DIYSaleSignup() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await base44.entities.SubscriptionPackage.list();
      const diyPackages = data.filter(pkg => 
        (pkg.data?.account_type || pkg.account_type) === 'diy_seller' && 
        (pkg.data?.is_active !== false)
      ).sort((a, b) => {
        const tierOrder = { basic: 1, pro: 2, premium: 3 };
        const tierA = a.data?.tier_level || a.tier_level;
        const tierB = b.data?.tier_level || b.tier_level;
        return tierOrder[tierA] - tierOrder[tierB];
      });
      setPackages(diyPackages);
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
      premium: 'bg-purple-100 text-purple-700'
    };
    return colors[tier] || 'bg-slate-100 text-slate-700';
  };

  const features = [
    { icon: Camera, title: 'Photo Listings', description: 'Upload high-quality photos of your items' },
    { icon: DollarSign, title: 'Set Your Prices', description: 'Full control over pricing and negotiations' },
    { icon: Calendar, title: 'Schedule Your Sale', description: 'Choose your own dates and times' },
    { icon: MapPin, title: 'Location Control', description: 'Host at your home or chosen venue' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
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
                <p className="text-xs text-orange-600">DIY Estate Sales</p>
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

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4">
            Run Your Own Estate Sale
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Take control and manage your estate sale from start to finish with our easy-to-use platform
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-12">
            Everything You Need to Succeed
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">Choose Your Plan</h2>
            <p className="text-slate-600 mb-6">Select the package that works best for your sale</p>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                onClick={() => setBillingPeriod('monthly')}
                className={billingPeriod === 'monthly' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === 'annual' ? 'default' : 'outline'}
                onClick={() => setBillingPeriod('annual')}
                className={billingPeriod === 'annual' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Annual <Badge className="ml-2 bg-green-600">Save 20%</Badge>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-slate-600">Loading packages...</div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No packages available at this time</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {packages.map(pkg => {
                const pkgData = pkg.data || pkg;
                const price = billingPeriod === 'annual' ? pkgData.annual_price : pkgData.monthly_price;
                return (
                  <Card key={pkg.id} className={`relative ${pkgData.featured ? 'border-2 border-purple-500 shadow-xl' : ''}`}>
                    {pkgData.featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-purple-600">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <Badge className={getTierColor(pkgData.tier_level)}>
                        {pkgData.tier_level}
                      </Badge>
                      <CardTitle className="text-2xl mt-4">{pkgData.package_name}</CardTitle>
                      <p className="text-sm text-slate-600">{pkgData.description}</p>
                      <div className="mt-6">
                        <div className="text-4xl font-bold text-slate-900">${price}</div>
                        <div className="text-sm text-slate-600">per {billingPeriod === 'annual' ? 'year' : 'month'}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pkgData.features && pkgData.features.length > 0 && (
                        <div className="space-y-2">
                          {pkgData.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-slate-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button className="w-full mt-6 bg-purple-600 hover:bg-purple-700">
                        Sign Up Now
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-serif font-bold text-slate-900 mb-8">Why Choose Legacy Lane?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold text-slate-900 mb-2">Easy to Use</h4>
              <p className="text-sm text-slate-600">Simple tools designed for anyone to run a successful sale</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold text-slate-900 mb-2">Full Control</h4>
              <p className="text-sm text-slate-600">You decide pricing, schedule, and how to run your sale</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold text-slate-900 mb-2">24/7 Support</h4>
              <p className="text-sm text-slate-600">Get help whenever you need it from our support team</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}