import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import ConsumerHeader from '@/components/layout/ConsumerHeader';
import SaleRequestModal from '@/components/leads/SaleRequestModal';
import QRCodeScanner from '@/components/checkin/QRCodeScanner';
import RecordPurchaseModal from '@/components/purchase/RecordPurchaseModal';
import { t } from '@/components/terminology';
import { 
  Search, MapPin, Calendar, Heart, User, LogIn, LogOut, MessageSquare, LayoutDashboard,
  TrendingUp, Home as HomeIcon, DollarSign, Navigation, Bookmark, ShoppingBag, Building2, QrCode, Receipt, ChevronDown, Bell, Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to update map view when userLocation changes
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [routeSales, setRouteSales] = useState([]);
  const [savedSales, setSavedSales] = useState([]);
  const [operators, setOperators] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);
  const [showSaleRequestModal, setShowSaleRequestModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapMinZoom, setMapMinZoom] = useState(null);
  const [debugMessage, setDebugMessage] = useState('');
  const [showLocationChangeDialog, setShowLocationChangeDialog] = useState(false);
  const [newLocation, setNewLocation] = useState(null);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          const user = await base44.auth.me();
          setCurrentUser(user);
        } catch (error) {
          console.error('Error loading user:', error);
        }
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
      try {
        await loadData();
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
      getUserLocation();
      loadRoute();
    }
  };

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
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Check if location has changed significantly from previous visit
          const storedLocation = localStorage.getItem('userLocation');
          if (storedLocation) {
            const prevLoc = JSON.parse(storedLocation);
            const distance = calculateDistance(prevLoc.lat, prevLoc.lng, userLoc.lat, userLoc.lng);
            
            // If moved more than 10 miles, ask to update
            if (distance > 10) {
              setNewLocation(userLoc);
              setShowLocationChangeDialog(true);
              // Use previous location temporarily
              setUserLocation(prevLoc);
              calculateMinZoom(prevLoc);
            } else {
              setUserLocation(userLoc);
              calculateMinZoom(userLoc);
            }
          } else {
            // First visit, store location
            localStorage.setItem('userLocation', JSON.stringify(userLoc));
            setUserLocation(userLoc);
            calculateMinZoom(userLoc);
          }
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Try to use stored location if available
          const storedLocation = localStorage.getItem('userLocation');
          if (storedLocation) {
            const prevLoc = JSON.parse(storedLocation);
            setUserLocation(prevLoc);
            calculateMinZoom(prevLoc);
          }
        }
      );
    }
  };
  
  const handleUpdateLocation = () => {
    if (newLocation) {
      localStorage.setItem('userLocation', JSON.stringify(newLocation));
      setUserLocation(newLocation);
      calculateMinZoom(newLocation);
      setShowLocationChangeDialog(false);
      setNewLocation(null);
    }
  };
  
  const handleKeepOldLocation = () => {
    setShowLocationChangeDialog(false);
    setNewLocation(null);
  };

  const calculateMinZoom = (location) => {
    // Zoom level 12 shows approximately 25 mile radius
    // Set this as minimum zoom to prevent zooming out beyond 25 miles
    setMapZoom(12);
    setMapMinZoom(12);
  };

  const loadData = async () => {
    try {
      console.log('Loading estate sales data...');
      // Load estate sales (public access)
      const salesData = await base44.entities.EstateSale.list('-created_date', 50);
      console.log('Raw sales data:', salesData);
      
      const activeSales = (salesData || []).filter(s => s.status === 'upcoming' || s.status === 'active');
      console.log('Active sales after filter:', activeSales.length);
      
      setSales(activeSales);

      // Calculate real-time stats
      const itemsCount = activeSales.reduce((sum, sale) => sum + (sale.total_items || 0), 0);
      const estimatedValue = activeSales.reduce((sum, sale) => sum + (sale.estimated_value || 0), 0);
      setTotalItems(itemsCount);
      setTotalEstimatedValue(estimatedValue);
      
      // Load operator company names (skip if not authenticated)
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated) {
          const users = await base44.entities.User.list();
          const operatorMap = {};
          (users || []).forEach(user => {
            operatorMap[user.id] = user.company_name || user.full_name;
          });
          setOperators(operatorMap);
        }
      } catch (error) {
        console.log('Could not load operators:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty data to avoid blank page
      setSales([]);
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
        const userLoc = { lat: location.lat, lng: location.lng };
        setUserLocation(userLoc);
        calculateMinZoom(userLoc);
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
      calculateMinZoom(userLocation);
    } else {
      // Get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLoc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userLoc);
            calculateMinZoom(userLoc);
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
    
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const saved = JSON.parse(localStorage.getItem('savedSales') || '[]');
    const sale = sales.find(s => s.id === saleId);
    
    if (saved.includes(saleId)) {
      const updated = saved.filter(id => id !== saleId);
      localStorage.setItem('savedSales', JSON.stringify(updated));
      setSavedSales(updated);
      setDebugMessage('❌ Removed from favorites');
      setTimeout(() => setDebugMessage(''), 3000);
      
      // Remove connection
      if (currentUser && sale?.operator_id) {
        try {
          const connections = await base44.entities.Connection.filter({
            connected_user_id: currentUser.id,
            account_owner_id: sale.operator_id,
            source: saleId
          });
          if (connections.length > 0) {
            await base44.entities.Connection.delete(connections[0].id);
            setDebugMessage('❌ Connection removed');
            setTimeout(() => setDebugMessage(''), 3000);
          }
        } catch (error) {
          setDebugMessage('⚠️ Error removing connection');
          setTimeout(() => setDebugMessage(''), 3000);
        }
      }
    } else {
      saved.push(saleId);
      localStorage.setItem('savedSales', JSON.stringify(saved));
      setSavedSales(saved);
      setDebugMessage('✅ Added to favorites (localStorage)');
      
      // Update save count
      if (sale) {
        try {
          await base44.entities.EstateSale.update(saleId, {
            saves: (sale.saves || 0) + 1
          });
          setDebugMessage('✅ Save count updated');
        } catch (error) {
          setDebugMessage('⚠️ Could not update save count');
        }
      }
      
      // Create connection
      if (currentUser && sale?.operator_id) {
        try {
          const connectionData = {
            account_owner_id: sale.operator_id,
            account_owner_type: 'estate_sale_operator',
            connected_user_id: currentUser.id,
            connected_user_name: currentUser.full_name,
            connected_user_email: currentUser.email,
            connected_user_phone: currentUser.phone || '',
            connection_type: 'favorite',
            source: saleId
          };
          setDebugMessage(`🔄 Creating connection... User: ${currentUser.id}, Operator: ${sale.operator_id}`);
          await base44.entities.Connection.create(connectionData);
          setDebugMessage('✅ Connection created successfully!');
          setTimeout(() => setDebugMessage(''), 5000);
        } catch (connError) {
          setDebugMessage(`❌ Connection error: ${connError.message}`);
          setTimeout(() => setDebugMessage(''), 5000);
        }
      } else {
        setDebugMessage(`⚠️ Missing: User=${!!currentUser}, Operator=${sale?.operator_id}`);
        setTimeout(() => setDebugMessage(''), 5000);
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

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Debug Message Banner */}
      {debugMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-2xl border-2 border-orange-500 max-w-xl">
          <p className="text-sm font-mono">{debugMessage}</p>
        </div>
      )}
      
      <SaleRequestModal 
        open={showSaleRequestModal} 
        onClose={() => setShowSaleRequestModal(false)} 
      />

      {/* Location Change Dialog */}
      <Dialog open={showLocationChangeDialog} onOpenChange={setShowLocationChangeDialog}>
        <DialogContent className="max-w-md">
          <div className="text-center py-4">
            <MapPin className="w-16 h-16 mx-auto text-cyan-600 mb-4" />
            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">
              Location Changed?
            </h3>
            <p className="text-slate-600 mb-6">
              It looks like you're in a different area than your last visit. Would you like to update your location to see estate sales near you?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleKeepOldLocation}
                variant="outline"
                className="flex-1"
              >
                Keep Old Location
              </Button>
              <Button
                onClick={handleUpdateLocation}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                Update Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      {isAuthenticated && (
        <>
          <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
            <DialogContent className="max-w-lg">
              <QRCodeScanner
                onScan={async (decodedText) => {
                  try {
                    const [saleId, saleTitle] = decodedText.split(':');

                    const createCheckIn = async (latitude = null, longitude = null) => {
                      try {
                        const checkInData = {
                          check_in_type: 'sale_visit',
                          location_name: saleTitle || 'Estate Sale',
                          location_id: saleId,
                          verified: true,
                          points_earned: 15
                        };

                        if (latitude && longitude) {
                          checkInData.latitude = latitude;
                          checkInData.longitude = longitude;
                        }

                        await base44.entities.CheckIn.create(checkInData);

                        await base44.entities.UserReward.create({
                          user_id: currentUser.id,
                          action_id: 'qr_check_in',
                          action_name: 'QR Code Check-in Bonus',
                          points_earned: 15,
                          description: `QR check-in at ${saleTitle || 'Estate Sale'}`
                        });

                        setShowQRScanner(false);
                        alert('Check-in successful! +15 points earned');
                      } catch (err) {
                        console.error('Error creating check-in:', err);
                        setShowQRScanner(false);
                        alert('Failed to create check-in');
                      }
                    };

                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => createCheckIn(position.coords.latitude, position.coords.longitude),
                        () => createCheckIn()
                      );
                    } else {
                      await createCheckIn();
                    }
                  } catch (error) {
                    console.error('Error processing QR code:', error);
                    setShowQRScanner(false);
                    alert('Failed to process QR code');
                  }
                }}
                onClose={() => setShowQRScanner(false)}
              />
            </DialogContent>
          </Dialog>

          <RecordPurchaseModal
            open={showPurchaseModal}
            onClose={() => setShowPurchaseModal(false)}
            onSuccess={() => {
              alert('Purchase recorded successfully!');
            }}
          />
        </>
      )}

      {/* Header */}
      {isAuthenticated && currentUser ? (
        <ConsumerHeader user={currentUser} />
      ) : (
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to={createPageUrl('Home')} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">LL</span>
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-white">Legacy Lane</h1>
                  <p className="text-xs text-orange-400">Discover Amazing Estate Sales</p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="text-white hover:text-orange-400 hover:bg-orange-500/20"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                >
                  Get Started Free
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section with Gradient Background */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0yMCA0NGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 hidden">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-sm px-4 py-1">
              🎉 {totalItems > 0 ? `${totalItems.toLocaleString()}+ Items` : 'Thousands of Items'} Available Now
            </Badge>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            Discover Hidden<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-cyan-400">Treasures</span> Near You
          </h2>
          <p className="text-sm md:text-base text-slate-300 mb-12 max-w-3xl mx-auto">
            Search local estate and moving sales as well as local and national online marketplace items
          </p>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Zip Code Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
                <Input
                  placeholder="Enter ZIP code..."
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleZipSearch()}
                  className="pl-14 h-16 text-lg shadow-xl w-full bg-white/95 backdrop-blur-sm border-slate-200"
                />
              </div>
              <Button 
                onClick={handleZipSearch}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 h-16 px-8 text-lg font-semibold shadow-xl w-full sm:w-auto whitespace-nowrap"
              >
                Search ZIP
              </Button>
              <Button 
                onClick={handleUseMyLocation}
                className="bg-white hover:bg-slate-50 text-slate-900 h-16 px-8 text-lg font-semibold shadow-xl w-full sm:w-auto whitespace-nowrap border-2 border-slate-200"
              >
                📍 Use My Location
              </Button>
            </div>

            {userLocation && (
              <div className="text-sm text-slate-300 text-center bg-slate-800/50 rounded-lg py-2 px-4 backdrop-blur-sm">
                📍 Showing sales within 25 miles of your location
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Map Section */}
      {(localFeatured.length > 0 || regularSales.length > 0) && (
        <section className="py-8 sm:py-12 px-2 sm:px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <h3 className="text-3xl font-serif font-bold text-slate-900 mb-6 text-center">
              🗺️ Sales Near {zipCode ? zipCode : 'You'}
            </h3>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              <MapContainer
                center={userLocation ? [userLocation.lat, userLocation.lng] : [39.8283, -98.5795]}
                zoom={userLocation ? 12 : 4}
                minZoom={userLocation ? 11 : undefined}
                style={{ height: '500px', width: '100%' }}
                className="z-0"
              >
                <ChangeMapView 
                  center={userLocation ? [userLocation.lat, userLocation.lng] : null} 
                  zoom={12} 
                />
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
        </section>
      )}

      {/* Quick Stats */}
      <section className="py-16 px-4 bg-white hidden">
      ...
      </section>

      {/* Nationally Featured Sales */}
      {nationalFeatured.length > 0 && (
        <section className="py-8 sm:py-16 px-2 sm:px-4 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <div className="text-center mb-8 sm:mb-12">
              <Badge className="mb-4 bg-orange-600 text-white text-sm px-4 py-1">Premium Featured</Badge>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-900 mb-3">
                ⭐ National Spotlight
              </h3>
              <p className="text-xl text-slate-600">Exceptional estate sales from across the country</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {nationalFeatured.map(sale => (
                <Link
                  key={sale.id}
                  to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 border-2 border-orange-300 bg-white">
                    {sale.images && sale.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={sale.images[0].url || sale.images[0]}
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
        <section className="py-8 sm:py-16 px-2 sm:px-4 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <div className="text-center mb-8 sm:mb-12">
              <Badge className="mb-4 bg-cyan-600 text-white text-sm px-4 py-1">Local Featured</Badge>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-900 mb-3">
                📍 Nearby Treasures
              </h3>
              <p className="text-lg sm:text-xl text-slate-600">Premium estate sales in your community</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {localFeatured.map(sale => (
                <Link
                  key={sale.id}
                  to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 border-2 border-cyan-300 bg-white">
                    {sale.images && sale.images.length > 0 && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={sale.images[0].url || sale.images[0]}
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
      <section className="py-8 sm:py-16 px-2 sm:px-4 bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-0">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-900 mb-3">
              {userLocation ? '🏘️ Estate Sales Near You' : '🏘️ All Estate Sales'}
            </h3>
            {userLocation ? (
              <p className="text-lg sm:text-xl text-slate-600">Within 25 miles • {regularSales.length} active {regularSales.length === 1 ? 'sale' : 'sales'}</p>
            ) : (
              <p className="text-lg sm:text-xl text-slate-600">{regularSales.length} active {regularSales.length === 1 ? 'sale' : 'sales'} nationwide</p>
            )}
          </div>

          {regularSales.length === 0 ? (
            <Card className="p-8 sm:p-16 text-center bg-slate-50">
              <MapPin className="w-20 h-20 text-slate-300 mx-auto mb-6" />
              <p className="text-slate-500 text-xl mb-4">
                {userLocation 
                  ? 'No estate sales found within 25 miles.'
                  : 'No estate sales available.'}
              </p>
              <Button onClick={handleUseMyLocation} className="bg-cyan-600 hover:bg-cyan-700">
                Try Different Location
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
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
                          src={sale.images[0].url || sale.images[0]}
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

          {/* National Advertising Panel */}
          <section className="py-8 px-4 bg-gradient-to-r from-purple-600 to-purple-700">
          <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">National Advertising Space</p>
            <p className="text-white text-2xl font-semibold">Premium placement available for nationwide reach</p>
          </div>
          </div>
          </section>

          {/* Local Advertising Panel */}
          <section className="py-8 px-4 bg-gradient-to-r from-cyan-600 to-blue-600">
          <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Local Advertising Space</p>
            <p className="text-white text-2xl font-semibold">Target your local community with premium placement</p>
          </div>
          </div>
          </section>

          {/* Browse by State & Estate Sale Request CTAs */}
          <section className="py-16 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Browse by State */}
                <Link to={createPageUrl('SearchByState')}>
                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all cursor-pointer group hover:scale-[1.02] h-full">
                    <div className="flex flex-col items-center text-center gap-6 h-full justify-center">
                      <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MapPin className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-serif font-bold text-white mb-2">
                          Browse by State
                        </h3>
                        <p className="text-lg text-cyan-100">
                          Discover estate sales in all 50 states
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Estate Sale Request */}
                <div 
                  onClick={() => setShowSaleRequestModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all cursor-pointer group hover:scale-[1.02] h-full"
                >
                  <div className="flex flex-col items-center text-center gap-6 h-full justify-center">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <HomeIcon className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-serif font-bold text-white mb-2">
                        Need an Estate Sale {t('Company')}?
                      </h3>
                      <p className="text-lg text-orange-100">
                        We'll connect you with trusted professionals in your area
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

      {/* Sign Up CTAs */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-serif font-bold text-slate-900 mb-4">Join Our Growing Network</h2>
            <p className="text-xl text-slate-600">Grow your business with Legacy Lane</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Link to={createPageUrl('OperatorPackages')}>
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full hover:-translate-y-1">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HomeIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-2">
                      Estate Sale {t('Company')}
                    </h3>
                    <p className="text-orange-100">
                      List, manage and market your sales
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link to={createPageUrl('DIYSaleSignup')}>
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full hover:-translate-y-1">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-2">
                      Sell Your Items
                    </h3>
                    <p className="text-purple-100">
                      Sell on marketplace or host your own sale
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link to={createPageUrl('AgentSignup')}>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full hover:-translate-y-1">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-2">
                      Real Estate Agent
                    </h3>
                    <p className="text-blue-100">
                      Get seller leads instantly
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link to={createPageUrl('VendorSignup')}>
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full hover:-translate-y-1">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white mb-2">
                      Vendor Network
                    </h3>
                    <p className="text-green-100">
                      Join our network and grow your business
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">LL</span>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold">Legacy Lane</h3>
                  <p className="text-sm text-orange-400">Estate Sale Finder</p>
                </div>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Discover amazing estate sales and find treasures near you. Connect with trusted estate sale companies nationwide.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('SearchByState')} className="text-white hover:text-orange-400 transition-colors">Browse by State</Link></li>
                <li><Link to={createPageUrl('Home')} className="text-white hover:text-orange-400 transition-colors">Find Sales</Link></li>
                <li><a href="#" onClick={() => setShowSaleRequestModal(true)} className="text-white hover:text-orange-400 transition-colors">Request Service</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('OperatorPackages')} className="text-white hover:text-orange-400 transition-colors">List Your Company</Link></li>
                <li><Link to={createPageUrl('AgentSignup')} className="text-white hover:text-orange-400 transition-colors">Real Estate Agents</Link></li>
                <li><Link to={createPageUrl('VendorSignup')} className="text-white hover:text-orange-400 transition-colors">Vendors</Link></li>
                <li><Link to={createPageUrl('StartYourCompany')} className="text-white hover:text-orange-400 transition-colors font-semibold">Start Your Own Estate Sale Company</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500">
              © {new Date().getFullYear()} Legacy Lane. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}