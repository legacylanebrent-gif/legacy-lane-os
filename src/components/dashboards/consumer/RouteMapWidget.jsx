import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Route, Clock, MapPin, ExternalLink } from 'lucide-react';
import { isSaleAddressVisible } from '@/utils/saleAddressUtils';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RouteMapWidget() {
  const [routeSales, setRouteSales] = useState([]);
  const [travelTimes, setTravelTimes] = useState([]); // [{duration, distance}] between consecutive stops
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]);
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    loadRoute();
    // Get user location for travel time from current position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (routeSales.length >= 2) fetchTravelTimes();
  }, [routeSales]);

  const loadRoute = async () => {
    setLoading(true);
    const ids = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    if (ids.length === 0) { setLoading(false); return; }

    const today = todayStr();
    const all = await base44.entities.EstateSale.list('-created_date', 200);
    const matched = ids
      .map(id => all.find(s => s.id === id))
      .filter(Boolean)
      .filter(s => (s.sale_dates || []).some(d => d.date === today));

    setRouteSales(matched);

    const firstWithPin = matched.find(s => s.location?.lat && s.location?.lng);
    if (firstWithPin) setMapCenter([firstWithPin.location.lat, firstWithPin.location.lng]);
    setLoading(false);
  };

  const fetchTravelTimes = async () => {
    const eligible = routeSales.filter(s => isSaleAddressVisible(s) && s.property_address && s.location?.lat);
    if (eligible.length < 2) return;

    try {
      const cfg = await base44.functions.invoke('getConfig', {});
      const apiKey = cfg.data?.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const times = [];
      for (let i = 0; i < eligible.length - 1; i++) {
        const from = `${eligible[i].location.lat},${eligible[i].location.lng}`;
        const to = `${eligible[i + 1].location.lat},${eligible[i + 1].location.lng}`;
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from}&destinations=${to}&mode=driving&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        const element = data.rows?.[0]?.elements?.[0];
        if (element?.status === 'OK') {
          times.push({ duration: element.duration.text, distance: element.distance.text });
        } else {
          times.push(null);
        }
      }
      setTravelTimes(times);
    } catch (e) { /* silent */ }
  };

  const routePoints = routeSales
    .filter(s => s.location?.lat && s.location?.lng)
    .map(s => [s.location.lat, s.location.lng]);

  if (loading) {
    return (
      <div className="h-48 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading route...</p>
      </div>
    );
  }

  if (routeSales.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Route className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="font-medium text-slate-500 text-sm">No route stops for today</p>
        <Link to="/RoutePlanner">
          <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs">
            <Route className="w-3 h-3" /> Plan Your Route
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <MapContainer center={mapCenter} zoom={11} style={{ height: '240px', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {routePoints.length >= 2 && (
            <Polyline positions={routePoints} color="#0891b2" weight={3} opacity={0.7} dashArray="6 4" />
          )}
          {routeSales.map((sale, idx) => {
            if (!sale.location?.lat) return null;
            return (
              <Marker key={sale.id} position={[sale.location.lat, sale.location.lng]}>
                <Popup>
                  <div className="text-xs">
                    <strong className="text-cyan-700">Stop {idx + 1}: {sale.title}</strong>
                    <p className="text-slate-500 mt-0.5">{sale.property_address?.city}, {sale.property_address?.state}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Stop list with travel times */}
      <div className="space-y-1.5">
        {routeSales.map((sale, idx) => {
          const travelToNext = travelTimes[idx];
          return (
            <div key={sale.id}>
              <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{sale.title}</p>
                  <p className="text-[10px] text-slate-400">{sale.property_address?.city}, {sale.property_address?.state}</p>
                </div>
                {isSaleAddressVisible(sale) && (
                  <Badge className="bg-green-50 text-green-600 border-0 text-[10px]">Address visible</Badge>
                )}
              </div>
              {travelToNext && idx < routeSales.length - 1 && (
                <div className="flex items-center gap-1 pl-5 py-0.5">
                  <div className="w-px h-4 bg-slate-200 ml-3" />
                  <span className="text-[10px] text-slate-400 ml-2">
                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                    {travelToNext.duration} · {travelToNext.distance}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Link to="/RoutePlanner">
        <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
          <ExternalLink className="w-3 h-3" /> Open Full Route Planner
        </Button>
      </Link>
    </div>
  );
}