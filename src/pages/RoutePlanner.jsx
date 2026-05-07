import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format, parseISO, isSameDay } from 'date-fns';
import {
  Navigation, MapPin, Calendar, Clock, Trash2, ExternalLink,
  Route, AlertCircle, CheckCircle2, Eye
} from 'lucide-react';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RoutePlanner() {
  const [routeIds, setRouteIds] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    setRouteIds(ids);
    if (ids.length > 0) {
      loadSales(ids);
    } else {
      setLoading(false);
    }
  }, []);

  const loadSales = async (ids) => {
    setLoading(true);
    try {
      const all = await base44.entities.EstateSale.list('-created_date', 200);
      const routeSales = all.filter(s => ids.includes(s.id));
      setSales(routeSales);

      // Center map on first sale with coordinates
      const first = routeSales.find(s => s.location?.lat && s.location?.lng);
      if (first) {
        setMapCenter([first.location.lat, first.location.lng]);
        setHasLocation(true);
      }
    } catch (err) {
      console.error('Error loading route sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromRoute = (saleId) => {
    const updated = routeIds.filter(id => id !== saleId);
    localStorage.setItem('estateRoute', JSON.stringify(updated));
    setRouteIds(updated);
    setSales(prev => prev.filter(s => s.id !== saleId));
  };

  const clearRoute = () => {
    if (!confirm('Clear all sales from your route?')) return;
    localStorage.setItem('estateRoute', JSON.stringify([]));
    setRouteIds([]);
    setSales([]);
  };

  const getDirections = (sale) => {
    if (!sale.property_address) return;
    const addr = `${sale.property_address.street}, ${sale.property_address.city}, ${sale.property_address.state} ${sale.property_address.zip}`;
    window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(addr)}`, '_blank');
  };

  const getMultiStopDirections = () => {
    const available = filteredSales.filter(s => s.property_address);
    if (available.length === 0) return;
    const waypoints = available.map(s =>
      `${s.property_address.street}, ${s.property_address.city}, ${s.property_address.state} ${s.property_address.zip}`
    );
    const dest = encodeURIComponent(waypoints[waypoints.length - 1]);
    const stops = waypoints.slice(0, -1).map(w => encodeURIComponent(w)).join('/');
    window.open(`https://maps.google.com/maps?saddr=My+Location&daddr=${stops ? stops + '/' : ''}${dest}`, '_blank');
  };

  // Sales available on the selected date
  const filteredSales = sales.filter(sale => {
    if (!selectedDate || !sale.sale_dates || sale.sale_dates.length === 0) return false;
    return sale.sale_dates.some(d => d.date === selectedDate);
  });

  // Sales NOT available on selected date (so user knows)
  const unavailableSales = sales.filter(sale => {
    if (!sale.sale_dates || sale.sale_dates.length === 0) return true;
    return !sale.sale_dates.some(d => d.date === selectedDate);
  });

  // Get time info for the selected date
  const getSaleDateInfo = (sale) => {
    if (!sale.sale_dates) return null;
    return sale.sale_dates.find(d => d.date === selectedDate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center">
                <Route className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-slate-900">Route Planner</h1>
                <p className="text-sm text-slate-500">{routeIds.length} sale{routeIds.length !== 1 ? 's' : ''} in your route</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Date picker */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 w-36"
                />
              </div>

              {filteredSales.length > 0 && (
                <Button
                  onClick={getMultiStopDirections}
                  className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </Button>
              )}

              {sales.length > 0 && (
                <Button variant="outline" onClick={clearRoute} className="text-red-600 border-red-200 hover:bg-red-50 gap-2">
                  <Trash2 className="w-4 h-4" />
                  Clear Route
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Empty state */}
        {!loading && sales.length === 0 && (
          <Card className="p-16 text-center">
            <Route className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-bold text-slate-700 mb-2">Your route is empty</h2>
            <p className="text-slate-500 mb-6">Browse estate sales and click "Add to Route" to start planning your day.</p>
            <Button asChild className="bg-orange-600 hover:bg-orange-700">
              <Link to={createPageUrl('Home')}>Browse Sales</Link>
            </Button>
          </Card>
        )}

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </Card>
            ))}
          </div>
        )}

        {!loading && sales.length > 0 && (
          <>
            {/* Date summary banner */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
              <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">
                  {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy') : 'Select a date'}
                </span>
                <span className="text-slate-500 text-sm ml-3">
                  {filteredSales.length} of {sales.length} sales available
                </span>
              </div>
            </div>

            {/* Map */}
            {filteredSales.some(s => s.location?.lat && s.location?.lng) && (
              <Card className="overflow-hidden">
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  style={{ height: '360px', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  {filteredSales.map((sale, idx) =>
                    sale.location?.lat && sale.location?.lng ? (
                      <Marker key={sale.id} position={[sale.location.lat, sale.location.lng]}>
                        <Popup>
                          <div className="text-sm">
                            <strong className="text-cyan-700">Stop {idx + 1}: {sale.title}</strong>
                            <p className="text-slate-600 mt-1">{sale.property_address?.city}, {sale.property_address?.state}</p>
                            {getSaleDateInfo(sale) && (
                              <p className="text-orange-600 font-medium mt-1 text-xs">
                                {formatTime(getSaleDateInfo(sale).start_time)} – {formatTime(getSaleDateInfo(sale).end_time)}
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ) : null
                  )}
                </MapContainer>
              </Card>
            )}

            {/* Available sales on selected date */}
            {filteredSales.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Available on {selectedDate ? format(parseISO(selectedDate), 'MMM d') : 'selected date'}
                  <Badge className="bg-green-100 text-green-700 border-0 ml-1">{filteredSales.length}</Badge>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSales.map((sale, idx) => {
                    const dateInfo = getSaleDateInfo(sale);
                    return (
                      <Card key={sale.id} className="overflow-hidden border-2 border-green-200 hover:shadow-lg transition-shadow">
                        {sale.images?.[0] && (
                          <div className="h-40 overflow-hidden">
                            <img
                              src={sale.images[0]?.url || sale.images[0]}
                              alt={sale.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Badge className="bg-cyan-100 text-cyan-700 border-0 text-xs mb-1">Stop {idx + 1}</Badge>
                              <h3 className="font-semibold text-slate-900 leading-tight">{sale.title}</h3>
                            </div>
                          </div>

                          {sale.property_address && (
                            <div className="flex items-start gap-1.5 text-sm text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0 mt-0.5" />
                              <span>{sale.property_address.street}, {sale.property_address.city}, {sale.property_address.state}</span>
                            </div>
                          )}

                          {dateInfo && (dateInfo.start_time || dateInfo.end_time) && (
                            <div className="flex items-center gap-1.5 text-sm text-orange-700 font-medium">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              {formatTime(dateInfo.start_time)} – {formatTime(dateInfo.end_time)}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1 text-xs"
                              onClick={() => getDirections(sale)}
                            >
                              <Navigation className="w-3 h-3" />
                              Directions
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" asChild>
                              <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                                <Eye className="w-3 h-3" />
                                View Sale
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50 px-2"
                              onClick={() => removeFromRoute(sale.id)}
                              title="Remove from route"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sales not available on selected date */}
            {unavailableSales.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                  Not running on {selectedDate ? format(parseISO(selectedDate), 'MMM d') : 'selected date'}
                  <Badge variant="outline" className="text-slate-400 ml-1">{unavailableSales.length}</Badge>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unavailableSales.map(sale => (
                    <Card key={sale.id} className="overflow-hidden opacity-60 border border-slate-200">
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-slate-700 leading-tight">{sale.title}</h3>

                        {sale.property_address && (
                          <div className="flex items-start gap-1.5 text-sm text-slate-500">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{sale.property_address.city}, {sale.property_address.state}</span>
                          </div>
                        )}

                        {sale.sale_dates && sale.sale_dates.length > 0 && (
                          <div className="text-xs text-slate-400">
                            Available: {sale.sale_dates.map(d => format(parseISO(d.date), 'MMM d')).join(', ')}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" asChild>
                            <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                              <Eye className="w-3 h-3" />
                              View Sale
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:bg-red-50 px-2"
                            onClick={() => removeFromRoute(sale.id)}
                            title="Remove from route"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No sales available on date but route has sales */}
            {filteredSales.length === 0 && sales.length > 0 && !loading && (
              <Card className="p-10 text-center border-dashed border-2 border-slate-300">
                <AlertCircle className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-600 mb-1">No sales running on this date</h3>
                <p className="text-slate-400 text-sm">Try selecting a different date or check the dates listed above.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}