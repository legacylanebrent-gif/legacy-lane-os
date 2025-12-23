import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, CheckCircle, TrendingUp, Users, Zap, BookOpen, Award,
  DollarSign, HeadphonesIcon, Rocket, Shield, Target, Building2, Star
} from 'lucide-react';

export default function StartYourCompany() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    experience: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // In a real app, this would send to a backend
    console.log('Application submitted:', formData);
    setSubmitted(true);
  };

  const benefits = [
    {
      icon: Building2,
      title: 'Proven Business Model',
      description: 'Access our battle-tested systems and processes that have generated millions in revenue'
    },
    {
      icon: Users,
      title: 'Free Training & Coaching',
      description: 'Comprehensive onboarding and ongoing mentorship from successful estate sale operators'
    },
    {
      icon: Zap,
      title: 'Technology Platform',
      description: 'Full access to our estate sale management software, CRM, and marketing automation tools'
    },
    {
      icon: Target,
      title: 'Marketing & Brand',
      description: 'Leverage the Legacy Lane brand, SEO, and national advertising to attract clients'
    },
    {
      icon: DollarSign,
      title: 'Lead Generation',
      description: 'Get qualified leads from our platform and referral network in your market'
    },
    {
      icon: HeadphonesIcon,
      title: 'Ongoing Support',
      description: '24/7 access to our support team, community, and best practices library'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Apply & Get Approved',
      description: 'Submit your application and have a consultation call with our team'
    },
    {
      number: '02',
      title: 'Complete Training',
      description: 'Access our comprehensive training program covering all aspects of estate sales'
    },
    {
      number: '03',
      title: 'Launch Your Business',
      description: 'Go live with full platform access, marketing materials, and ongoing support'
    },
    {
      number: '04',
      title: 'Grow & Scale',
      description: 'Build your business with our proven systems and continuous coaching'
    }
  ];

  const included = [
    'Legacy Lane brand licensing',
    'Complete estate sale management platform',
    'CRM and client management tools',
    'Professional website and online presence',
    'Marketing templates and materials',
    'Pricing and valuation tools',
    'Inventory management system',
    'Payment processing integration',
    'Lead generation and distribution',
    'Community of successful operators',
    'Monthly coaching calls',
    'Annual conference and training events'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-white">Legacy Lane</h1>
                <p className="text-xs text-orange-400">Business Opportunity</p>
              </div>
            </Link>
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="text-white hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0yMCA0NGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-orange-500/20 text-orange-400 border-orange-500/30 text-sm px-6 py-2">
            🚀 Limited Opportunities Available
          </Badge>
          
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">
            Start Your Own<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-cyan-400">
              Estate Sale Company
            </span>
          </h2>
          
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Join the Legacy Lane network and launch a profitable estate sale business with our proven model, technology platform, and free training
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => document.getElementById('application-form').scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-14 px-8 text-lg font-semibold shadow-xl"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Apply Now - It's Free
            </Button>
            <Button 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 px-8 text-lg backdrop-blur-sm"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">$0</div>
              <div className="text-slate-300">Startup Costs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">100%</div>
              <div className="text-slate-300">Free Training</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
              <div className="text-slate-300">Support Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Legacy Lane Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Why Start with Legacy Lane?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to launch and grow a successful estate sale business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <Card key={idx} className="border-2 border-slate-200 hover:border-orange-300 transition-all hover:shadow-xl">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Your Journey to Success
            </h2>
            <p className="text-xl text-slate-600">
              Four simple steps to launch your estate sale business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl font-bold text-white">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600">
                    {step.description}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 px-4 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Everything Included
            </h2>
            <p className="text-xl text-slate-600">
              Your complete toolkit for success
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {included.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <span className="text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-slate-600">
              Real results from Legacy Lane operators
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">
                  "I went from zero experience to running $50K+ sales in my first 6 months. The training and support are incredible."
                </p>
                <div className="font-semibold text-slate-900">Sarah M.</div>
                <div className="text-sm text-slate-500">Atlanta, GA</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">
                  "The platform handles everything - from marketing to payments. I can focus on running great sales."
                </p>
                <div className="font-semibold text-slate-900">Michael R.</div>
                <div className="text-sm text-slate-500">Phoenix, AZ</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">
                  "The lead generation alone is worth it. I get qualified clients every week without spending a dime on advertising."
                </p>
                <div className="font-semibold text-slate-900">Jennifer T.</div>
                <div className="text-sm text-slate-500">Dallas, TX</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="application-form" className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-3xl mx-auto">
          {!submitted ? (
            <>
              <div className="text-center mb-12">
                <h2 className="text-4xl font-serif font-bold text-white mb-4">
                  Start Your Application
                </h2>
                <p className="text-xl text-slate-300">
                  Take the first step towards owning your own estate sale business
                </p>
              </div>

              <Card className="border-2 border-slate-700">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name *
                      </label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        City/State *
                      </label>
                      <Input
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Atlanta, GA"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Relevant Experience
                      </label>
                      <Textarea
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        placeholder="Tell us about your background in sales, estate sales, real estate, or related fields..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Why do you want to start an estate sale business?
                      </label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Share your goals and interests..."
                        rows={4}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-14 text-lg font-semibold"
                    >
                      Submit Application
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-2 border-green-500">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">
                  Application Received!
                </h3>
                <p className="text-lg text-slate-600 mb-6">
                  Thank you for your interest in starting an estate sale business with Legacy Lane. 
                  Our team will review your application and contact you within 1-2 business days.
                </p>
                <Button
                  onClick={() => window.location.href = createPageUrl('Home')}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-lg text-slate-900 mb-2">
                  Do I need previous experience in estate sales?
                </h4>
                <p className="text-slate-600">
                  No! Our comprehensive training program covers everything from pricing and staging to marketing and client management. Many of our most successful operators started with zero experience.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-lg text-slate-900 mb-2">
                  What are the startup costs?
                </h4>
                <p className="text-slate-600">
                  There are no franchise fees or upfront costs to join Legacy Lane. You'll need basic business insurance and potentially some equipment (pricing guns, tables, etc.), but we help you source everything affordably.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-lg text-slate-900 mb-2">
                  How do I get clients?
                </h4>
                <p className="text-slate-600">
                  We provide qualified leads through our platform, national advertising, SEO, and referral network. You'll also get training on local marketing strategies to build your own client base.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-lg text-slate-900 mb-2">
                  What's the earning potential?
                </h4>
                <p className="text-slate-600">
                  Most operators charge 30-40% commission on sales. Typical estate sales range from $10,000 to $100,000+. With 2-4 sales per month, operators can earn $50,000-$200,000+ annually.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-lg text-slate-900 mb-2">
                  Is this a franchise?
                </h4>
                <p className="text-slate-600">
                  No, this is not a traditional franchise. You operate as an independent business owner using the Legacy Lane platform and brand. There are no franchise fees, just revenue sharing on platform-generated leads.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
            Ready to Build Your Future?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join the Legacy Lane network and start your journey to financial independence
          </p>
          <Button
            onClick={() => document.getElementById('application-form').scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-orange-600 hover:bg-slate-50 h-14 px-12 text-lg font-semibold shadow-xl"
          >
            <Award className="w-5 h-5 mr-2" />
            Apply Now - Limited Spots Available
          </Button>
        </div>
      </section>
    </div>
  );
}