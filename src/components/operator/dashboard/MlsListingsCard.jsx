import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ArrowRight, Home } from 'lucide-react';

function price(value) {
  const n = Number(value);
  return n ? `$${Math.round(n).toLocaleString()}` : '';
}

export default function MlsListingsCard({ limit = 5 }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.PropstreamREListing
      .list('-created_date', limit)
      .then((rows) => {
        if (!active) return;
        setListings(Array.isArray(rows) ? rows : rows?.items || []);
      })
      .catch((error) => console.error('MLS listings:', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
            New MLS listings
          </p>
          <Link
            to="/PropstreamREListings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-4">Loading listings…</p>
        ) : listings.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <Home className="w-4 h-4 text-slate-300" />
            No MLS listings imported yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listings.map((listing) => (
              <div key={listing.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {listing.property_address || 'Address unavailable'}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {[listing.city, listing.state].filter(Boolean).join(', ') || 'Location unknown'}
                  </span>
                  {price(listing.list_price) && (
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {price(listing.list_price)}
                    </span>
                  )}
                  {listing.listing_status && <span>· {listing.listing_status}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}