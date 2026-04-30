import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function TerritoryHeatmap() {
  const [sales, setSales] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const saleData = await base44.entities.EstateSale.filter({ operator_id: user.id });
      const leadData = await base44.entities.Lead.list('-created_date', 100);
      setSales(saleData || []);
      setLeads(leadData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading territory map...</div>;

  // Filter items with valid coordinates
  const salesWithCoords = sales.filter(s => s.location?.lat && s.location?.lng);
  const leadsWithCoords = leads.filter(l => l.location?.lat && l.location?.lng);

  const allPoints = [
    ...salesWithCoords.map(s => ({
      type: 'sale',
      lat: s.location.lat,
      lng: s.location.lng,
      name: s.title,
      value: s.estimated_value || 0,
      status: s.status
    })),
    ...leadsWithCoords.map(l => ({
      type: 'lead',
      lat: l.location.lat,
      lng: l.location.lng,
      name: l.contact_name,
      value: l.estimated_value || 0,
      status: l.converted ? 'converted' : 'active'
    }))
  ];

  const center = allPoints.length > 0 
    ? [allPoints[0].lat, allPoints[0].lng]
    : [39.8283, -98.5795];

  // Intensity based on value
  const getRadius = (value) => Math.min(30, Math.max(5, value / 10000));
  const getColor = (type, status) => {
    if (type === 'sale') return status === 'active' ? '#10b981' : '#3b82f6';
    return status === 'converted' ? '#f59e0b' : '#f87171';
  };

  const stats = {
    totalSales: salesWithCoords.length,
    totalLeads: leadsWithCoords.length,
    totalValue: allPoints.reduce((sum, p) => sum + p.value, 0),
    avgDensity: (allPoints.length / (salesWithCoords.length + leadsWithCoords.length || 1)).toFixed(1)
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Territory Heatmap</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Active Sales</div>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Leads</div>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Territory Value</div>
            <div className="text-2xl font-bold">${(stats.totalValue / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Opportunities</div>
            <div className="text-2xl font-bold">{stats.totalSales + stats.totalLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {allPoints.length > 0 ? (
            <div className="h-96 rounded-lg overflow-hidden border">
              <MapContainer
                center={center}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {allPoints.map((point, idx) => (
                  <CircleMarker
                    key={idx}
                    center={[point.lat, point.lng]}
                    radius={getRadius(point.value)}
                    fill
                    fillColor={getColor(point.type, point.status)}
                    fillOpacity={0.6}
                    stroke
                    color="white"
                    weight={2}
                  >
                    <Tooltip>{point.name}</Tooltip>
                    <Popup>
                      <div className="text-sm">
                        <strong>{point.name}</strong>
                        <p className="text-xs text-slate-600 mt-1">
                          {point.type === 'sale' ? 'Sale' : 'Lead'}
                        </p>
                        <p className="text-xs font-semibold text-green-600 mt-1">
                          ${point.value.toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center bg-slate-50 rounded-lg">
              <p className="text-slate-600">No location data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="text-sm">Other Status</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500" />
              <span className="text-sm">Converted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-sm">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}