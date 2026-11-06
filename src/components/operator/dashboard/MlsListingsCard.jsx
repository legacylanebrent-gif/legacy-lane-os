import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, ArrowRight, Home, ChevronRight } from 'lucide-react';
import MlsFilterBar from '@/components/operator/mls/MlsFilterBar';
import MlsListingDetailDialog from '@/components/operator/mls/MlsListingDetailDialog';
import {
  DEFAULT_FILTERS,
  normalizeFilters,
  sameFilters,
  formatPrice,
} from '@/components/operator/mls/mlsFilters';

const PREVIEW_COUNT = 5;

export default function MlsListingsCard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [savedFilters, setSavedFilters] = useState(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    base44.auth
      .me()
      .then((me) => {
        if (!active) return;
        if (me?.mls_listing_filters) {
          const saved = normalizeFilters(me.mls_listing_filters);
          setFilters(saved);
          setSavedFilters(saved);
        }
        setPrefsLoaded(true);
      })
      .catch(() => active && setPrefsLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    let active = true;
    setLoading(true);
    setError(false);
    const timer = setTimeout(() => {
      base44.functions
        .invoke('operatorMlsListings', { filters })
        .then((res) => {
          if (!active) return;
          setData(res?.data || null);
          setLoading(false);
        })
        .catch((err) => {
          console.error('MLS listings:', err);
          if (!active) return;
          setError(true);
          setLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, prefsLoaded]);

  const items = data?.items || [];
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const areaLabel =
    data?.scope === 'all'
      ? 'All imported listings'
      : data?.base_zip
        ? `Within ${data.radius_miles} mi of ZIP ${data.base_zip}`
        : `Within ${data?.radius_miles || 0} mi of your service ZIP`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ mls_listing_filters: filters });
      setSavedFilters(normalizeFilters(filters));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
              New MLS listings
            </p>
            {!loading && data && !data.needs_base && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {areaLabel} · {data.matched_count || 0} match
                {data.matched_count === 1 ? '' : 'es'}
              </p>
            )}
          </div>
          {items.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            >
              {expanded ? 'Show less' : `Show all ${data.matched_count}`}
              <ArrowRight
                className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
          )}
        </div>

        {!data?.needs_base && (
          <MlsFilterBar
            filters={filters}
            onChange={(patch) => setFilters((prev) => normalizeFilters({ ...prev, ...patch }))}
            cities={data?.cities || []}
            radiusMiles={data?.radius_miles || 25}
            onSave={handleSave}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            saving={saving}
            isSaved={!!savedFilters && sameFilters(filters, savedFilters)}
          />
        )}

        {loading ? (
          <div className="space-y-2 py-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-slate-500">Listings couldn’t be loaded just now.</p>
        ) : data?.needs_base ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
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
            <Home className="mx-auto mb-1 h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-700">No listings match these filters.</p>
            <p className="text-[11px] text-slate-500">Adjust or reset the filters above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shown.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => setSelected(listing)}
                className="-mx-1 flex w-full items-center gap-2 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {listing.property_address || 'Address unavailable'}
                    </p>
                    {listing.miles != null && (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-cyan-700">
                        <MapPin className="w-3 h-3" />
                        {listing.miles < 0.2 ? '0 mi' : `${listing.miles} mi`}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                    <span>
                      {[listing.city, listing.state].filter(Boolean).join(', ') ||
                        'Location unknown'}
                    </span>
                    {formatPrice(listing.list_price) !== '—' && (
                      <span className="font-semibold tabular-nums text-slate-700">
                        {formatPrice(listing.list_price)}
                      </span>
                    )}
                    {listing.listing_status && <span>· {listing.listing_status}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <MlsListingDetailDialog listing={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}