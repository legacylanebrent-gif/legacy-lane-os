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
import { Plus, Mail, Phone, MapPin, Clock, AlertCircle, CheckCircle, User, TrendingUp, Globe } from 'lucide-react';
import WebsiteLeadDetailModal from '@/components/leads/WebsiteLeadDetailModal';

const WEBSITE_PAGES = ['Estate Sale Request Form', 'Home Value Tool', 'Find an Operator', 'Contact Page', 'Estate Finder', 'Agent Signup', 'Vendor Signup'];

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export default function AdminLeadsWebsite() {
  const [leads, setLeads] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unassigned');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '',
    property_address: '', situation: '', timeline: '', estimated_value: '',
    website_page: '', intent: 'estate_sale', score: 55, notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [leadsData, users] = await Promise.all([
      base44.entities.Lead.filter({ source: 'website' }, '-created_date'),
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
      source: 'website',
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
      score: parseInt(form.score)
    });
    setShowAdd(false);
    setForm({ contact_name: '', contact_email: '', contact_phone: '', property_address: '', situation: '', timeline: '', estimated_value: '', website_page: '', intent: 'estate_sale', score: 55, notes: '' });
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

  const unassigned = leads.filter(l => !l.routed_to && !l.converted).length;
  const assigned = leads.filter(l => l.routed_to && !l.converted).length;
  const converted = leads.filter(l => l.converted).length;

  const filtered = leads.filter(lead => {
    const q = search.toLowerCase();
    const match = !search || lead.contact_name?.toLowerCase().includes(q) || lead.contact_email?.toLowerCase().includes(q) || lead.property_address?.toLowerCase().includes(q) || lead.website_page?.toLowerCase().includes(q);
    if (filter === 'unassigned') return match && !lead.routed_to && !lead.converted;
    if (filter === 'assigned') return match && lead.routed_to && !lead.converted;
    if (filter === 'converted') return match && lead.converted;
    return match;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-4xl font-serif font-bold text-slate-900">Website Leads</h1>
          </div>
          <p className="text-slate-600">Organic leads from EstateSalen.com — forms, tools & direct inquiries</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-cyan-600 hover:bg-cyan-700 w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />Add Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Total</p><p className="text-3xl font-bold">{leads.length}</p></div><TrendingUp className="w-8 h-8 text-slate-300" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Unassigned</p><p className="text-3xl font-bold text-orange-600">{unassigned}</p></div><AlertCircle className="w-8 h-8 text-orange-200" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Assigned</p><p className="text-3xl font-bold text-cyan-600">{assigned}</p></div><User className="w-8 h-8 text-cyan-200" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Converted</p><p className="text-3xl font-bold text-green-600">{converted}</p></div><CheckCircle className="w-8 h-8 text-green-200" /></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="unassigned">Unassigned ({unassigned})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({assigned})</TabsTrigger>
            <TabsTrigger value="converted">Converted ({converted})</TabsTrigger>
            <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Search by name, email, page..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
      </div>

      {/* Table */}
      {loading ? <div className="animate-pulse h-48 bg-slate-100 rounded-lg" /> : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Globe className="w-16 h-16 mx-auto text-slate-300 mb-4" /><p className="text-slate-500">No website leads found</p></CardContent></Card>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-14">Score</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden xl:table-cell">Situation</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-cyan-50/50 cursor-pointer transition-colors" onClick={() => { setSelectedLead(lead); setShowDetail(true); }}>
                    <td className="px-4 py-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getScoreColor(lead.score || 0)}`}>{lead.score || 0}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lead.contact_name || 'Unknown'}</p>
                      {lead.lead_status === 'in_progress' && <span className="text-xs text-yellow-600">In Progress</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.contact_email ? <span className="text-cyan-600 truncate block max-w-[180px]">{lead.contact_email}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                      {lead.contact_phone || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                      {lead.property_county || lead.property_state ? `${lead.property_county || ''}${lead.property_county && lead.property_state ? ', ' : ''}${lead.property_state || ''}` : (lead.property_address ? <span className="truncate block max-w-[160px]">{lead.property_address}</span> : <span className="text-slate-300">—</span>)}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-600 capitalize">
                      {lead.situation ? lead.situation.replace(/_/g, ' ') : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.converted ? <Badge className="bg-green-100 text-green-800">Converted</Badge>
                        : lead.routed_to ? <Badge className="bg-cyan-100 text-cyan-800">Assigned</Badge>
                        : <Badge className="bg-orange-100 text-orange-800">New</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs whitespace-nowrap">
                      {new Date(lead.created_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <WebsiteLeadDetailModal
        lead={selectedLead}
        open={showDetail}
        onOpenChange={(open) => { setShowDetail(open); if (!open) setSelectedLead(null); }}
        operators={operators}
        onAssign={handleAssign}
        onMarkConverted={handleMarkConverted}
      />

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Website Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} required /></div>
              <div><Label>Website Page / Form</Label>
                <Select value={form.website_page} onValueChange={v => setForm({ ...form, website_page: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{WEBSITE_PAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
            </div>
            <div><Label>Property Address</Label><Input value={form.property_address} onChange={e => setForm({ ...form, property_address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Situation</Label>
                <Select value={form.situation} onValueChange={v => setForm({ ...form, situation: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{['probate','divorce','downsizing','relocation','foreclosure','investment','standard'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Timeline</Label>
                <Select value={form.timeline} onValueChange={v => setForm({ ...form, timeline: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="1_3_months">1-3 Months</SelectItem>
                    <SelectItem value="3_6_months">3-6 Months</SelectItem>
                    <SelectItem value="6_12_months">6-12 Months</SelectItem>
                    <SelectItem value="exploring">Just Exploring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Est. Value ($)</Label><Input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} /></div>
              <div><Label>Lead Score (0-100)</Label><Input type="number" min="0" max="100" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Add Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}