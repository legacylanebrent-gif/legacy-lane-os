import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Calendar, DollarSign, Eye, Bookmark, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EstateSaleCard from '@/components/estate/EstateSaleCard';
import { shouldShowSaleOnFrontend } from '@/components/estate/getSaleDisplayStatus';
import { useSEO } from '@/hooks/useSEO';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import 'leaflet/dist/leaflet.css';

import { estateSaleIcon as customIcon, communityEventIcon, storeIcon } from '@/components/maps/mapPins';

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
  const countyParam = urlParams.get('county');
  const searchParam = urlParams.get('search');

  useSEO({
    title: countyParam
      ? `Estate Sales in ${decodeURIComponent(countyParam)}${stateParam ? `, ${stateParam}` : ''} | EstateSalen.com`
      : cityParam
        ? `Estate Sales in ${decodeURIComponent(cityParam)}${stateParam ? `, ${stateParam}` : ''} | EstateSalen.com`
        : 'Find Estate Sales Near You | EstateSalen.com',
    description: countyParam
      ? `Browse upcoming estate sales in ${decodeURIComponent(countyParam)}${stateParam ? `, ${stateParam}` : ''}. Find antiques, furniture, collectibles, jewelry and more on EstateSalen.com.`
      : cityParam
        ? `Browse upcoming estate sales in ${decodeURIComponent(cityParam)}${stateParam ? `, ${stateParam}` : ''}. Find antiques, furniture, collectibles, jewelry and more on EstateSalen.com.`
        : 'Discover estate sales near you. Browse listings by location, find dates and photos, save favorites, and plan your route on EstateSalen.com.',
  });

  const [user, setUser] = useState(null);
  const [estates, setEstates] = useState([]);
  const [filteredEstates, setFilteredEstates] = useState([]);
  const [featuredEstates, setFeaturedEstates] = useState([]);
  const [regularEstates, setRegularEstates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParam ? decodeURIComponent(searchParam) : '');
  const [userLocation, setUserLocation] = useState(null);
  const [geoFailed, setGeoFailed] = useState(false);
  const [mapCenter, setMapCenter] = useState([34.0522, -118.2437]); // Default to LA
  const [selectedEstate, setSelectedEstate] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [isBrowsingByRegion, setIsBrowsingByRegion] = useState(false);
  const [operators, setOperators] = useState({}); // operator ID → company_name || full_name
  const [savedSaleIds, setSavedSaleIds] = useState(() => {
    const s = localStorage.getItem('savedSales');
    return s ? JSON.parse(s) : [];
  });
  const [communityEvents, setCommunityEvents] = useState([]);
  const [dealerProfiles, setDealerProfiles] = useState([]);

  const handleToggleSave = (estate) => {
    setSavedSaleIds(prev => {
      const next = prev.includes(estate.id) 
        ? prev.filter(id => id !== estate.id)
        : [...prev, estate.id];
      localStorage.setItem('savedSales', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    getUserLocation();
  }, []);

  useEffect(() => {
    filterEstates();
  }, [estates, searchQuery]);

  // When geolocation is unavailable, fall back to the logged-in user's saved location
  useEffect(() => {
    if (!user || !geoFailed || userLocation) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('state') && (urlParams.get('city') || urlParams.get('county'))) return;

    (async () => {
      try {
        const prefs = await base44.entities.EmailPreferences.filter({ user_id: user.id });
        const pref = prefs[0];
        if (!pref) return;
        const { data } = pref.location_zip
          ? await base44.functions.invoke('geocodeZip', { zip: pref.location_zip })
          : await base44.functions.invoke('geocodeCity', { city: pref.location_city, state: pref.location_state });
        if (data?.lat && data?.lng) {
          const coords = [data.lat, data.lng];
          setMapCenter(coords);
          searchNearby(data.lat, data.lng);
        }
      } catch (e) {
        console.error('Error using saved location preference:', e);
      }
    })();
  }, [user, geoFailed, userLocation]);

  const getUserLocation = () => {
    // Check if browsing by state/city/county - skip geocoding
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('state');
    const cityParam = urlParams.get('city');
    const countyParam = urlParams.get('county');
    
    if (stateParam && (cityParam || countyParam)) {
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
          setGeoFailed(true);
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
        setEstates((data.estates || []).filter(s => shouldShowSaleOnFrontend(s)));
      }
      loadCommunityEvents();
    } catch (error) {
      console.error('Error searching nearby:', error);
      loadEstates();
    } finally {
      setLoading(false);
    }
  };

  // Load published community events (flea markets, antique shows) for the map
  const loadCommunityEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await base44.entities.CommunityEvent.filter({ status: 'published' }, 'start_date', 100);
      const visible = (data || []).filter(e => {
        if (!e.start_date) return false;
        const eventEnd = e.end_date || e.start_date;
        return e.start_date >= thirtyDaysAgo && eventEnd >= today && e.location?.lat && e.location?.lng;
      });
      setCommunityEvents(visible);
      loadDealerProfiles();
    } catch (e) {
      console.error('Error loading community events:', e);
    }
  };

  // Load geocoded dealer/store profiles for the map
  const loadDealerProfiles = async () => {
    try {
      const profiles = await base44.entities.ResellerProfile.filter({ geocode_status: 'geocoded', is_active: true }, '-created_date', 200);
      setDealerProfiles(profiles || []);
    } catch (e) {
      console.error('Error loading dealer profiles:', e);
    }
  };

  const loadEstates = async () => {
    try {
      setLoading(true);
      
      // Check if coming from state/city/county selection
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');
      const cityParam = urlParams.get('city');
      const countyParam = urlParams.get('county');

      const rawData = await base44.entities.EstateSale.list('-created_date', 100);
      
      // Exclude completed/past sales using display status
      const data = rawData.filter(s => shouldShowSaleOnFrontend(s));
      
      // Load operator names (company_name or fallback to full_name)
      try {
        const users = await base44.entities.User.list();
        const opMap = {};
        (users || []).forEach(u => { opMap[u.id] = u.company_name || u.full_name; });
        setOperators(opMap);
      } catch (e) { /* non-critical */ }

      // Filter by county if county and state are specified
      if (stateParam && countyParam) {
        setIsBrowsingByRegion(true);
        const decodedCounty = decodeURIComponent(countyParam);
        
        // Look up HousioTerritory records for this county to get ZIP codes
        let countyZips = [];
        let geocodeResult = null;
        try {
          const territories = await base44.entities.HousioTerritory.filter({ 
            state: stateParam, 
            county: decodedCounty,
            is_active: true 
          });
          countyZips = [...new Set(territories.flatMap(t => t.zip_codes_json || []))];
          
          // Geocode the county for map center
          if (territories.length > 0 && territories[0].zip_codes_json?.length > 0) {
            const geoResp = await base44.functions.invoke('geocodeCity', { 
              city: decodedCounty.replace(/\s+County$/i, ''), 
              state: stateParam 
            });
            if (geoResp.data?.lat && geoResp.data?.lng) {
              geocodeResult = [geoResp.data.lat, geoResp.data.lng];
            }
          }
        } catch (e) {
          console.error('Error looking up county:', e);
        }

        // Filter estates by ZIP codes in this county, or fallback to state-only
        const countyFiltered = data.filter(e => 
          e.property_address?.state === stateParam && (
            countyZips.length === 0 ||
            countyZips.includes(e.property_address?.zip)
          )
        );
        setEstates(countyFiltered);
        
        // Set map center to geocoded county location
        if (geocodeResult) {
          setMapCenter(geocodeResult);
        }
        
        // Separate featured and regular sales
        const featured = countyFiltered.filter(e => e.local_featured);
        const regular = countyFiltered.filter(e => !e.local_featured);
        setFeaturedEstates(featured);
        setRegularEstates(regular);
      } else if (stateParam && cityParam) {
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
      loadCommunityEvents();
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
      <UniversalHeader user={user} isAuthenticated={!!user} />
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
                  const countyParam = urlParams.get('county');
                  if (countyParam) {
                    return `${estates.length} estate sales in ${decodeURIComponent(countyParam)}`;
                  }
                  if (cityParam) {
                    return `${estates.length} estate sales in ${decodeURIComponent(cityParam)}`;
                  }
                  return `Discover ${estates.length} estate sales in your area`;
                })()}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode('grid')}
                style={{
                  backgroundColor: viewMode === 'grid' ? '#1e293b' : '#ffffff',
                  color: viewMode === 'grid' ? '#ffffff' : '#475569',
                  borderColor: viewMode === 'grid' ? 'transparent' : '#e2e8f0',
                  borderWidth: '1px'
                }}
              >
                Grid View
              </Button>
              <Button
                onClick={() => setViewMode('map')}
                style={{
                  backgroundColor: viewMode === 'map' ? '#1e293b' : '#ffffff',
                  color: viewMode === 'map' ? '#ffffff' : '#475569',
                  borderColor: viewMode === 'map' ? 'transparent' : '#e2e8f0',
                  borderWidth: '1px'
                }}
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
              <Navigation className="w-4 h-4 text-orange-600" />
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
                  No upcoming or active estate sales currently found in your area.
                </h3>
                <p className="text-slate-500">
                  We are continually building our territories. Refer a company you know and earn a{' '}
                  <Link to={createPageUrl('ReferCompany')} className="text-orange-600 font-semibold underline hover:text-orange-700">
                    Referral Reward
                  </Link>!
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
                          saved={savedSaleIds.includes(estate.id)}
                          onToggleSave={handleToggleSave}
                          operatorDisplayName={estate.operator_name || operators[estate.operator_id]}
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
                          saved={savedSaleIds.includes(estate.id)}
                          onToggleSave={handleToggleSave}
                          operatorDisplayName={estate.operator_name || operators[estate.operator_id]}
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
                        saved={savedSaleIds.includes(estate.id)}
                        onToggleSave={handleToggleSave}
                        operatorDisplayName={estate.operator_name || operators[estate.operator_id]}
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
            <div className="lg:col-span-3 flex flex-wrap items-center gap-4 mb-2 text-sm">
              <span className="flex items-center gap-1.5">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png" alt="Estate Sale" className="h-5" />
                <span className="text-slate-600 font-medium">Estate Sales</span>
              </span>
              <span className="flex items-center gap-1.5">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png" alt="Community Event" className="h-5" />
                <span className="text-slate-600 font-medium">Flea Markets & Antique Shows</span>
              </span>
              <span className="flex items-center gap-1.5">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" alt="Store / Dealer" className="h-5" />
                <span className="text-slate-600 font-medium">Stores & Dealers</span>
              </span>
              <Link to="/CommunityEvents" className="ml-auto text-violet-600 hover:underline text-sm font-medium">
                Browse all community events →
              </Link>
            </div>
            <div className="lg:col-span-2">
              <Card className="overflow-hidden h-[600px] [&_.leaflet-container]:z-0 [&_.leaflet-pane]:z-[5] [&_.leaflet-top]:z-[10] [&_.leaflet-bottom]:z-[10]">
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
                  {communityEvents.map((evt) => {
                    if (!evt.location?.lat || !evt.location?.lng) return null;
                    return (
                      <Marker
                        key={`evt-${evt.id}`}
                        position={[evt.location.lat, evt.location.lng]}
                        icon={communityEventIcon}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-violet-600 mb-1">
                              {evt.event_type === 'antique_show' ? 'Antique Show' : 'Flea Market'}
                            </span>
                            <h3 className="font-semibold text-navy-900 mb-1">{evt.title}</h3>
                            <p className="text-sm text-slate-600 mb-1">
                              {evt.property_address?.city}, {evt.property_address?.state}
                            </p>
                            <p className="text-sm text-slate-500">
                              {new Date(evt.start_date + 'T00:00:00').toLocaleDateString()}
                            </p>
                            {evt.admission_fee && (
                              <p className="text-sm text-violet-600 font-medium mt-1">{evt.admission_fee}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                  {dealerProfiles.map((profile) => {
                    if (!profile.lat || !profile.lng) return null;
                    return (
                      <Marker
                        key={`dealer-${profile.id}`}
                        position={[profile.lat, profile.lng]}
                        icon={storeIcon}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-red-600 mb-1">
                              Store / Dealer
                            </span>
                            <h3 className="font-semibold text-navy-900 mb-1">{profile.business_name}</h3>
                            <p className="text-sm text-slate-600 mb-1">
                              {profile.city}, {profile.state}
                            </p>
                            {profile.business_type && (
                              <p className="text-sm text-slate-500 capitalize">
                                {profile.business_type.replace(/_/g, ' ')}
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
                <EstateSaleCard estate={selectedEstate} expanded saved={savedSaleIds.includes(selectedEstate.id)} onToggleSave={handleToggleSave} operatorDisplayName={selectedEstate.operator_name || operators[selectedEstate.operator_id]} />
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
      <SharedFooter />
    </div>
  );
}