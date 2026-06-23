import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Clock, DollarSign, Plus, Search, Navigation, Globe } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
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

// Teal/violet icon for community events (distinct from gold estate sale pins)
const eventIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const EVENT_TYPE_LABELS = {
  flea_market: 'Flea Market',
  antique_show: 'Antique Show',
  craft_show: 'Craft Show',
  collectibles_show: 'Collectibles Show',
  other: 'Community Event',
};

const EVENT_TYPE_COLORS = {
  flea_market: 'bg-teal-100 text-teal-700',
  antique_show: 'bg-violet-100 text-violet-700',
  craft_show: 'bg-pink-100 text-pink-700',
  collectibles_show: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
};

export default function CommunityEvents() {
  useSEO({
    title: 'Flea Markets & Antique Shows Near You | EstateSalen.com',
    description: 'Find flea markets, antique shows, and community events near you. Free promotion for event organizers.',
  });

  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]); // US center
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await base44.entities.CommunityEvent.filter({ status: 'published' }, 'start_date', 200);

      // Only show events within 30 days leading up to the event (i.e., start_date is within 30 days from now or in the future)
      // and not yet completed
      const visible = (data || []).filter(e => {
        if (!e.start_date) return false;
        // Show if event start date is >= 30 days ago and end date >= today (not completed)
        const eventEnd = e.end_date || e.start_date;
        return e.start_date >= thirtyDaysAgo && eventEnd >= today;
      });

      setEvents(visible);

      // Center map on first event with location
      const firstWithLoc = visible.find(e => e.location?.lat && e.location?.lng);
      if (firstWithLoc) {
        setMapCenter([firstWithLoc.location.lat, firstWithLoc.location.lng]);
      }
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = events.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return e.title?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.property_address?.city?.toLowerCase().includes(q) ||
      e.property_address?.state?.toLowerCase().includes(q);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatEventDate = (e) => {
    if (e.start_date === e.end_date || !e.end_date) {
      return formatDate(e.start_date);
    }
    return `${formatDate(e.start_date)} – ${formatDate(e.end_date)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">
                Flea Markets & Antique Shows
              </h1>
              <p className="text-slate-600">
                {events.length} upcoming community events near you
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/CommunityEventSubmit">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Submit Event
                </Button>
              </Link>
              <Button
                onClick={() => setViewMode('grid')}
                variant={viewMode === 'grid' ? 'default' : 'outline'}
              >
                Grid
              </Button>
              <Button
                onClick={() => setViewMode('map')}
                variant={viewMode === 'map' ? 'default' : 'outline'}
              >
                Map
              </Button>
            </div>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event name, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden h-[600px] [&_.leaflet-container]:z-0 [&_.leaflet-pane]:z-[5] [&_.leaflet-top]:z-[10] [&_.leaflet-bottom]:z-[10]">
                <MapContainer
                  center={mapCenter}
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={10} />
                  {filtered.map(evt => {
                    if (!evt.location?.lat || !evt.location?.lng) return null;
                    return (
                      <Marker
                        key={evt.id}
                        position={[evt.location.lat, evt.location.lng]}
                        icon={eventIcon}
                        eventHandlers={{ click: () => setSelectedEvent(evt) }}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <Badge className={`mb-1 ${EVENT_TYPE_COLORS[evt.event_type] || EVENT_TYPE_COLORS.other}`}>
                              {EVENT_TYPE_LABELS[evt.event_type] || 'Event'}
                            </Badge>
                            <h3 className="font-semibold text-slate-900 mb-1">{evt.title}</h3>
                            <p className="text-sm text-slate-600 mb-1">
                              {evt.property_address?.city}, {evt.property_address?.state}
                            </p>
                            <p className="text-sm text-slate-500 mb-2">{formatEventDate(evt)}</p>
                            {evt.admission_fee && (
                              <p className="text-sm text-teal-600 font-medium">{evt.admission_fee}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </Card>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[600px]">
              {selectedEvent ? (
                <Card className="p-5">
                  <Badge className={`mb-2 ${EVENT_TYPE_COLORS[selectedEvent.event_type] || EVENT_TYPE_COLORS.other}`}>
                    {EVENT_TYPE_LABELS[selectedEvent.event_type] || 'Event'}
                  </Badge>
                  <h3 className="font-serif font-bold text-lg text-slate-900 mb-2">{selectedEvent.title}</h3>
                  {selectedEvent.description && (
                    <p className="text-sm text-slate-600 mb-3">{selectedEvent.description}</p>
                  )}
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-500" /> {formatEventDate(selectedEvent)}</p>
                    {(selectedEvent.start_time || selectedEvent.end_time) && (
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-teal-500" /> {selectedEvent.start_time}{selectedEvent.end_time ? ` – ${selectedEvent.end_time}` : ''}</p>
                    )}
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-500" /> {selectedEvent.property_address?.street}, {selectedEvent.property_address?.city}, {selectedEvent.property_address?.state}</p>
                    {selectedEvent.admission_fee && (
                      <p className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-teal-500" /> {selectedEvent.admission_fee}</p>
                    )}
                    {selectedEvent.website_url && (
                      <a href={selectedEvent.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-600 hover:underline">
                        <Globe className="w-4 h-4" /> Visit Website
                      </a>
                    )}
                  </div>
                  {selectedEvent.organizer_name && (
                    <p className="text-xs text-slate-400 mt-3">Organized by {selectedEvent.organizer_name}</p>
                  )}
                </Card>
              ) : (
                <Card className="p-6 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Click a marker to view event details</p>
                </Card>
              )}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No upcoming events found</h3>
            <p className="text-slate-500 mb-6">Be the first to promote your flea market or antique show!</p>
            <Link to="/CommunityEventSubmit">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Submit an Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(evt => (
              <Card key={evt.id} className="overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={() => {
                if (evt.location?.lat && evt.location?.lng) {
                  setMapCenter([evt.location.lat, evt.location.lng]);
                  setViewMode('map');
                  setSelectedEvent(evt);
                }
              }}>
                {evt.photos?.[0] ? (
                  <div className="h-40 overflow-hidden bg-slate-100">
                    <img src={evt.photos[0]} alt={evt.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-teal-100 to-violet-100 flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-teal-300" />
                  </div>
                )}
                <CardContent className="p-4">
                  <Badge className={`mb-2 ${EVENT_TYPE_COLORS[evt.event_type] || EVENT_TYPE_COLORS.other}`}>
                    {EVENT_TYPE_LABELS[evt.event_type] || 'Event'}
                  </Badge>
                  <h3 className="font-serif font-bold text-lg text-slate-900 mb-1 line-clamp-1">{evt.title}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> {evt.property_address?.city}, {evt.property_address?.state}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-2">
                    <Calendar className="w-3.5 h-3.5" /> {formatEventDate(evt)}
                  </p>
                  {evt.admission_fee && (
                    <p className="text-sm text-teal-600 font-medium">{evt.admission_fee}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SharedFooter />
    </div>
  );
}