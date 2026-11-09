import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { estateSaleIcon } from '@/components/maps/mapPins';

// One estate-sale map pin.
// A guest (DIY) sale is an individual seller's sale, not a company's: it carries the
// "Sponsored by EstateSalen" tag and names the seller as the contact.
export default function SaleMapPin({ sale, isGuest = false }) {
  if (!sale?.location?.lat || !sale?.location?.lng) return null;
  const url = createPageUrl('EstateSaleDetail') + '?id=' + sale.id;

  return (
    <Marker position={[sale.location.lat, sale.location.lng]} icon={estateSaleIcon}>
      <Popup>
        <div className="text-sm">
          {isGuest && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5 mb-1">
              Sponsored by EstateSalen
            </span>
          )}
          <Link to={url} className="text-cyan-600 hover:text-cyan-700 hover:underline font-semibold">
            {sale.title}
          </Link>
          <p className="text-xs text-slate-600 mt-1">
            {sale.property_address?.city}, {sale.property_address?.state}
          </p>
          {sale.distance && (
            <p className="text-xs text-orange-600 font-semibold mt-1">{sale.distance.toFixed(1)} mi away</p>
          )}
          {isGuest && (
            <p className="text-xs text-slate-700 mt-1">
              <span className="font-semibold">Seller:</span> {sale.operator_name || 'Private seller'}
            </p>
          )}
          {isGuest && (
            <Link to={url} className="inline-block text-xs font-semibold text-cyan-700 hover:underline mt-1">
              Contact seller →
            </Link>
          )}
        </div>
      </Popup>
    </Marker>
  );
}