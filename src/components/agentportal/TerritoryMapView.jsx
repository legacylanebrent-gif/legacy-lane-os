import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Geocode a city+state string using Google Maps Geocoding API
async function geocode(query, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.results && json.results.length > 0) {
    const { lat, lng } = json.results[0].geometry.location;
    return { lat, lng };
  }
  return null;
}

export default function TerritoryMapView({ user }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [connected, setConnected] = useState([]);
  const [potential, setPotential] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [stats, setStats] = useState({ connected: 0, potential: 0, gaps: 0 });
  const [error, setError] = useState('');

  // Load Google Maps script dynamically
  const loadMapsScript = (key) => new Promise((resolve, reject) => {
    if (window.google && window.google.maps) { resolve(); return; }
    const existing = document.getElementById('gmap-script');
    if (existing) { existing.onload = resolve; existing.onerror = reject; return; }
    const script = document.createElement('script');
    script.id = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [matches, futureLeads, config] = await Promise.all([
        base44.entities.OperatorAgentMatch.list(),
        base44.entities.FutureOperatorLead.list(),
        base44.functions.invoke('getConfig', {}),
      ]);

      const key = config?.data?.GOOGLE_MAPS_API_KEY || '';
      setApiKey(key);

      const myId = user?.id || user?.email;
      const myMatches = myId
        ? matches.filter(m => m.agent_id === myId || m.MasterAgentID === myId || m.agent_id === user?.email)
        : matches;

      const acceptedOperatorIds = new Set(
        myMatches.filter(m => m.status === 'accepted').map(m => m.operator_id)
      );

      // Get territory profiles for connected operators
      const territories = await base44.entities.OperatorTerritoryProfile.list();
      const connectedTerritories = territories.filter(t => acceptedOperatorIds.has(t.operator_id));

      setConnected(connectedTerritories);
      setPotential(futureLeads.filter(l => l.city && l.state));
      setStats({
        connected: connectedTerritories.length,
        potential: futureLeads.length,
        gaps: Math.max(0, futureLeads.length - connectedTerritories.length),
      });

      if (key) {
        await loadMapsScript(key);
        await buildMap(key, connectedTerritories, futureLeads);
      } else {
        setError('Google Maps API key not configured.');
      }
    } catch (e) {
      setError(e.message || 'Failed to load map data.');
    } finally {
      setLoading(false);
    }
  };

  const buildMap = async (key, connectedList, potentialList) => {
    if (!mapRef.current || !window.google) return;
    setGeocoding(true);

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 8,
      center: { lat: 39.5, lng: -98.35 },
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapInstanceRef.current = map;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const infoWindow = new window.google.maps.InfoWindow();
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Plot connected operators (green)
    for (const op of connectedList) {
      const locationStr = op.company_name
        ? `${op.company_name}, ${op.service_counties?.[0] || op.service_towns?.[0] || ''}`
        : null;
      if (!locationStr) continue;
      const coords = await geocode(locationStr, key);
      if (!coords) continue;
      const marker = new window.google.maps.Marker({
        position: coords,
        map,
        title: op.company_name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#10b981',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="font-family:sans-serif;padding:4px 8px;min-width:160px">
            <p style="font-weight:700;margin:0 0 4px">${op.company_name}</p>
            <p style="color:#10b981;font-size:12px;margin:0">✓ Connected Partner</p>
            ${op.service_counties?.length ? `<p style="font-size:11px;color:#666;margin:4px 0 0">Counties: ${op.service_counties.join(', ')}</p>` : ''}
          </div>
        `);
        infoWindow.open(map, marker);
        setSelectedMarker({ type: 'connected', name: op.company_name, counties: op.service_counties });
      });
      markersRef.current.push(marker);
      bounds.extend(coords);
      hasPoints = true;
    }

    // Plot potential operators (orange, limit to 60 for perf)
    const sample = potentialList.slice(0, 60);
    for (const lead of sample) {
      if (!lead.city || !lead.state) continue;
      const coords = await geocode(`${lead.city}, ${lead.state}`, key);
      if (!coords) continue;
      const marker = new window.google.maps.Marker({
        position: coords,
        map,
        title: lead.company_name || lead.city,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#f97316',
          fillOpacity: 0.75,
          strokeColor: '#fff',
          strokeWeight: 1.5,
        },
      });
      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="font-family:sans-serif;padding:4px 8px;min-width:160px">
            <p style="font-weight:700;margin:0 0 4px">${lead.company_name || 'Potential Operator'}</p>
            <p style="color:#f97316;font-size:12px;margin:0">⬤ Not Yet Connected</p>
            <p style="font-size:11px;color:#666;margin:4px 0 0">${lead.city}, ${lead.state}</p>
            ${lead.email ? `<p style="font-size:11px;color:#666;margin:2px 0 0">${lead.email}</p>` : ''}
          </div>
        `);
        infoWindow.open(map, marker);
        setSelectedMarker({ type: 'potential', name: lead.company_name, city: lead.city, state: lead.state });
      });
      markersRef.current.push(marker);
      bounds.extend(coords);
      hasPoints = true;
    }

    if (hasPoints) map.fitBounds(bounds);
    setGeocoding(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Connected Operators', count: stats.connected, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
          { label: 'Potential Operators', count: stats.potential, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
          { label: 'Coverage Gaps', count: stats.gaps, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
        ].map(s => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.dot} shrink-0`} />
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-slate-800 text-sm">Territory Coverage Map</span>
            {geocoding && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Geocoding locations…
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Connected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Potential / Gap</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="flex items-center gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        <CardContent className="p-0 relative">
          {loading ? (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
              <p className="text-sm text-slate-500">Loading territory data…</p>
            </div>
          ) : error ? (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-50">
              <Info className="w-7 h-7 text-slate-400" />
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-[480px]" />
          )}
        </CardContent>
      </Card>

      {/* Selected marker info */}
      {selectedMarker && (
        <Card className={`border ${selectedMarker.type === 'connected' ? 'border-emerald-300 bg-emerald-50' : 'border-orange-300 bg-orange-50'}`}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{selectedMarker.name || 'Unknown'}</p>
              {selectedMarker.type === 'connected'
                ? <p className="text-xs text-emerald-700 mt-0.5">✓ Active partner · {selectedMarker.counties?.join(', ') || 'No county data'}</p>
                : <p className="text-xs text-orange-700 mt-0.5">⬤ Potential operator — {selectedMarker.city}, {selectedMarker.state}</p>
              }
            </div>
            <Badge className={selectedMarker.type === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
              {selectedMarker.type === 'connected' ? 'Connected' : 'Gap'}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}