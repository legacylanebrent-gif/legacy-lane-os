import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Calendar, DollarSign, Eye, Bookmark, Navigation } from 'lucide-react';
import EstateSaleCard from '@/components/estate/EstateSaleCard';
import { useSEO } from '@/hooks/useSEO';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function EstateSaleFinder() {
  const urlParams = new URLSearchParams(window.location.search);
  const cityParam = urlParams.get('city');
  const stateParam = urlParams.get('state');

  useSEO({
    title: cityParam
      ? `Estate Sales in ${decodeURIComponent(cityParam)}${stateParam ? `, ${stateParam}` : ''} | EstateSalen.com`
      : 'Find Estate Sales Near You | EstateSalen.com',
    description: cityParam
      ? `Browse upcoming estate sales in ${decodeURIComponent(cityParam)}${stateParam ? `, ${stateParam}` : ''}. Find antiques, furniture, collectibles, jewelry and more on EstateSalen.com.`
      : 'Discover estate sales near you. Browse listings by location, find dates and photos, save favorites, and plan your route on EstateSalen.com.',
  });

  const [estates, setEstates] = useState([]);
  const [filteredEstates, setFilteredEstates] = useState([]);
  const [featuredEstates, setFeaturedEstates] = useState([]);
  const [regularEstates, setRegularEstates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([34.0522, -118.2437]); // Default to LA
  const [selectedEstate, setSelectedEstate] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [isBrowsingByRegion, setIsBrowsingByRegion] = useState(false);

  useEffect(() => {
    getUserLocation();
    loadEstates();
  }, []);

  useEffect(() => {
    filterEstates();
  }, [estates, searchQuery]);

  const getUserLocation = () => {
    // Check if browsing by state/city - skip geocoding
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('state');
    const cityParam = urlParams.get('city');
    
    if (stateParam && cityParam) {
      loadEstates();
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
          searchNearby(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Location access denied, using default location');
          loadEstates();
        }
      );
    } else {
      loadEstates();
    }
  };

  const searchNearby = async (lat, lng) => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke('searchNearbyEstateSales', { lat, lng, radius: 50000 });
      if (data.success) {
        setEstates(data.estates);
      }
    } catch (error) {
      console.error('Error searching nearby:', error);
      loadEstates();
    } finally {
      setLoading(false);
    }
  };

  const loadEstates = async () => {
    try {
      setLoading(true);
      
      // Check if coming from state/city selection
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');
      const cityParam = urlParams.get('city');

      const data = await base44.entities.EstateSale.list('-created_date', 100);
      
      // Filter by region if state and city are specified
      if (stateParam && cityParam) {
        setIsBrowsingByRegion(true);
        const regionFiltered = data.filter(e => 
          e.property_address?.state === stateParam && 
          e.property_address?.region === decodeURIComponent(cityParam)
        );
        setEstates(regionFiltered);
        
        // Separate featured and regular sales
        const featured = regionFiltered.filter(e => e.local_featured);
        const regular = regionFiltered.filter(e => !e.local_featured);
        setFeaturedEstates(featured);
        setRegularEstates(regular);
      } else {
        setIsBrowsingByRegion(false);
        setEstates(data);
        setFeaturedEstates([]);
        setRegularEstates([]);
      }
    } catch (error) {
      console.error('Error loading estates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEstates = () => {
    if (!searchQuery.trim()) {
      setFilteredEstates(estates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = estates.filter(estate => 
      estate.title?.toLowerCase().includes(query) ||
      estate.description?.toLowerCase().includes(query) ||
      estate.property_address?.city?.toLowerCase().includes(query) ||
      estate.property_address?.zip?.toLowerCase().includes(query) ||
      estate.operator_name?.toLowerCase().includes(query)
    );
    setFilteredEstates(filtered);
  };

  const handleEstateClick = (estate) => {
    setSelectedEstate(estate);
    if (estate.location?.lat && estate.location?.lng) {
      setMapCenter([estate.location.lat, estate.location.lng]);
      setViewMode('map');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900 mb-1">
                Estate Sale Finder
              </h1>
              <p className="text-slate-600">
                {(() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const cityParam = urlParams.get('city');
                  if (cityParam) {
                    return `${estates.length} estate sales in ${decodeURIComponent(cityParam)}`;
                  }
                  return `Discover ${estates.length} estate sales in your area`;
                })()}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-navy-900' : ''}
              >
                Grid View
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                onClick={() => setViewMode('map')}
                className={viewMode === 'map' ? 'bg-navy-900' : ''}
              >
                Map View
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search by location, operator, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {userLocation && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Navigation className="w-4 h-4 text-gold-600" />
              <span>Showing results near your location</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'grid' ? (
          // Grid View
          <div>
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-48 w-full mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </Card>
                ))}
              </div>
            ) : filteredEstates.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No estate sales found
                </h3>
                <p className="text-slate-500">
                  Try adjusting your search or check back later
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Featured Sales Section - only when browsing by region */}
                {isBrowsingByRegion && featuredEstates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-8 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-full"></div>
                      <h2 className="text-2xl font-serif font-bold text-slate-900">Featured Sales in This Area</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredEstates.map((estate) => (
                        <EstateSaleCard
                          key={estate.id}
                          estate={estate}
                          onClick={() => handleEstateClick(estate)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Sales Section */}
                {isBrowsingByRegion && regularEstates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-8 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
                      <h2 className="text-2xl font-serif font-bold text-slate-900">All Sales</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {regularEstates.map((estate) => (
                        <EstateSaleCard
                          key={estate.id}
                          estate={estate}
                          onClick={() => handleEstateClick(estate)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-region browsing - show all filtered */}
                {!isBrowsingByRegion && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEstates.map((estate) => (
                      <EstateSaleCard
                        key={estate.id}
                        estate={estate}
                        onClick={() => handleEstateClick(estate)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Map View
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden h-[600px]">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={12} />
                  
                  {filteredEstates.map((estate) => {
                    if (!estate.location?.lat || !estate.location?.lng) return null;
                    return (
                      <Marker
                        key={estate.id}
                        position={[estate.location.lat, estate.location.lng]}
                        icon={customIcon}
                        eventHandlers={{
                          click: () => setSelectedEstate(estate)
                        }}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-navy-900 mb-1">
                              {estate.title}
                            </h3>
                            <p className="text-sm text-slate-600 mb-2">
                              {estate.property_address?.city}, {estate.property_address?.state}
                            </p>
                            {estate.sale_dates?.[0] && (
                              <p className="text-sm text-slate-500">
                                {new Date(estate.sale_dates[0].date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </Card>
            </div>

            {/* Selected Estate Details */}
            <div className="space-y-4 overflow-y-auto max-h-[600px]">
              {selectedEstate ? (
                <EstateSaleCard estate={selectedEstate} expanded />
              ) : (
                <Card className="p-6 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">
                    Click on a marker to view details
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}