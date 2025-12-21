import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { 
  Search, MapPin, Calendar, Heart, User, LogIn, MessageSquare, LayoutDashboard,
  TrendingUp, Home as HomeIcon, DollarSign, Navigation, Bookmark
} from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Home() {
  const [sales, setSales] = useState([]);
  const [nationalFeatured, setNationalFeatured] = useState([]);
  const [localFeatured, setLocalFeatured] = useState([]);
  const [regularSales, setRegularSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [routeSales, setRouteSales] = useState([]);
  const [savedSales, setSavedSales] = useState([]);
  const [operators, setOperators] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);

  useEffect(() => {
    loadData();
    getUserLocation();
    loadRoute();
  }, []);

  const loadRoute = () => {
    const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    setRouteSales(route);
    const saved = JSON.parse(localStorage.getItem('savedSales') || '[]');
    setSavedSales(saved);
  };

  useEffect(() => {
    organizeSales();
  }, [searchQuery, sales, userLocation]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          // Don't automatically filter, just get location for distance display
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

      if (authenticated) {
        try {
          const user = await base44.auth.me();
          setCurrentUser(user);
        } catch (error) {
          console.log('Could not load user');
        }
      }

      // Load estate sales (public access)
      const salesData = await base44.entities.EstateSale.list('-created_date', 50);
      const activeSales = salesData.filter(s => s.status === 'upcoming' || s.status === 'active');
      setSales(activeSales);

      // Calculate real-time stats
      const itemsCount = activeSales.reduce((sum, sale) => sum + (sale.total_items || 0), 0);
      const estimatedValue = activeSales.reduce((sum, sale) => sum + (sale.estimated_value || 0), 0);
      setTotalItems(itemsCount);
      setTotalEstimatedValue(estimatedValue);
      
      // Load operator company names
      try {
        const users = await base44.entities.User.list();
        const operatorMap = {};
        users.forEach(user => {
          operatorMap[user.id] = user.company_name || user.full_name;
        });
        setOperators(operatorMap);
      } catch (error) {
        console.log('Could not load operators');
      }
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
    if (userLocation) {
      // Already have location, re-organize
      organizeSales();
    } else {
      // Get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.log('Geolocation error:', error);
            alert('Unable to get your location. Please try entering a ZIP code.');
          }
        );
      }
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

  const handleSaveSale = async (e, saleId) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = JSON.parse(localStorage.getItem('savedSales') || '[]');
    if (saved.includes(saleId)) {
      const updated = saved.filter(id => id !== saleId);
      localStorage.setItem('savedSales', JSON.stringify(updated));
      setSavedSales(updated);
    } else {
      saved.push(saleId);
      localStorage.setItem('savedSales', JSON.stringify(saved));
      setSavedSales(saved);
      // Update save count
      try {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          await base44.entities.EstateSale.update(saleId, {
            saves: (sale.saves || 0) + 1
          });
        }
      } catch (error) {
        console.log('Could not update save count');
      }
    }
  };

  const organizeSales = () => {
    let allSales = [...sales];

    // Add distance to all sales if location is available
    if (userLocation) {
      allSales = allSales.map(sale => {
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
    }

    // Apply search filter if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allSales = allSales.filter(sale =>
        sale.title?.toLowerCase().includes(query) ||
        sale.property_address?.city?.toLowerCase().includes(query) ||
        sale.property_address?.state?.toLowerCase().includes(query) ||
        sale.property_address?.zip?.includes(query) ||
        sale.categories?.some(cat => cat.toLowerCase().includes(query))
      );
    }

    // Separate into categories
    const national = allSales.filter(s => s.national_featured);
    const local = allSales.filter(s => !s.national_featured && s.local_featured);
    const regular = allSales.filter(s => !s.national_featured && !s.local_featured);

    // For local featured and regular: filter by distance if location available
    const filterByDistance = (salesList) => {
      if (userLocation) {
        return salesList
          .filter(s => s.distance !== null && s.distance < 25)
          .sort((a, b) => a.distance - b.distance);
      }
      return salesList;
    };

    setNationalFeatured(national);
    setLocalFeatured(filterByDistance(local));
    setRegularSales(filterByDistance(regular));
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

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = createPageUrl('Dashboard')}
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = createPageUrl('Messages')}
                    title="Messages"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                  {currentUser && <NotificationsDropdown user={currentUser} />}
                  <Button
                    variant="ghost"
                    onClick={() => window.location.href = createPageUrl('Dashboard')}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </>
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

          {/* Map Section */}
          {(localFeatured.length > 0 || regularSales.length > 0) && (
            <div className="max-w-5xl mx-auto mb-8">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-slate-200">
                <MapContainer
                  center={userLocation ? [userLocation.lat, userLocation.lng] : [39.8283, -98.5795]}
                  zoom={userLocation ? 10 : 4}
                  style={{ height: '400px', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {localFeatured.map(sale => 
                    sale.location && sale.location.lat && sale.location.lng && (
                      <Marker key={sale.id} position={[sale.location.lat, sale.location.lng]}>
                        <Popup>
                          <div className="text-sm">
                            <strong className="text-cyan-600">{sale.title}</strong>
                            <p className="text-xs text-slate-600 mt-1">{sale.property_address?.city}, {sale.property_address?.state}</p>
                            {sale.distance && <p className="text-xs text-orange-600 font-semibold mt-1">{sale.distance.toFixed(1)} mi away</p>}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  )}
                  {regularSales.map(sale => 
                    sale.location && sale.location.lat && sale.location.lng && (
                      <Marker key={sale.id} position={[sale.location.lat, sale.location.lng]}>
                        <Popup>
                          <div className="text-sm">
                            <strong>{sale.title}</strong>
                            <p className="text-xs text-slate-600 mt-1">{sale.property_address?.city}, {sale.property_address?.state}</p>
                            {sale.distance && <p className="text-xs text-orange-600 font-semibold mt-1">{sale.distance.toFixed(1)} mi away</p>}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  )}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto space-y-4">
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

            {userLocation && (
              <div className="text-sm text-slate-600 text-center">
                📍 Showing local sales within 25 miles of your location
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
              <div className="text-3xl font-bold text-slate-900">
                {totalItems > 0 ? totalItems.toLocaleString() : '0'}
              </div>
              <div className="text-slate-600">Items Available</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900">
                {totalEstimatedValue > 0 ? `$${(totalEstimatedValue / 1000000).toFixed(1)}M` : '$0'}
              </div>
              <div className="text-slate-600">Total Value</div>
            </div>
          </div>
        </div>
      </section>

      {/* Nationally Featured Sales */}
      {nationalFeatured.length > 0 && (
        <section className="py-12 px-4 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-serif font-bold text-slate-900">
                  🌟 Nationally Featured Sales
                </h3>
                <p className="text-slate-600 mt-1">Premium estate sales from across the country</p>
              </div>
              <div className="text-slate-600">
                {nationalFeatured.length} {nationalFeatured.length === 1 ? 'sale' : 'sales'}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nationalFeatured.map(sale => (
                <Link
                  key={sale.id}
                  to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-shadow border-2 border-orange-200">
                    {sale.images && sale.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={sale.images[0]}
                          alt={sale.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className="absolute top-3 right-3 bg-orange-600 text-white">
                          National Featured
                        </Badge>
                        <button 
                          onClick={(e) => handleSaveSale(e, sale.id)}
                          className="absolute top-3 left-3 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${savedSales.includes(sale.id) ? 'fill-red-600 text-red-600' : 'text-slate-600'}`} />
                        </button>
                        </div>
                    )}
                    <CardContent className="p-5">
                      <h4 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                        {sale.title}
                      </h4>
                      
                      {sale.operator_id && operators[sale.operator_id] && (
                        <Link 
                          to={createPageUrl('BusinessProfile') + '?id=' + sale.operator_id}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium block mb-3"
                        >
                          by {operators[sale.operator_id]}
                        </Link>
                      )}

                      <div className="space-y-2 text-sm">
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

                      <div className="mt-4 pt-4 border-t">
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
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Locally Featured Sales */}
      {localFeatured.length > 0 && (
        <section className="py-12 px-4 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-serif font-bold text-slate-900">
                  📍 Featured Sales Near You
                </h3>
                <p className="text-slate-600 mt-1">Premium local estate sales in your area</p>
              </div>
              <div className="text-slate-600">
                {localFeatured.length} {localFeatured.length === 1 ? 'sale' : 'sales'}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localFeatured.map(sale => (
                <Link
                  key={sale.id}
                  to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-shadow border-2 border-cyan-200">
                    {sale.images && sale.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={sale.images[0]}
                          alt={sale.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className="absolute top-3 right-3 bg-cyan-600 text-white">
                          Local Featured
                        </Badge>
                        <button 
                          onClick={(e) => handleSaveSale(e, sale.id)}
                          className="absolute top-3 left-3 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${savedSales.includes(sale.id) ? 'fill-red-600 text-red-600' : 'text-slate-600'}`} />
                        </button>
                        </div>
                    )}
                    <CardContent className="p-5">
                      <h4 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                        {sale.title}
                      </h4>
                      
                      {sale.operator_id && operators[sale.operator_id] && (
                        <Link 
                          to={createPageUrl('BusinessProfile') + '?id=' + sale.operator_id}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium block mb-3"
                        >
                          by {operators[sale.operator_id]}
                        </Link>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                          <span>
                            {sale.property_address?.street && `${sale.property_address.street}, `}
                            {sale.property_address?.city}, {sale.property_address?.state} {sale.property_address?.zip}
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

                      <div className="mt-4 pt-4 border-t">
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
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Regular Local Sales */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-serif font-bold text-slate-900">
                {userLocation ? 'Local Estate Sales Near You' : 'All Estate Sales'}
              </h3>
              {userLocation && (
                <p className="text-slate-600 mt-1">Within 25 miles of your location</p>
              )}
            </div>
            <div className="text-slate-600">
              {regularSales.length} {regularSales.length === 1 ? 'sale' : 'sales'}
            </div>
          </div>

          {regularSales.length === 0 ? (
            <Card className="p-12 text-center">
              <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">
                {userLocation 
                  ? 'No estate sales found within 25 miles. Try searching a different location.'
                  : 'No estate sales available. Check back soon!'}
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularSales.map(sale => (
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
                        <button 
                          onClick={(e) => handleSaveSale(e, sale.id)}
                          className="absolute top-3 left-3 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${savedSales.includes(sale.id) ? 'fill-red-600 text-red-600' : 'text-slate-600'}`} />
                        </button>
                        </div>
                    )}
                    <CardContent className="p-5">
                      <h4 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                        {sale.title}
                      </h4>
                      
                      {sale.operator_id && operators[sale.operator_id] && (
                        <Link 
                          to={createPageUrl('BusinessProfile') + '?id=' + sale.operator_id}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium block mb-3"
                        >
                          by {operators[sale.operator_id]}
                        </Link>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                          <span>
                            {sale.property_address?.street && `${sale.property_address.street}, `}
                            {sale.property_address?.city}, {sale.property_address?.state} {sale.property_address?.zip}
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

                      <div className="mt-4 pt-4 border-t">
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