import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Database, RefreshCw, Search, Phone, MapPin, Building2, Merge, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const PAGE_SIZE = 50;

export default function AdminMasterOperatorDirectory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [search, setSearch] = useState('');
  const [mergeFilter, setMergeFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);
  const [rebuildResult, setRebuildResult] = useState(null);

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
      let batch;
      if (mergeFilter) {
        batch = await base44.entities.MasterOperatorDirectory.filter({ merge_status: mergeFilter }, '-created_date', PAGE_SIZE, resetSkip);
      } else {
        batch = await base44.entities.MasterOperatorDirectory.list('-created_date', PAGE_SIZE, resetSkip);
      }
      const filtered = search
        ? batch.filter(r =>
            (r.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.phone || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.city || '').toLowerCase().includes(search.toLowerCase())
          )
        : batch;
      setRecords(resetSkip === 0 ? filtered : [...records, ...filtered]);
      setHasMore(batch.length === PAGE_SIZE);
      setSkip(resetSkip);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, mergeFilter, records]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => loadRecords(0), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mergeFilter]);

  const handleRebuild = async () => {
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const res = await base44.functions.invoke('buildMasterOperatorDirectory', {});
      setRebuildResult(res.data);
      await loadStats();
      await loadRecords(0);
    } catch (err) {
      setRebuildResult({ error: err.message || 'Rebuild failed — the function may have timed out.' });
    } finally {
      setRebuilding(false);
    }
  };

  const loadMore = () => loadRecords(skip + PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-orange-600" />
            Master Operator Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated, phone-deduplicated directory from FutureEstateOperator, EstatesalesOrgOperator & FutureOperatorLead
          </p>
        </div>
        <Button onClick={handleRebuild} disabled={rebuilding} className="bg-orange-600 hover:bg-orange-700 text-white">
          {rebuilding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {rebuilding ? 'Rebuilding...' : 'Rebuild & Dedup (by Phone)'}
        </Button>
      </div>

      {rebuildResult && (
        <Card className={rebuildResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="pt-4">
            {rebuildResult.error ? (
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Rebuild Error</p>
                  <p className="text-sm">{rebuildResult.error}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Directory rebuilt successfully</p>
                  <p className="text-sm">
                    {rebuildResult.masterRecordsCreated || rebuildResult.total_created || 0} unique records from{' '}
                    {rebuildResult.totalSourceRecords || rebuildResult.total_source_records || 0} source records.
                    {(rebuildResult.mergedFromMultipleSources || rebuildResult.merged_from_multiple_sources) &&
                      ` ${rebuildResult.mergedFromMultipleSources || rebuildResult.merged_from_multiple_sources} merged from multiple sources.`}
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
        <select
          value={mergeFilter}
          onChange={(e) => setMergeFilter(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">All Sources</option>
          <option value="merged">Merged (multi-source)</option>
          <option value="single_source">Single Source</option>
        </select>
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