import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Database, RefreshCw, Search, Phone, MapPin, Building2, Merge, CheckCircle2, AlertCircle, Loader2, Filter, X, Wand2 } from 'lucide-react';

const PAGE_SIZE = 50;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const SOURCE_LABELS = {
  FutureEstateOperator: 'ES.net',
  EstatesalesOrgOperator: 'ES.org',
  FutureOperatorLead: 'FOL'
};

export default function AdminMasterOperatorDirectory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [search, setSearch] = useState('');
  const [mergeFilter, setMergeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [geocodeFilter, setGeocodeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);
  const [rebuildResult, setRebuildResult] = useState(null);
  const [fixingEncoding, setFixingEncoding] = useState(false);
  const [encodingResult, setEncodingResult] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getMasterOperatorDirectoryStats', {});
      const d = res.data || {};
      setStats({
        total: d.total ?? 0,
        merged: d.merged ?? 0,
        single: d.single ?? 0,
        geocoded: d.geocoded ?? 0,
        notGeocoded: d.notGeocoded ?? 0,
        states: d.states ?? 0,
        approximate: false
      });
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, []);

  const loadRecords = useCallback(async (resetSkip = 0) => {
    setLoading(true);
    try {
      // When a search term is active, use server-side search so records beyond the
      // first loaded batch are still findable. Otherwise fall back to direct listing.
      if (search.trim()) {
        const res = await base44.functions.invoke('searchMasterOperatorDirectory', {
          search: search.trim(),
          merge_status: mergeFilter,
          state: stateFilter,
          geocode_status: geocodeFilter,
          source: sourceFilter,
          skip: resetSkip,
          limit: PAGE_SIZE
        });
        const data = res.data || {};
        const page = data.records || [];
        setRecords(resetSkip === 0 ? page : [...records, ...page]);
        setHasMore(!!data.hasMore);
        setSkip(resetSkip);
      } else {
        const query = {};
        if (mergeFilter) query.merge_status = mergeFilter;
        if (stateFilter) query.state = stateFilter;
        if (geocodeFilter) query.geocode_status = geocodeFilter;

        let batch;
        if (Object.keys(query).length > 0) {
          batch = await base44.entities.MasterOperatorDirectory.filter(query, '-created_date', PAGE_SIZE, resetSkip);
        } else {
          batch = await base44.entities.MasterOperatorDirectory.list('-created_date', PAGE_SIZE, resetSkip);
        }

        let filtered = batch;
        if (sourceFilter) {
          filtered = filtered.filter(r => (r.sources || []).includes(sourceFilter));
        }
        setRecords(resetSkip === 0 ? filtered : [...records, ...filtered]);
        setHasMore(batch.length === PAGE_SIZE);
        setSkip(resetSkip);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, mergeFilter, stateFilter, geocodeFilter, sourceFilter, records]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => loadRecords(0), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mergeFilter, stateFilter, geocodeFilter, sourceFilter]);

  const handleRebuild = async () => {
    setRebuilding(true);
    setRebuildResult(null);
    let cursor = null;
    let calls = 0;
    try {
      while (true) {
        calls += 1;
        const res = await base44.functions.invoke('buildMasterOperatorDirectory', cursor ? { cursor } : {});
        const data = res.data || {};
        if (data.error) { setRebuildResult({ error: data.error }); break; }
        cursor = data.cursor || null;
        const s = data.stats || cursor?.stats || {};
        setRebuildResult({
          progress: true,
          calls,
          done: data.done,
          stats: s,
          phase: cursor?.phase
        });
        if (data.done) break;
        if (calls > 500) { setRebuildResult({ error: 'Rebuild exceeded 500 batches — stopped for safety.' }); break; }
        // Small cooldown to avoid sustained API rate limits between calls
        await new Promise(r => setTimeout(r, 500));
      }
      await loadStats();
      await loadRecords(0);
    } catch (err) {
      setRebuildResult({ error: err.message || 'Rebuild failed — the function may have timed out.' });
    } finally {
      setRebuilding(false);
    }
  };

  const loadMore = () => loadRecords(skip + PAGE_SIZE);

  const handleFixEncoding = async () => {
    setFixingEncoding(true);
    setEncodingResult(null);
    let cursor = { skip: 0, scanned: 0, fixed: 0, updated: 0 };
    let calls = 0;
    try {
      while (true) {
        calls += 1;
        const res = await base44.functions.invoke('fixDirectoryEncoding', { cursor });
        const data = res.data || {};
        if (data.error) { setEncodingResult({ error: data.error }); break; }
        cursor = data.cursor || cursor;
        setEncodingResult({
          progress: !data.done,
          calls,
          done: data.done,
          scanned: cursor.scanned,
          fixed: cursor.fixed,
          updated: cursor.updated
        });
        if (data.done) break;
        if (calls > 200) { setEncodingResult({ error: 'Exceeded 200 batches — stopped for safety.' }); break; }
        await new Promise(r => setTimeout(r, 400));
      }
      await loadRecords(0);
    } catch (err) {
      setEncodingResult({ error: err.message || 'Encoding fix failed.' });
    } finally {
      setFixingEncoding(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-orange-600" />
            Master Operator Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated, phone-deduplicated directory from FutureEstateOperator, EstatesalesOrgOperator & FutureOperatorLead
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleRebuild} disabled={rebuilding} className="bg-orange-600 hover:bg-orange-700 text-white">
            {rebuilding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {rebuilding ? 'Rebuilding...' : 'Rebuild & Dedup (by Phone)'}
          </Button>
          <Button onClick={handleFixEncoding} disabled={fixingEncoding} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            {fixingEncoding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {fixingEncoding ? 'Fixing...' : 'Fix Encoding (â€™â†’\' )'}
          </Button>
        </div>
      </div>

      {rebuildResult && (
        <Card className={rebuildResult.error ? 'border-red-200 bg-red-50' : rebuildResult.done ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
          <CardContent className="pt-4">
            {rebuildResult.error ? (
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Rebuild Error</p>
                  <p className="text-sm">{rebuildResult.error}</p>
                </div>
              </div>
            ) : rebuildResult.done ? (
              <div className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Directory rebuilt successfully (batched)</p>
                  <p className="text-sm">
                    Processed {rebuildResult.stats?.totalSourceRecords ?? 0} source records across {rebuildResult.calls} batches.
                    {' '}Created {rebuildResult.stats?.created ?? 0}, updated {rebuildResult.stats?.updated ?? 0}
                    {' '}({rebuildResult.stats?.phoneMatches ?? 0} phone merges, {rebuildResult.stats?.nameStateMatches ?? 0} name+state merges).
                    {' '}Synced {rebuildResult.stats?.subscribersSynced ?? 0} subscriber(s).
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-blue-700">
                <Loader2 className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />
                <div>
                  <p className="font-semibold">Rebuilding in batches… (call {rebuildResult.calls}, phase: {rebuildResult.phase || 'merge'})</p>
                  <p className="text-sm">
                    {rebuildResult.phase === 'clear'
                      ? <>Clearing old records: {rebuildResult.stats?.cleared ?? 0} deleted so far.</>
                      : <>Source records processed: {rebuildResult.stats?.totalSourceRecords ?? 0}. Created {rebuildResult.stats?.created ?? 0}, updated {rebuildResult.stats?.updated ?? 0}.</>}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {encodingResult && (
        <Card className={encodingResult.error ? 'border-red-200 bg-red-50' : encodingResult.done ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
          <CardContent className="pt-4">
            {encodingResult.error ? (
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Encoding Fix Error</p>
                  <p className="text-sm">{encodingResult.error}</p>
                </div>
              </div>
            ) : encodingResult.done ? (
              <div className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Encoding fixed across directory</p>
                  <p className="text-sm">
                    Scanned {encodingResult.scanned ?? 0} records. Found mojibake in {encodingResult.fixed ?? 0} records, updated {encodingResult.updated ?? 0} across {encodingResult.calls} batches.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-blue-700">
                <Loader2 className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />
                <div>
                  <p className="font-semibold">Fixing encoding… (batch {encodingResult.calls})</p>
                  <p className="text-sm">
                    Scanned {encodingResult.scanned ?? 0}, found {encodingResult.fixed ?? 0} with mojibake, updated {encodingResult.updated ?? 0}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Database} label="Total Records" value={stats?.total ?? '—'} suffix={stats?.approximate ? '+' : ''} color="text-slate-700" />
        <StatCard icon={Merge} label="Merged" value={stats?.merged ?? '—'} color="text-blue-600" />
        <StatCard icon={Building2} label="Single Source" value={stats?.single ?? '—'} color="text-slate-600" />
        <StatCard icon={CheckCircle2} label="Geocoded" value={stats?.geocoded ?? '—'} color="text-green-600" />
        <StatCard icon={AlertCircle} label="Not Geocoded" value={stats?.notGeocoded ?? '—'} color="text-amber-600" />
        <StatCard icon={MapPin} label="States" value={stats?.states ?? '—'} color="text-purple-600" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by company, phone, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {(mergeFilter || stateFilter || geocodeFilter || sourceFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setMergeFilter(''); setStateFilter(''); setGeocodeFilter(''); setSourceFilter(''); }}
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
            value={mergeFilter}
            onChange={(e) => setMergeFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All Merge Types</option>
            <option value="merged">Merged (multi-source)</option>
            <option value="single_source">Single Source</option>
          </select>
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
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All Source Entities</option>
            <option value="FutureEstateOperator">ES.net (FutureEstateOperator)</option>
            <option value="EstatesalesOrgOperator">ES.org (EstatesalesOrgOperator)</option>
            <option value="FutureOperatorLead">FOL (FutureOperatorLead)</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Company</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Phone</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Location</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Sources</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Geocode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && records.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No records found</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800 truncate max-w-[200px]">{r.company_name || '—'}</div>
                    {r.owner_name && <div className="text-xs text-slate-400 truncate max-w-[200px]">{r.owner_name}</div>}
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
                    <div className="flex flex-wrap gap-1">
                      {r.merge_status === 'merged' ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          <Merge className="w-3 h-3 mr-1" />Merged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Single</Badge>
                      )}
                      {(r.sources || []).map(s => (
                        <Badge key={s} variant="outline" className="text-xs text-slate-400">
                          {s.replace('EstatesalesOrgOperator', 'ES.org').replace('FutureEstateOperator', 'ES.net').replace('FutureOperatorLead', 'FOL')}
                        </Badge>
                      ))}
                    </div>
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