import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Phone, Globe, MapPin, Calendar,
  Facebook, Twitter, Instagram, Youtube, ExternalLink, Filter, Download,
  Mail, Loader2, CheckCircle2, Pencil, Save, X, Trash2, Navigation,
  Merge, RefreshCw, Building2, Zap, Play, SkipForward
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const US_STATES = ['AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY'];

// Scrape functions for estatesales.net (FutureEstateOperator)
const ALL_SCRAPE_FNS = [
  'scrapeAKOperators','scrapeALOperators','scrapeAROperators','scrapeAZOperators',
  'scrapeCAOperators','scrapeCOOperators','scrapeCTOperators','scrapeDCOperators',
  'scrapeDEOperators','scrapeFLOperators','scrapeGAOperators','scrapeHIOperators',
  'scrapeIAOperators','scrapeIDOperators','scrapeILOperators','scrapeINOperators',
  'scrapeKSOperators','scrapeKYOperators','scrapeLAOperators','scrapeMAOperators',
  'scrapeMDOperators','scrapeMEOperators','scrapeMIOperators','scrapeMNOperators',
  'scrapeMOOperators','scrapeMSOperators','scrapeMTOperators','scrapeNCOperators',
  'scrapeNDOperators','scrapeNEOperators','scrapeNHOperators','scrapeNJOperators',
  'scrapeNMOperators','scrapeNVOperators','scrapeNYOperators','scrapeOHOperators',
  'scrapeOKOperators','scrapeOROperators','scrapePAOperators','scrapeRIOperators',
  'scrapeSCOperators','scrapeSDOperators','scrapeTNOperators','scrapeTXOperators',
  'scrapeUTOperators','scrapeVAOperators','scrapeVTOperators','scrapeWAOperators',
  'scrapeWIOperators','scrapeWVOperators','scrapeWYOperators',
];

const getStateFn = (state) => ALL_SCRAPE_FNS.find(fn => {
  const body = fn.replace(/^scrape/, '').replace(/Operators.*$/, '');
  return body.toUpperCase() === state.toUpperCase();
});

const decodeHtml = (str) => str ? str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'") : '';

