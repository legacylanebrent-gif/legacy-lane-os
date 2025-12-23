import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Search, Mail, Phone, Building2, MapPin, Star, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const user = await base44.auth.me();
      
      // Get all connections where this user favorited a business
      const connections = await base44.entities.Connection.filter({
        connected_user_id: user.id,
        connection_type: 'favorite'
      }, '-created_date');

      setFavorites(connections);

      // Load business details for all favorited accounts
      const businessIds = connections.map(c => c.account_owner_id);
      const users = await base44.entities.User.list();
      const businessMap = {};
      users.forEach(u => {
        if (businessIds.includes(u.id)) {
          businessMap[u.id] = u;
        }
      });
      setBusinesses(businessMap);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId) => {
    if (!confirm('Remove this business from your favorites?')) return;
    
    try {
      await base44.entities.Connection.delete(favoriteId);
      loadFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Error removing favorite');
    }
  };

  const filteredFavorites = searchQuery.trim()
    ? favorites.filter(f => {
        const business = businesses[f.account_owner_id];
        return business?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               business?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               business?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : favorites;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">My Favorites</h1>
          <p className="text-slate-600 mt-1">Businesses you've saved for quick access</p>
        </div>
        <Badge className="bg-pink-100 text-pink-700 text-lg px-4 py-2">
          <Heart className="w-5 h-5 mr-2 fill-current" />
          {favorites.length} {favorites.length === 1 ? 'Favorite' : 'Favorites'}
        </Badge>
      </div>

      {favorites.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {filteredFavorites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Favorites Yet</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery.trim() ? 'No favorites match your search' : 'Start adding businesses to your favorites by clicking the heart icon'}
            </p>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                Browse Estate Sales
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map((favorite) => {
            const business = businesses[favorite.account_owner_id];
            if (!business) return null;

            return (
              <Card key={favorite.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-br from-pink-50 to-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                        {business.logo_url ? (
                          <img src={business.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-cyan-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{business.company_name || business.full_name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          {favorite.account_owner_type?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveFavorite(favorite.id)}
                      className="text-pink-600 hover:text-pink-700 hover:bg-pink-100"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {business.bio && (
                    <p className="text-sm text-slate-600 line-clamp-2">{business.bio}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {business.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{business.email}</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{business.phone}</span>
                      </div>
                    )}
                    {business.city && business.state && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{business.city}, {business.state}</span>
                      </div>
                    )}
                  </div>

                  {business.rating && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{business.rating.toFixed(1)}</span>
                      {business.total_reviews > 0 && (
                        <span className="text-xs text-slate-500">({business.total_reviews} reviews)</span>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t flex gap-2">
                    <Link to={createPageUrl('BusinessProfile') + '?id=' + business.id} className="flex-1">
                      <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                        View Profile
                      </Button>
                    </Link>
                  </div>

                  <div className="text-xs text-slate-500 text-center">
                    Added {format(new Date(favorite.created_date), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}