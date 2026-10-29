import React, { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Search } from 'lucide-react';
import { opportunities } from '@/components/agentlisting/listingApi';
import OpportunityCard from '@/components/agentlisting/OpportunityCard';
import OpportunityDetailDialog from '@/components/agentlisting/OpportunityDetailDialog';
import ImportPanel from '@/components/agentlisting/ImportPanel';
import ImportHistory from '@/components/agentlisting/ImportHistory';
import EnrichToolbar from '@/components/agentlisting/EnrichToolbar';
import FacebookExportDialog from '@/components/agentlisting/FacebookExportDialog';

const FILTERS = [
  { id: 'work_today', label: 'Work today' },
  { id: 'needs_review', label: 'Needs review' },
  { id: 'verified', label: 'Verified' },
  { id: 'unmatched', label: 'No match' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'closed', label: 'Closed' },
];

const COUNTERS = [
  ['newly_pending', 'Pending listings'],
  ['verified', 'Ownership verified'],
  ['needs_review', 'Need review'],
  ['unmatched', 'No match yet'],
  ['deadlines_soon', 'Closings in 14 days'],
  ['tasks_due', 'Tasks due'],
];

export default function AgentPendingListings() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('work_today');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await opportunities.dashboard({ filter, q, limit: 60 }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter, q]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, q, refreshKey]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, q]);

  const counts = data?.counts || {};

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-serif font-semibold text-slate-900">Pending Listings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Import the pending listings you represent, then work each property with ownership evidence from the stored
          reference database. A pending listing never means the seller needs a service — record a need only when you are
          told.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {COUNTERS.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xl font-semibold text-slate-900">{counts[key] ?? 0}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="work">
        <TabsList>
          <TabsTrigger value="work">My properties</TabsTrigger>
          <TabsTrigger value="imports">Import listings</TabsTrigger>
        </TabsList>

        <TabsContent value="work" className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filter === f.id
                      ? 'border-cyan-600 bg-cyan-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search address"
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <EnrichToolbar
              filter={filter}
              q={q}
              selectedIds={selectedIds}
              matchingCount={data?.total_matching || 0}
              onFinished={() => setRefreshKey((k) => k + 1)}
            />
            <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export for Facebook
            </Button>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {loading && !data && (
            <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your properties…
            </div>
          )}
          {!loading && data && data.opportunities.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-800">Nothing in this view yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Import a pending listing export to start cross-referencing addresses.
              </p>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {(data?.opportunities || []).map((card) => (
              <OpportunityCard
                key={card.id}
                card={card}
                onOpen={setSelectedId}
                selected={selectedIds.has(card.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="imports" className="mt-4 space-y-4">
          <ImportPanel onImported={() => setRefreshKey((k) => k + 1)} />
          <ImportHistory refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>

      <OpportunityDetailDialog
        opportunityId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />

      <FacebookExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filter={filter}
        q={q}
        selectedIds={selectedIds}
        matchingCount={data?.total_matching || 0}
      />
    </div>
  );
}