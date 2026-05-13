import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Load Google Maps script once
function loadMapsScript(key) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) { resolve(); return; }
    const existing = document.getElementById('gmap-script');
    if (existing) { existing.addEventListener('load', resolve); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script');
    script.id = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

// Geocode a query and return bounds + center
async function geocodeCounty(county, state, apiKey) {
  const query = `${county}, ${state}, USA`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.results && json.results.length > 0) {
    const result = json.results[0];
    const { lat, lng } = result.geometry.location;
    const viewport = result.geometry.viewport;
    const placeId = result.place_id;
    return { lat, lng, viewport, placeId };
  }
  return null;
}

export default function TerritoryMapView({ user }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);
  const [countyInfo, setCountyInfo] = useState(null);

  const initMap = async () => {
    setLoading(true);
    setError('');
    try {
      // Get agent's approved territory application
      const apps = await base44.entities.AgentTerritoryApplication.filter({ email: user?.email });
      const approved = apps.find(a => a.status === 'approved') || apps[0];
      
      if (!approved) {
        setError('No territory application found for your account.');
        setLoading(false);
        return;
      }
      setApplication(approved);

      const county = approved.county_requested;
      const state = approved.license_state;

      if (!county || !state) {
        setError('Your application does not have a county or state assigned yet.');
        setLoading(false);
        return;
      }

      // Get API key
      const config = await base44.functions.invoke('getConfig', {});
      const apiKey = config?.data?.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key not configured.');
        setLoading(false);
        return;
      }

      await loadMapsScript(apiKey);

      // Geocode the county
      const geo = await geocodeCounty(county, state, apiKey);
      if (!geo) {
        setError(`Could not locate "${county}, ${state}" on the map.`);
        setLoading(false);
        return;
      }
      setCountyInfo({ county, state, lat: geo.lat, lng: geo.lng });

      // Build map centered on county
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: geo.lat, lng: geo.lng },
        mapTypeId: 'roadmap',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstanceRef.current = map;

      // Fit to viewport bounds from geocoding result
      if (geo.viewport) {
        map.fitBounds({
          north: geo.viewport.northeast.lat,
          south: geo.viewport.southwest.lat,
          east: geo.viewport.northeast.lng,
          west: geo.viewport.southwest.lng,
        });
      }

      // Draw county highlight using Places + Data layer
      // Use Geocoding API place_id to fetch boundary via Maps JavaScript API
      if (geo.placeId) {
        const dataLayer = map.data;
        dataLayer.setStyle({
          fillColor: '#f97316',
          fillOpacity: 0.18,
          strokeColor: '#f97316',
          strokeWeight: 2.5,
          strokeOpacity: 0.85,
        });

        // Load the county boundary using the Places API boundary
        try {
          const featureLayer = map.getFeatureLayer
            ? null // feature layers need Map IDs — fall back to marker approach
            : null;

          // Place a prominent center marker with info window
          const marker = new window.google.maps.Marker({
            position: { lat: geo.lat, lng: geo.lng },
            map,
            title: `${county}, ${state}`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#f97316',
              fillOpacity: 0.9,
              strokeColor: '#fff',
              strokeWeight: 3,
            },
            zIndex: 10,
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="font-family:sans-serif;padding:6px 10px;min-width:180px">
                <p style="font-weight:700;font-size:14px;margin:0 0 4px;color:#1e293b">${county}</p>
                <p style="font-size:12px;color:#64748b;margin:0">Licensed Territory · ${state}</p>
                ${approved.interested_in ? `<p style="font-size:11px;color:#f97316;margin:6px 0 0;font-weight:600">${approved.interested_in === 'exclusive' ? '🔒 Exclusive' : approved.interested_in === 'preferred' ? '⭐ Preferred' : '🤔 Unsure'} Territory</p>` : ''}
              </div>
            `,
          });
          infoWindow.open(map, marker);
          marker.addListener('click', () => infoWindow.open(map, marker));
        } catch (e) {
          // Marker already added above, boundary is optional
        }
      }

    } catch (e) {
      setError(e.message || 'Failed to load territory map.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) initMap();
  }, [user]);

  const interestLabel = {
    exclusive: { label: 'Exclusive', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    preferred: { label: 'Preferred', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    unsure: { label: 'Exploring', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  return (
    <div className="space-y-4">
      {/* Territory info strip */}
      {application && !loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Assigned County</p>
                <p className="font-bold text-slate-900 text-sm">{application.county_requested || '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-slate-600">{application.license_state || '?'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Licensed State</p>
                <p className="font-bold text-slate-900 text-sm">{application.license_state || '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="shrink-0">
                {application.interested_in && (
                  <Badge className={`border text-xs ${interestLabel[application.interested_in]?.color || 'bg-slate-100 text-slate-600'}`}>
                    {interestLabel[application.interested_in]?.label || application.interested_in}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Territory Type</p>
                <p className="font-bold text-slate-900 text-sm capitalize">{application.interested_in || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-slate-800 text-sm">
              {countyInfo ? `${countyInfo.county}, ${countyInfo.state}` : 'Territory Map'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={initMap} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        <CardContent className="p-0 relative">
          {loading ? (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
              <p className="text-sm text-slate-500">Loading territory map…</p>
            </div>
          ) : error ? (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
              <AlertCircle className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-[480px]" />
          )}
        </CardContent>
      </Card>

      {/* Cities note */}
      {application?.cities_requested && !loading && !error && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Requested Cities / Areas</p>
            <p className="text-sm text-slate-700">{application.cities_requested}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}