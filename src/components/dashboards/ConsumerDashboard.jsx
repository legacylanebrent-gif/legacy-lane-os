import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User, Heart, AlertCircle, MapPin, ShoppingBag, Star, Users,
  MessageSquare, Bell, HandCoins, Route, Calendar, Image, Building2
} from 'lucide-react';
import SalesTimeline from './consumer/SalesTimeline';
import RouteMapWidget from './consumer/RouteMapWidget';
import SavedItemsGallery from './consumer/SavedItemsGallery';

export default function ConsumerDashboard({ user }) {
  const [followedSales, setFollowedSales] = useState([]);   // upcoming sales from followed operators
  const [allFollowedSales, setAllFollowedSales] = useState([]); // for SavedItemsGallery (saved images)
  const [followedOperatorIds, setFollowedOperatorIds] = useState([]);
  const [savedSaleIds, setSavedSaleIds] = useState([]);
  const [savedSales, setSavedSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline'); // timeline | route | gallery

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Followed companies
      const follows = await base44.entities.CompanyFollow.filter({ consumer_user_id: user.id });
      const opIds = follows.map(f => f.operator_id);
      setFollowedOperatorIds(opIds);

      // Saved sales from localStorage
      const savedIds = JSON.parse(localStorage.getItem('savedSales') || '[]');
      setSavedSaleIds(savedIds);

      // Fetch all active/upcoming sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allSales = await base44.entities.EstateSale.list('-created_date', 200);
      const upcoming = allSales.filter(s =>
        (s.status === 'upcoming' || s.status === 'active') &&
        (s.sale_dates || []).some(d => new Date(d.date + 'T00:00:00') >= today)
      );

      // Timeline: sales from followed operators OR saved sales
      const relevantIds = new Set([...opIds.flatMap(id =>
        upcoming.filter(s => s.operator_id === id).map(s => s.id)
      ), ...savedIds]);
      const relevantSales = upcoming.filter(s => relevantIds.has(s.id));
      setFollowedSales(relevantSales);

      // Saved items gallery: sales with saved images in localStorage
      const salesWithSavedImgs = allSales.filter(s => {
        const stored = localStorage.getItem(`savedImages_${s.id}`);
        if (!stored) return false;
        try { return JSON.parse(stored).length > 0; } catch { return false; }
      });
      setAllFollowedSales(salesWithSavedImgs);

      // Saved sales cards
      const saved = allSales.filter(s => savedIds.includes(s.id));
      setSavedSales(saved);
    } catch (err) {
      console.error('ConsumerDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <p className="font-semibold">Consumer dashboard cannot load without user data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickActions = [
    { title: 'Find Sales', icon: MapPin, link: 'EstateSaleFinder', color: 'bg-orange-100 text-orange-600' },
    { title: 'Favorites', icon: Heart, link: 'Favorites', color: 'bg-red-100 text-red-600' },
    { title: 'Marketplace', icon: ShoppingBag, link: 'BrowseItems', color: 'bg-cyan-100 text-cyan-600' },
    { title: 'Route Planner', icon: Route, link: 'RoutePlanner', color: 'bg-indigo-100 text-indigo-600' },
    { title: 'My Rewards', icon: Star, link: 'MyRewards', color: 'bg-yellow-100 text-yellow-600' },
    { title: 'My Referrals', icon: Users, link: 'MyReferrals', color: 'bg-purple-100 text-purple-600' },
    { title: 'Buyouts', icon: HandCoins, link: 'Buyouts', color: 'bg-amber-100 text-amber-600' },
    { title: 'Support', icon: MessageSquare, link: 'MyTickets', color: 'bg-slate-100 text-slate-600' },
    { title: 'Notifications', icon: Bell, link: 'Notifications', color: 'bg-sky-100 text-sky-600' },
    { title: 'My Profile', icon: User, link: 'MyProfile', color: 'bg-blue-100 text-blue-600' },
  ];

  const tabs = [
    { id: 'timeline', label: 'Sales Timeline', icon: Calendar },
    { id: 'route', label: "Today's Route", icon: Route },
    { id: 'gallery', label: 'Saved Photos', icon: Image },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {followedOperatorIds.length > 0
            ? `You're following ${followedOperatorIds.length} compan${followedOperatorIds.length === 1 ? 'y' : 'ies'} · ${followedSales.length} upcoming sale${followedSales.length !== 1 ? 's' : ''}`
            : 'Follow companies to see personalized sale alerts'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {quickActions.map((a) => (
          <Link key={a.link} to={createPageUrl(a.link)} className="flex flex-col items-center gap-1 group">
            <div className={`w-11 h-11 rounded-xl ${a.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <a.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-500 text-center leading-tight">{a.title}</span>
          </Link>
        ))}
      </div>

      {/* Main tabbed panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Personalized tabs */}
        <div className="lg:col-span-2">
          <Card>
            {/* Tab bar */}
            <div className="flex border-b border-slate-100">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600 bg-orange-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  {activeTab === 'timeline' && (
                    <SalesTimeline sales={followedSales} followedOperatorIds={followedOperatorIds} />
                  )}
                  {activeTab === 'route' && <RouteMapWidget />}
                  {activeTab === 'gallery' && <SavedItemsGallery sales={allFollowedSales} />}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Saved sales + follow prompt */}
        <div className="space-y-4">
          {/* Saved Sales */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                Saved Sales
                {savedSaleIds.length > 0 && (
                  <Badge className="bg-red-100 text-red-600 border-0 text-xs">{savedSaleIds.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {savedSales.length === 0 ? (
                <div className="text-center py-6">
                  <Heart className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Heart sales while browsing to save them here</p>
                  <Link to={createPageUrl('Home')}>
                    <Button size="sm" variant="outline" className="mt-3 text-xs gap-1">
                      <MapPin className="w-3 h-3" /> Browse Sales
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedSales.slice(0, 5).map(sale => (
                    <Link key={sale.id} to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        {sale.images?.[0] ? (
                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={sale.images[0]?.url || sale.images[0]}
                              alt={sale.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{sale.title}</p>
                          <p className="text-[10px] text-slate-400">{sale.property_address?.city}, {sale.property_address?.state}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {savedSales.length > 5 && (
                    <Link to={createPageUrl('Favorites')}>
                      <Button size="sm" variant="ghost" className="w-full text-xs text-slate-500 mt-1">
                        +{savedSales.length - 5} more →
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow prompt if not following anyone */}
          {followedOperatorIds.length === 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 text-center">
                <Building2 className="w-8 h-8 mx-auto text-orange-400 mb-2" />
                <p className="text-sm font-semibold text-orange-800 mb-1">Follow Companies</p>
                <p className="text-xs text-orange-600 mb-3">
                  Follow your favorite estate sale companies to get a personalized timeline of their upcoming sales.
                </p>
                <Link to={createPageUrl('FavoriteCompanies')}>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1">
                    <Users className="w-3 h-3" /> Explore Companies
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}