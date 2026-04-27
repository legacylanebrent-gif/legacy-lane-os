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
import { Plus, Mail, Phone, MapPin, Clock, Users, AlertCircle, CheckCircle, User, TrendingUp, Database } from 'lucide-react';

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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">Propstream Leads</h1>
          </div>
          <p className="text-slate-600">Leads sourced from Propstream API — absentee owners, inherited, distressed properties</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />Add Lead
        </Button>
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
      </div>

      {/* Cards */}
      {loading ? <div className="animate-pulse h-48 bg-slate-100 rounded-lg" /> : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Database className="w-16 h-16 mx-auto text-slate-300 mb-4" /><p className="text-slate-500">No Propstream leads found</p></CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(lead => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-400" onClick={() => { setSelectedLead(lead); setShowDetail(true); }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold ${getScoreColor(lead.score || 0)}`}>{lead.score || 0}</div>
                    <div>
                      <p className="font-semibold">{lead.contact_name || 'Unknown Owner'}</p>
                      {lead.propstream_owner_type && <Badge className="bg-purple-100 text-purple-700 text-xs">{lead.propstream_owner_type}</Badge>}
                    </div>
                  </div>
                  {lead.converted ? <Badge className="bg-green-100 text-green-800">Converted</Badge>
                    : lead.routed_to ? <Badge className="bg-cyan-100 text-cyan-800">Assigned</Badge>
                    : <Badge className="bg-orange-100 text-orange-800">New</Badge>}
                </div>
                <div className="space-y-1 text-sm">
                  {lead.contact_email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="text-cyan-600 truncate">{lead.contact_email}</span></div>}
                  {lead.contact_phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span>{lead.contact_phone}</span></div>}
                  {lead.property_address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span className="text-slate-600 line-clamp-1">{lead.property_address}</span></div>}
                </div>
                <div className="space-y-2 mt-3 pt-2 border-t text-xs">
                  {lead.estimated_value && <div className="flex justify-between"><span className="text-slate-500">Home Value:</span><span className="text-green-600 font-semibold">${lead.estimated_value.toLocaleString()}</span></div>}
                  {lead.estimated_value && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Platform Referral Income:</span><span className="text-blue-600 font-semibold">${(lead.estimated_value * 0.02 * 0.25 * 0.70).toLocaleString('en-US', {maximumFractionDigits: 0})}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Operator Referral Income:</span><span className="text-purple-600 font-semibold">${(lead.estimated_value * 0.02 * 0.25 * 0.30).toLocaleString('en-US', {maximumFractionDigits: 0})}</span></div>
                    </>
                  )}
                  {lead.propstream_equity && <div className="flex justify-between"><span className="text-slate-500">Equity:</span><span className="text-slate-600">${lead.propstream_equity.toLocaleString()}</span></div>}
                </div>
                {!lead.routed_to && !lead.converted && (
                  <div className="mt-3" onClick={e => e.stopPropagation()}>
                    <Select onValueChange={(opId) => handleAssign(lead.id, opId)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assign to operator..." /></SelectTrigger>
                      <SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setSelectedLead(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Propstream Lead</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${getScoreColor(selectedLead.score || 0)}`}>{selectedLead.score || 0}</div>
                <div>
                  <p className="font-bold text-lg">{selectedLead.contact_name || 'Unknown Owner'}</p>
                  {selectedLead.propstream_owner_type && <Badge className="bg-purple-100 text-purple-700">{selectedLead.propstream_owner_type}</Badge>}
                  {selectedLead.propstream_id && <p className="text-xs text-slate-500 mt-1">PS ID: {selectedLead.propstream_id}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedLead.contact_email && <div><p className="text-xs text-slate-500">Email</p><a href={`mailto:${selectedLead.contact_email}`} className="text-cyan-600 hover:underline break-all">{selectedLead.contact_email}</a></div>}
                {selectedLead.contact_phone && <div><p className="text-xs text-slate-500">Phone</p><a href={`tel:${selectedLead.contact_phone}`} className="text-cyan-600 hover:underline">{selectedLead.contact_phone}</a></div>}
                {selectedLead.estimated_value && <div><p className="text-xs text-slate-500">Est. Value</p><p className="text-green-600 font-semibold">${selectedLead.estimated_value.toLocaleString()}</p></div>}
                {selectedLead.propstream_equity && <div><p className="text-xs text-slate-500">Equity</p><p className="text-purple-600 font-semibold">${selectedLead.propstream_equity.toLocaleString()}</p></div>}
                {selectedLead.timeline && <div><p className="text-xs text-slate-500">Timeline</p><p className="capitalize">{selectedLead.timeline.replace(/_/g, ' ')}</p></div>}
                {selectedLead.situation && <div><p className="text-xs text-slate-500">Situation</p><p className="capitalize">{selectedLead.situation}</p></div>}
              </div>
              {selectedLead.property_address && <div className="flex items-start gap-2 text-sm p-3 bg-slate-50 rounded-lg"><MapPin className="w-4 h-4 text-cyan-600 mt-0.5" /><span>{selectedLead.property_address}</span></div>}
              {selectedLead.notes && <div className="p-3 bg-slate-50 rounded-lg text-sm"><p className="font-medium mb-1">Notes</p><p className="text-slate-600">{selectedLead.notes}</p></div>}
              {!selectedLead.routed_to && !selectedLead.converted && (
                <div><p className="text-sm font-medium mb-1">Assign to Operator</p>
                  <Select onValueChange={(opId) => handleAssign(selectedLead.id, opId)}>
                    <SelectTrigger><SelectValue placeholder="Select operator..." /></SelectTrigger>
                    <SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {selectedLead.routed_to && !selectedLead.converted && (
                <Button onClick={() => handleMarkConverted(selectedLead.id)} className="w-full bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />Mark as Converted</Button>
              )}
              <div className="flex items-center gap-2 pt-2 border-t text-xs text-slate-500">
                <Clock className="w-3 h-3" />{new Date(selectedLead.created_date).toLocaleDateString()}
                {selectedLead.converted && <Badge className="ml-auto bg-green-100 text-green-800">Converted</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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