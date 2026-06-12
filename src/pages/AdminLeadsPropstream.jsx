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
import { Plus, AlertCircle, CheckCircle, User, TrendingUp, Database, Zap, Loader, ChevronLeft, ChevronRight, Eye, FileSpreadsheet } from 'lucide-react';
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
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '',
    property_address: '', situation: '', timeline: '', estimated_value: '',
    propstream_id: '', propstream_equity: '', propstream_owner_type: '',
    intent: 'estate_sale', score: 65, notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [leadsData, users] = await Promise.all([
      base44.entities.Lead.filter({ source: 'propstream' }, '-created_date'),
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
      loadData();
    } finally {
      setScoring(false);
    }
  };

  const unassigned = leads.filter(l => !l.routed_to && !l.converted).length;
  const assigned = leads.filter(l => l.routed_to && !l.converted).length;
  const converted = leads.filter(l => l.converted).length;

  const filtered = leads.filter(lead => {
    const q = search.toLowerCase();
    const match = !search || lead.contact_name?.toLowerCase().includes(q) || lead.contact_email?.toLowerCase().includes(q) || lead.property_address?.toLowerCase().includes(q) || lead.propstream_id?.toLowerCase().includes(q);
    if (filter === 'unassigned') return match && !lead.routed_to && !lead.converted;
    if (filter === 'assigned') return match && lead.routed_to && !lead.converted;
    if (filter === 'converted') return match && lead.converted;
    return match;
  });

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

      {/* Filters */}
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
        <Button onClick={handleScoreLeads} disabled={scoring} variant="outline" className="gap-2">
          {scoring ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {scoring ? 'Scoring...' : 'Score Leads'}
        </Button>
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
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Score</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Owner</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Property Address</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">County</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Contact</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Owner Type</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Situation</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Est. Value</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Equity</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Beds</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Baths</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Sq Ft</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Year</th>
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
                  <td className="p-3">
                    {lead.situation ? (
                      <Badge className="bg-blue-100 text-blue-700 text-xs capitalize whitespace-nowrap">{lead.situation}</Badge>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="p-3 text-slate-700 whitespace-nowrap">
                    {lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {lead.propstream_equity ? (
                      <span className="text-purple-600 font-medium">${Number(lead.propstream_equity).toLocaleString()}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{lead.propstream_beds || '—'}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{lead.propstream_baths || '—'}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{lead.propstream_sqft ? Number(lead.propstream_sqft).toLocaleString() : '—'}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{lead.propstream_year_built || '—'}</td>
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