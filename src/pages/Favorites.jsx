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
  Heart, Search, MapPin, Calendar, Trash2, Star, Building2, Mail, Phone, Navigation, Bookmark
} from 'lucide-react';
import { format } from 'date-fns';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [saleDetails, setSaleDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [routeSales, setRouteSales] = useState([]);

  useEffect(() => {
    loadFavorites();
    loadRoute();
  }, []);

  const loadRoute = () => {
    const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    setRouteSales(route);
  };

  const loadFavorites = async () => {
    try {
      const user = await base44.auth.me();
      
      // Load connections where user is the connected user and type is favorite
      const connections = await base44.entities.Connection.filter({
        connected_user_id: user.id,
        connection_type: 'favorite'
      });
      
      setFavorites(connections);
      
      // Load estate sale details for each connection
      const saleIds = [...new Set(connections.map(c => c.source).filter(s => s))];
      const sales = await Promise.all(
        saleIds.map(id => 
          base44.entities.EstateSale.filter({ id }).then(sales => sales[0])
        )
      );
      
      const saleMap = {};
      sales.forEach(sale => {
        if (sale) {
          saleMap[sale.id] = sale;
        }
      });
      
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
      
      // Also remove from localStorage
      const saved = JSON.parse(localStorage.getItem('savedSales') || '[]');
      const favorite = favorites.find(f => f.id === favoriteId);
      if (favorite?.source) {
        const updated = saved.filter(id => id !== favorite.source);
        localStorage.setItem('savedSales', JSON.stringify(updated));
      }
      
      loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove favorite');
    }
  };

  const handleAddToRoute = (e, saleId) => {
    e.preventDefault();
    e.stopPropagation();
    const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    if (route.includes(saleId)) {
      const updated = route.filter(id => id !== saleId);
      localStorage.setItem('estateRoute', JSON.stringify(updated));
      setRouteSales(updated);
    } else {
      route.push(saleId);
      localStorage.setItem('estateRoute', JSON.stringify(route));
      setRouteSales(route);
    }
  };

  const handleGetDirections = (e, sale) => {
    e.preventDefault();
    e.stopPropagation();
    if (sale.property_address) {
      const address = `${sale.property_address.street}, ${sale.property_address.city}, ${sale.property_address.state} ${sale.property_address.zip}`;
      window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const filteredFavorites = favorites.filter(fav => {
    const sale = saleDetails[fav.source];
    if (!sale) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      sale.title?.toLowerCase().includes(query) ||
      sale.property_address?.city?.toLowerCase().includes(query) ||
      sale.property_address?.state?.toLowerCase().includes(query)
    );
  });

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
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
            ❤️ My Favorites
          </h1>
          <p className="text-slate-600">{filteredFavorites.length} saved estate {filteredFavorites.length === 1 ? 'sale' : 'sales'}</p>
        </div>
        <Button onClick={loadFavorites} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search favorites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredFavorites.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Favorites Yet</h3>
          <p className="text-slate-600 mb-6">
            {searchQuery ? 'No favorites match your search.' : 'Start saving estate sales you\'re interested in!'}
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-orange-600 hover:bg-orange-700">
              Browse Estate Sales
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map(favorite => {
            const sale = saleDetails[favorite.source];
            if (!sale) return null;

            return (
              <Card key={favorite.id} className="overflow-hidden hover:shadow-xl transition-shadow group">
                <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                  {sale.images && sale.images.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={sale.images[0].url || sale.images[0]}
                        alt={sale.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-red-600 text-white rounded-full p-2 shadow-lg">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                      {sale.national_featured && (
                        <Badge className="absolute top-3 right-3 bg-orange-600 text-white">
                          National Featured
                        </Badge>
                      )}
                      {!sale.national_featured && sale.local_featured && (
                        <Badge className="absolute top-3 right-3 bg-cyan-600 text-white">
                          Local Featured
                        </Badge>
                      )}
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-orange-600 transition-colors">
                      {sale.title}
                    </h3>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                        <span>
                          {sale.property_address?.street && `${sale.property_address.street}, `}
                          {sale.property_address?.city}, {sale.property_address?.state} {sale.property_address?.zip}
                        </span>
                      </div>

                      {sale.sale_dates && sale.sale_dates.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <div className="flex items-center justify-between flex-1">
                            <span>{format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')}</span>
                            {sale.sale_dates[0].start_time && (
                              <span className="text-xs text-slate-500">
                                {sale.sale_dates[0].start_time} - {sale.sale_dates[0].end_time}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-2">
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
                        <Button
                          onClick={(e) => handleGetDirections(e, sale)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Directions
                        </Button>
                      </div>
                      
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