import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Building2, Users, TrendingUp, Target, Award } from 'lucide-react';

export default function AgentSignup() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await base44.entities.SubscriptionPackage.list();
      const agentPackages = data.filter(pkg => 
        (pkg.data?.account_type || pkg.account_type) === 'real_estate_agent' && 
        (pkg.data?.is_active !== false)
      ).sort((a, b) => {
        const tierOrder = { basic: 1, pro: 2, premium: 3 };
        const tierA = a.data?.tier_level || a.tier_level;
        const tierB = b.data?.tier_level || b.tier_level;
        return tierOrder[tierA] - tierOrder[tierB];
      });
      setPackages(agentPackages);
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

  const features = [
    { icon: Users, title: 'Quality Leads', description: 'Access to motivated sellers and buyers' },
    { icon: TrendingUp, title: 'More Listings', description: 'Expand your portfolio with estate properties' },
    { icon: Target, title: 'Targeted Marketing', description: 'Reach the right audience at the right time' },
    { icon: Award, title: 'Preferred Status', description: 'Stand out as a verified preferred agent' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back Home</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">LL</span>
                </div>
                <div>
                  <h1 className="text-xl font-serif font-bold text-slate-900">Legacy Lane</h1>
                  <p className="text-xs text-orange-600">For Real Estate Agents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-serif font-bold text-slate-900 mb-4">
            Become a Preferred Agent
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Connect with estate sellers, probate leads, and grow your real estate business
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center mb-12">
            Grow Your Real Estate Business
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
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
            <p className="text-slate-600 mb-6">Select the package that matches your business goals</p>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                onClick={() => setBillingPeriod('monthly')}
                className={billingPeriod === 'monthly' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === 'annual' ? 'default' : 'outline'}
                onClick={() => setBillingPeriod('annual')}
                className={billingPeriod === 'annual' ? 'bg-blue-600 hover:bg-blue-700' : ''}
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
                  <Card key={pkg.id} className={`relative ${pkgData.featured ? 'border-2 border-blue-500 shadow-xl' : ''}`}>
                    {pkgData.featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-600">Recommended</Badge>
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
                      <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
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
          <h3 className="text-2xl font-serif font-bold text-slate-900 mb-8">Join Thousands of Successful Agents</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold text-slate-900 mb-2">Exclusive Leads</h4>
              <p className="text-sm text-slate-600">Get first access to estate and probate property leads</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold text-slate-900 mb-2">Verified Profile</h4>
              <p className="text-sm text-slate-600">Stand out with your preferred agent badge</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold text-slate-900 mb-2">Marketing Tools</h4>
              <p className="text-sm text-slate-600">Access professional templates and automation</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}