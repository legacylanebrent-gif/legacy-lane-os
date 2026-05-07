import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, Search, MapPin, Calendar, Trash2, Navigation, Bookmark, Clock, Archive
} from 'lucide-react';
import { isSaleAddressVisible } from '@/utils/saleAddressUtils';
import { format } from 'date-fns';

// Determine if a sale is fully in the past (all sale dates + end times have passed)
function isSalePast(sale) {
  if (!sale?.sale_dates || sale.sale_dates.length === 0) return false;
  const now = new Date();
  // Check if the LAST sale date has passed
  const lastDate = sale.sale_dates[sale.sale_dates.length - 1];
  if (!lastDate?.date) return false;

  // Build end datetime
  let endDateTime;
  if (lastDate.end_time) {
    // Parse time like "14:00" or "2:00 PM"
    const dateStr = lastDate.date;
    const timeStr = lastDate.end_time;
    endDateTime = new Date(`${dateStr}T${convertTo24Hour(timeStr)}:00`);
  } else {
    // No end time — consider end of day, parse as local time
    endDateTime = new Date(lastDate.date + 'T23:59:59');
  }

  return endDateTime < now;
}

function convertTo24Hour(time) {
  if (!time) return '23:59';
  if (!time.includes('AM') && !time.includes('PM') && !time.includes('am') && !time.includes('pm')) {
    return time.length === 5 ? time : time.padStart(5, '0');
  }
  const [t, modifier] = time.split(' ');
  let [hours, minutes] = t.split(':');
  if (modifier?.toUpperCase() === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
  if (modifier?.toUpperCase() === 'AM' && hours === '12') hours = '00';
  return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [saleDetails, setSaleDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'past'
  const [routeSales, setRouteSales] = useState([]);

  useEffect(() => {
    loadFavorites();
    const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    setRouteSales(route);
  }, []);

  const loadFavorites = async () => {
    try {
      const user = await base44.auth.me();
      const connections = await base44.entities.Connection.filter({
        connected_user_id: user.id,
        connection_type: 'favorite'
      });
      setFavorites(connections);

      const saleIds = [...new Set(connections.map(c => c.source).filter(Boolean))];
      const sales = await Promise.all(
        saleIds.map(id =>
          base44.entities.EstateSale.filter({ id }).then(res => res[0])
        )
      );
      const saleMap = {};
      sales.forEach(sale => { if (sale) saleMap[sale.id] = sale; });
      setSaleDetails(saleMap);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    if (!confirm('Remove this sale from your favorites?')) return;
    try {
      await base44.entities.Connection.delete(favoriteId);
      const saved = JSON.parse(localStorage.getItem('savedSales') || '[]');
      const favorite = favorites.find(f => f.id === favoriteId);
      if (favorite?.source) {
        localStorage.setItem('savedSales', JSON.stringify(saved.filter(id => id !== favorite.source)));
      }
      loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleAddToRoute = (e, saleId) => {
    e.preventDefault();
    e.stopPropagation();
    const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    const updated = route.includes(saleId) ? route.filter(id => id !== saleId) : [...route, saleId];
    localStorage.setItem('estateRoute', JSON.stringify(updated));
    setRouteSales(updated);
  };

  const handleGetDirections = (e, sale) => {
    e.preventDefault();
    e.stopPropagation();
    if (sale.property_address) {
      const address = `${sale.property_address.street}, ${sale.property_address.city}, ${sale.property_address.state} ${sale.property_address.zip}`;
      window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`, '_blank');
    }
  };

  // Split favorites into active vs past
  const activeFavorites = favorites.filter(fav => {
    const sale = saleDetails[fav.source];
    return sale && !isSalePast(sale);
  });

  const pastFavorites = favorites.filter(fav => {
    const sale = saleDetails[fav.source];
    return sale && isSalePast(sale);
  });

  const applySearch = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(fav => {
      const sale = saleDetails[fav.source];
      return (
        sale?.title?.toLowerCase().includes(q) ||
        sale?.property_address?.city?.toLowerCase().includes(q) ||
        sale?.property_address?.state?.toLowerCase().includes(q)
      );
    });
  };

  const displayList = applySearch(activeTab === 'active' ? activeFavorites : pastFavorites);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">❤️ My Favorites</h1>
          <p className="text-slate-600">
            {activeFavorites.length} active · {pastFavorites.length} past
          </p>
        </div>
        <Button onClick={loadFavorites} variant="outline">Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Heart className="w-4 h-4 inline mr-1" />
          Current Favorites
          {activeFavorites.length > 0 && (
            <Badge className="ml-2 bg-orange-100 text-orange-700 border-orange-200">{activeFavorites.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'past'
              ? 'border-slate-500 text-slate-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="w-4 h-4 inline mr-1" />
          Past Favorites
          {pastFavorites.length > 0 && (
            <Badge className="ml-2 bg-slate-100 text-slate-600 border-slate-200">{pastFavorites.length}</Badge>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder={`Search ${activeTab === 'past' ? 'past ' : ''}favorites...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Past notice */}
      {activeTab === 'past' && (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
          <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>These sales have ended. Addresses are hidden to prevent unannounced visits to private properties.</span>
        </div>
      )}

      {/* Cards */}
      {displayList.length === 0 ? (
        <Card className="p-12 text-center">
          {activeTab === 'active' ? (
            <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          ) : (
            <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          )}
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {activeTab === 'active' ? 'No Current Favorites' : 'No Past Favorites'}
          </h3>
          <p className="text-slate-600 mb-6">
            {searchQuery
              ? 'No favorites match your search.'
              : activeTab === 'active'
              ? "Start saving estate sales you're interested in!"
              : "Sales you've favorited that have ended will appear here."}
          </p>
          {activeTab === 'active' && (
            <Link to={createPageUrl('Home')}>
              <Button className="bg-orange-600 hover:bg-orange-700">Browse Estate Sales</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayList.map(favorite => {
            const sale = saleDetails[favorite.source];
            if (!sale) return null;
            const isPast = activeTab === 'past';

            return (
              <Card
                key={favorite.id}
                className={`overflow-hidden transition-shadow group ${isPast ? 'opacity-80 hover:opacity-100' : 'hover:shadow-xl'}`}
              >
                <Link to={isPast ? '#' : createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                  onClick={isPast ? (e) => e.preventDefault() : undefined}
                >
                  {sale.images && sale.images.length > 0 && (
                    <div className={`relative h-48 overflow-hidden ${isPast ? 'grayscale' : ''}`}>
                      <img
                        src={sale.images[0].url || sale.images[0]}
                        alt={sale.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-red-600 text-white rounded-full p-2 shadow-lg">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                      {isPast && (
                        <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                          <Badge className="bg-slate-700 text-white text-xs px-3 py-1">Sale Ended</Badge>
                        </div>
                      )}
                      {!isPast && sale.national_featured && (
                        <Badge className="absolute top-3 right-3 bg-orange-600 text-white">National Featured</Badge>
                      )}
                      {!isPast && !sale.national_featured && sale.local_featured && (
                        <Badge className="absolute top-3 right-3 bg-cyan-600 text-white">Local Featured</Badge>
                      )}
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-orange-600 transition-colors">
                      {sale.title}
                    </h3>

                    <div className="space-y-2 text-sm mb-4">
                      {/* Address: hidden for past; revealed 24hrs before for active */}
                      {isPast ? (
                        <div className="flex items-start gap-2 text-slate-400 italic text-xs">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>Address hidden — sale has ended</span>
                        </div>
                      ) : isSaleAddressVisible(sale) ? (
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                          <span>
                            {sale.property_address?.street && `${sale.property_address.street}, `}
                            {sale.property_address?.city}, {sale.property_address?.state} {sale.property_address?.zip}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-slate-400 text-xs">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="italic">Address revealed 24 hrs before sale · {sale.property_address?.city}, {sale.property_address?.state}</span>
                        </div>
                      )}

                      {sale.sale_dates && sale.sale_dates.length > 0 && (
                        <div className="flex items-start gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-sm">
                            {sale.sale_dates.map((d, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <span>{format(new Date(d.date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                                {d.start_time && (
                                  <span className="text-xs text-slate-500">{d.start_time}{d.end_time ? ` – ${d.end_time}` : ''}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      {/* Action buttons — only show route/directions for active sales */}
                      {!isPast && (
                        <div className="flex gap-2">
                          <Button
                            onClick={(e) => handleAddToRoute(e, sale.id)}
                            variant="outline"
                            size="sm"
                            className={`flex-1 ${routeSales.includes(sale.id) ? 'bg-cyan-100 border-cyan-600 text-cyan-700' : ''}`}
                          >
                            <Bookmark className={`w-4 h-4 mr-1 ${routeSales.includes(sale.id) ? 'fill-current' : ''}`} />
                            {routeSales.includes(sale.id) ? 'In Route' : 'Add to Route'}
                          </Button>
                          {isSaleAddressVisible(sale) && (
                            <Button
                              onClick={(e) => handleGetDirections(e, sale)}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              <Navigation className="w-4 h-4 mr-1" />
                              Directions
                            </Button>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.id);
                        }}
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove from Favorites
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}