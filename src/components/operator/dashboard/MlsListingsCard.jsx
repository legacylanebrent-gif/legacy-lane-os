import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, ArrowRight, Home } from 'lucide-react';

const PREVIEW_COUNT = 5;

function price(value) {
  const n = Number(value);
  return n ? `$${Math.round(n).toLocaleString()}` : '';
}

export default function MlsListingsCard() {
  const [state, setState] = useState({ loading: true, data: null, error: false });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    base44.functions
      .invoke('operatorMlsListings', {})
      .then((res) => {
        if (active) setState({ loading: false, data: res?.data || null, error: false });
      })
      .catch((error) => {
        console.error('MLS listings:', error);
        if (active) setState({ loading: false, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, []);

  const data = state.data;
  const items = data?.items || [];
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const areaLabel = data?.scope === 'all'
    ? 'All imported listings'
    : data?.base_zip
      ? `Within ${data.radius_miles} mi of ZIP ${data.base_zip}`
      : `Within ${data?.radius_miles || 0} mi of your service ZIP`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
              New MLS listings
            </p>
            {!state.loading && data && !data.needs_base && (
              <p className="mt-0.5 text-[11px] text-slate-500">{areaLabel}</p>
            )}
          </div>
          {items.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            >
              {expanded ? 'Show less' : `Show all ${data.total_in_area}`}
              <ArrowRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        {state.loading ? (
          <div className="space-y-2 py-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : state.error ? (
          <p className="text-sm text-slate-500 py-4">Listings couldn’t be loaded just now.</p>
        ) : data?.needs_base ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <Navigation className="w-4 h-4" />
              Add your business ZIP to see local listings
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800">
              You only see MLS listings inside your service area, so a base ZIP and radius are
              needed first.
            </p>
            <Link
              to="/MyProfile"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline"
            >
              Go to profile
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <Home className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <p className="text-sm text-slate-700">No new listings in your service area.</p>
            <p className="text-[11px] text-slate-500">{areaLabel.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shown.map((listing) => (
              <div key={listing.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {listing.property_address || 'Address unavailable'}
                  </p>
                  {listing.miles != null && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 flex-shrink-0">
                      <MapPin className="w-3 h-3" />
                      {listing.miles < 0.2 ? '0 mi' : `${listing.miles} mi`}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                  <span>
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