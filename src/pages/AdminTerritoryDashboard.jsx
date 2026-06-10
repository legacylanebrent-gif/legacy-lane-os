import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, RefreshCw, Search, ChevronLeft, ChevronRight, Code, ChevronsLeft, ChevronsRight, Building2, UserCheck } from 'lucide-react';
import TerritoryAssignmentDrawer from '@/components/territory/TerritoryAssignmentDrawer';

const PAGE_SIZE = 50;

const STATUS_COLORS = {
  available: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  full: 'bg-red-100 text-red-700',
  taken: 'bg-red-100 text-red-700',
  paused: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  reviewing: 'bg-purple-100 text-purple-700',
  denied: 'bg-red-100 text-red-700',
};

const statusClass = (s) => STATUS_COLORS[s?.toLowerCase()] || 'bg-slate-100 text-slate-600';

export default function AdminTerritoryDashboard() {
  const [showDebug, setShowDebug] = useState(false);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [assigningTerritory, setAssigningTerritory] = useState(null);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['housioTerritories'],
    queryFn: async () => {
      const res = await base44.functions.invoke('fetchHousioTerritories', { action: 'list' });
      return res.data;
    },
  });

  const territories = response?.territories || [];
  const totalCities = response?.total_cities || 0;
  const totalActive = response?.total_active || 0;
  const rawData = response;

  // Derived filter options
  const stateOptions = useMemo(() => {
    const states = [...new Set(territories.map(t => t.state).filter(Boolean))].sort();
    return states;
  }, [territories]);

  const statusOptions = useMemo(() => {
    const statuses = [...new Set(territories.map(t => t.status).filter(Boolean))].sort();
    return statuses;
  }, [territories]);

  // Filtered + searched list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return territories.filter(t => {
      const matchesSearch = !q || t.name?.toLowerCase().includes(q) || t.state?.toLowerCase().includes(q) || t.territory_id?.toLowerCase().includes(q);
      const matchesState = filterState === 'all' || t.state === filterState;
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchesSearch && matchesState && matchesStatus;
    });
  }, [territories, search, filterState, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterState, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading territory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Territory Dashboard</h1>
              <p className="text-sm text-slate-500">{territories.length.toLocaleString()} master territories loaded</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={() => setShowDebug(!showDebug)} variant="ghost" size="sm">
              <Code className="w-4 h-4 mr-1" /> {showDebug ? 'Hide' : 'Debug'}
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Total Territories</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{territories.length.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Micro Territory Cities</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{totalCities.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-teal-600 text-sm font-medium">Active</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{totalActive.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-teal-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug panel */}
        {showDebug && rawData && (
          <Card className="mb-5 border-amber-200 bg-amber-50">
            <CardHeader><CardTitle className="text-sm text-amber-800">Debug — Raw API Response (first record)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs text-amber-900 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(territories[0] || rawData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Filters bar */}
        <Card className="bg-white shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search name, state, ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {stateOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {(search || filterState !== 'all' || filterStatus !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterState('all'); setFilterStatus('all'); }}>
                  Clear
                </Button>
              )}
              <span className="text-sm text-slate-500 ml-auto">{filtered.length.toLocaleString()} results</span>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Territory Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">State</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Territory ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Cities</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Agents</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Active Listings</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Avg Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Assign</th>
                  </tr>
                  </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                      No territories match your filters.
                    </td>
                  </tr>
                ) : (
                  paged.map((t, i) => (
                    <tr key={t.territory_id || t.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {(currentPage - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{t.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.state || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{t.territory_id || t.id || '—'}</td>
                      <td className="px-4 py-3">
                        {t.status ? (
                          <Badge className={`text-xs ${statusClass(t.status)}`}>{t.status}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{t.cities_count ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{t.total_agent_count ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{t.active_listings ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.avg_listing_price ? `$${t.avg_listing_price.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          onClick={() => setAssigningTerritory({ county: t.name, state: t.state, status: t.status })}
                        >
                          <UserCheck className="w-3 h-3 mr-1" /> Assign
                        </Button>
                      </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3 text-slate-700">Page {currentPage} of {totalPages}</span>
                <Button variant="ghost" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

      </div>

      <TerritoryAssignmentDrawer
        territory={assigningTerritory}
        onClose={() => setAssigningTerritory(null)}
        onSaved={() => setAssigningTerritory(null)}
      />
    </div>
  );
}