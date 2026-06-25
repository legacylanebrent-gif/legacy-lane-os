import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { communityEventIcon, storeIcon } from '@/components/maps/mapPins';
import MapPinLegend from '@/components/maps/MapPinLegend';

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function EmptySalesMap({ userLocation, searchRadius, communityEvents, dealerProfiles, onTryLocation }) {
  const center = userLocation ? [userLocation.lat, userLocation.lng] : [39.8283, -98.5795];
  const zoom = userLocation ? 11 : 4;

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '420px', width: '100%' }}
        className="z-0"
      >
        <ChangeMapView center={userLocation ? center : null} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {communityEvents.map(evt =>
          evt.location?.lat && evt.location?.lng && (
            <Marker key={`evt-${evt.id}`} position={[evt.location.lat, evt.location.lng]} icon={communityEventIcon}>
              <Popup>
                <div className="text-sm">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-violet-600 mb-0.5">
                    {evt.event_type === 'antique_show' ? 'Antique Show' : 'Flea Market'}
                  </span>
                  <p className="font-semibold text-slate-900">{evt.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{evt.property_address?.city}, {evt.property_address?.state}</p>
                </div>
              </Popup>
            </Marker>
          )
        )}
        {dealerProfiles.map(profile =>
          profile.lat && profile.lng && (
            <Marker key={`dealer-${profile.id}`} position={[profile.lat, profile.lng]} icon={storeIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-red-700">{profile.business_name}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{profile.city}, {profile.state}</p>
                </div>
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
      <MapPinLegend />

      {/* Overlay message — pointer-events-none so the map stays interactive */}
      <div className="absolute inset-x-0 top-0 z-[1000] flex justify-center pointer-events-none">
        <div className="m-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 px-6 py-4 text-center max-w-md pointer-events-auto">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 text-lg mb-3">
            {userLocation ? `No sales found within ${searchRadius} miles.` : 'No estate sales available.'}
          </p>
          <Button onClick={onTryLocation} className="bg-cyan-600 hover:bg-cyan-700">
            Try Different Location
          </Button>
          <Link to="/ReferCompany" className="block mt-3 text-sm text-slate-500 hover:text-cyan-700 underline">
            Know a company in this area? Refer them →
          </Link>
        </div>
      </div>
    </div>
  );
}