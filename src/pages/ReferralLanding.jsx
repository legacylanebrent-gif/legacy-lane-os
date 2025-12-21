import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, ArrowRight, Users, DollarSign, TrendingUp, 
  Calendar, Package, Sparkles, BarChart, MessageSquare, Home
} from 'lucide-react';

export default function ReferralLanding() {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [referrer, setReferrer] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('ref');
      setReferralCode(code || '');

      // Load packages
      const packageData = await base44.entities.SubscriptionPackage.filter({ 
        account_type: 'estate_sale_operator',
        is_active: true 
      });
      setPackages(packageData.sort((a, b) => {
        const tierOrder = { basic: 1, pro: 2, premium: 3 };
        return tierOrder[a.tier_level] - tierOrder[b.tier_level];
      }));

      // If there's a referral code, try to find the referrer
      if (code) {
        // The referral code is the first 8 chars of user ID
        const users = await base44.asServiceRole.entities.User.list();
        const referrerUser = users.find(u => u.id.slice(0, 8).toUpperCase() === code);
        if (referrerUser) {
          setReferrer(referrerUser);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    // Redirect to onboarding with referral code
    if (referralCode) {
      navigate(createPageUrl('Onboarding') + `?ref=${referralCode}&type=estate_sale_operator`);
    } else {
      navigate(createPageUrl('Onboarding') + '?type=estate_sale_operator');
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'basic': return 'bg-blue-100 text-blue-700';
      case 'pro': return 'bg-purple-100 text-purple-700';
      case 'premium': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const features = [
    {
      icon: Calendar,
      title: 'Sale Management',
      description: 'Create and manage estate sales with ease. Track dates, items, and revenue in one place.'
    },
    {
      icon: DollarSign,
      title: 'Transaction Tracking',
      description: 'Process sales, track multiple payment methods, and automatically calculate commissions.'
    },
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'List items on the marketplace, manage bundles, and track what sells.'
    },
    {
      icon: BarChart,
      title: 'Analytics & Reports',
      description: 'Get insights on your sales performance, revenue trends, and customer data.'
    },
    {
      icon: Users,
      title: 'Client Management',
      description: 'Manage relationships with sellers, track commissions, and handle payments.'
    },
    {
      icon: MessageSquare,
      title: 'Marketing Tools',
      description: 'Create professional signs, share on social media, and reach more buyers.'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-white">Legacy Lane</h1>
                <p className="text-xs text-orange-400">Estate Sale Management</p>
              </div>
            </div>
            <Button onClick={handleSignUp} className="bg-orange-600 hover:bg-orange-700">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {referrer && (
            <div className="mb-6 inline-block">
              <Badge className="bg-green-100 text-green-700 text-base px-4 py-2">
                <Users className="w-4 h-4 mr-2" />
                Referred by {referrer.company_name || referrer.full_name}
              </Badge>
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 mb-6">
            Grow Your Estate Sale Business
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Join Legacy Lane and get the complete platform to manage sales, track inventory, 
            process payments, and grow your estate sale operation.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={handleSignUp} 
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('Home'))}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
            >
              <Home className="w-5 h-5 mr-2" />
              Browse Sales
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-8 text-center">
            Everything You Need to Run Estate Sales
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Packages */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2 text-center">
            Choose Your Plan
          </h2>
          <p className="text-slate-600 text-center mb-8">
            Start with a free trial, then select the plan that fits your business
          </p>
          
          {packages.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id}
                  className={`bg-white hover:shadow-xl transition-shadow ${
                    pkg.featured ? 'border-2 border-orange-500 shadow-lg' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={getTierColor(pkg.tier_level)}>
                        {pkg.tier_level}
                      </Badge>
                      {pkg.featured && (
                        <Badge className="bg-orange-600 text-white">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {pkg.package_name}
                    </h3>
                    
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-slate-900">
                          ${pkg.monthly_price}
                        </span>
                        <span className="text-slate-600">/month</span>
                      </div>
                      {pkg.annual_price && (
                        <p className="text-sm text-green-600 mt-1">
                          Save ${(pkg.monthly_price * 12 - pkg.annual_price).toFixed(0)}/year with annual billing
                        </p>
                      )}
                    </div>

                    {pkg.description && (
                      <p className="text-slate-600 text-sm mb-4">{pkg.description}</p>
                    )}

                    {pkg.limits && (
                      <div className="mb-6 space-y-2 text-sm">
                        {pkg.limits.listings && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {pkg.limits.listings} listings
                          </div>
                        )}
                        {pkg.limits.photos && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {pkg.limits.photos} photos per listing
                          </div>
                        )}
                        {pkg.limits.storage && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {pkg.limits.storage} storage
                          </div>
                        )}
                      </div>
                    )}

                    {pkg.features && pkg.features.length > 0 && (
                      <div className="mb-6 space-y-2">
                        {pkg.features.slice(0, 5).map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      onClick={handleSignUp}
                      className={`w-full ${
                        pkg.featured 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-600">Loading pricing plans...</p>
            </Card>
          )}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Estate Sale Business?
            </h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of estate sale professionals using Legacy Lane to streamline 
              operations and grow their business.
            </p>
            <Button 
              onClick={handleSignUp}
              size="lg"
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="bg-slate-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">
            © 2024 Legacy Lane. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}