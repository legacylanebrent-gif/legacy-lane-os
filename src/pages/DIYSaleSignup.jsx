import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import { ArrowLeft, Check, ShoppingBag, Camera, DollarSign, Calendar, MapPin, Image, Upload, Clock } from 'lucide-react';

export default function DIYSaleSignup() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const user = await base44.auth.me();
        setCurrentUser(user);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const packageFeatures = [
    { icon: Camera, title: 'Upload Photos', description: 'Up to 100 high-quality photos of your items' },
    { icon: DollarSign, title: 'Set Your Prices', description: 'Full control — you set every price yourself' },
    { icon: Calendar, title: 'Pick Your Dates', description: 'Schedule your sale when it works for you' },
    { icon: MapPin, title: 'Choose Location', description: 'Host at your home or any venue you pick' },
    { icon: Image, title: 'Public Listing', description: 'Your sale appears on EstateSalen.com for shoppers' },
    { icon: Clock, title: 'One-Time Purchase', description: 'Pay once, post once. No subscriptions, no recurring fees' },
  ];

  const whatsIncluded = [
    '1 estate sale listing on EstateSalen.com',
    'Up to 100 photos per sale',
    'Set your own item titles and prices',
    'Choose your sale dates and times',
    'Full address and location display',
  ];

  const whatsNotIncluded = [
    'AI pricing suggestions or SERP lookups',
    'Marketing campaigns or email blasts',
    'Buyer matching or hunt list features',
    'Multi-sale management dashboard',
  ];

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-rose-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      {/* Back Link */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </Link>
      </div>

      {/* Hero */}
      <section className="py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-3">
            Run Your Own Estate Sale
          </h1>
          <p className="text-lg text-slate-600 mb-2 max-w-xl mx-auto">
            One flat fee. One sale. Full control. Post your estate sale listing and reach thousands of local shoppers.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-slate-900 text-center mb-8">
            Everything You Need
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packageFeatures.map((f, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="overflow-hidden border-2 border-purple-500 shadow-xl">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-1" />
            <CardContent className="p-8 text-center">
              <Badge className="bg-purple-100 text-purple-700 mb-3">One-Time Purchase</Badge>
              <div className="text-5xl font-bold text-slate-900 mb-1">$47</div>
              <p className="text-slate-500 mb-6">Single posting — no subscription, no recurring fees</p>

              <div className="space-y-3 mb-6 text-left">
                <h4 className="font-semibold text-sm text-slate-900">What's Included:</h4>
                {whatsIncluded.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-8 text-left bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-slate-900">Not Included (available on higher plans):</h4>
                {whatsNotIncluded.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-400">—</span>
                    <span className="text-sm text-slate-500">{item}</span>
                  </div>
                ))}
              </div>

              {isAuthenticated ? (
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-base py-6" size="lg">
                  Purchase — $47 One-Time
                </Button>
              ) : (
                <div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-base py-6 mb-3"
                    size="lg"
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  >
                    Sign In to Purchase
                  </Button>
                  <p className="text-xs text-slate-400">You'll need an account to post your sale</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-8">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Purchase', desc: 'Pay the $47 one-time fee' },
              { step: '2', title: 'Create Sale', desc: 'Add photos, prices, dates & location' },
              { step: '3', title: 'Go Live', desc: 'Your sale is listed for shoppers to find' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  {s.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-slate-900 text-center mb-8">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Is this really a one-time payment?', a: 'Yes. $47 covers one sale posting. There are no recurring charges, hidden fees, or subscriptions.' },
              { q: 'Can I post multiple sales?', a: 'This package covers one sale. For multiple sales, consider our Estate Sale Company plans which include unlimited listings.' },
              { q: 'Who can see my sale?', a: 'Your sale will appear on EstateSalen.com and be visible to shoppers searching in your area.' },
              { q: 'Can I edit my sale after posting?', a: 'Yes, you can update photos, prices, dates, and details any time before or during your sale.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-lg p-5 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-1">{faq.q}</h4>
                <p className="text-sm text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}