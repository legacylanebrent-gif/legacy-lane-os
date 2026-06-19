import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import { base44 } from '@/api/base44Client';
import { Search, MapPin, Heart, Navigation, QrCode, Star, ShoppingBag, Bell, Target, CalendarDays, ClipboardList, Send, Smartphone, Wrench, Building2 } from 'lucide-react';

export default function HowToUse() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);
  const features = [
    {
      icon: <Search className="w-8 h-8 text-orange-500" />,
      title: 'Find Estate Sales',
      description: 'Search for estate sales near you by location, date, or category. Browse detailed listings with photos, descriptions, and Estate Sale Company Owner information.',
      cta: 'Start Searching',
      link: createPageUrl('EstateSaleFinder')
    },
    {
      icon: <MapPin className="w-8 h-8 text-orange-500" />,
      title: 'Browse by State',
      description: 'Explore estate sales across all 50 states. Filter by region and find companies operating in your area.',
      cta: 'Browse States',
      link: createPageUrl('SearchByState')
    },
    {
      icon: <Heart className="w-8 h-8 text-orange-500" />,
      title: 'Save Your Favorites',
      description: 'Bookmark sales you\'re interested in and manage your watchlist. Get instant notifications when new sales matching your interests are posted.',
      cta: 'View Favorites',
      link: createPageUrl('Favorites')
    },
    {
      icon: <Navigation className="w-8 h-8 text-orange-500" />,
      title: 'Plan Your Route',
      description: 'Use our route planner to organize visits to multiple sales. Get directions and estimated travel times between locations.',
      cta: 'Plan Routes',
      link: createPageUrl('RoutePlanner')
    },
    {
      icon: <QrCode className="w-8 h-8 text-orange-500" />,
      title: 'Check In to Sales',
      description: 'Earn rewards by checking in to estate sales you attend. Scan QR codes at the venue to get points and exclusive benefits.',
      cta: 'Learn More',
      link: createPageUrl('RewardsCheckins')
    },
    {
      icon: <ShoppingBag className="w-8 h-8 text-orange-500" />,
      title: 'Browse Marketplace',
      description: 'Discover items from completed sales and private sellers. Find unique treasures, antiques, and collectibles in our marketplace.',
      cta: 'Shop Now',
      link: createPageUrl('BrowseItems')
    },
    {
      icon: <Star className="w-8 h-8 text-orange-500" />,
      title: 'Earn Rewards',
      description: 'Collect points for every visit, purchase, and referral. Redeem points for discounts and exclusive perks on the platform.',
      cta: 'See Rewards',
      link: createPageUrl('MyRewards')
    },
    {
      icon: <Bell className="w-8 h-8 text-orange-500" />,
      title: 'Get Notifications',
      description: 'Customize alerts for new sales in your area, favorite companies, and items you\'re watching. Never miss an opportunity again.',
      cta: 'Manage Settings',
      link: createPageUrl('NotificationSettings')
    },
    {
      icon: <Target className="w-8 h-8 text-orange-500" />,
      title: 'ISO Wanted Items',
      description: 'Create your personal hunt list of items you\'re searching for. Get automatically matched when an estate sale has what you want.',
      cta: 'Set Up Hunt List',
      link: createPageUrl('MyProfile') + '?tab=buyer_prefs'
    },
    {
      icon: <CalendarDays className="w-8 h-8 text-orange-500" />,
      title: 'My Sale Calendar',
      description: 'Track all the sales you plan to attend in one view. See dates, times, and locations at a glance. Add sales to your phone calendar.',
      cta: 'View Calendar',
      link: createPageUrl('MyCalendar')
    },
    {
      icon: <ClipboardList className="w-8 h-8 text-orange-500" />,
      title: 'Early Sign-Ins',
      description: 'Sign in ahead of time for popular sales. Secure your spot in line and get early access notifications before doors open.',
      cta: 'Sign In Early',
      link: createPageUrl('MyEarlySignIns')
    },
    {
      icon: <Send className="w-8 h-8 text-orange-500" />,
      title: 'Refer a Company',
      description: 'Know a great estate sale company not yet on our platform? Refer them and earn rewards when they join EstateSalen.com.',
      cta: 'Make a Referral',
      link: createPageUrl('ReferCompany')
    },
    {
      icon: <Smartphone className="w-8 h-8 text-orange-500" />,
      title: 'Mobile App',
      description: 'Take EstateSalen.com on the go. Browse sales, scan QR codes, and get directions — all optimized for your phone.',
      cta: 'Open Mobile App',
      link: '/mobile'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            How to Use EstateSalen.com
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Discover the top features and learn how to get the most out of your estate sale hunting experience.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3 mb-3">
                    {feature.icon}
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600">{feature.description}</p>
                  <Link to={feature.link}>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                      {feature.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-8 text-center">Quick Start Guide</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-600 text-white font-bold">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Create an Account</h3>
                  <p className="text-slate-600">Sign up for free to unlock all features, save favorites, and earn rewards.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-600 text-white font-bold">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Search for Sales</h3>
                  <p className="text-slate-600">Find estate sales near you using our search tools and filters.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-600 text-white font-bold">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Save Favorites</h3>
                  <p className="text-slate-600">Heart sales to bookmark them and get notifications about upcoming events.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-600 text-white font-bold">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Plan Your Route</h3>
                  <p className="text-slate-600">Use the route planner to organize your visits and optimize travel time.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-600 text-white font-bold">
                    5
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Check In & Earn</h3>
                  <p className="text-slate-600">Scan QR codes at sales to check in and earn rewards points.</p>
                </div>
              </div>
              <div className="flex gap-4">
               <div className="flex-shrink-0">
                 <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-600 text-white font-bold">
                   6
                 </div>
               </div>
               <div>
                 <h3 className="font-semibold text-slate-900 mb-1">Set Up a Hunt List</h3>
                 <p className="text-slate-600">Tell us what you're looking for — our system auto-matches items from upcoming sales.</p>
               </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-8 text-center">Pro Tips</h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Set Your Location:</span> Update your location in settings to get personalized sale recommendations near you.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Enable Notifications:</span> Turn on alerts for your favorite companies and categories to be the first to know about new sales.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Check Weather & Hours:</span> Always review sale dates, hours, and special conditions before heading out.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Follow Companies:</span> Follow your favorite estate sale companies to get updates on all their upcoming sales.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Use the Marketplace:</span> Don't miss great finds—browse our marketplace for items from completed sales.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Create a Hunt List:</span> Set up your ISO Wanted Items and get instant matches when sales have what you're looking for. The more specific, the better.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-slate-700"><span className="font-semibold text-orange-600">Go Mobile:</span> Use the mobile app version for on-the-go access, QR scanning at sales, and turn-by-turn directions to your next stop.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Local Vendors & Services */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-8 text-center">Local Vendors & Services</h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Estate transitions require more than just finding a sale. Connect with trusted local professionals
            for cleanouts, moving, appraisals, and more.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Link to={createPageUrl('CleanoutNetwork')}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-slate-200">
                <CardContent className="pt-6 text-center">
                  <Wrench className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-2">Cleanout Crews</h3>
                  <p className="text-sm text-slate-600">Junk removal, dumpster rental, and estate cleanout specialists near you.</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('ResellerNetwork')}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-slate-200">
                <CardContent className="pt-6 text-center">
                  <ShoppingBag className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-2">Reseller Network</h3>
                  <p className="text-sm text-slate-600">Connect with resellers who buy in bulk and handle leftover inventory.</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={createPageUrl('VendorSignup')}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-slate-200">
                <CardContent className="pt-6 text-center">
                  <Building2 className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-900 mb-2">Become a Vendor</h3>
                  <p className="text-sm text-slate-600">Offer your services to thousands of estate sale shoppers and companies.</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}