export default function FutOperLeads() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('NJ');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrichmentFilter, setEnrichmentFilter] = useState('all'); // all | has_email | no_email | geocoded | not_geocoded
  const [totalCount, setTotalCount] = useState(0);
  const [orgCount, setOrgCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [stateCount, setStateCount] = useState(null);

  // Per-row email enrichment
  const [enrichingIds, setEnrichingIds] = useState(new Set());

  // Batch email find
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);

  // Deduplicate
  const [deduplicating, setDeduplicating] = useState(false);

  // Geocode
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(null);
  const [showGeocodeModal, setShowGeocodeModal] = useState(false);

  // Backfill cities
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(null);
  const [showBackfillModal, setShowBackfillModal] = useState(false);

  // Build Clean List modal
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [buildPhase, setBuildPhase] = useState(null); // null | 'dedup' | 'process'
  const [buildDedup, setBuildDedup] = useState(null);
  const [buildProcess, setBuildProcess] = useState(null); // { offset, total, done, enriched, geocoded, skipped, failed, hasMore }
  const [buildRunning, setBuildRunning] = useState(false);
  const [buildLeadCount, setBuildLeadCount] = useState(null);

  // Scrape (net) modal
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [njBatchState, setNjBatchState] = useState(null);
  const [scrapeRunning, setScrapeRunning] = useState(false);

  // Edit modal
  const [editingOperator, setEditingOperator] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOperators();
    loadStateCount();
  }, [stateFilter]);

  useEffect(() => {
    loadTotalCount();
  }, []);

  const loadTotalCount = async () => {
    try {
      const [futRes, orgRes, leadRes] = await Promise.all([
        base44.functions.invoke('getFutureOperatorCount', {}),
        base44.functions.invoke('getFutureOperatorCount', { entity: 'org' }).catch(() => null),
        base44.functions.invoke('buildCleanLeadList', { action: 'count' }).catch(() => null),
      ]);
      setTotalCount(futRes.data.total || 0);
      if (orgRes?.data?.total) setOrgCount(orgRes.data.total);
      if (leadRes?.data?.total) setLeadCount(leadRes.data.total);
    } catch (e) {}
  };

  const loadStateCount = async () => {
    setStateCount(null);
    try {
      const leads = await base44.entities.FutureOperatorLead.filter({ state: stateFilter }, null, 1000);
      setStateCount(leads.length);
    } catch (e) {}
  };

  const isJunkEmail = (email) => {
    if (!email) return false;
    const lower = email.toLowerCase();
    return lower.endsWith('@estatesales.net') || lower.endsWith('@estatesales.org');
  };

  const cleanEmail = (record) => isJunkEmail(record.email) ? { ...record, email: '' } : record;

  const loadOperators = async () => {
    setLoading(true);
    try {
      const [cleanData, netData, orgData] = await Promise.all([
        base44.entities.FutureOperatorLead.filter({ state: stateFilter }, '-created_date', 1000),
        base44.entities.FutureEstateOperator.filter({ state: stateFilter }, '-created_date', 1000),
        base44.entities.EstatesalesOrgOperator.filter({ base_state: stateFilter }, '-created_date', 1000),
      ]);

      if (cleanData.length > 0) {
        // Clean list exists — show it, then append raw records not yet merged in
        const cleanSourceIds = new Set(cleanData.map(r => r.source_id).filter(Boolean));
        const netUnmerged = netData.filter(r => !cleanSourceIds.has(r.id));
        const orgUnmerged = orgData.filter(r => !cleanSourceIds.has(r.id)).map(r => ({
          ...r, state: r.base_state, city: r.base_city, source: 'estatesales_org', _raw_source: 'org',
        }));
        setOperators([...cleanData.map(cleanEmail), ...netUnmerged.map(cleanEmail), ...orgUnmerged.map(cleanEmail)]);
      } else {
        // No clean list yet — show all raw sources combined
        const orgNormalized = orgData.map(r => ({
          ...r, state: r.base_state, city: r.base_city, source: 'estatesales_org', _raw_source: 'org',
        }));
        setOperators([...netData.map(cleanEmail), ...orgNormalized.map(cleanEmail)]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ──
  const filteredOperators = operators.filter(op => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || (
      op.company_name?.toLowerCase().includes(q) ||
      op.city?.toLowerCase().includes(q) ||
      op.phone?.includes(q) ||
      op.email?.toLowerCase().includes(q)
    );
    let matchEnrich = true;
    if (enrichmentFilter === 'has_email') matchEnrich = !!op.email;
    if (enrichmentFilter === 'no_email') matchEnrich = !op.email;
    if (enrichmentFilter === 'geocoded') matchEnrich = op.geocode_status === 'geocoded';
    if (enrichmentFilter === 'not_geocoded') matchEnrich = op.geocode_status !== 'geocoded';
    return matchSearch && matchEnrich;
  });

  // ── Edit ──
  const openEdit = (op) => {
    setEditingOperator(op);
    setEditForm({
      company_name: decodeHtml(op.company_name || ''),
      email: op.email || '',
      phone: op.phone || '',
      website_url: op.website_url || '',
      city: op.city || '',
      state: op.state || '',
      zip_code: op.zip_code || '',
      county: op.county || '',
      facebook: op.facebook || '',
      instagram: op.instagram || '',
      twitter: op.twitter || '',
      youtube: op.youtube || '',
      enrichment_notes: op.enrichment_notes || '',
      alternate_emails_text: (op.alternate_emails || []).join(', '),
      do_not_contact: op.do_not_contact || false,
      unsubscribe_status: op.unsubscribe_status || false,
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const saveData = { ...editForm };
      saveData.alternate_emails = editForm.alternate_emails_text
        ? editForm.alternate_emails_text.split(',').map(e => e.trim()).filter(Boolean)
        : [];
      delete saveData.alternate_emails_text;
      await base44.entities.FutureOperatorLead.update(editingOperator.id, saveData);
      setOperators(prev => prev.map(op => op.id === editingOperator.id ? { ...op, ...saveData } : op));
      setEditingOperator(null);
    } catch (e) {
      alert('Error saving: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Per-row Find Email ──
  const handleFindEmail = async (opId) => {
    setEnrichingIds(prev => new Set([...prev, opId]));
    try {
      await base44.functions.invoke('enrichCompanyEmail', { company_id: opId, entity: 'FutureOperatorLead' });
      await loadOperators();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setEnrichingIds(prev => { const n = new Set(prev); n.delete(opId); return n; });
    }
  };

  // ── Batch Find Emails ──
  const handleBatchFindEmails = async () => {
    const targets = filteredOperators.filter(op => !op.email && !op.do_not_contact);
    if (targets.length === 0) return alert('All visible companies already have emails.');
    if (!confirm(`Run email finder on ${targets.length} companies? This may take a while.`)) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      try { await base44.functions.invoke('enrichCompanyEmail', { company_id: targets[i].id }); } catch (e) {}
      setBatchProgress({ done: i + 1, total: targets.length });
    }
    setBatchRunning(false);
    setBatchProgress(null);
    await loadOperators();
  };

  // ── Deduplicate ──
  const handleDeduplicate = async () => {
    if (!confirm(`Remove duplicates by phone for ${stateFilter}?`)) return;
    setDeduplicating(true);
    try {
      const res = await base44.functions.invoke('deduplicateFutureOperators', { state: stateFilter });
      const { total_scanned, duplicates_deleted, remaining } = res.data;
      alert(`Done! Scanned ${total_scanned}, deleted ${duplicates_deleted} dupes. ${remaining} remain.`);
      await loadTotalCount();
      await loadStateCount();
      await loadOperators();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setDeduplicating(false);
    }
  };

  // ── Geocode ──
  const handleGeocode = async () => {
    setShowGeocodeModal(true);
    setGeocoding(true);
    setGeocodeProgress({ done: 0, failed: 0, skipped: 0, offset: 0 });
    let offset = 0, totalDone = 0, totalFailed = 0, totalSkipped = 0;
    while (true) {
      const res = await base44.functions.invoke('geocodeFutureOperators', { offset, state: stateFilter });
      const d = res.data;
      totalDone += d.geocoded || 0;
      totalFailed += d.failed || 0;
      totalSkipped += d.skipped || 0;
      setGeocodeProgress({ done: totalDone, failed: totalFailed, skipped: totalSkipped, offset: d.nextOffset, hasMore: d.hasMore });
      if (!d.hasMore) break;
      offset = d.nextOffset;
    }
    setGeocoding(false);
    await loadOperators();
  };

  // ── Backfill Cities ──
  const handleBackfillCities = async () => {
    setShowBackfillModal(true);
    setBackfilling(true);
    setBackfillProgress({ done: 0, failed: 0, skipped: 0, offset: 0 });
    let offset = 0, totalDone = 0, totalFailed = 0, totalSkipped = 0;
    while (true) {
      const res = await base44.functions.invoke('backfillOperatorCities', { offset, state: stateFilter });
      const d = res.data;
      totalDone += d.geocoded || 0;
      totalFailed += d.failed || 0;
      totalSkipped += d.skipped || 0;
      setBackfillProgress({ done: totalDone, failed: totalFailed, skipped: totalSkipped, offset: d.nextOffset });
      if (!d.hasMore) break;
      offset = d.nextOffset;
    }
    setBackfilling(false);
    await loadOperators();
  };

  // ── Scrape net (batched) ──
  const handleOpenScrape = () => {
    setNjBatchState(null);
    setScrapeRunning(false);
    setShowScrapeModal(true);
  };

  const handleNjStartBatch = async (offset = 0, cachedCompanies = null, cachedExisting = null, autoRun = false) => {
    const fnName = getStateFn(stateFilter) || `scrape${stateFilter}Operators`;
    setNjBatchState(prev => ({ ...(prev || {}), running: true, autoRun }));
    try {
      const payload = { batch_offset: offset };
      if (cachedCompanies) payload.all_companies = cachedCompanies;
      if (cachedExisting) payload.existing_map = cachedExisting;
      const res = await base44.functions.invoke(fnName, payload);
      const data = res.data;
      setNjBatchState(prev => ({
        allCompanies: data.all_companies || cachedCompanies || [],
        existingMap: data.existing_map || cachedExisting,
        nextOffset: data.next_offset,
        totalCompanies: data.total_companies,
        totalInserted: (prev?.totalInserted || 0) + (data.inserted || 0),
        totalUpdated: (prev?.totalUpdated || 0) + (data.updated || 0),
        totalFailed: (prev?.totalFailed || 0) + (data.failed || 0),
        dbCountAfter: data.db_count_after,
        lastErrors: data.record_errors || [],
        currentOffset: offset,
        batchSize: data.batch_size,
        isLastBatch: data.is_last_batch,
        running: false,
        autoRun,
        error: null,
      }));
      await loadStateCount();
      if (!data.is_last_batch && autoRun) {
        await handleNjStartBatch(data.next_offset, data.all_companies || cachedCompanies, data.existing_map || cachedExisting, true);
      }
    } catch (e) {
      setNjBatchState(prev => ({ ...(prev || {}), running: false, autoRun: false, error: e.message }));
    }
  };

  // ── Build Clean List ──
  const handleOpenBuildModal = async () => {
    setShowBuildModal(true);
    setBuildPhase(null);
    setBuildDedup(null);
    setBuildProcess(null);
    setBuildRunning(false);
    // Load current count for this state
    try {
      const res = await base44.functions.invoke('buildCleanLeadList', { action: 'count', state: stateFilter });
      setBuildLeadCount(res.data);
    } catch (e) {}
  };

  const handleRunDedup = async () => {
    setBuildPhase('dedup');
    setBuildRunning(true);
    setBuildDedup(null);
    try {
      const res = await base44.functions.invoke('buildCleanLeadList', { action: 'dedup', state: stateFilter });
      setBuildDedup(res.data);
      // After dedup, refresh count for this state
      const countRes = await base44.functions.invoke('buildCleanLeadList', { action: 'count', state: stateFilter });
      setBuildLeadCount(countRes.data);
      // Auto-advance to process phase
      setBuildPhase('process');
      setBuildProcess({ offset: 0, total: countRes.data.pending || 0, done: 0, enriched: 0, geocoded: 0, skipped: 0, failed: 0, hasMore: (countRes.data.pending || 0) > 0 });
    } catch (e) {
      alert('Dedup error: ' + e.message);
    } finally {
      setBuildRunning(false);
    }
  };

  const handleProcessBatch = async (currentOffset) => {
    setBuildRunning(true);
    try {
      const res = await base44.functions.invoke('buildCleanLeadList', { action: 'process_batch', offset: currentOffset, batch_size: 50, state: stateFilter });
      const d = res.data;
      setBuildProcess(prev => ({
        offset: d.next_offset,
        total: d.total_pending,
        done: (prev?.done || 0) + d.batch_size,
        enriched: (prev?.enriched || 0) + (d.enriched || 0),
        geocoded: (prev?.geocoded || 0) + (d.geocoded || 0),
        skipped: (prev?.skipped || 0) + (d.skipped || 0),
        failed: (prev?.failed || 0) + (d.failed || 0),
        hasMore: d.has_more,
      }));
      if (!d.has_more) {
        const countRes = await base44.functions.invoke('buildCleanLeadList', { action: 'count', state: stateFilter });
        setBuildLeadCount(countRes.data);
      }
    } catch (e) {
      alert('Process error: ' + e.message);
    } finally {
      setBuildRunning(false);
    }
  };

  const isBusy = batchRunning || deduplicating || geocoding || backfilling || scrapeRunning || buildRunning;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fut Oper Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Combined lead pipeline from EstateSales.net — enrich, geocode, and manage by state</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-2xl font-bold text-indigo-700">{leadCount > 0 ? leadCount.toLocaleString() : '...'}</div>
            <div className="text-xs text-slate-500">Clean Leads</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-600">{totalCount > 0 ? totalCount.toLocaleString() : '...'}</div>
            <div className="text-xs text-slate-500">EstateSales.net</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-600">{orgCount > 0 ? orgCount.toLocaleString() : '...'}</div>
            <div className="text-xs text-slate-500">EstateSales.org</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{stateCount !== null ? stateCount.toLocaleString() : '...'}</div>
            <div className="text-xs text-slate-500">{stateFilter} Records</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* State selector */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">State</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Enrichment filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Filter</label>
              <Select value={enrichmentFilter} onValueChange={setEnrichmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="has_email">Has Email</SelectItem>
                  <SelectItem value="no_email">No Email</SelectItem>
                  <SelectItem value="geocoded">Geocoded</SelectItem>
                  <SelectItem value="not_geocoded">Not Geocoded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Search</label>
              <Search className="absolute left-3 top-7 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Company, city, phone, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Badge variant="outline" className="self-end mb-0.5">{filteredOperators.length} shown</Badge>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 ml-auto self-end">
              <Button onClick={handleOpenBuildModal} disabled={isBusy} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                <Zap className="w-4 h-4 mr-1" />Build Clean List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">Company</th>
                    <th className="text-left p-3 font-medium text-slate-600">Location</th>
                    <th className="text-left p-3 font-medium text-slate-600">Phone</th>
                    <th className="text-left p-3 font-medium text-slate-600">Email</th>
                    <th className="text-left p-3 font-medium text-slate-600">Website</th>
                    <th className="text-left p-3 font-medium text-slate-600">Social</th>
                    <th className="text-left p-3 font-medium text-slate-600">Geo</th>
                    <th className="text-left p-3 font-medium text-slate-600">Enrichment</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperators.map((op, i) => (
                    <tr key={op.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 max-w-48">{decodeHtml(op.company_name)}</div>
                        {op.package_type && (
                          <Badge className="text-xs mt-1 bg-yellow-100 text-yellow-800">{op.package_type}</Badge>
                        )}
                        {op.member_since && <div className="text-xs text-slate-400 mt-0.5">Since {op.member_since}</div>}
                        {op.do_not_contact && <Badge className="text-xs bg-red-100 text-red-700 mt-1">DNC</Badge>}
                      </td>
                      <td className="p-3 text-slate-600 text-xs">
                        <div>{op.geocoded_city || op.city}, {op.state} {op.geocoded_zip || op.zip_code}</div>
                        {op.geocoded_county && <div className="text-slate-400">{op.geocoded_county}</div>}
                        {op.county && !op.geocoded_county && <div className="text-slate-400">{op.county}</div>}
                      </td>
                      <td className="p-3 text-slate-600 text-xs">{op.phone || '—'}</td>
                      <td className="p-3 text-xs max-w-44">
                        {op.email ? (
                          <div>
                            <a href={`mailto:${op.email}`} className="text-green-700 hover:underline font-mono">{op.email}</a>
                            {op.email_confidence_score != null && (
                              <span className="text-slate-400 ml-1">({op.email_confidence_score}%)</span>
                            )}
                            {op.alternate_emails?.length > 0 && (
                              <div className="text-slate-400 text-xs mt-0.5">+{op.alternate_emails.length} alt</div>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs border-orange-300 text-orange-700"
                            onClick={() => handleFindEmail(op.id)}
                            disabled={enrichingIds.has(op.id) || op.do_not_contact}
                          >
                            {enrichingIds.has(op.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
                            Find
                          </Button>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        {(op.website_url || op.website) ? (
                          <a href={op.website_url || op.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            <Globe className="w-3 h-3" />Visit
                          </a>
                        ) : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {op.facebook && <a href={op.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600"><Facebook className="w-3.5 h-3.5" /></a>}
                          {op.instagram && <a href={op.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600"><Instagram className="w-3.5 h-3.5" /></a>}
                          {op.twitter && <a href={op.twitter} target="_blank" rel="noopener noreferrer" className="text-sky-500"><Twitter className="w-3.5 h-3.5" /></a>}
                          {op.youtube && <a href={op.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600"><Youtube className="w-3.5 h-3.5" /></a>}
                          {!op.facebook && !op.instagram && !op.twitter && !op.youtube && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {op.geocode_status === 'geocoded' ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Geocoded</span>
                        ) : op.lat ? (
                          <span className="text-cyan-600 text-xs">Has coords</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        <Badge className={`text-xs ${
                          op.enrichment_status === 'found' || op.enrichment_status === 'verified' ? 'bg-green-100 text-green-700' :
                          op.enrichment_status === 'failed' ? 'bg-red-100 text-red-700' :
                          op.enrichment_status === 'searching' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {op.enrichment_status || 'not_started'}
                        </Badge>
                        <div className="text-slate-400 mt-0.5">{op.outreach_status || ''}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => openEdit(op)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {op.source_url && (
                            <a href={op.source_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOperators.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        No records found for {stateFilter}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingOperator} onOpenChange={(open) => !open && setEditingOperator(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Operator</DialogTitle>
            <DialogDescription>{decodeHtml(editingOperator?.company_name || '')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Company Name</Label>
                <Input value={editForm.company_name || ''} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Primary Email</Label>
                <Input value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} type="email" />
              </div>
              <div className="sm:col-span-2">
                <Label>Alternate Emails (comma-separated)</Label>
                <Input value={editForm.alternate_emails_text || ''} onChange={e => setEditForm(p => ({ ...p, alternate_emails_text: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={editForm.website_url || ''} onChange={e => setEditForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>City</Label>
                <Input value={editForm.city || ''} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={editForm.state || ''} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} maxLength={2} />
              </div>
              <div>
                <Label>ZIP Code</Label>
                <Input value={editForm.zip_code || ''} onChange={e => setEditForm(p => ({ ...p, zip_code: e.target.value }))} />
              </div>
              <div>
                <Label>County</Label>
                <Input value={editForm.county || ''} onChange={e => setEditForm(p => ({ ...p, county: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 border-t pt-3">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">Social Media</Label>
              </div>
              <div><Label>Facebook</Label><Input value={editForm.facebook || ''} onChange={e => setEditForm(p => ({ ...p, facebook: e.target.value }))} /></div>
              <div><Label>Instagram</Label><Input value={editForm.instagram || ''} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} /></div>
              <div><Label>Twitter / X</Label><Input value={editForm.twitter || ''} onChange={e => setEditForm(p => ({ ...p, twitter: e.target.value }))} /></div>
              <div><Label>YouTube</Label><Input value={editForm.youtube || ''} onChange={e => setEditForm(p => ({ ...p, youtube: e.target.value }))} /></div>
              <div className="sm:col-span-2 border-t pt-3 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={editForm.do_not_contact || false} onChange={e => setEditForm(p => ({ ...p, do_not_contact: e.target.checked }))} className="rounded" />
                  Do Not Contact
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={editForm.unsubscribe_status || false} onChange={e => setEditForm(p => ({ ...p, unsubscribe_status: e.target.checked }))} className="rounded" />
                  Unsubscribed
                </label>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={editForm.enrichment_notes || ''} onChange={e => setEditForm(p => ({ ...p, enrichment_notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingOperator(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scrape Modal */}
      <Dialog open={showScrapeModal} onOpenChange={(open) => { if (!njBatchState?.running) setShowScrapeModal(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scrape EstateSales.net — {stateFilter}</DialogTitle>
            <DialogDescription>Scrapes all {stateFilter} cities from EstateSales.net in batches.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!njBatchState ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Choose Manual (step through batches) or Auto-Run (run all automatically).</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowScrapeModal(false)}>Cancel</Button>
                  <Button onClick={() => handleNjStartBatch(0, null, null, false)} variant="outline" className="border-orange-400 text-orange-700">
                    <Download className="w-4 h-4 mr-2" />Manual
                  </Button>
                  <Button onClick={() => handleNjStartBatch(0, null, null, true)} className="bg-orange-600 hover:bg-orange-700">
                    <Download className="w-4 h-4 mr-2" />Auto-Run All
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Total companies:</span><span className="font-semibold">{njBatchState.totalCompanies ?? '...'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Saved so far:</span>
                    <span className="font-semibold">{njBatchState.isLastBatch ? njBatchState.totalCompanies : njBatchState.currentOffset + njBatchState.batchSize} / {njBatchState.totalCompanies}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((njBatchState.currentOffset + njBatchState.batchSize) / njBatchState.totalCompanies) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-green-700">+{njBatchState.totalInserted} new</span>
                    <span className="text-blue-700">{njBatchState.totalUpdated} updated</span>
                    {njBatchState.totalFailed > 0 && <span className="text-red-600">{njBatchState.totalFailed} failed</span>}
                  </div>
                </div>
                {njBatchState.error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">Error: {njBatchState.error}</div>}
                <div className="flex justify-end gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => { setNjBatchState(null); setShowScrapeModal(false); loadOperators(); }}>
                    {njBatchState.isLastBatch ? 'Done' : 'Close'}
                  </Button>
                  {!njBatchState.isLastBatch && !njBatchState.running && (
                    <>
                      <Button onClick={() => handleNjStartBatch(njBatchState.nextOffset, njBatchState.allCompanies, njBatchState.existingMap, false)} variant="outline" className="border-orange-400 text-orange-700">
                        Next Batch
                      </Button>
                      <Button onClick={() => handleNjStartBatch(njBatchState.nextOffset, njBatchState.allCompanies, njBatchState.existingMap, true)} className="bg-orange-600 hover:bg-orange-700">
                        Auto-Run Rest
                      </Button>
                    </>
                  )}
                  {njBatchState.running && (
                    <Button disabled className="bg-orange-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{njBatchState.autoRun ? 'Auto-saving...' : 'Saving batch...'}
                    </Button>
                  )}
                  {njBatchState.isLastBatch && !njBatchState.running && (
                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> All batches complete!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Geocode Modal */}
      <Dialog open={showGeocodeModal} onOpenChange={(open) => { if (!geocoding) setShowGeocodeModal(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Geocoding {stateFilter}</DialogTitle>
            <DialogDescription>Resolving ZIP → city, county, and coordinates.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {geocoding && <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-cyan-600" /><span className="text-sm text-slate-600">Processing at offset {geocodeProgress?.offset ?? 0}…</span></div>}
            {geocodeProgress && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Geocoded:</span><span className="font-semibold text-green-700">{geocodeProgress.done}</span></div>
                <div className="flex justify-between"><span>Failed:</span><span className="font-semibold text-red-600">{geocodeProgress.failed}</span></div>
                <div className="flex justify-between"><span>Skipped:</span><span className="font-semibold text-slate-500">{geocodeProgress.skipped}</span></div>
              </div>
            )}
            {!geocoding && geocodeProgress && <div className="flex items-center gap-2 text-green-700 font-semibold text-sm"><CheckCircle2 className="w-4 h-4" />Done!</div>}
          </div>
          {!geocoding && <div className="flex justify-end"><Button onClick={() => setShowGeocodeModal(false)}>Close</Button></div>}
        </DialogContent>
      </Dialog>

      {/* Build Clean List Modal */}
      <Dialog open={showBuildModal} onOpenChange={(open) => { if (!buildRunning) { setShowBuildModal(open); if (!open) { loadOperators(); loadStateCount(); loadTotalCount(); } } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-600" />Build Clean Lead List — {stateFilter}</DialogTitle>
            <DialogDescription>Deduplicates {stateFilter} records from both source tables, then enriches email and geocodes each record in batches of 50.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Current table status */}
            {buildLeadCount && (
              <div className="bg-slate-50 border rounded-lg p-3 text-sm grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xl font-bold text-slate-800">{(buildLeadCount.total || 0).toLocaleString()}</div><div className="text-xs text-slate-500">Total Leads</div></div>
                <div><div className="text-xl font-bold text-amber-600">{(buildLeadCount.pending || 0).toLocaleString()}</div><div className="text-xs text-slate-500">Pending</div></div>
                <div><div className="text-xl font-bold text-green-600">{(buildLeadCount.complete || 0).toLocaleString()}</div><div className="text-xs text-slate-500">Complete</div></div>
              </div>
            )}

            {/* Phase: idle (not started) */}
            {!buildPhase && !buildDedup && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBuildModal(false)}>Cancel</Button>
                <Button onClick={handleRunDedup} className="bg-indigo-600 hover:bg-indigo-700">
                  <Play className="w-4 h-4 mr-2" />Start Dedup + Build
                </Button>
              </div>
            )}

            {/* Phase: dedup running */}
            {buildPhase === 'dedup' && buildRunning && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <div>
                  <p className="font-medium text-slate-700">Deduplicating both source tables…</p>
                  <p className="text-xs text-slate-500">This may take 1–2 minutes depending on dataset size.</p>
                </div>
              </div>
            )}

            {/* Phase: process */}
            {buildPhase === 'process' && buildProcess && (
              <div className="space-y-4">
                {buildDedup && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-green-800 mb-1">✓ Dedup Complete</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div><div className="font-bold text-green-700">{(buildDedup.new_inserted || 0).toLocaleString()}</div><div className="text-slate-500">New added</div></div>
                      <div><div className="font-bold text-slate-600">{(buildDedup.skipped_existing || 0).toLocaleString()}</div><div className="text-slate-500">Already existed</div></div>
                      <div><div className="font-bold text-slate-800">{(buildDedup.total_in_table || 0).toLocaleString()}</div><div className="text-slate-500">Total in list</div></div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Progress</span>
                    <span>{buildProcess.done.toLocaleString()} / {buildProcess.total.toLocaleString()} processed</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${buildProcess.total > 0 ? Math.min(100, (buildProcess.done / buildProcess.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-xs pt-1">
                    <div><div className="font-bold text-green-700">{buildProcess.enriched}</div><div className="text-slate-500">Emails found</div></div>
                    <div><div className="font-bold text-cyan-700">{buildProcess.geocoded}</div><div className="text-slate-500">Geocoded</div></div>
                    <div><div className="font-bold text-slate-500">{buildProcess.skipped}</div><div className="text-slate-500">Skipped</div></div>
                    <div><div className="font-bold text-red-500">{buildProcess.failed}</div><div className="text-slate-500">Failed</div></div>
                  </div>
                </div>

                {buildProcess.hasMore ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBuildModal(false)}>Close (resume later)</Button>
                    <Button
                      onClick={() => handleProcessBatch(buildProcess.offset)}
                      disabled={buildRunning}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {buildRunning
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                        : <><SkipForward className="w-4 h-4 mr-2" />Continue (next 50)</>}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />All pending records processed!
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => { setShowBuildModal(false); loadOperators(); loadStateCount(); loadTotalCount(); }}>Close</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Backfill Modal */}
      <Dialog open={showBackfillModal} onOpenChange={(open) => { if (!backfilling) setShowBackfillModal(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolving Cities — {stateFilter}</DialogTitle>
            <DialogDescription>Extracts city + ZIP from source URL and resolves via OpenAI.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {backfilling && <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-violet-600" /><span className="text-sm text-slate-600">Processing at offset {backfillProgress?.offset ?? 0}…</span></div>}
            {backfillProgress && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Resolved:</span><span className="font-semibold text-green-700">{backfillProgress.done}</span></div>
                <div className="flex justify-between"><span>Failed:</span><span className="font-semibold text-red-600">{backfillProgress.failed}</span></div>
                <div className="flex justify-between"><span>Skipped:</span><span className="font-semibold text-slate-500">{backfillProgress.skipped}</span></div>
              </div>
            )}
            {!backfilling && backfillProgress && <div className="flex items-center gap-2 text-green-700 font-semibold text-sm"><CheckCircle2 className="w-4 h-4" />Done!</div>}
          </div>
          {!backfilling && <div className="flex justify-end"><Button onClick={() => setShowBackfillModal(false)}>Close</Button></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}