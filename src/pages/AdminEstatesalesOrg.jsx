import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, RefreshCw, Search, ExternalLink, Building2, Globe2, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const TIER_COLORS = {
  elite: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-slate-100 text-slate-800',
  basic: 'bg-blue-50 text-blue-700',
  unknown: 'bg-gray-100 text-gray-500',
};

const decodeHTMLEntities = (str) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str || '';
  return textarea.value;
};

export default function AdminEstatesalesOrg() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [selectedState, setSelectedState] = useState('NJ');
  const [filterTier, setFilterTier] = useState('all');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});
  const [filterEnrichment, setFilterEnrichment] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50);

  // Global progress dialog state
  const [showProgress, setShowProgress] = useState(false);
  const [globalCounts, setGlobalCounts] = useState(null);
  const [progressLog, setProgressLog] = useState([]);
  const [allStatesScraping, setAllStatesScraping] = useState(false);
  const [allStatesEnriching, setAllStatesEnriching] = useState(false);
  const [currentStateProcessing, setCurrentStateProcessing] = useState('');
  const [batchDone, setBatchDone] = useState(false); // waiting for "Continue" click
  const [pendingContinue, setPendingContinue] = useState(null); // resolve fn for next batch
  const stopRef = useRef(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedState, filterTier, filterEnrichment]);

  useEffect(() => {
    loadRecords();
    loadCounts();
  }, [selectedState, filterTier, filterEnrichment, currentPage]);

  useEffect(() => {
    loadGlobalCounts();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filter = {};
      if (selectedState !== 'ALL') filter.source_state = selectedState;
      if (filterTier !== 'all') filter.membership_tier = filterTier;
      if (filterEnrichment === 'not_enriched') filter.scrape_status = 'listing_only';
      if (filterEnrichment === 'enriched') filter.scrape_status = 'detail_scraped';
      const skip = currentPage * pageSize;
      const data = await base44.entities.EstatesalesOrgOperator.filter(filter, '-last_scraped_at', pageSize, skip);
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const filter = selectedState !== 'ALL' ? { source_state: selectedState } : {};
      const all = await base44.entities.EstatesalesOrgOperator.filter(filter, '-created_date', 500);
      const c = { total: all.length, listing_only: 0, detail_scraped: 0, failed: 0 };
      all.forEach(r => { if (c[r.scrape_status] !== undefined) c[r.scrape_status]++; });
      setCounts(c);
    } catch (e) {}
  };

  const loadGlobalCounts = async () => {
    try {
      const res = await invokeWithRetry('scrapeEstatesalesOrgState', { mode: 'counts' });
      setGlobalCounts(res.data);
      return res.data;
    } catch (e) {
      return null;
    }
  };

  const addLog = useCallback((msg, type = 'info') => {
    setProgressLog(prev => [...prev.slice(-80), { msg, type, time: new Date().toLocaleTimeString() }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // Single-state scrape — batched 10 cities at a time with Continue prompt
  const handleScrape = async () => {
    if (selectedState === 'ALL') return; // use Scrape All States button instead
    setScraping(true);
    setScrapeResult(null);
    let offset = 0;
    let totalNew = 0;
    let totalSkipped = 0;
    let totalCities = 0;
    try {
      while (true) {
        const res = await invokeWithRetry('scrapeEstatesalesOrgState', {
          state: selectedState.toLowerCase(),
          mode: 'listing',
          batch_offset: offset,
          batch_size: 100,
        });
        const d = res.data;
        totalNew += d.new_records || 0;
        totalSkipped += d.skipped || 0;
        totalCities = d.total_cities || totalCities;
        setScrapeResult({ mode: 'listing', cities_scraped: offset + (d.cities_scraped || 0), total_cities: totalCities, new_records: totalNew, skipped: totalSkipped, has_more: d.has_more });
        await loadRecords();
        await loadCounts();
        if (!d.has_more) break;
        offset = d.next_offset;
        // Wait for user to click Continue
        await waitForContinue();
        if (stopRef.current) break;
      }
    } catch (e) {
      setScrapeResult({ error: e.message });
    } finally {
      setScraping(false);
      setBatchDone(false);
    }
  };

  // Invoke with automatic retry on 429/403 rate limit
  const invokeWithRetry = async (fn, args, maxRetries = 4) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await base44.functions.invoke(fn, args);
      } catch (e) {
        const isRateLimit = e.message?.includes('429') || e.message?.includes('403') || e.message?.includes('Rate limit') || e.message?.includes('rate limit');
        if (isRateLimit && attempt < maxRetries) {
          const delay = 15000 * (attempt + 1); // 15s, 30s, 45s, 60s
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw isRateLimit
            ? new Error(`Rate limit hit — waited but still throttled. Please wait 1–2 minutes and try again.`)
            : e;
        }
      }
    }
  };

  // Single-state enrich (25 at a time) — loops through all states if ALL is selected
  const handleEnrich = async () => {
    if (selectedState === 'ALL') {
      // Enrich the first state that has unenriched records
      setEnriching(true);
      setScrapeResult(null);
      try {
        for (const state of US_STATES) {
          const res = await invokeWithRetry('scrapeEstatesalesOrgState', {
            state: state.toLowerCase(),
            mode: 'detail',
            detail_limit: 25,
          });
          const d = res.data;
          if ((d.enriched || 0) > 0 || (d.failed || 0) > 0) {
            setScrapeResult(d);
            await loadRecords();
            await loadCounts();
            break;
          }
        }
      } catch (e) {
        setScrapeResult({ error: e.message });
      } finally {
        setEnriching(false);
      }
      return;
    }
    setEnriching(true);
    setScrapeResult(null);
    try {
      const res = await invokeWithRetry('scrapeEstatesalesOrgState', {
        state: selectedState.toLowerCase(),
        mode: 'detail',
        detail_limit: 25,
      });
      setScrapeResult(res.data);
      await loadRecords();
      await loadCounts();
    } catch (e) {
      setScrapeResult({ error: e.message });
    } finally {
      setEnriching(false);
    }
  };

  // Wait for user to click "Continue"
  const waitForContinue = () => new Promise(resolve => {
    setBatchDone(true);
    setPendingContinue(() => resolve);
  });

  const handleContinueClick = () => {
    setBatchDone(false);
    if (pendingContinue) {
      pendingContinue();
      setPendingContinue(null);
    }
  };

  // Scrape listings for ALL states
  const handleScrapeAllStates = async () => {
    stopRef.current = false;
    setShowProgress(true);
    setAllStatesScraping(true);
    setProgressLog([]);
    setBatchDone(false);
    addLog('Starting listing scrape for all states...', 'info');

    const gc = await loadGlobalCounts();
    addLog(`Global total so far: ${gc?.total || 0} records`, 'info');

    for (const state of US_STATES) {
      if (stopRef.current) { addLog('Stopped by user.', 'warn'); break; }
      setCurrentStateProcessing(state);
      addLog(`Scraping listings: ${state}...`);
      try {
        const res = await invokeWithRetry('scrapeEstatesalesOrgState', {
          state: state.toLowerCase(),
          mode: 'listing',
        });
        const d = res.data;
        addLog(`${state}: ${d.new_records} new, ${d.skipped} skipped (${d.cities_scraped} cities)`, 'success');
        // Refresh global counts after each state
        await loadGlobalCounts();
      } catch (e) {
        addLog(`${state}: ERROR — ${e.message}`, 'error');
      }
      // Pause every 5 states and wait for Continue
      const idx = US_STATES.indexOf(state);
      if ((idx + 1) % 5 === 0 && idx < US_STATES.length - 1) {
        addLog(`Processed ${idx + 1} states. Click Continue to proceed.`, 'warn');
        await waitForContinue();
        if (stopRef.current) break;
      }
    }

    addLog('All-states listing scrape complete!', 'success');
    setCurrentStateProcessing('');
    setAllStatesScraping(false);
    await loadGlobalCounts();
    await loadRecords();
    await loadCounts();
  };

  // Enrich details for ALL states, 50 at a time per state
  const handleEnrichAllStates = async () => {
    stopRef.current = false;
    setShowProgress(true);
    setAllStatesEnriching(true);
    setProgressLog([]);
    setBatchDone(false);
    addLog('Starting detail enrichment for all states...', 'info');

    let totalEnriched = 0;
    let batchCount = 0;

    for (const state of US_STATES) {
      if (stopRef.current) { addLog('Stopped by user.', 'warn'); break; }
      setCurrentStateProcessing(state);

      // Keep enriching this state until nothing left
      let stateEnriched = 0;
      let hasMore = true;
      while (hasMore) {
        if (stopRef.current) break;
        try {
          const res = await invokeWithRetry('scrapeEstatesalesOrgState', {
            state: state.toLowerCase(),
            mode: 'detail',
            detail_limit: 50,
          });
          const d = res.data;
          stateEnriched += d.enriched || 0;
          totalEnriched += d.enriched || 0;
          batchCount++;
          addLog(`${state}: enriched ${d.enriched}, failed ${d.failed}`, d.failed > 0 ? 'warn' : 'success');
          await loadGlobalCounts();

          // If less than 50 returned enriched, state is done
          hasMore = (d.enriched + d.failed) >= 50 && d.enriched > 0;

          if (hasMore) {
            addLog(`${state}: more to go, continuing after pause...`, 'info');
            await new Promise(r => setTimeout(r, 1500));
          }

          // Pause every 50 enriched total and wait for Continue
          if (batchCount % 3 === 0) {
            addLog(`Batch checkpoint: ${totalEnriched} enriched so far. Click Continue.`, 'warn');
            await waitForContinue();
            if (stopRef.current) break;
          }
        } catch (e) {
          addLog(`${state}: ERROR — ${e.message}`, 'error');
          hasMore = false;
        }
      }
    }

    addLog(`Enrichment complete! Total enriched: ${totalEnriched}`, 'success');
    setCurrentStateProcessing('');
    setAllStatesEnriching(false);
    await loadGlobalCounts();
    await loadRecords();
    await loadCounts();
  };

  const handleStop = () => {
    stopRef.current = true;
    setBatchDone(false);
    if (pendingContinue) { pendingContinue(); setPendingContinue(null); }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.company_name || '').toLowerCase().includes(q) ||
           (r.base_city || '').toLowerCase().includes(q) ||
           (r.phone || '').includes(q);
  });

  const isRunning = allStatesScraping || allStatesEnriching;
  const pctEnriched = globalCounts?.total > 0 ? Math.round((globalCounts.detail_scraped / globalCounts.total) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">EstateSales.org Operator Scraper</h1>
          <p className="text-slate-500 text-sm mt-1">Scrape and manage estate sale company data from estatesales.org</p>
        </div>
        <Button
          onClick={() => { setShowProgress(true); loadGlobalCounts(); }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Globe2 className="w-4 h-4" />
          All-States Progress
        </Button>
      </div>

      {/* Single-state Controls */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">State</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL States</SelectItem>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleScrape} disabled={scraping || isRunning || selectedState === 'ALL'} className="bg-slate-800 text-white" title={selectedState === 'ALL' ? 'Select a specific state to scrape' : ''}>
              {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {scraping ? 'Scraping...' : 'Scrape Listings'}
            </Button>
            <Button onClick={handleEnrich} disabled={enriching || isRunning} variant="outline">
              {enriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {enriching ? 'Enriching...' : `Enrich 25 (${selectedState})`}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button onClick={handleScrapeAllStates} disabled={isRunning} className="bg-indigo-700 text-white">
                {allStatesScraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe2 className="w-4 h-4 mr-2" />}
                Scrape All States
              </Button>
              <Button onClick={handleEnrichAllStates} disabled={isRunning} className="bg-emerald-700 text-white">
                {allStatesEnriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Enrich All States
              </Button>
            </div>
          </div>

          {scrapeResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${scrapeResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
              {scrapeResult.error ? `Error: ${scrapeResult.error}` : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span>
                    {scrapeResult.mode === 'listing' ? (
                      <>
                        ✓ Scraped {scrapeResult.cities_scraped}{scrapeResult.total_cities ? `/${scrapeResult.total_cities}` : ''} cities — {scrapeResult.new_records} new records
                        {scrapeResult.skipped > 0 && (
                          <span className="ml-2 text-slate-600">
                            · <strong>{scrapeResult.skipped} skipped</strong> <span className="text-slate-500">(already in database)</span>
                          </span>
                        )}
                        {scrapeResult.has_more && <span className="ml-2 text-orange-600 font-medium"> · More cities remaining</span>}
                      </>
                    ) : `✓ Enriched ${scrapeResult.enriched} records — ${scrapeResult.failed} failed`}
                  </span>
                  {scrapeResult.has_more && batchDone && (
                    <Button onClick={handleContinueClick} size="sm" className="bg-indigo-700 text-white flex-shrink-0">
                      <PlayCircle className="w-3 h-3 mr-1" /> Continue Next Batch
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter & Stats Row */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEnrichment} onValueChange={setFilterEnrichment}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_enriched">Not Enriched</SelectItem>
            <SelectItem value="enriched">Enriched Only</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search company or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3 text-sm text-slate-600 ml-auto">
          <span className="font-medium">{counts.total || 0} total ({selectedState === 'ALL' ? 'all' : selectedState})</span>
          <span className="text-orange-600">{counts.listing_only || 0} listing-only</span>
          <span className="text-green-600">{counts.detail_scraped || 0} enriched</span>
          {globalCounts && (
            <>
              <span className="text-slate-300 mx-1">|</span>
              <span className="font-semibold text-slate-700">{globalCounts.total?.toLocaleString() || 0} all territories</span>
              <span className="text-green-700">{globalCounts.detail_scraped?.toLocaleString() || 0} enriched total</span>
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {selectedState === 'ALL' && (
        <div className="flex justify-between items-center mb-4 text-sm text-slate-600">
          <span>Page {currentPage + 1}</span>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} variant="outline" size="sm">
              Previous
            </Button>
            <Button onClick={() => setCurrentPage(p => p + 1)} disabled={records.length < pageSize} variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600">Company</th>
                <th className="text-left p-3 font-medium text-slate-600">City</th>
                <th className="text-left p-3 font-medium text-slate-600">Phone</th>
                <th className="text-left p-3 font-medium text-slate-600">Website</th>
                <th className="text-left p-3 font-medium text-slate-600">Email</th>
                <th className="text-left p-3 font-medium text-slate-600">Tier</th>
                <th className="text-left p-3 font-medium text-slate-600">Exp</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{decodeHTMLEntities(r.company_name)}</div>
                    {r.bonded_insured && <span className="text-xs text-green-600">✓ Bonded & Insured</span>}
                    {r.award_winner && <span className="text-xs text-yellow-600 ml-2">🏆 Award Winner</span>}
                  </td>
                  <td className="p-3 text-slate-600 text-sm">{r.base_city}, {r.base_state}</td>
                  <td className="p-3 text-slate-600 text-sm">{r.phone || '—'}</td>
                  <td className="p-3">
                    {r.website_url ? (
                      <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Visit</a>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-slate-600 text-sm">{r.email || '—'}</td>
                  <td className="p-3">
                    <Badge className={`text-xs ${TIER_COLORS[r.membership_tier] || TIER_COLORS.unknown}`}>
                      {r.membership_tier || 'unknown'}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-600 text-sm">{r.years_in_business ? `${r.years_in_business}y` : '—'}</td>
                  <td className="p-3">
                    <a href={r.profile_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-700" />
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No records found. Run a scrape to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Global Progress Dialog */}
      <Dialog open={showProgress} onOpenChange={v => { if (!isRunning) setShowProgress(v); }}>
        <DialogContent className="max-w-2xl w-full" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Globe2 className="w-5 h-5" />
              All-States Scrape Progress
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
            {/* Global stats */}
            {globalCounts && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800">{globalCounts.total.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">Total Scraped</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{globalCounts.detail_scraped.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">Fully Enriched</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">{globalCounts.listing_only.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">Needs Enrichment</div>
                </div>
              </div>
            )}

            {globalCounts && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Enrichment progress</span>
                  <span>{pctEnriched}%</span>
                </div>
                <Progress value={pctEnriched} className="h-2" />
              </div>
            )}

            {/* Per-state breakdown (compact) */}
            {globalCounts?.byState && (
              <div className="flex flex-wrap gap-1">
                {US_STATES.map(s => {
                  const sd = globalCounts.byState[s];
                  if (!sd) return <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{s}</span>;
                  const allEnriched = sd.listing_only === 0 && sd.total > 0;
                  return (
                    <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${allEnriched ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {s} {sd.total}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Current activity */}
            {isRunning && currentStateProcessing && (
              <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 rounded px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing: <strong>{currentStateProcessing}</strong>
              </div>
            )}

            {/* Log */}
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs overflow-y-auto" style={{ height: '200px' }}>
              {progressLog.length === 0 && <span className="text-slate-500">Waiting to start...</span>}
              {progressLog.map((l, i) => (
                <div key={i} className={`leading-5 ${l.type === 'error' ? 'text-red-400' : l.type === 'warn' ? 'text-yellow-400' : l.type === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                  <span className="text-slate-600">{l.time} </span>{l.msg}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t mt-2 flex-shrink-0">
            {!isRunning && (
              <Button onClick={loadGlobalCounts} variant="outline" size="sm">
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh Counts
              </Button>
            )}
            {batchDone && (
              <Button onClick={handleContinueClick} className="bg-indigo-700 text-white" size="sm">
                <PlayCircle className="w-4 h-4 mr-1" /> Continue Next Batch
              </Button>
            )}
            {isRunning && (
              <Button onClick={handleStop} variant="destructive" size="sm">
                Stop
              </Button>
            )}
            {!isRunning && (
              <Button onClick={() => setShowProgress(false)} variant="outline" size="sm" className="ml-auto">
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}