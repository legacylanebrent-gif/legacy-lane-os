import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Search, MapPin, Bell, Smartphone, ShoppingBag, Heart, Route, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import SharedFooter from '@/components/layout/SharedFooter';

const FEATURES = [
  {
    icon: Search,
    title: 'ISO Wanted Items™',
    desc: 'Tell us what you\'re hunting for — a specific piece of furniture, art, jewelry, collectibles, or anything else. Our system continuously scans thousands of estate sale listings and notifies you the moment your item appears.',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
  {
    icon: Bell,
    title: 'Instant Match Alerts',
    desc: 'When an estate sale posts an item matching your hunt list, you get notified immediately. No more checking websites every day. No more missing out. Just pull up and be first in line.',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    icon: Smartphone,
    title: 'Mobile App Ready',
    desc: 'The entire platform works beautifully on your phone. Browse sales, save favorites, plan routes, get directions, and check in — all from the palm of your hand. iOS and Android supported.',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-200',
  },
  {
    icon: Route,
    title: 'Smart Route Planner',
    desc: 'Going to multiple sales in one day? The Route Planner maps out the most efficient path between all your saved sales. Spend less time driving and more time finding treasures.',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
  },
  {
    icon: Heart,
    title: 'Favorite Companies & Follow',
    desc: 'Find estate sale companies you love? Follow them. You\'ll get notified when they post new sales. Build relationships with operators who consistently have what you\'re looking for.',
    color: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-200',
  },
  {
    icon: ShoppingBag,
    title: 'Online Marketplace',
    desc: 'Can\'t make it in person? Browse thousands of items available for online purchase. Fixed price and auction listings from estate sales across the country. Buy from anywhere.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    icon: Camera,
    title: 'Google Lens™ Item Search',
    desc: 'See something interesting in a sale photo? Our Google Lens integration identifies items, estimates values, and gives you research data — right from the listing.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    icon: MapPin,
    title: 'Find Sales Near You',
    desc: 'Browse estate sales happening in your area with detailed photos, item lists, pricing, and sale dates. Filter by categories, distance, and sale type to find exactly what interests you.',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Create Your Hunt List', desc: 'Add items you\'re looking for — furniture, art, jewelry, tools, collectibles, anything. Be as specific or broad as you want.' },
  { step: '2', title: 'Set Your Preferences', desc: 'Choose your area, distance range, budget, and condition preferences. We\'ll match items that fit your criteria.' },
  { step: '3', title: 'Get Matched Instantly', desc: 'When a sale posts items matching your list, you get notified. Click through to see details, photos, and sale info.' },
  { step: '4', title: 'Plan Your Visit', desc: 'Save the sale, plan your route, and show up ready. Or buy directly through the Marketplace if shipping is available.' },
];

export default function LandingPageConsumer() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-orange-400 font-serif font-bold text-2xl tracking-tight">Estate<span className="text-white">Salen</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/EstateSaleFinder" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Browse Sales</Link>
          <Link to="/OnboardingChat">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-sm font-semibold px-4 py-1.5 rounded-full">
            For Shoppers & Collectors
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            Never Miss the Estate Sale Item You're Looking For
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Tell us what you're hunting for. We'll scan thousands of estate sales and notify you the moment it appears. Find treasures, save time, and beat the crowds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/OnboardingChat">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold px-10 py-6 rounded-xl shadow-lg shadow-purple-500/30">
                <Heart className="w-5 h-5 mr-2" /> Start Your Hunt List
              </Button>
            </Link>
            <Link to="/EstateSaleFinder">
              <Button variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-lg font-semibold px-10 py-6 rounded-xl">
                <MapPin className="w-5 h-5 mr-2" /> Browse Sales Near You
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xl mx-auto">{item.step}</div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center">Everything You Need to Hunt Smarter</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className={`rounded-2xl border p-5 space-y-3 ${feat.bg}`}>
                  <Icon className={`w-7 h-7 ${feat.color}`} />
                  <h3 className="font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why EstateSalen vs others */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif font-bold text-slate-900 text-center">Why EstateSalen vs. Other Platforms</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-red-600">Typical Estate Sale Sites</h3>
              {[
                'Check multiple websites daily',
                'No personalized alerts',
                'No route planning',
                'No item-level search',
                'No mobile app',
                'Manually track what you want',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <span className="text-red-400 font-bold mt-0.5">✕</span>
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-green-600">EstateSalen</h3>
              {[
                'One platform, all local sales',
                'Instant push notifications for your items',
                'Built-in route planner',
                'Search by item, brand, or category',
                'Full mobile experience',
                'Automated ISO Wanted Items matching',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Buyer-Dealer Connection */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-serif font-bold">Dealers & Collectors Are Welcome</h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            We have a dedicated network of antique dealers, art collectors, furniture buyers, and vintage resellers actively looking for inventory. When you create your hunt list, you can choose to let dealers contact you with items that match your criteria.
          </p>
          <Link to="/OnboardingChat">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold px-10 py-6 rounded-xl mt-4">
              Set Up Your Collector Profile
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-600 to-purple-800 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-serif font-bold">Stop Searching. Start Finding.</h2>
          <p className="text-purple-100 text-xl max-w-xl mx-auto">
            Create your free account, build your ISO Wanted Items list, and let our system do the hunting for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/OnboardingChat">
              <Button className="bg-white hover:bg-purple-50 text-purple-700 text-xl font-bold px-12 py-7 rounded-xl shadow-xl">
                Get Started Free
              </Button>
            </Link>
            <Link to="/EstateSaleFinder">
              <Button variant="outline" className="border-purple-300 text-white hover:bg-purple-500 text-lg font-semibold px-10 py-6 rounded-xl">
                Browse Sales Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}