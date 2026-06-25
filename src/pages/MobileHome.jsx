import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileAppShell from '@/components/layout/MobileAppShell';
import { MapPin, Calendar, Heart, Navigation, Bookmark, Search } from 'lucide-react';
import { format } from 'date-fns';
import { isSaleAddressVisible } from '@/utils/saleAddressUtils';

export default function MobileHome() {
  const [sales, setSales] = useState([]);
  const [zipCode, setZipCode] = useState(() => localStorage.getItem('userZipCode') || '');
  const [userLocation, setUserLocation] = useState(() => {
    const stored = localStorage.getItem('userLocation');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [savedSales, setSavedSales] = useState([]);
  const [routeSales, setRouteSales] = useState([]);
  const [activeFilter, setActiveFilter] = useState('nearby');
  const [searchRadius, setSearchRadius] = useState(() => {
    const stored = localStorage.getItem('mobileSearchRadius');
    return stored ? parseInt(stored, 10) : 25;
  });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadLocalState(); }, []);

  const loadLocalState = () => {
    setSavedSales(JSON.parse(localStorage.getItem('savedSales') || '[]'));
    setRouteSales(JSON.parse(localStorage.getItem('estateRoute') || '[]'));
  };

  const loadData = async () => {
    try {
      const salesData = await base44.entities.EstateSale.list('-created_date', 200);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const activeSales = (salesData || []).filter(s => {
        if (s.status !== 'upcoming' && s.status !== 'active') return false;
        if (s.sale_dates?.length > 0) {
          return s.sale_dates.some(d => { const sd = new Date(d.date); sd.setHours(0, 0, 0, 0); return sd >= today; });
        }
        return true;
      });
      setSales(activeSales);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const geocodeZip = async (zip) => {
    if (!/^\d{5}$/.test(zip.trim())) return;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.places?.[0]) {
        const loc = { lat: parseFloat(data.places[0].latitude), lng: parseFloat(data.places[0].longitude) };
        setUserLocation(loc);
        localStorage.setItem('userLocation', JSON.stringify(loc));
        localStorage.setItem('userZipCode', zip.trim());
      }
    } catch (e) { console.error(e); }
  };

  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const sortedSales = () => {
    let list = [...sales];
    if (userLocation) {
      list = list.map(s => {
        if (s.location?.lat && s.location?.lng) {
          return { ...s, distance: calcDistance(userLocation.lat, userLocation.lng, s.location.lat, s.location.lng) };
        }
        return { ...s, distance: null };
      });
    }

    const national = list.filter(s => s.national_featured);
    const local = list.filter(s => !s.national_featured && s.local_featured);
    const regular = list.filter(s => !s.national_featured && !s.local_featured);

    if (userLocation) {
      const byDist = (arr) => arr.filter(s => s.distance !== null && s.distance < searchRadius).sort((a, b) => a.distance - b.distance);
      return [...national, ...byDist(local), ...byDist(regular)];
    }
    return [...national, ...local, ...regular];
  };

  const handleZipSearch = () => { if (zipCode.trim()) geocodeZip(zipCode.trim()); };

  const toggleSave = async (saleId) => {
    const saved = [...savedSales];
    if (saved.includes(saleId)) {
      localStorage.setItem('savedSales', JSON.stringify(saved.filter(id => id !== saleId)));
      setSavedSales(saved.filter(id => id !== saleId));
    } else {
      saved.push(saleId);
      localStorage.setItem('savedSales', JSON.stringify(saved));
      setSavedSales(saved);
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
        base44.entities.EstateSale.update(saleId, { saves: (sale.saves || 0) + 1 });
      }
    }
  };

  const toggleRoute = (saleId) => {
    const route = [...routeSales];
    if (route.includes(saleId)) {
      localStorage.setItem('estateRoute', JSON.stringify(route.filter(id => id !== saleId)));
      setRouteSales(route.filter(id => id !== saleId));
    } else {
      route.push(saleId);
      localStorage.setItem('estateRoute', JSON.stringify(route));
      setRouteSales(route);
    }
  };

  const displaySales = sortedSales().slice(0, 30);

  if (loading) {
    return (
      <MobileAppShell title="Discover">
        <div className="p-10 text-center text-slate-400 animate-pulse">Loading sales near you...</div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell title="Discover">
      <div className="px-4 pt-4 pb-2">
        {/* ZIP Search */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="ZIP code"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleZipSearch()}
              className="pl-9 h-11 bg-white border-slate-200"
            />
          </div>
          <Button onClick={handleZipSearch} className="bg-cyan-600 hover:bg-cyan-700 h-11 px-4">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {['nearby', 'featured', 'this-weekend'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === f ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {f === 'nearby' ? '📍 Nearby' : f === 'featured' ? '⭐ Featured' : '🗓️ This Weekend'}
            </button>
          ))}
        </div>

        {/* Radius selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500 whitespace-nowrap">Within</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[10, 25, 50, 100, 250].map(r => (
              <button
                key={r}
                onClick={() => { setSearchRadius(r); localStorage.setItem('mobileSearchRadius', String(r)); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  searchRadius === r ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {userLocation && (
          <p className="text-xs text-slate-500 mb-3">
            {displaySales.length} sales within {searchRadius} miles
          </p>
        )}
      </div>

      {/* Sales Feed */}
      <div className="px-4 space-y-3">
        {displaySales.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No sales found nearby.</p>
            <p className="text-sm text-slate-400 mt-1">Try a different ZIP code.</p>
          </Card>
        ) : (
          displaySales.map(sale => (
            <Link key={sale.id} to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99]">
                {sale.images?.[0] && (
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={sale.images[0].url || sale.images[0]}
                      alt={sale.title}
                      className="w-full h-full object-cover"
                    />
                    {sale.national_featured && (
                      <Badge className="absolute top-2 right-2 bg-orange-600 text-white text-[10px]">Featured</Badge>
                    )}
                  </div>
                )}
                <CardContent className="p-3">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1.5">{sale.title}</h3>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                      {isSaleAddressVisible(sale) ? (
                        <span>{sale.property_address?.city}, {sale.property_address?.state}</span>
                      ) : (
                        <span className="italic">{sale.property_address?.city}, {sale.property_address?.state} (address pending)</span>
                      )}
                      {sale.distance && <span className="text-orange-600 font-semibold ml-1">{sale.distance.toFixed(1)}mi</span>}
                    </div>
                    {sale.sale_dates?.[0] && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-orange-600 flex-shrink-0" />
                        <span>{format(new Date(sale.sale_dates[0].date + 'T00:00:00'), 'MMM d')}{sale.sale_dates[0].start_time ? ` · ${sale.sale_dates[0].start_time}` : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    <Button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleRoute(sale.id); }}
                      variant="outline"
                      size="sm"
                      className={`flex-1 h-8 text-xs ${routeSales.includes(sale.id) ? 'bg-cyan-50 border-cyan-500 text-cyan-700' : ''}`}
                    >
                      <Bookmark className={`w-3 h-3 mr-1 ${routeSales.includes(sale.id) ? 'fill-current' : ''}`} />
                      {routeSales.includes(sale.id) ? 'In Route' : 'Add'}
                    </Button>
                    <Button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSave(sale.id); }}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <Heart className={`w-3 h-3 mr-1 ${savedSales.includes(sale.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      {savedSales.includes(sale.id) ? 'Saved' : 'Save'}
                    </Button>
                    <Button
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        const addr = sale.property_address;
                        if (addr) window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`)}`, '_blank');
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Navigation className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* CTA */}
      <div className="px-4 mt-6 mb-4 space-y-5">
        <Link to="/mobile/packages">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-center text-white">
            <p className="font-semibold text-sm">Need an estate sale company?</p>
            <p className="text-xs text-orange-100 mt-0.5">We'll connect you with local pros →</p>
          </div>
        </Link>
        <Link to="/mobile/companies">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-4 text-center text-white">
            <p className="font-semibold text-sm">Browse all companies</p>
            <p className="text-xs text-cyan-100 mt-0.5">Explore estate sale companies nationwide →</p>
          </div>
        </Link>
        <Link to="/mobile/cool-finds">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-center text-white">
            <p className="font-semibold text-sm">Cool Finds & Crazy Stories</p>
            <p className="text-xs text-purple-100 mt-0.5">Discover hidden treasures & wild tales →</p>
          </div>
        </Link>
      </div>
    </MobileAppShell>
  );
}