import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, MapPin, Calendar, Heart, User, LogIn,
  TrendingUp, Home as HomeIcon, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

export default function Home() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [filterByLocation, setFilterByLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadData();
    getUserLocation();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchQuery, sales, userLocation, filterByLocation]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setFilterByLocation(true);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const loadData = async () => {
    try {
      // Check if user is authenticated
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Load estate sales (public access)
      const salesData = await base44.asServiceRole.entities.EstateSale.list('-created_date', 50);
      const activeSales = salesData.filter(s => s.status === 'upcoming' || s.status === 'active');
      setSales(activeSales);
      setFilteredSales(activeSales);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const geocodeZipCode = async (zip) => {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${await getGoogleMapsKey()}`);
      const data = await response.json();
      if (data.results && data.results[0]) {
        const location = data.results[0].geometry.location;
        setUserLocation({ lat: location.lat, lng: location.lng });
        setFilterByLocation(true);
      }
    } catch (error) {
      console.error('Error geocoding zip:', error);
    }
  };

  const getGoogleMapsKey = async () => {
    try {
      const response = await base44.functions.invoke('getConfig', {});
      return response.data.GOOGLE_MAPS_API_KEY;
    } catch (error) {
      return '';
    }
  };

  const handleZipSearch = () => {
    if (zipCode.trim()) {
      geocodeZipCode(zipCode.trim());
    }
  };

  const handleUseMyLocation = () => {
    getUserLocation();
  };

  const filterSales = () => {
    let filtered = [...sales];

    // Add distance to all sales if location is available
    if (userLocation) {
      filtered = filtered.map(sale => {
        if (sale.location && sale.location.lat && sale.location.lng) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            sale.location.lat,
            sale.location.lng
          );
          return { ...sale, distance };
        }
        return { ...sale, distance: null };
      });

      // Filter by distance only if explicitly requested
      if (filterByLocation) {
        filtered = filtered.filter(sale => sale.distance !== null && sale.distance < 25);
      }

      // Sort by distance
      filtered.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.title?.toLowerCase().includes(query) ||
        sale.property_address?.city?.toLowerCase().includes(query) ||
        sale.property_address?.state?.toLowerCase().includes(query) ||
        sale.property_address?.zip?.includes(query) ||
        sale.categories?.some(cat => cat.toLowerCase().includes(query))
      );
    }

    setFilteredSales(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-slate-900">Legacy Lane</h1>
                <p className="text-xs text-orange-600">Estate Sale Finder</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Button
                  onClick={() => window.location.href = createPageUrl('Dashboard')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <User className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                  <Button
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-serif font-bold text-slate-900 mb-4">
            Discover Amazing Estate Sales
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Find treasures, furniture, antiques, and more near you
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by location, category, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg shadow-lg border-2 border-slate-200 focus:border-orange-500"
              />
            </div>

            {/* Zip Code Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Enter ZIP code to find sales near you..."
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleZipSearch()}
                  className="pl-12 h-12 shadow-md"
                />
              </div>
              <Button 
                onClick={handleZipSearch}
                className="bg-cyan-600 hover:bg-cyan-700 h-12 px-6"
              >
                Search ZIP
              </Button>
              <Button 
                onClick={handleUseMyLocation}
                variant="outline"
                className="h-12 px-6"
              >
                Use My Location
              </Button>
            </div>

            {filterByLocation && userLocation && (
              <div className="text-sm text-slate-600 text-center">
                📍 Showing sales within 25 miles of your location
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <HomeIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900">{sales.length}</div>
              <div className="text-slate-600">Active Sales</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <TrendingUp className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900">50K+</div>
              <div className="text-slate-600">Items Available</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900">$2M+</div>
              <div className="text-slate-600">Savings Found</div>
            </div>
          </div>
        </div>
      </section>

      {/* Estate Sales Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-serif font-bold text-slate-900">
              {filterByLocation ? 'Local Estate Sales Near You' : searchQuery ? 'Search Results' : 'Featured Estate Sales'}
            </h3>
            <div className="text-slate-600">
              {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'} found
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <Card className="p-12 text-center">
              <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No estate sales found matching your search</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSales.map(sale => (
                <Link
                  key={sale.id}
                  to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-shadow">
                    {sale.images && sale.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={sale.images[0]}
                          alt={sale.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {sale.premium_listing && (
                          <Badge className="absolute top-3 right-3 bg-orange-600 text-white">
                            Featured
                          </Badge>
                        )}
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h4 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                        {sale.title}
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                          <span className="truncate">
                            {sale.property_address?.city}, {sale.property_address?.state}
                            {sale.distance !== null && sale.distance !== undefined && (
                              <span className="ml-2 text-xs text-orange-600 font-semibold">
                                ({sale.distance.toFixed(1)} mi)
                              </span>
                            )}
                          </span>
                        </div>

                        {sale.sale_dates && sale.sale_dates.length > 0 && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <span>{format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      {sale.categories && sale.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {sale.categories.slice(0, 3).map((cat, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                          {sale.categories.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{sale.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-slate-500">
                        <span>{sale.views || 0} views</span>
                        <Heart className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">LL</span>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-serif font-bold">Legacy Lane</h3>
              <p className="text-xs text-orange-400">Estate Sale Finder</p>
            </div>
          </div>
          <p className="text-slate-400">
            Discover amazing estate sales and find treasures near you
          </p>
          <p className="text-slate-500 text-sm mt-4">
            © 2024 Legacy Lane. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}