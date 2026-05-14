import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
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
  // Try with "County" suffix first, then fall back to plain name
  const withCounty = county.toLowerCase().includes('county') ? county : `${county} County`;
  const queries = [`${withCounty}, ${state}, USA`, `${county}, ${state}, USA`];
  for (const query of queries) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      const result = json.results[0];
      const { lat, lng } = result.geometry.location;
      return { lat, lng, viewport: result.geometry.viewport, placeId: result.place_id };
    }
  }
  return null;
}

export default function TerritoryMapView({ user }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);
  const [countyInfo, setCountyInfo] = useState(null);
  const [operatorCounts, setOperatorCounts] = useState({ future: 0, live: 0 });

  const initMap = async () => {
    setLoading(true);
    setMapReady(false);
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

      // Reveal the map div FIRST, then initialize — mapRef.current must exist
      setLoading(false);
      setMapReady(true);

      // Wait one tick for the DOM to render the map div
      await new Promise(resolve => setTimeout(resolve, 50));

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

      // County center marker
      const centerMarker = new window.google.maps.Marker({
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
      const centerInfo = new window.google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:6px 10px;min-width:180px"><p style="font-weight:700;font-size:14px;margin:0 0 4px;color:#1e293b">${county}</p><p style="font-size:12px;color:#64748b;margin:0">Licensed Territory · ${state}</p>${approved.interested_in ? `<p style="font-size:11px;color:#f97316;margin:6px 0 0;font-weight:600">${approved.interested_in === 'exclusive' ? '🔒 Exclusive' : '⭐ Preferred'} Territory</p>` : ''}</div>`,
      });
      centerInfo.open(map, centerMarker);
      centerMarker.addListener('click', () => centerInfo.open(map, centerMarker));

      // Load operators in this county
      const [futureOps, liveOps] = await Promise.all([
        base44.entities.FutureEstateOperator.filter({ geocode_status: 'geocoded', state }),
        base44.entities.OperatorTerritoryProfile.filter({ territory_state: state }).catch(() => []),
      ]);

      // Filter future operators to this county
      const countyNorm = county.toLowerCase().replace(/\s+county$/i, '').trim();
      const inCounty = futureOps.filter(op => {
        const opCounty = (op.geocoded_county || op.county || '').toLowerCase().replace(/\s+county$/i, '').trim();
        return opCounty === countyNorm;
      });

      // Filter live operators to this county
      const liveInCounty = liveOps.filter(op => {
        const opCounty = (op.territory_county || '').toLowerCase().replace(/\s+county$/i, '').trim();
        return opCounty === countyNorm;
      });

      setOperatorCounts({ future: inCounty.length, live: liveInCounty.length });

      const sharedInfoWindow = new window.google.maps.InfoWindow();

      // Plot future operators (blue pins)
      inCounty.forEach(op => {
        if (!op.lat || !op.lng) return;
        const m = new window.google.maps.Marker({
          position: { lat: op.lat, lng: op.lng },
          map,
          title: op.company_name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 0.85,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          zIndex: 5,
        });
        m.addListener('click', () => {
          sharedInfoWindow.setContent(`<div style="font-family:sans-serif;padding:6px 10px;min-width:160px"><p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1e293b">${op.company_name}</p><p style="font-size:11px;color:#64748b;margin:0">${op.geocoded_city || op.city || ''}, ${state}</p>${op.geocoded_county ? `<p style="font-size:11px;color:#94a3b8;margin:2px 0 0">${op.geocoded_county}</p>` : ''}<p style="font-size:11px;color:#3b82f6;margin:4px 0 0;font-weight:600">🔵 Future Operator</p></div>`);
          sharedInfoWindow.open(map, m);
        });
      });

      // Plot live operators (green pins)
      liveInCounty.forEach(op => {
        if (!op.lat && !op.lng) return;
        const m = new window.google.maps.Marker({
          position: { lat: op.lat, lng: op.lng },
          map,
          title: op.company_name || op.operator_name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#22c55e',
            fillOpacity: 0.9,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          zIndex: 7,
        });
        m.addListener('click', () => {
          sharedInfoWindow.setContent(`<div style="font-family:sans-serif;padding:6px 10px;min-width:160px"><p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1e293b">${op.company_name || op.operator_name}</p><p style="font-size:11px;color:#22c55e;margin:4px 0 0;font-weight:600">🟢 Active Operator</p></div>`);
          sharedInfoWindow.open(map, m);
        });
      });

    } catch (e) {
      setError(e.message || 'Failed to load territory map.');
      setLoading(false);
      setMapReady(false);
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

      {/* Operator count legend */}
      {!loading && !error && (operatorCounts.future > 0 || operatorCounts.live > 0) && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span className="text-slate-600"><strong className="text-slate-900">{operatorCounts.future}</strong> Future Operators</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            <span className="text-slate-600"><strong className="text-slate-900">{operatorCounts.live}</strong> Active Operators</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-block" />
            <span className="text-slate-600">Territory Center</span>
          </div>
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
          {loading && (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
              <p className="text-sm text-slate-500">Loading territory map…</p>
            </div>
          )}
          {!loading && error && (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
              <AlertCircle className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          )}
          {/* Map div is always in DOM once mapReady, so ref is valid */}
          <div ref={mapRef} className="w-full h-[480px]" style={{ display: mapReady ? 'block' : 'none' }} />
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