import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import SharedFooter from '@/components/layout/SharedFooter';
import {
  Store, MapPin, Target, Search, ArrowRight, ShoppingBag, Heart,
  Building2, TrendingUp, Package, Bell, Compass, Phone, Globe
} from 'lucide-react';

const DEALER_BUSINESS_TYPES = [
  'Antique Store', 'Art Gallery', 'Estate Jewelry Buyer', 'Coin Shop',
  'Sports Card Shop', 'Comic Shop', 'Vintage Furniture Dealer',
  'Architectural Salvage Dealer', 'Record Store', 'Book Dealer',
  'Collectible Shop', 'Luxury Consignment Store', 'Other'
];

const DEALER_SPECIALTY_OPTIONS = [
  'Antiques', 'Fine Art', 'Paintings', 'Sculpture', 'Prints & Lithographs',
  'Furniture', 'Jewelry', 'Watches', 'Silver & Silverware',
  'China & Porcelain', 'Glassware & Crystal', 'Rugs & Textiles',
  'Mid-Century Modern', 'Art Deco', 'Victorian Era',
  'Coins & Currency', 'Stamps', 'Collectibles', 'Military Memorabilia',
  'Books & Rare Manuscripts', 'Toys & Vintage Games', 'Musical Instruments',
  'Lighting & Lamps', 'Clocks', 'Cameras & Photography', 'Wine & Spirits'
];

