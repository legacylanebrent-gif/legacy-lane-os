import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Loader2, RefreshCw, Filter, ShieldAlert } from 'lucide-react';
import ObservationRow from '@/components/repository/ObservationRow';
import ObservationBackfillPanel from '@/components/repository/ObservationBackfillPanel';

const EMPTY_FILTERS = {
  operator_id: '', state: '', city: '', category: '', title: '',
  outcome: 'all', capture_status: 'all', active_only: false,
};

const FILTER_QUERY = (filters) => {
  const query = {};
  if (filters.operator_id) query.operator_id = filters.operator_id.trim();
  if (filters.state) query.state = filters.state.trim().toUpperCase();
  if (filters.city) query.city = filters.city.trim();
  if (filters.category) query.category = filters.category.trim();
  if (filters.title) query.title = filters.title.trim();
  if (filters.outcome !== 'all') query.outcome = filters.outcome;
  if (filters.capture_status !== 'all') query.capture_status = filters.capture_status;
  if (filters.active_only) query.active_only = true;
  return query;
};

function StatCard({ label, value, tone = 'slate' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl font-semibold ${toneClass}`}>{value == null ? '—' : value}</div>
    </div>
  );
}

export default function AdminItemObservations() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [overview, setOverview] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryingSale, setRetryingSale] = useState('');
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('itemObservationCapture', { action: 'overview' });
      setOverview(res.data);
    } catch (e) {
      setError('Could not load the capture overview.');
    }
  }, []);

  const loadRows = useCallback(async (nextFilters, nextCursor) => {
    setLoading(true);
    setError('');
    try {
      const payload = { action: 'list', ...FILTER_QUERY(nextFilters || filters), limit: 40 };
      if (nextCursor) payload.cursor = nextCursor;
      const res = await base44.functions.invoke('itemObservationCapture', payload);
      const data = res.data || {};
      setRows(prev => (nextCursor ? [...prev, ...(data.items || [])] : (data.items || [])));
      setCursor(data.next_cursor || null);
      setHasMore(!!data.has_more);
    } catch (e) {
      setError('Could not load observations.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setIsAdmin(me?.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    loadOverview();
    loadRows(EMPTY_FILTERS, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const applyFilters = () => loadRows(filters, null);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    loadRows(EMPTY_FILTERS, null);
  };

  const retrySale = async (saleId) => {
    setRetryingSale(saleId);
    try {
      await base44.functions.invoke('itemObservationCapture', { action: 'retry', sale_id: saleId });
      await loadRows(EMPTY_FILTERS, null);
      setFilters(EMPTY_FILTERS);
      await loadOverview();
    } catch (e) {
      setError('Retry failed for that sale.');
    } finally {
      setRetryingSale('');
    }
  };

  if (isAdmin === null) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }
  if (isAdmin === false) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-2 text-sm text-amber-800">
          <ShieldAlert className="w-4 h-4 mt-0.5" /> The central item database is restricted to platform administrators.
        </div>
      </div>
    );
  }

  const status = overview?.by_status || {};
  const outcomes = overview?.by_outcome || {};
  const incomplete = (status.incomplete || 0);
  const failedJobs = (overview?.jobs || []).filter(job => job.status === 'failed' || job.status === 'partial').length;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-700" /> Central item database
          </h1>
          <p className="text-[12px] text-slate-500">Every published sale contributes traceable item observations. Admin-only.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadOverview(); loadRows(filters, null); }} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Refresh
        </Button>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Observations" value={overview?.total} />
        <StatCard label="Active pricing evidence" value={overview?.active_for_pricing} tone="emerald" />
        <StatCard label="Incomplete captures" value={incomplete} tone={incomplete ? 'amber' : 'slate'} />
        <StatCard label="Failed / partial jobs" value={failedJobs} tone={failedJobs ? 'amber' : 'slate'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Evidence by outcome</div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">asking only: {outcomes.asking || 0}</Badge>
              <Badge variant="outline" className="text-[10px] border-cyan-200 bg-cyan-50 text-cyan-800">operator-reported sold: {outcomes.operator_reported_sold || 0}</Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-800">transaction-linked sold: {outcomes.transaction_linked_sold || 0}</Badge>
              <Badge variant="outline" className="text-[10px] text-slate-500">unknown: {outcomes.unknown || 0}</Badge>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              withdrawn: {status.withdrawn || 0} · group photos: {overview?.by_representation?.group || 0} · lots: {overview?.by_representation?.lot || 0}
            </div>
          </CardContent>
        </Card>
        <ObservationBackfillPanel onChanged={() => { loadOverview(); loadRows(EMPTY_FILTERS, null); }} />
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="w-3 h-3" /> Filters
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input placeholder="Operator user id" value={filters.operator_id} onChange={e => setFilters({ ...filters, operator_id: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="State (NJ)" value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="City" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Category" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Title contains" value={filters.title} onChange={e => setFilters({ ...filters, title: e.target.value })} className="h-8 text-xs" />
            <Select value={filters.outcome} onValueChange={value => setFilters({ ...filters, outcome: value })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any outcome</SelectItem>
                <SelectItem value="asking">Asking only</SelectItem>
                <SelectItem value="operator_reported_sold">Operator-reported sold</SelectItem>
                <SelectItem value="transaction_linked_sold">Transaction-linked sold</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.capture_status} onValueChange={value => setFilters({ ...filters, capture_status: value })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Capture status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any capture status</SelectItem>
                <SelectItem value="captured">Captured</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <input type="checkbox" checked={filters.active_only} onChange={e => setFilters({ ...filters, active_only: e.target.checked })} />
              Pricing evidence only
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyFilters} disabled={loading}>Apply</Button>
            <Button size="sm" variant="ghost" onClick={resetFilters} disabled={loading}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Item observations</span>
          <span className="text-[10px] text-slate-400">{rows.length} shown</span>
        </div>
        {rows.length === 0 && !loading ? (
          <p className="text-[12px] text-slate-500 py-4">No observations match these filters yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
            {rows.map(row => (
              <ObservationRow key={row.id} observation={row} onRetry={retrySale} retrying={retryingSale === row.source_sale_id} />
            ))}
          </ul>
        )}
        {hasMore && (
          <div className="mt-2 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => loadRows(filters, cursor)} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Load more
            </Button>
          </div>
        )}
      </div>

      {(overview?.jobs || []).length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Recent capture jobs</div>
            <ul className="divide-y divide-slate-100">
              {overview.jobs.map(job => (
                <li key={job.id} className="py-1.5 flex flex-wrap items-center gap-x-2 text-[11px]">
                  <Badge variant="outline" className="text-[10px]">{job.job_type}</Badge>
                  <span className="text-slate-600">{job.trigger}</span>
                  <span className={`font-medium ${job.status === 'completed' ? 'text-emerald-700' : job.status === 'failed' || job.status === 'partial' ? 'text-red-600' : 'text-amber-700'}`}>{job.status}</span>
                  <span className="text-slate-400">{job.units_processed || 0}/{job.units_total || 0} units</span>
                  <span className="text-slate-400">+{job.created_count || 0} new, {job.updated_count || 0} updated, {job.failed_count || 0} failed</span>
                  {job.last_error && <span className="text-amber-700 truncate max-w-[280px]">{job.last_error}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}