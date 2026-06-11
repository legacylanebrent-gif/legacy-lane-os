import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import {
  Upload, Zap, Mail, Send, Download, History, Eye, Building2, Users,
  Filter, ChevronDown, ChevronUp, Loader, RefreshCw, FileSpreadsheet,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import PropstreamImportModal from '@/components/propstream/PropstreamImportModal';
import PropstreamListingDrawer from '@/components/propstream/PropstreamListingDrawer';
import SendToOperatorsModal from '@/components/propstream/SendToOperatorsModal';

const SCORE_COLORS = {
  Priority: 'bg-red-100 text-red-700 border-red-200',
  Strong: 'bg-orange-100 text-orange-700 border-orange-200',
  Moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-200'
};
const EMAIL_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  ready: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  replied: 'bg-purple-100 text-purple-700',
  interested: 'bg-emerald-100 text-emerald-700',
  not_interested: 'bg-red-100 text-red-700'
};

export default function PropstreamREListings() {
  const [listings, setListings] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [showImport, setShowImport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [sendToOpsListing, setSendToOpsListing] = useState(null);

  // Actions
  const [scoring, setScoring] = useState(false);
  const [genEmails, setGenEmails] = useState(false);
  const [extractingAgents, setExtractingAgents] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '', batch: '', county: '', territory: '', scoreLabel: '',
    emailStatus: '', operatorStatus: '', probate: false, inherited: false,
    absentee: false, vacant: false, hasAgentEmail: false, hasOperator: false, agentSubmitted: false
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [listData, batchData] = await Promise.all([
      base44.entities.PropstreamREListing.list('-created_date', 2000),
      base44.entities.PropstreamImportBatch.list('-created_date', 50)
    ]);
    setListings(listData);
    setBatches(batchData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const filtered = listings.filter(l => {
    const q = filters.search.toLowerCase();
    if (q && !`${l.property_address} ${l.city} ${l.county} ${l.listing_agent_name} ${l.owner_name}`.toLowerCase().includes(q)) return false;
    if (filters.batch && l.import_batch_id !== filters.batch) return false;
    if (filters.county && l.county?.toLowerCase() !== filters.county.toLowerCase()) return false;
    if (filters.territory && l.territory_name !== filters.territory) return false;
    if (filters.scoreLabel && l.estate_sale_score_label !== filters.scoreLabel) return false;
    if (filters.emailStatus && l.email_status !== filters.emailStatus) return false;
    if (filters.operatorStatus && l.operator_status !== filters.operatorStatus) return false;
    if (filters.probate && !l.probate_indicator) return false;
    if (filters.inherited && !l.inherited_indicator) return false;
    if (filters.absentee && !l.absentee_owner) return false;
    if (filters.vacant && !l.vacant) return false;
    if (filters.hasAgentEmail && !l.listing_agent_email) return false;
    if (filters.hasOperator && (!l.matched_operator_ids || l.matched_operator_ids.length === 0)) return false;
    if (filters.agentSubmitted && !l.agent_submitted_to_pool) return false;
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filtered.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  const handleScoreAll = async () => {
    setScoring(true);
    await base44.functions.invoke('scorePropstreamListings', { rescore_all: false });
    setScoring(false);
    loadData();
  };

  const handleGenEmails = async () => {
    setGenEmails(true);
    const ids = selected.size > 0 ? Array.from(selected) : undefined;
    await base44.functions.invoke('generateListingAgentEmails', ids ? { listing_ids: ids } : {});
    setGenEmails(false);
    loadData();
  };

  const handleExtractAgents = async () => {
    setExtractingAgents(true);
    try {
      const result = await base44.functions.invoke('extractAgentLeadsFromPropstream');
      alert(`Agent leads extracted!\n\n${result.agents_created} new agents created\n${result.agents_updated} existing agents updated\n\nView them in the Agent Leads page.`);
    } catch (error) {
      alert('Error extracting agents: ' + error.message);
    } finally {
      setExtractingAgents(false);
    }
  };

  const handleExport = () => {
    const rows = (selected.size > 0 ? filtered.filter(l => selected.has(l.id)) : filtered);
    const headers = ['property_address', 'city', 'state', 'zip', 'county', 'list_price', 'estate_sale_score', 'estate_sale_score_label', 'listing_agent_name', 'listing_agent_email', 'listing_agent_phone', 'email_status', 'operator_status', 'territory_name'];
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `propstream_listings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const toggleSelect = (id) => setSelected(s => { const ns = new Set(s); ns.has(id) ? ns.delete(id) : ns.add(id); return ns; });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));

  const uniqueCounties = [...new Set(listings.map(l => l.county).filter(Boolean))].sort();
  const uniqueTerritories = [...new Set(listings.map(l => l.territory_name).filter(Boolean))].sort();

  const stats = {
    total: listings.length,
    priority: listings.filter(l => l.estate_sale_score_label === 'Priority').length,
    strong: listings.filter(l => l.estate_sale_score_label === 'Strong').length,
    emailsReady: listings.filter(l => l.email_status === 'ready').length,
    noEmail: listings.filter(l => !l.email_status || l.email_status === 'draft').length,
    unsentOps: listings.filter(l => l.operator_status === 'not_sent').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">PropStream RE Listings</h1>
          </div>
          <p className="text-slate-500 text-sm">Import daily PropStream MLS listings, score estate sale opportunities, prep agent outreach, and distribute leads to operators.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button onClick={() => setShowImport(true)} className="bg-purple-700 hover:bg-purple-800">
            <Upload className="w-4 h-4 mr-1" /> Quick Import
          </Button>
          <Link to="/PropstreamREListingImporter">
            <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Full Importer
            </Button>
          </Link>
          <Button onClick={handleScoreAll} disabled={scoring} variant="outline">
            {scoring ? <Loader className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />} Score
          </Button>
          <Button onClick={handleGenEmails} disabled={genEmails} variant="outline">
            {genEmails ? <Loader className="w-4 h-4 animate-spin mr-1" /> : <Mail className="w-4 h-4 mr-1" />} Gen Emails
          </Button>
          <Button onClick={handleExtractAgents} disabled={extractingAgents} variant="outline" className="text-blue-600 hover:text-blue-700">
            {extractingAgents ? <Loader className="w-4 h-4 animate-spin mr-1" /> : <Users className="w-4 h-4 mr-1" />} Extract Agents
          </Button>
          <Link to="/PropstreamAgentLeads">
            <Button variant="outline" className="text-blue-600 hover:text-blue-700">
              <Users className="w-4 h-4 mr-1" /> View Agent Leads
            </Button>
          </Link>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button onClick={() => setShowHistory(!showHistory)} variant="outline">
            <History className="w-4 h-4 mr-1" /> History
          </Button>
          <Button onClick={loadData} variant="ghost" size="icon"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Flags Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-xs font-bold">?</span>
            Property Flags Legend
          </h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">P</span>
              <span className="text-slate-600">Probate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">I</span>
              <span className="text-slate-600">Inherited</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">S</span>
              <span className="text-slate-600">Senior Owner</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">A</span>
              <span className="text-slate-600">Absentee Owner</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">V</span>
              <span className="text-slate-600">Vacant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-bold">F</span>
              <span className="text-slate-600">Foreclosure</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          ['Total', stats.total, 'text-slate-700'],
          ['Priority', stats.priority, 'text-red-600'],
          ['Strong', stats.strong, 'text-orange-600'],
          ['Emails Ready', stats.emailsReady, 'text-blue-600'],
          ['No Email Yet', stats.noEmail, 'text-yellow-600'],
          ['Not Sent to Ops', stats.unsentOps, 'text-purple-600'],
        ].map(([label, val, cls]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${cls}`}>{val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import History */}
      {showHistory && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">Import History</h3>
            {batches.length === 0 ? <p className="text-slate-400 text-sm">No imports yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-slate-500 border-b">
                    <th className="pb-2 pr-4">File</th><th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Total</th><th className="pb-2 pr-4">Imported</th><th className="pb-2 pr-4">Dupes</th><th className="pb-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {batches.map(b => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => setFilters(f => ({ ...f, batch: f.batch === b.id ? '' : b.id }))}>
                        <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{b.uploaded_file_name}</td>
                        <td className="py-2 pr-4 text-slate-500">{new Date(b.created_date).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{b.total_rows}</td>
                        <td className="py-2 pr-4 text-green-600">{b.imported_count}</td>
                        <td className="py-2 pr-4 text-yellow-600">{b.duplicate_count}</td>
                        <td className="py-2"><Badge className={b.import_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{b.import_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="Search address, city, county, agent, owner…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="flex-1" />
          <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} className="gap-2 shrink-0">
            <Filter className="w-4 h-4" /> Filters
            {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          {selected.size > 0 && (
            <Button onClick={() => { /* Send selected to ops */ }} className="bg-purple-600 hover:bg-purple-700 shrink-0">
              <Send className="w-4 h-4 mr-1" /> Send {selected.size} Selected
            </Button>
          )}
        </div>

        {filtersOpen && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Batch</label>
                  <select value={filters.batch} onChange={e => setFilters(f => ({ ...f, batch: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All Batches</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.uploaded_file_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">County</label>
                  <select value={filters.county} onChange={e => setFilters(f => ({ ...f, county: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All Counties</option>
                    {uniqueCounties.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Score Label</label>
                  <select value={filters.scoreLabel} onChange={e => setFilters(f => ({ ...f, scoreLabel: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All Scores</option>
                    {['Priority', 'Strong', 'Moderate', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Email Status</label>
                  <select value={filters.emailStatus} onChange={e => setFilters(f => ({ ...f, emailStatus: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All</option>
                    {['draft', 'ready', 'sent', 'replied', 'interested', 'not_interested'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Operator Status</label>
                  <select value={filters.operatorStatus} onChange={e => setFilters(f => ({ ...f, operatorStatus: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All</option>
                    {['not_sent', 'sent_to_operator', 'operator_accepted', 'operator_declined', 'contacted_agent'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Territory</label>
                  <select value={filters.territory} onChange={e => setFilters(f => ({ ...f, territory: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">All Territories</option>
                    {uniqueTerritories.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex flex-wrap gap-3 items-center pt-1">
                  {[['probate', 'Probate'], ['inherited', 'Inherited'], ['absentee', 'Absentee'], ['vacant', 'Vacant'], ['hasAgentEmail', 'Has Agent Email'], ['hasOperator', 'Has Operator'], ['agentSubmitted', 'Agent Submitted']].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.checked }))} className="accent-purple-600" />
                      {label}
                    </label>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setFilters({ search: '', batch: '', county: '', territory: '', scoreLabel: '', emailStatus: '', operatorStatus: '', probate: false, inherited: false, absentee: false, vacant: false, hasAgentEmail: false, hasOperator: false })}>
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{filtered.length} of {listings.length} listings · {selected.size} selected</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Rows per page:</label>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 text-xs">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader className="w-8 h-8 animate-spin text-purple-600" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-16 text-center text-slate-400">
          <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No listings found</p>
          <p className="text-sm mt-1">Import a PropStream CSV to get started</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="p-3 w-8"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-purple-600" /></th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Score</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Address</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">City/County</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">List Price</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Ownership</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Flags</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Agent</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Territory</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Email</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Operator</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map(listing => (
                <tr key={listing.id} className={`hover:bg-slate-50 ${selected.has(listing.id) ? 'bg-purple-50' : ''}`}>
                  <td className="p-3"><input type="checkbox" checked={selected.has(listing.id)} onChange={() => toggleSelect(listing.id)} className="accent-purple-600" /></td>
                  <td className="p-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${SCORE_COLORS[listing.estate_sale_score_label] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {listing.estate_sale_score} <span className="font-normal">{listing.estate_sale_score_label}</span>
                    </div>
                  </td>
                  <td className="p-3 max-w-[160px]">
                    <p className="font-medium truncate" title={listing.property_address}>{listing.property_address}</p>
                    <p className="text-xs text-slate-400">{listing.state} {listing.zip}</p>
                  </td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">
                    <p>{listing.city}</p>
                    <p className="text-xs text-slate-400">{listing.county}</p>
                  </td>
                  <td className="p-3 text-slate-700 whitespace-nowrap">{listing.list_price ? `$${Number(listing.list_price).toLocaleString()}` : '—'}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{listing.ownership_length_years ? `${listing.ownership_length_years}y` : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-0.5 max-w-[100px]">
                      {listing.probate_indicator && <span className="text-xs bg-red-100 text-red-700 px-1 rounded">P</span>}
                      {listing.inherited_indicator && <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">I</span>}
                      {listing.senior_owner_indicator && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">S</span>}
                      {listing.absentee_owner && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">A</span>}
                      {listing.vacant && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">V</span>}
                      {listing.preforeclosure_indicator && <span className="text-xs bg-red-200 text-red-800 px-1 rounded">F</span>}
                    </div>
                  </td>
                  <td className="p-3 max-w-[140px]">
                    {listing.listing_agent_name ? (
                      <Link to={`/PropstreamAgentLeads?agent=${encodeURIComponent(listing.listing_agent_name)}`}>
                        <p className="text-xs font-medium truncate text-blue-600 hover:text-blue-800 hover:underline" title={listing.listing_agent_name}>
                          {listing.listing_agent_name}
                        </p>
                      </Link>
                    ) : (
                      <p className="text-xs text-slate-400">—</p>
                    )}
                    {listing.listing_agent_email && <p className="text-xs text-slate-400 truncate">{listing.listing_agent_email}</p>}
                  </td>
                  <td className="p-3 text-xs text-slate-500 max-w-[120px] truncate">{listing.territory_name || '—'}</td>
                  <td className="p-3 space-y-1">
                    <Badge className={`${EMAIL_COLORS[listing.email_status] || 'bg-slate-100'} text-xs whitespace-nowrap`}>{listing.email_status}</Badge>
                    {listing.agent_submitted_to_pool && (
                      <Badge className="bg-green-100 text-green-700 text-xs block whitespace-nowrap">Agent Submitted</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge className={`text-xs whitespace-nowrap ${listing.operator_status === 'not_sent' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                      {(listing.operator_status || 'not_sent').replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setActiveDrawer(listing)}>
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700" onClick={() => setSendToOpsListing(listing)}>
                        <Send className="w-3 h-3 mr-1" /> Ops
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} listings
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4 -ml-1" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 -ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PropstreamImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={() => { setShowImport(false); loadData(); }}
      />

      <SendToOperatorsModal
        open={!!sendToOpsListing}
        listing={sendToOpsListing}
        onClose={() => setSendToOpsListing(null)}
        onSent={() => { setSendToOpsListing(null); loadData(); }}
      />

      {/* Detail Drawer */}
      {activeDrawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setActiveDrawer(null)} />
          <PropstreamListingDrawer
            listing={activeDrawer}
            onClose={() => setActiveDrawer(null)}
            onUpdate={() => { loadData(); const updated = listings.find(l => l.id === activeDrawer.id); if (updated) setActiveDrawer(updated); }}
          />
        </>
      )}
    </div>
  );
}