export default function CollectorDealerDashboard() {
  const [user, setUser] = useState(null);
  const [wantedItems, setWantedItems] = useState([]);
  const [matchNotifications, setMatchNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dealerForm, setDealerForm] = useState({
    collector_dealer_business_type: '',
    collector_dealer_specialties: [],
    store_name: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      setDealerForm({
        collector_dealer_business_type: u.collector_dealer_business_type || '',
        collector_dealer_specialties: u.collector_dealer_specialties || [],
        store_name: u.store_name || u.company_name || '',
      });

      const [items, notifications] = await Promise.all([
        base44.entities.WantedItem.filter({ buyer_id: u.id, status: 'active' }, '-created_date', 20),
        base44.entities.Notification.filter({ user_id: u.id, type: 'system' }, '-created_date', 10),
      ]);
      setWantedItems(items);
      setMatchNotifications(notifications.filter(n => n.title?.includes('Match')));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGeocode = async () => {
    if (!user?.business_address_city || !user?.business_address_state) {
      alert('Please set your business address in My Profile first.');
      return;
    }
    setGeocoding(true);
    try {
      const res = await base44.functions.invoke('geocodeDealerAddress', {
        street: user.business_address_street,
        city: user.business_address_city,
        state: user.business_address_state,
        zip: user.business_address_zip,
      });
      setUser(prev => ({ ...prev, store_address_geocoded: res.data }));
    } catch (e) {
      alert('Geocoding failed. Please verify your address.');
    }
    finally { setGeocoding(false); }
  };

  const toggleSpecialty = (s) => {
    setDealerForm(prev => ({
      ...prev,
      collector_dealer_specialties: prev.collector_dealer_specialties.includes(s)
        ? prev.collector_dealer_specialties.filter(v => v !== s)
        : [...prev.collector_dealer_specialties, s]
    }));
  };

  const handleSaveDealerProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        collector_dealer_business_type: dealerForm.collector_dealer_business_type,
        collector_dealer_specialties: dealerForm.collector_dealer_specialties,
        store_name: dealerForm.store_name,
      });
      setUser(prev => ({ ...prev, ...dealerForm }));
      const u = await base44.auth.me();
      setUser(u);
    } catch (e) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
    </div>
  );

  const hasStoreAddress = user?.store_address_geocoded?.lat;
  const activeHuntCount = wantedItems.filter(i => i.status === 'active').length;
  const matchCount = matchNotifications.length;

  return (
    <div className="p-6 lg:p-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Collector Dealer Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {user?.store_name || user?.company_name || 'Your Store'} — Antique, Art & Collectibles
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('MyProfile')}>
            <Button variant="outline" className="gap-2">
              <Building2 className="w-4 h-4" /> Store Profile
            </Button>
          </Link>
          <Link to="/">
            <Button className="bg-orange-600 hover:bg-orange-700 gap-2">
              <Search className="w-4 h-4" /> Browse Estate Sales
            </Button>
          </Link>
        </div>
      </div>

      {/* Store Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" /> Store Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.business_address_street ? (
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="font-medium text-slate-800">{user.store_name || user.company_name || 'Store'}</p>
                <p className="text-sm text-slate-600">{user.business_address_street}</p>
                <p className="text-sm text-slate-600">
                  {user.business_address_city}, {user.business_address_state} {user.business_address_zip}
                </p>
                {user?.company_email && <p className="text-sm text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" />{user.company_email}</p>}
                {user?.phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</p>}
              </div>
              <div>
                {hasStoreAddress ? (
                  <Badge className="bg-green-100 text-green-700 gap-1">
                    <MapPin className="w-3 h-3" /> Geocoded
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeocode}
                    disabled={geocoding}
                    className="gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    {geocoding ? 'Geocoding...' : 'Geocode Store Address'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm mb-3">No business address set</p>
              <Link to={createPageUrl('MyProfile')}>
                <Button size="sm" variant="outline">Set Address in My Profile</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dealer Profile Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-600" /> Dealer Profile
          </CardTitle>
          <p className="text-sm text-slate-500">Tell buyers what you specialize in buying.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Store / Gallery Name</label>
              <input
                value={dealerForm.store_name}
                onChange={e => setDealerForm(p => ({ ...p, store_name: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="e.g. Main Street Antiques"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Dealer Type</label>
              <select
                value={dealerForm.collector_dealer_business_type}
                onChange={e => setDealerForm(p => ({ ...p, collector_dealer_business_type: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select type...</option>
                {DEALER_BUSINESS_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Buying Specialties</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {DEALER_SPECIALTY_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                    dealerForm.collector_dealer_specialties.includes(s)
                      ? 'border-purple-500 bg-purple-50 text-purple-800 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-purple-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveDealerProfile} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? 'Saving...' : 'Save Dealer Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* ISO Wanted Items — Core Feature */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" /> ISO Wanted Items — Your Hunt List
          </CardTitle>
          <p className="text-sm text-slate-600">
            Add items you're actively hunting for. We'll match them against every new estate sale and notify you — and the seller — when we find a match.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-orange-100 text-center">
              <div className="text-3xl font-bold text-orange-700">{activeHuntCount}</div>
              <div className="text-xs text-slate-500 mt-1">Active Hunt Items</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-purple-100 text-center">
              <div className="text-3xl font-bold text-purple-700">{matchCount}</div>
              <div className="text-xs text-slate-500 mt-1">Recent Matches</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-100 text-center">
              <div className="text-3xl font-bold text-green-700">{wantedItems.filter(i => i.status === 'fulfilled').length}</div>
              <div className="text-xs text-slate-500 mt-1">Fulfilled</div>
            </div>
          </div>

          {wantedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Currently Hunting:</p>
              {wantedItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                  <div className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                        {item.budget_max && <Badge variant="outline" className="text-xs">Up to ${item.budget_max}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Badge className={item.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <Link to={createPageUrl('MyProfile', { tab: 'buyer_prefs' })}>
            <Button className="bg-orange-600 hover:bg-orange-700 gap-2 w-full sm:w-auto">
              <Target className="w-4 h-4" /> Manage ISO Wanted Items
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Matches */}
      {matchNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" /> Recent Match Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchNotifications.slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Target className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(n.created_date).toLocaleDateString()}</p>
                  </div>
                  {n.link_to_page && (
                    <Link to={`/${n.link_to_page}?${n.link_params || ''}`}>
                      <Button size="sm" variant="ghost" className="text-orange-600">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-slate-600" /> Explore & Discover
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all cursor-pointer">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Find Estate Sales</p>
                  <p className="text-xs text-slate-500">Browse upcoming sales</p>
                </div>
              </div>
            </Link>
            <Link to={createPageUrl('BrowseItems')}>
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-cyan-50 hover:border-cyan-300 transition-all cursor-pointer">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Browse Marketplace</p>
                  <p className="text-xs text-slate-500">Shop items for sale</p>
                </div>
              </div>
            </Link>
            <Link to={createPageUrl('RoutePlanner')}>
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition-all cursor-pointer">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Compass className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Route Planner</p>
                  <p className="text-xs text-slate-500">Plan your sale route</p>
                </div>
              </div>
            </Link>
            <Link to={createPageUrl('MyPurchases')}>
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">My Purchases</p>
                  <p className="text-xs text-slate-500">Track items bought</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      <SharedFooter />
    </div>
  );
}