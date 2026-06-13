import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, AlertCircle, CheckCircle, User, TrendingUp, Database, Zap, Loader, ChevronLeft, ChevronRight, Eye, FileSpreadsheet, Share2, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { exportToFacebookAudienceCSV } from '@/lib/facebookAudienceExport';
import ProbateLeadBatchImporter from '@/components/propstream/ProbateLeadBatchImporter';
import LeadDetailModal from '@/components/leads/LeadDetailModal';

const OWNER_TYPES = ['Absentee Owner', 'Inherited', 'Distressed', 'Pre-Foreclosure', 'High Equity', 'Free & Clear', 'Probate'];

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export default function AdminLeadsPropstream() {
  const [leads, setLeads] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unassigned');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [situationFilter, setSituationFilter] = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '',
    property_address: '', situation: '', timeline: '', estimated_value: '',
    propstream_id: '', propstream_equity: '', propstream_owner_type: '',
    intent: 'estate_sale', score: 65, notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const PAGE_SIZE = 5000;

    // Fetch all leads with pagination — API caps at 5000 per call
    const fetchAllLeads = async () => {
      let allLeads = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Lead.filter({ source: 'propstream' }, '-created_date', PAGE_SIZE, skip);
        if (batch.length === 0) break;
        allLeads = [...allLeads, ...batch];
        if (batch.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
        // Small delay between batches to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
      }
      return allLeads;
    };

    const [leadsData, users] = await Promise.all([
      fetchAllLeads(),
      base44.entities.User.list()
    ]);
    setLeads(leadsData);
    setOperators(users.filter(u =>
      u.primary_account_type === 'estate_sale_operator' ||
      u.account_types?.includes('estate_sale_operator')
    ));
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await base44.entities.Lead.create({
      ...form,
      source: 'propstream',
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
      propstream_equity: form.propstream_equity ? parseFloat(form.propstream_equity) : undefined,
      score: parseInt(form.score)
    });
    setShowAdd(false);
    setForm({ contact_name: '', contact_email: '', contact_phone: '', property_address: '', situation: '', timeline: '', estimated_value: '', propstream_id: '', propstream_equity: '', propstream_owner_type: '', intent: 'estate_sale', score: 65, notes: '' });
    loadData();
  };

  const handleAssign = async (leadId, operatorId) => {
    await base44.entities.Lead.update(leadId, { routed_to: operatorId });
    setShowDetail(false);
    loadData();
  };

  const handleMarkConverted = async (leadId) => {
    await base44.entities.Lead.update(leadId, { converted: true, conversion_date: new Date().toISOString() });
    setShowDetail(false);
    loadData();
  };

  const handleScoreLeads = async () => {
    setScoring(true);
    try {
      const result = await base44.functions.invoke('scoreLeads', {});
      toast.success(result?.data?.message || `${result?.data?.scored || 0} leads scored`);
      loadData();
    } catch (err) {
      toast.error('Scoring failed. Please try again.');
    } finally {
      setScoring(false);
    }
  };

  const unassigned = leads.filter(l => !l.routed_to && !l.converted).length;
  const assigned = leads.filter(l => l.routed_to && !l.converted).length;
  const converted = leads.filter(l => l.converted).length;

  // Get unique states and counties for filters
  const uniqueStates = [...new Set(leads.map(l => l.property_state).filter(Boolean))].sort();
  const uniqueCounties = [...new Set(leads.map(l => l.property_county).filter(Boolean))].sort();

  const filtered = leads.filter(lead => {
    const q = search.toLowerCase();
    const match = !search || lead.contact_name?.toLowerCase().includes(q) || lead.contact_email?.toLowerCase().includes(q) || lead.property_address?.toLowerCase().includes(q) || lead.propstream_id?.toLowerCase().includes(q);
    if (filter === 'unassigned' && (lead.routed_to || lead.converted)) return false;
    if (filter === 'assigned' && (!lead.routed_to || lead.converted)) return false;
    if (filter === 'converted' && !lead.converted) return false;
    if (!match) return false;
    // Additional filters
    if (ownerTypeFilter && lead.propstream_owner_type !== ownerTypeFilter) return false;
    if (scoreRangeFilter) {
      const s = lead.score || 0;
      if (scoreRangeFilter === 'high' && s < 70) return false;
      if (scoreRangeFilter === 'medium' && (s < 40 || s >= 70)) return false;
      if (scoreRangeFilter === 'low' && s >= 40) return false;
    }
    if (stateFilter && lead.property_state !== stateFilter) return false;
    if (countyFilter && lead.property_county !== countyFilter) return false;
    if (situationFilter && lead.situation !== situationFilter) return false;
    return true;
  }).sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const clearFilters = () => {
    setOwnerTypeFilter('');
    setScoreRangeFilter('');
    setStateFilter('');
    setSituationFilter('');
    setCountyFilter('');
    setSearch('');
    setFilter('unassigned');
  };

  const hasActiveFilters = ownerTypeFilter || scoreRangeFilter || stateFilter || situationFilter || countyFilter;

  // Revenue calculations based on filtered leads
  const estatesalenRev = filtered.reduce((sum, l) => sum + (l.estimated_value ? Math.round(l.estimated_value * 0.0035) : 0), 0);
  const operatorRev = filtered.reduce((sum, l) => sum + (l.estimated_value ? Math.round(l.estimated_value * 0.0015) : 0), 0);
  const estatesalenRev10 = Math.round(estatesalenRev * 0.1);
  const operatorRev10 = Math.round(operatorRev * 0.1);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filtered.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">Propstream Probate Leads</h1>
          </div>
          <p className="text-slate-600">Leads sourced from Propstream API — absentee owners, inherited, distressed properties</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md">
            <FileSpreadsheet className="w-4 h-4 mr-2" />Batch Import
          </Button>
          <Button onClick={() => exportToFacebookAudienceCSV(leads)} variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" />Export FB Audience
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Total</p><p className="text-3xl font-bold">{leads.length}</p></div><TrendingUp className="w-8 h-8 text-slate-300" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Unassigned</p><p className="text-3xl font-bold text-orange-600">{unassigned}</p></div><AlertCircle className="w-8 h-8 text-orange-200" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Assigned</p><p className="text-3xl font-bold text-purple-600">{assigned}</p></div><User className="w-8 h-8 text-purple-200" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Converted</p><p className="text-3xl font-bold text-green-600">{converted}</p></div><CheckCircle className="w-8 h-8 text-green-200" /></CardContent></Card>
      </div>

      {/* Referral Revenue — Row 1: Potential */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Potential Referral Revenue</p>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50/50"><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-slate-500 mb-1">EstateSalen (0.35% of value)</p><p className="text-2xl font-bold text-green-700">${estatesalenRev.toLocaleString()}</p></div>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          </CardContent></Card>
          <Card className="border-orange-200 bg-orange-50/50"><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-slate-500 mb-1">Separate Operator (0.15%)</p><p className="text-2xl font-bold text-orange-700">${operatorRev.toLocaleString()}</p></div>
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-orange-600" /></div>
          </CardContent></Card>
        </div>
      </div>

      {/* Referral Revenue — Row 2: 10% */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">10% Conversion Estimate</p>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50/30"><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-slate-500 mb-1">EstateSalen (10% of above)</p><p className="text-2xl font-bold text-green-800">${estatesalenRev10.toLocaleString()}</p></div>
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          </CardContent></Card>
          <Card className="border-orange-200 bg-orange-50/30"><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-slate-500 mb-1">Operator (10% of above)</p><p className="text-2xl font-bold text-orange-800">${operatorRev10.toLocaleString()}</p></div>
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
          </CardContent></Card>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="unassigned">Unassigned ({unassigned})</TabsTrigger>
              <TabsTrigger value="assigned">Assigned ({assigned})</TabsTrigger>
              <TabsTrigger value="converted">Converted ({converted})</TabsTrigger>
              <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input placeholder="Search by name, address, Propstream ID..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className={`gap-2 ${hasActiveFilters ? 'border-purple-400 bg-purple-50 text-purple-700' : ''}`}>
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
          </Button>
          <Button onClick={handleScoreLeads} disabled={scoring} variant="outline" className="gap-2">
            {scoring ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {scoring ? 'Scoring...' : 'Score Leads'}
          </Button>
        </div>

        {/* Advanced Filter Panel */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Advanced Filters</p>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs text-red-600 hover:text-red-700 gap-1">
                  <X className="w-3 h-3" /> Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1">Owner Type</Label>
                <Select value={ownerTypeFilter} onValueChange={v => setOwnerTypeFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {OWNER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1">Score Range</Label>
                <Select value={scoreRangeFilter} onValueChange={v => setScoreRangeFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Scores" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="high">High (70+)</SelectItem>
                    <SelectItem value="medium">Medium (40-69)</SelectItem>
                    <SelectItem value="low">Low (0-39)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1">State</Label>
                <Select value={stateFilter} onValueChange={v => setStateFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All States" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1">County</Label>
                <Select value={countyFilter} onValueChange={v => setCountyFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Counties" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="all">All Counties</SelectItem>
                    {uniqueCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1">Situation</Label>
                <Select value={situationFilter} onValueChange={v => setSituationFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Situations" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Situations</SelectItem>
                    {['probate','divorce','downsizing','relocation','foreclosure','investment','standard'].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page Size */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{filtered.length} leads</p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Rows per page:</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 text-xs">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader className="w-8 h-8 animate-spin text-purple-600" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-16 text-center text-slate-400">
          <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Add leads manually or import from PropStream</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200 max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b sticky top-0 z-10">
              <tr className="text-left">
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none" onClick={() => { if (sortField === 'score') setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortField('score'); setSortDir('desc'); }}}>
                  Score {sortField === 'score' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Owner</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Property Address</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">County</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Contact</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Owner Type</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-slate-700 select-none" onClick={() => { if (sortField === 'estimated_value') setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortField('estimated_value'); setSortDir('desc'); }}}>
                  Est. Value {sortField === 'estimated_value' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">EstSale Rev</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Op Ref</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-slate-700 select-none" onClick={() => { if (sortField === 'propstream_equity') setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortField('propstream_equity'); setSortDir('desc'); }}}>
                  Equity {sortField === 'propstream_equity' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Type</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedLead(lead); setShowDetail(true); }}>
                  <td className="p-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getScoreColor(lead.score || 0)}`}>
                      {lead.score || 0}
                    </div>
                  </td>
                  <td className="p-3 max-w-[140px]">
                    <p className="font-medium text-slate-800 truncate" title={lead.contact_name}>{lead.contact_name || 'Unknown'}</p>
                    {lead.propstream_id && <p className="text-xs text-slate-400">PS: {lead.propstream_id.slice(0, 12)}</p>}
                  </td>
                  <td className="p-3 max-w-[140px]">
                    <p className="font-medium truncate" title={lead.property_address}>{lead.property_address}</p>
                    <p className="text-xs text-slate-400">
                      {lead.property_city}{lead.property_city && lead.property_state ? ', ' : ''}{lead.property_state}{lead.property_state && lead.property_zip ? ' ' : ''}{lead.property_zip}
                    </p>
                  </td>
                  <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{lead.property_county || '—'}</td>
                  <td className="p-3 max-w-[130px]">
                    {lead.contact_email && (
                      <a href={`mailto:${lead.contact_email}`} className="text-xs text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>
                        {lead.contact_email}
                      </a>
                    )}
                    {lead.contact_phone && (
                      <a href={`tel:${lead.contact_phone}`} className="text-xs text-slate-600 hover:underline block" onClick={e => e.stopPropagation()}>
                        {lead.contact_phone}
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    {lead.propstream_owner_type ? (
                      <Badge className="bg-purple-100 text-purple-700 text-xs whitespace-nowrap">{lead.propstream_owner_type}</Badge>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="p-3 text-slate-700 whitespace-nowrap">
                    {lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3 text-green-700 font-medium whitespace-nowrap">
                    {lead.estimated_value ? `$${Math.round(lead.estimated_value * 0.0035).toLocaleString()}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3 text-orange-700 font-medium whitespace-nowrap">
                    {lead.estimated_value ? `$${Math.round(lead.estimated_value * 0.0015).toLocaleString()}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {lead.propstream_equity ? (
                      <span className="text-purple-600 font-medium">${Number(lead.propstream_equity).toLocaleString()}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3">
                    {lead.propstream_property_type ? (
                      <span className="text-xs text-slate-600 capitalize">{lead.propstream_property_type}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3">
                    {lead.converted ? <Badge className="bg-green-100 text-green-800 text-xs">Converted</Badge>
                      : lead.routed_to ? <Badge className="bg-cyan-100 text-cyan-800 text-xs">Assigned</Badge>
                      : <Badge className="bg-orange-100 text-orange-800 text-xs">New</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setSelectedLead(lead); setShowDetail(true); }}>
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      {!lead.routed_to && !lead.converted && (
                        <Select onValueChange={(opId) => handleAssign(lead.id, opId)}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue placeholder="Assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
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
            Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} leads
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

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        operators={operators}
        onAssign={handleAssign}
        onMarkConverted={handleMarkConverted}
        open={showDetail}
        onOpenChange={(open) => { setShowDetail(open); if (!open) setSelectedLead(null); }}
      />

      {/* Batch Import Modal */}
      <ProbateLeadBatchImporter
        open={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={() => { setShowImport(false); loadData(); }}
      />

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Propstream Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Propstream ID</Label><Input value={form.propstream_id} onChange={e => setForm({ ...form, propstream_id: e.target.value })} placeholder="PS-XXXXXXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
            </div>
            <div><Label>Property Address *</Label><Input value={form.property_address} onChange={e => setForm({ ...form, property_address: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Owner Type</Label>
                <Select value={form.propstream_owner_type} onValueChange={v => setForm({ ...form, propstream_owner_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{OWNER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Situation</Label>
                <Select value={form.situation} onValueChange={v => setForm({ ...form, situation: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{['probate','divorce','downsizing','relocation','foreclosure','investment','standard'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Est. Value ($)</Label><Input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} /></div>
              <div><Label>Equity ($)</Label><Input type="number" value={form.propstream_equity} onChange={e => setForm({ ...form, propstream_equity: e.target.value })} /></div>
              <div><Label>Lead Score</Label><Input type="number" min="0" max="100" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Add Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}