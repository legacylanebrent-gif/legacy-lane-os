import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Database, Search, Phone, MapPin, Briefcase, CheckCircle2, AlertCircle, Loader2, Filter, X, User } from 'lucide-react';

const PAGE_SIZE = 50;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

export default function AdminRealEstateAgentDirectory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [geocodeFilter, setGeocodeFilter] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      // Compute stats client-side from a capped scan (no dedicated stats function yet)
      const batch = await base44.entities.RealEstateAgentDirectory.list('-created_date', 500, 0).catch(() => []);
      const total = batch.length;
      const geocoded = batch.filter(r => r.geocode_status === 'geocoded').length;
      const statesSet = new Set(batch.map(r => r.state).filter(Boolean));
      const subscribed = batch.filter(r => r.subscription_status === 'active' || r.subscription_status === 'free_trial' || r.claimed_by_user_id).length;
      setStats({
        total,
        geocoded,
        notGeocoded: total - geocoded,
        states: statesSet.size,
        subscribed,
        approximate: total === 500
      });
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, []);

  const loadRecords = useCallback(async (resetSkip = 0) => {
    setLoading(true);
    try {
      const query = {};
      if (stateFilter) query.state = stateFilter;
      if (geocodeFilter) query.geocode_status = geocodeFilter;
      if (subscriptionFilter) query.subscription_status = subscriptionFilter;

      let batch;
      if (Object.keys(query).length > 0) {
        batch = await base44.entities.RealEstateAgentDirectory.filter(query, '-created_date', PAGE_SIZE, resetSkip);
      } else {
        batch = await base44.entities.RealEstateAgentDirectory.list('-created_date', PAGE_SIZE, resetSkip);
      }

      let filtered = batch;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(r =>
          (r.agent_name || '').toLowerCase().includes(q) ||
          (r.company_name || '').toLowerCase().includes(q) ||
          (r.phone || '').toLowerCase().includes(q) ||
          (r.city || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q)
        );
      }

      setRecords(resetSkip === 0 ? filtered : [...records, ...filtered]);
      setHasMore(batch.length === PAGE_SIZE);
      setSkip(resetSkip);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter, geocodeFilter, subscriptionFilter, records]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => loadRecords(0), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stateFilter, geocodeFilter, subscriptionFilter]);

  const loadMore = () => loadRecords(skip + PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" />
          Real Estate Agent Directory
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consolidated directory of real estate agents. Scraping pipeline coming soon — records will populate here automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Database} label="Total Records" value={stats?.total ?? '—'} suffix={stats?.approximate ? '+' : ''} color="text-slate-700" />
        <StatCard icon={CheckCircle2} label="Geocoded" value={stats?.geocoded ?? '—'} color="text-green-600" />
        <StatCard icon={AlertCircle} label="Not Geocoded" value={stats?.notGeocoded ?? '—'} color="text-amber-600" />
        <StatCard icon={MapPin} label="States" value={stats?.states ?? '—'} color="text-purple-600" />
        <StatCard icon={User} label="Subscribed" value={stats?.subscribed ?? '—'} color="text-emerald-600" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by agent, brokerage, phone, city, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {(stateFilter || geocodeFilter || subscriptionFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStateFilter(''); setGeocodeFilter(''); setSubscriptionFilter(''); }}
              className="text-slate-500"
            >
              <X className="w-3.5 h-3.5 mr-1" />Clear Filters
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter className="w-3.5 h-3.5" />Filters:
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All States</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={geocodeFilter}
            onChange={(e) => setGeocodeFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All Geocode Status</option>
            <option value="geocoded">Geocoded</option>
            <option value="not_geocoded">Not Geocoded</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All Subscriptions</option>
            <option value="active">Active</option>
            <option value="free_trial">Free Trial</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Agent</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Brokerage</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Phone</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Location</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Subscription</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Geocode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && records.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No records found</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800 truncate max-w-[200px]">{r.agent_name || '—'}</div>
                    {r.email && <div className="text-xs text-slate-400 truncate max-w-[200px]">{r.email}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 text-slate-600 truncate max-w-[180px]">
                      <Briefcase className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{r.company_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.phone ? (
                      <span className="flex items-center gap-1 text-slate-600"><Phone className="w-3 h-3" />{r.phone}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.subscription_status === 'active' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                    ) : r.subscription_status === 'free_trial' ? (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Free Trial</Badge>
                    ) : r.claimed_by_user_id ? (
                      <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">Claimed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">None</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.geocode_status === 'geocoded' ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Geocoded</Badge>
                    ) : r.geocode_status === 'failed' ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600">Pending</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && !loading && records.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore}>Load More</Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, color }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs font-medium text-slate-500">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}{suffix}</p>
      </CardContent>
    </Card>
  );
}