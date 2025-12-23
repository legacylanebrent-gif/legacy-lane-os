import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Check, Star, Briefcase, Globe, GraduationCap, Phone, FileText,
  Megaphone, BarChart3, Users, Shield, Rocket, Zap, TrendingUp,
  Award, Target, DollarSign, Package, Calendar, Mail, Video, Smartphone, Clock
} from 'lucide-react';

export default function BizInABox() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    experience: '',
    why_interested: '',
    start_timeline: '',
    investment_ready: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [pricing, setPricing] = useState({
    setup_fee: 2997,
    monthly_year1: 149,
    revenue_share: 3
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const packages = await base44.entities.SubscriptionPackage.filter({
        account_type: 'biz_in_a_box'
      });
      
      if (packages.length > 0) {
        const pkg = packages[0];
        setPricing({
          setup_fee: pkg.biz_in_a_box_setup_fee || 2997,
          monthly_year1: pkg.biz_in_a_box_monthly_year1 || 149,
          revenue_share: pkg.biz_in_a_box_revenue_share || 3
        });
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.Lead.create({
        lead_type: 'biz_in_a_box',
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        location: `${formData.city}, ${formData.state}`,
        message: `Experience: ${formData.experience}\nInterest: ${formData.why_interested}\nTimeline: ${formData.start_timeline}\nInvestment Ready: ${formData.investment_ready}`,
        status: 'new',
        source: 'biz_in_a_box_page'
      });
      alert('Thank you! We will contact you within 24 hours to discuss your business opportunity.');
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        experience: '',
        why_interested: '',
        start_timeline: '',
        investment_ready: ''
      });
    } catch (error) {
      alert('Error submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    {
      icon: Briefcase,
      title: 'Complete Business Formation',
      description: 'LLC filing, EIN registration, business bank account setup',
      color: 'text-orange-600'
    },
    {
      icon: Globe,
      title: 'Professional Website + 12 Months Hosting',
      description: 'Custom-branded website with booking system, gallery, and SEO optimization',
      color: 'text-cyan-600'
    },
    {
      icon: Megaphone,
      title: 'Complete Marketing Suite',
      description: 'Logo design, business cards, yard signs, banners, email templates, social media graphics',
      color: 'text-purple-600'
    },
    {
      icon: GraduationCap,
      title: 'Comprehensive Training Program',
      description: '6-week intensive training covering operations, pricing, marketing, and client management',
      color: 'text-green-600'
    },
    {
      icon: Phone,
      title: 'Monthly Coaching Calls',
      description: 'Live group coaching with industry experts + private consultation quarterly',
      color: 'text-blue-600'
    },
    {
      icon: FileText,
      title: 'Legal Document Templates',
      description: 'Contracts, waivers, consignment agreements, vendor forms - all attorney-reviewed',
      color: 'text-red-600'
    },
    {
      icon: Users,
      title: 'Vendor Network Access',
      description: 'Pre-vetted movers, cleanout crews, appraisers, and contractors in your area',
      color: 'text-yellow-600'
    },
    {
      icon: BarChart3,
      title: 'Enterprise Platform Access',
      description: 'Full Legacy Lane OS with CRM, inventory management, and analytics - 50% OFF first year',
      color: 'text-indigo-600'
    }
  ];

  const included = [
    'Exclusive territory rights in your market',
    'Legacy Lane Estate Sales branding and trademark usage',
    'Professional email setup (@yourcompany.legacylane.com)',
    'Social media account setup and optimization',
    'Google Business Profile creation and optimization',
    'Initial ad spend credit ($500 for first campaigns)',
    'Pricing calculator and estimation tools',
    'Client onboarding system and automation',
    'Photography and staging guidelines',
    'Pre-sale, sale day, and post-sale checklists',
    'Financial tracking and tax preparation templates',
    'Insurance and bonding guidance',
    '24/7 support portal access',
    'Monthly newsletter with industry insights',
    'Quarterly business review sessions',
    'Access to private operator community',
    'Continuing education webinars',
    'Lead generation system and scripts'
  ];

  const regularMonthlyPrice = pricing.monthly_year1 * 2;
  
  const pricingCards = [
    {
      label: 'One-Time Setup Investment',
      price: `$${pricing.setup_fee.toLocaleString()}`,
      description: 'Everything to launch your business',
      popular: false
    },
    {
      label: 'Monthly Platform Fee (Year 1)',
      price: `$${pricing.monthly_year1}`,
      description: `50% OFF - Regular price $${regularMonthlyPrice}/mo`,
      popular: true,
      saved: `Save $${((regularMonthlyPrice - pricing.monthly_year1) * 12).toLocaleString()} first year`
    },
    {
      label: 'Ongoing Revenue Share',
      price: `${pricing.revenue_share}%`,
      description: 'Of profit per sale. Must use the onsite worksheets to document all transactions',
      popular: false
    }
  ];

  const outcomes = [
    { label: 'Average First-Year Revenue', value: '$150,000+', icon: DollarSign },
    { label: 'Typical Sale Commission', value: '35-45%', icon: TrendingUp },
    { label: 'Break-Even Timeline', value: '3-6 months', icon: Calendar },
    { label: 'Client Satisfaction Rate', value: '98%', icon: Award }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-serif font-bold text-white">Legacy Lane</h1>
                <p className="text-xs text-orange-400">Business in a Box</p>
              </div>
            </Link>
            <Button className="bg-orange-600 hover:bg-orange-700 flex-shrink-0">
              <Phone className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Schedule a Call</span>
              <span className="sm:hidden">Call</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0yMCA0NGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-orange-500/20 text-orange-400 border-orange-500/30 text-lg px-6 py-2">
            <Rocket className="w-5 h-5 mr-2" />
            Launch Your Estate Sale Empire
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            Legacy Lane Estate Sales<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-cyan-400">Business in a Box</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            Everything you need to launch a profitable estate sale business in 90 days or less. 
            <strong className="text-white"> No experience required.</strong> Complete branding, training, and support included.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6">
              <Zap className="w-5 h-5 mr-2" />
              Apply Now
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 text-lg px-8 py-6">
              <Video className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {outcomes.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6 text-center">
                    <Icon className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-slate-300">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What's Included - Hero Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-600 text-white">Complete Package</Badge>
            <h2 className="text-5xl font-serif font-bold text-slate-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Launch a professional estate sale business with our proven system. No guesswork, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="hover:shadow-2xl transition-all hover:-translate-y-1 border-2">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-4 ${feature.color}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Inclusions */}
          <Card className="bg-gradient-to-br from-slate-50 to-cyan-50 border-2 border-cyan-200">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="w-6 h-6 text-cyan-600" />
                Plus All These Additional Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {included.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Investment & ROI */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500 text-white">Investment Breakdown</Badge>
            <h2 className="text-5xl font-serif font-bold text-white mb-4">
              Smart Investment, Massive Returns
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Transparent pricing with no hidden fees. Most operators recover their initial investment within 6 months.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {pricingCards.map((price, idx) => (
              <Card key={idx} className={`${price.popular ? 'ring-4 ring-orange-500 shadow-2xl' : ''} relative`}>
                {price.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white">
                    Best Value
                  </Badge>
                )}
                <CardContent className="p-8 text-center">
                  <div className="text-sm font-semibold text-slate-600 mb-2">{price.label}</div>
                  <div className="text-5xl font-bold text-slate-900 mb-2">{price.price}</div>
                  <div className="text-sm text-slate-600 mb-4">{price.description}</div>
                  {price.saved && (
                    <Badge className="bg-green-100 text-green-700">{price.saved}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-orange-500 to-cyan-500 border-0">
            <CardContent className="p-8 text-center text-white">
              <h3 className="text-3xl font-bold mb-2">
                Total First Year Cost: ${(pricing.setup_fee + (pricing.monthly_year1 * 12)).toLocaleString()}
              </h3>
              <p className="text-xl text-white/90 mb-4">Average First Year Revenue: $150,000+</p>
              <p className="text-2xl font-bold">
                That's a {Math.round((150000 / (pricing.setup_fee + (pricing.monthly_year1 * 12))) * 100)}% ROI in Year One
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Training & Support */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-600 text-white">World-Class Support</Badge>
            <h2 className="text-5xl font-serif font-bold text-slate-900 mb-4">
              Never Feel Alone in Your Journey
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From day one through your first million, we're with you every step of the way.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-cyan-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-cyan-600" />
                  6-Week Training Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Week 1-2: Foundations</div>
                    <div className="text-sm text-slate-600">Business setup, legal requirements, insurance</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Week 3-4: Operations</div>
                    <div className="text-sm text-slate-600">Pricing, staging, inventory management, photography</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Week 5: Marketing</div>
                    <div className="text-sm text-slate-600">Digital marketing, social media, lead generation</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Week 6: Launch</div>
                    <div className="text-sm text-slate-600">First sale walkthrough, client management, scaling</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-orange-600" />
                  Ongoing Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Monthly Group Coaching</div>
                    <div className="text-sm text-slate-600">Live calls with industry experts and Q&A sessions</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Quarterly Private Consultations</div>
                    <div className="text-sm text-slate-600">One-on-one strategy sessions for your business</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">24/7 Support Portal</div>
                    <div className="text-sm text-slate-600">Instant answers to common questions, video library</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Private Community Access</div>
                    <div className="text-sm text-slate-600">Network with other operators, share wins and challenges</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-orange-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-orange-600 text-white">Limited Availability</Badge>
            <h2 className="text-5xl font-serif font-bold text-slate-900 mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-slate-600">
              We're accepting applications for exclusive territories. Apply now to secure your market.
            </p>
          </div>

          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Application Form</CardTitle>
              <p className="text-slate-600">Tell us about yourself and your goals</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Atlanta"
                    />
                  </div>
                </div>

                <div>
                  <Label>State *</Label>
                  <Input
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="GA"
                  />
                </div>

                <div>
                  <Label>Relevant Experience</Label>
                  <Textarea
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="Real estate, sales, event planning, etc."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Why are you interested in this opportunity? *</Label>
                  <Textarea
                    required
                    value={formData.why_interested}
                    onChange={(e) => setFormData({ ...formData, why_interested: e.target.value })}
                    placeholder="Tell us about your goals and motivations..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>When would you like to start? *</Label>
                  <Input
                    required
                    value={formData.start_timeline}
                    onChange={(e) => setFormData({ ...formData, start_timeline: e.target.value })}
                    placeholder="Immediately, 30 days, 60 days, etc."
                  />
                </div>

                <div>
                  <Label>Are you ready to invest ${pricing.setup_fee.toLocaleString()} to launch? *</Label>
                  <select
                    required
                    value={formData.investment_ready}
                    onChange={(e) => setFormData({ ...formData, investment_ready: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select...</option>
                    <option value="yes_cash">Yes, I have cash available</option>
                    <option value="yes_financing">Yes, I need financing options</option>
                    <option value="not_yet">Not yet, still researching</option>
                  </select>
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6">
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>

                <p className="text-sm text-slate-600 text-center">
                  By submitting, you agree to be contacted by Legacy Lane about this business opportunity.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">LL</span>
            </div>
            <div>
              <h3 className="text-2xl font-serif font-bold">Legacy Lane</h3>
              <p className="text-sm text-orange-400">Business in a Box</p>
            </div>
          </div>
          <p className="text-slate-400 mb-4">
            Questions? Call us at (888) 555-LEGACY or email <a href="mailto:franchise@legacylane.com" className="text-orange-400 hover:text-orange-300">franchise@legacylane.com</a>
          </p>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Legacy Lane. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}