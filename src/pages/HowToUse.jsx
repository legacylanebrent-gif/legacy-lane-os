import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import { Search, MapPin, Heart, Navigation, QrCode, Star, ShoppingBag, Bell } from 'lucide-react';

export default function HowToUse() {
  const features = [
    {
      icon: <Search className="w-8 h-8 text-orange-500" />,
      title: 'Find Estate Sales',
      description: 'Search for estate sales near you by location, date, or category. Browse detailed listings with photos, descriptions, and operator information.',
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
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader />

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
                  <h3 className="font-semibold text-slate-900 mb-1">Redeem Rewards</h3>
                  <p className="text-slate-600">Use your points for discounts and exclusive benefits on the platform.</p>
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
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}