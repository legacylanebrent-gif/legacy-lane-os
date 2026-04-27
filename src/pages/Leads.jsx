import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Mail, Phone, MapPin, Clock, TrendingUp, User,
  CheckCircle, Loader2, Search, Users, AlertCircle, DollarSign
} from 'lucide-react';
import LeadCard from '@/components/leads/LeadCard';
import LeadRoutingModal from '@/components/leads/LeadRoutingModal';

const PIPELINE_STAGES = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closing', label: 'Closing' }
];

const SITUATION_CONFIG = {
  probate: { label: 'Probate', className: 'bg-purple-100 text-purple-700' },
  divorce: { label: 'Divorce', className: 'bg-red-100 text-red-700' },
  downsizing: { label: 'Downsizing', className: 'bg-blue-100 text-blue-700' },
  relocation: { label: 'Relocation', className: 'bg-cyan-100 text-cyan-700' },
  foreclosure: { label: 'Foreclosure', className: 'bg-orange-100 text-orange-700' },
  investment: { label: 'Investment', className: 'bg-green-100 text-green-700' },
  estate: { label: 'Estate', className: 'bg-amber-100 text-amber-700' },
  standard: { label: 'Standard', className: 'bg-slate-100 text-slate-700' }
};

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export default function Leads() {
  const [activeTab, setActiveTab] = useState('leads');

  // Unified leads state
  const [leads, setLeads] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('assigned');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pipeline state
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  const [formData, setFormData] = useState({
    source: 'email', intent: 'estate_sale', situation: '',
    property_address: '', contact_name: '', contact_email: '',
    contact_phone: '', home_size: '', gated_community: false,
    sales_allowed: '', amount_to_sell: '', interested_in_full_service: '',
    items_to_sell: [], timeline: '', notes: '', score: 50
  });

  useEffect(() => { loadData(); loadDeals(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [leadsData, users] = await Promise.all([
      base44.entities.Lead.list('-created_date'),
      base44.entities.User.list()
    ]);
    setLeads(leadsData);
    setOperators(users.filter(u =>
      u.primary_account_type === 'estate_sale_operator' ||
      u.account_types?.includes('estate_sale_operator')
    ));
    setLoading(false);
  };

  const loadDeals = async () => {
    setDealsLoading(true);
    const data = await base44.entities.Deal.filter({ stage: { $ne: 'lost' } });
    setDeals(data);
    setDealsLoading(false);
  };

  // Stats
  const unassignedCount = leads.filter(l => !l.routed_to && !l.converted).length;
  const assignedCount = leads.filter(l => l.routed_to && !l.converted).length;
  const convertedCount = leads.filter(l => l.converted).length;

  const filteredLeads = leads.filter(lead => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      lead.property_address?.toLowerCase().includes(q) ||
      lead.contact_name?.toLowerCase().includes(q) ||
      lead.contact_email?.toLowerCase().includes(q) ||
      lead.source?.toLowerCase().includes(q);
    if (filter === 'unassigned') return matchesSearch && !lead.routed_to && !lead.converted;
    if (filter === 'assigned') return matchesSearch && lead.routed_to && !lead.converted;
    if (filter === 'converted') return matchesSearch && lead.converted;
    return matchesSearch;
  });

  const handleAddLead = async (e) => {
    e.preventDefault();
    await base44.entities.Lead.create({
      ...formData,
      source_details: 'Manual entry via admin',
      intent: 'estate_sale',
      situation: formData.situation || 'standard',
      score: parseInt(formData.score)
    });
    setShowAddModal(false);
    setFormData({
      source: 'email', intent: 'estate_sale', situation: '',
      property_address: '', contact_name: '', contact_email: '',
      contact_phone: '', home_size: '', gated_community: false,
      sales_allowed: '', amount_to_sell: '', interested_in_full_service: '',
      items_to_sell: [], timeline: '', notes: '', score: 50
    });
    loadData();
  };

  const handleAssignLead = async (leadId, operatorId) => {
    await base44.entities.Lead.update(leadId, {
      routed_to: operatorId,
      routing_criteria: { geography: true, manual_assignment: true }
    });
    loadData();
  };

  const handleMarkConverted = async (leadId) => {
    await base44.entities.Lead.update(leadId, {
      converted: true,
      conversion_date: new Date().toISOString()
    });
    loadData();
  };

  const getDealsByStage = (stage) => deals.filter(d => d.stage === stage);
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">Lead Center</h1>
        <p className="text-slate-600">Manage leads, assignments, and deal pipeline</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
        </TabsList>

        {/* ===== LEADS TAB ===== */}
        <TabsContent value="leads" className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Total</p><p className="text-3xl font-bold">{leads.length}</p></div><div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-slate-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Unassigned</p><p className="text-3xl font-bold text-orange-600">{unassignedCount}</p></div><div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><AlertCircle className="w-5 h-5 text-orange-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Assigned</p><p className="text-3xl font-bold text-cyan-600">{assignedCount}</p></div><div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-cyan-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Converted</p><p className="text-3xl font-bold text-green-600">{convertedCount}</p></div><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div></CardContent></Card>
          </div>

          {/* Filters + Search + Add */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="assigned">Assigned ({assignedCount})</TabsTrigger>
                <TabsTrigger value="unassigned">Unassigned ({unassignedCount})</TabsTrigger>
                <TabsTrigger value="converted">Converted ({convertedCount})</TabsTrigger>
                <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={() => setShowAddModal(true)} className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />Add Lead
            </Button>
          </div>

          {/* Lead Cards */}
          {loading ? (
            <div className="animate-pulse h-48 bg-slate-100 rounded-lg" />
          ) : filteredLeads.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Users className="w-16 h-16 mx-auto text-slate-300 mb-4" /><p className="text-slate-500">No leads found</p></CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeads.map(lead => {
                const assignedOperator = operators.find(o => o.id === lead.routed_to);
                return (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    assignedOperator={assignedOperator}
                    operators={operators}
                    onRoute={(l) => { setSelectedLead(l); setShowRoutingModal(true); }}
                    onAssign={handleAssignLead}
                    onMarkConverted={handleMarkConverted}
                    onClick={() => { setSelectedLead(lead); setShowLeadDetail(true); }}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== PIPELINE TAB ===== */}
        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-600">{deals.length} active deals • <span className="font-semibold">${totalDealValue.toLocaleString()}</span> total value</p>
            <Button className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" />New Deal</Button>
          </div>
          {dealsLoading ? (
            <div className="animate-pulse h-64 bg-slate-100 rounded-lg" />
          ) : (
            <div className="grid lg:grid-cols-5 gap-4">
              {PIPELINE_STAGES.map(stage => {
                const stageDeals = getDealsByStage(stage.value);
                const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                return (
                  <div key={stage.value} className="space-y-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <span>{stage.label}</span>
                          <Badge variant="outline">{stageDeals.length}</Badge>
                        </CardTitle>
                        <div className="text-xl font-bold text-slate-900">${stageValue.toLocaleString()}</div>
                      </CardHeader>
                    </Card>
                    <div className="space-y-3">
                      {stageDeals.map(deal => (
                        <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{deal.name}</h3>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-lg font-bold text-orange-600">${deal.value?.toLocaleString() || 0}</span>
                              {deal.probability && <Badge variant="outline" className="text-xs">{deal.probability}%</Badge>}
                            </div>
                            {deal.expected_close_date && (
                              <p className="text-xs text-slate-500 mt-2">Close: {new Date(deal.expected_close_date).toLocaleDateString()}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Modal */}
      <Dialog open={showLeadDetail} onOpenChange={(open) => { setShowLeadDetail(open); if (!open) setSelectedLead(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">Lead Details</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${getScoreColor(selectedLead.score || 0)}`}>
                  {selectedLead.score || 0}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 capitalize">{selectedLead.intent?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-slate-500 capitalize">{selectedLead.source?.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedLead.contact_name && <div><p className="text-xs text-slate-500 mb-0.5">Name</p><p className="font-medium">{selectedLead.contact_name}</p></div>}
                {selectedLead.contact_email && <div><p className="text-xs text-slate-500 mb-0.5">Email</p><a href={`mailto:${selectedLead.contact_email}`} className="font-medium text-cyan-600 hover:underline break-all">{selectedLead.contact_email}</a></div>}
                {selectedLead.contact_phone && <div><p className="text-xs text-slate-500 mb-0.5">Phone</p><a href={`tel:${selectedLead.contact_phone}`} className="font-medium text-cyan-600 hover:underline">{selectedLead.contact_phone}</a></div>}
                {selectedLead.timeline && <div><p className="text-xs text-slate-500 mb-0.5">Timeline</p><p className="font-medium capitalize">{selectedLead.timeline.replace(/_/g, ' ')}</p></div>}
                {selectedLead.estimated_value && <div><p className="text-xs text-slate-500 mb-0.5">Est. Value</p><p className="font-medium text-green-600">${selectedLead.estimated_value.toLocaleString()}</p></div>}
                {selectedLead.situation && <div><p className="text-xs text-slate-500 mb-0.5">Situation</p><p className="font-medium capitalize">{selectedLead.situation}</p></div>}
                {selectedLead.home_size && <div><p className="text-xs text-slate-500 mb-0.5">Home Size</p><p className="font-medium capitalize">{selectedLead.home_size.replace(/_/g, ' ')}</p></div>}
              </div>

              {selectedLead.property_address && (
                <div className="flex items-start gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span>{selectedLead.property_address}</span>
                </div>
              )}

              {selectedLead.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-slate-600">{selectedLead.notes}</p>
                </div>
              )}

              {/* Assign operator if unassigned */}
              {!selectedLead.routed_to && !selectedLead.converted && (
                <div>
                  <p className="text-sm font-medium mb-1">Assign to Operator</p>
                  <Select onValueChange={(operatorId) => { handleAssignLead(selectedLead.id, operatorId); setShowLeadDetail(false); }}>
                    <SelectTrigger><SelectValue placeholder="Select operator..." /></SelectTrigger>
                    <SelectContent>
                      {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedLead.routed_to && !selectedLead.converted && (
                <Button onClick={() => { handleMarkConverted(selectedLead.id); setShowLeadDetail(false); }} className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />Mark as Converted
                </Button>
              )}

              <div className="flex items-center gap-2 pt-2 border-t text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                Added {new Date(selectedLead.created_date).toLocaleDateString()}
                {selectedLead.routed_to && !selectedLead.converted && <Badge className="ml-auto bg-cyan-100 text-cyan-800">Assigned</Badge>}
                {selectedLead.converted && <Badge className="ml-auto bg-green-100 text-green-800">Converted</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Routing Modal */}
      {showRoutingModal && selectedLead && (
        <LeadRoutingModal
          lead={selectedLead}
          onClose={() => { setShowRoutingModal(false); setSelectedLead(null); }}
          onSuccess={() => { setShowRoutingModal(false); setSelectedLead(null); loadData(); }}
        />
      )}

      {/* Add Lead Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl">Add Estate Sale Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name *</Label><Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} placeholder="John Doe" required /></div>
              <div><Label>Source *</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="advertising">Advertising</SelectItem>
                    <SelectItem value="organic">Organic/Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="john@example.com" /></div>
              <div><Label>Phone</Label><Input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="(555) 123-4567" /></div>
            </div>
            <div><Label>Property Address *</Label><Input value={formData.property_address} onChange={(e) => setFormData({ ...formData, property_address: e.target.value })} placeholder="123 Main St, City, State ZIP" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Situation</Label>
                <Select value={formData.situation} onValueChange={(v) => setFormData({ ...formData, situation: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {['probate','divorce','downsizing','relocation','foreclosure','investment','estate','standard'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Timeline</Label>
                <Select value={formData.timeline} onValueChange={(v) => setFormData({ ...formData, timeline: v })}>
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
              <div><Label>Size of Home</Label>
                <Select value={formData.home_size} onValueChange={(v) => setFormData({ ...formData, home_size: v })}>
                  <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2_bedroom">1-2 Bedroom</SelectItem>
                    <SelectItem value="3-4_bedroom">3-4 Bedroom</SelectItem>
                    <SelectItem value="5+_bedroom">5+ Bedroom</SelectItem>
                    <SelectItem value="apartment_condo">Apartment/Condo</SelectItem>
                    <SelectItem value="storefront_business">Storefront/Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Lead Score (0-100)</Label><Input type="number" min="0" max="100" value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} /></div>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="gated" checked={formData.gated_community} onChange={(e) => setFormData({ ...formData, gated_community: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="gated" className="cursor-pointer">Gated Community?</Label>
            </div>
            {formData.gated_community && (
              <div><Label>Are sales allowed?</Label>
                <Select value={formData.sales_allowed} onValueChange={(v) => setFormData({ ...formData, sales_allowed: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="unsure">Unsure</SelectItem></SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional details..." rows={3} />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Add Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}