import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Navigation } from 'lucide-react';
import { loadLocalIsos, LOCAL_ISO_RADIUS_MILES } from './localIso';

const budget = (item) => {
  const min = Number(item.budget_min) || 0;
  const max = Number(item.budget_max) || 0;
  if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return 'Budget open';
};

function ago(value) {
  if (!value) return '';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LocalIsoCard({ user }) {
  const [state, setState] = useState({
    loading: true,
    items: [],
    needsBase: false,
    totalActive: 0,
    unlocated: 0,
  });

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    loadLocalIsos(user)
      .then((res) => !cancelled && setState({ loading: false, ...res }))
      .catch((e) => {
        console.error('Local ISO board:', e);
        if (!cancelled) setState({ loading: false, items: [], needsBase: false, totalActive: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.operating_base?.geocoded_zip, user?.business_address_zip]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-cyan-700">
            <Search className="w-3 h-3" />
            Local ISO board
          </div>
          <h2 className="mt-1 font-serif text-lg sm:text-xl font-bold text-slate-900">
            Buyers looking, near you
          </h2>
          <p className="text-xs text-slate-600">
            In-search-of requests from local buyers within {LOCAL_ISO_RADIUS_MILES} miles of your
            home base.
          </p>
        </div>
        <Link to="/wanted" className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 whitespace-nowrap">
          Open ISO board
        </Link>
      </div>

      <div className="mt-3">
        {state.loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : state.needsBase ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <Navigation className="w-4 h-4" />
              Add your business ZIP to see local ISOs
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800">
              Your home base anchors the {LOCAL_ISO_RADIUS_MILES}-mile radius. Set it once in your
              profile.
            </p>
            <Link
              to="/MyProfile"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline"
            >
              Go to profile
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : state.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <MapPin className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <p className="text-sm text-slate-700">No local ISOs right now.</p>
            <p className="text-[11px] text-slate-500">
              {state.totalActive} active request{state.totalActive === 1 ? '' : 's'} platform-wide,
              none within {LOCAL_ISO_RADIUS_MILES} miles of {state.base?.zip || 'your base'}.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.items.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 min-w-0 truncate">
                    {item.title}
                  </p>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 flex-shrink-0">
                    <MapPin className="w-3 h-3" />
                    {item.miles < 0.2 ? '0 mi' : `${item.miles} mi`}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                  {[item.category?.replace(/_/g, ' '), budget(item), item.zip_code && `ZIP ${item.zip_code}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {item.allow_dealer_contact ? `${item.buyer_name || 'Buyer'} · ` : ''}
                  posted {ago(item.created_date)}
                </p>
              </div>
            ))}
            {state.items.length > 5 && (
              <Link
                to="/wanted"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
              >
                +{state.items.length - 5} more nearby
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            {state.unlocated > 0 && (
              <p className="text-[11px] text-slate-400">
                {state.unlocated} active request{state.unlocated === 1 ? '' : 's'} without a ZIP
                can&apos;t be placed on the map.{' '}
                <Link to="/wanted" className="font-semibold text-cyan-700">
                  View all
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}