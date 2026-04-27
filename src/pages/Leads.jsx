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
  CheckCircle, XCircle, Loader2, Filter, Search, Users, AlertCircle, DollarSign
} from 'lucide-react';
import LeadCard from '@/components/leads/LeadCard';
import LeadRoutingModal from '@/components/leads/LeadRoutingModal';

const PIPELINE_STAGES = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-slate-100 text-slate-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-800' },
  { value: 'closing', label: 'Closing', color: 'bg-green-100 text-green-800' }
];

export default function Leads() {
  const [activeTab, setActiveTab] = useState('leads');

  // --- Leads tab state ---
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsFilter, setLeadsFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showRoutingModal, setShowRoutingModal] = useState(false);

  // --- Pipeline tab state ---
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  // --- Incoming Leads tab state ---
  const [incomingLeads, setIncomingLeads] = useState([]);
  const [operators, setOperators] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [incomingSearch, setIncomingSearch] = useState('');
  const [incomingFilter, setIncomingFilter] = useState('unassigned');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    source: 'email', intent: 'estate_sale', situation: '',
    property_address: '', contact_name: '', contact_email: '',
    contact_phone: '', home_size: '', gated_community: false,
    sales_allowed: '', amount_to_sell: '', interested_in_full_service: '',
    items_to_sell: [], timeline: '', notes: '', score: 50
  });

  useEffect(() => { loadLeads(); loadDeals(); loadIncomingData(); }, []);

  // ---- Leads ----
  const loadLeads = async () => {
    setLeadsLoading(true);
    const data = await base44.entities.Lead.list('-created_date');
    setLeads(data);
    setLeadsLoading(false);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = leadsSearch.trim() === '' ||
      lead.property_address?.toLowerCase().includes(leadsSearch.toLowerCase()) ||
      lead.source?.toLowerCase().includes(leadsSearch.toLowerCase());
    if (leadsFilter === 'unassigned') return matchesSearch && !lead.routed_to;
    if (leadsFilter === 'converted') return matchesSearch && lead.converted;
    return matchesSearch;
  });

  const leadsStats = {
    total: leads.length,
    unassigned: leads.filter(l => !l.routed_to).length,
    converted: leads.filter(l => l.converted).length,
    avgScore: Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / (leads.length || 1))
  };

  // ---- Pipeline ----
  const loadDeals = async () => {
    setDealsLoading(true);
    const data = await base44.entities.Deal.filter({ stage: { $ne: 'lost' } });
    setDeals(data);
    setDealsLoading(false);
  };

  const getDealsByStage = (stage) => deals.filter(d => d.stage === stage);
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  // ---- Incoming Leads ----
  const loadIncomingData = async () => {
    setIncomingLoading(true);
    const leadsData = await base44.entities.Lead.filter({ intent: 'estate_sale' }, '-created_date');
    setIncomingLeads(leadsData);
    const users = await base44.entities.User.list();
    setOperators(users.filter(u =>
      u.primary_account_type === 'estate_sale_operator' ||
      u.account_types?.includes('estate_sale_operator')
    ));
    setIncomingLoading(false);
  };

  const filteredIncoming = incomingLeads.filter(lead => {
    const matchesSearch = !incomingSearch ||
      lead.property_address?.toLowerCase().includes(incomingSearch.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(incomingSearch.toLowerCase()) ||
      lead.contact_email?.toLowerCase().includes(incomingSearch.toLowerCase());
    if (incomingFilter === 'unassigned') return matchesSearch && !lead.routed_to;
    if (incomingFilter === 'assigned') return matchesSearch && lead.routed_to && !lead.converted;
    if (incomingFilter === 'converted') return matchesSearch && lead.converted;
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
    resetForm();
    loadIncomingData();
  };

  const handleAssignLead = async (leadId, operatorId) => {
    await base44.entities.Lead.update(leadId, {
      routed_to: operatorId,
      routing_criteria: { geography: true, manual_assignment: true }
    });
    loadIncomingData();
  };

  const handleMarkConverted = async (leadId) => {
    await base44.entities.Lead.update(leadId, {
      converted: true,
      conversion_date: new Date().toISOString()
    });
    loadIncomingData();
  };

  const resetForm = () => setFormData({
    source: 'email', intent: 'estate_sale', situation: '',
    property_address: '', contact_name: '', contact_email: '',
    contact_phone: '', home_size: '', gated_community: false,
    sales_allowed: '', amount_to_sell: '', interested_in_full_service: '',
    items_to_sell: [], timeline: '', notes: '', score: 50
  });

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSituationBadge = (situation) => {
    const configs = {
      probate: { label: 'Probate', className: 'bg-purple-100 text-purple-700' },
      divorce: { label: 'Divorce', className: 'bg-red-100 text-red-700' },
      downsizing: { label: 'Downsizing', className: 'bg-blue-100 text-blue-700' },
      relocation: { label: 'Relocation', className: 'bg-cyan-100 text-cyan-700' },
      foreclosure: { label: 'Foreclosure', className: 'bg-orange-100 text-orange-700' },
      investment: { label: 'Investment', className: 'bg-green-100 text-green-700' },
      estate: { label: 'Estate', className: 'bg-amber-100 text-amber-700' },
      standard: { label: 'Standard', className: 'bg-slate-100 text-slate-700' }
    };
    const config = configs[situation] || configs.standard;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const unassignedCount = incomingLeads.filter(l => !l.routed_to).length;
  const assignedCount = incomingLeads.filter(l => l.routed_to && !l.converted).length;
  const convertedCount = incomingLeads.filter(l => l.converted).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">Lead Center</h1>
        <p className="text-slate-600">Manage leads, pipeline, and incoming estate sale requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="leads">Lead Intelligence</TabsTrigger>
          <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
          <TabsTrigger value="incoming">Incoming Leads</TabsTrigger>
        </TabsList>

        {/* ===== LEADS TAB ===== */}
        <TabsContent value="leads" className="mt-6 space-y-6">
          <div className="grid sm:grid-cols-4 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle><Users className="h-5 w-5 text-blue-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{leadsStats.total}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-600">Unassigned</CardTitle><AlertCircle className="h-5 w-5 text-amber-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{leadsStats.unassigned}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-600">Converted</CardTitle><CheckCircle className="h-5 w-5 text-green-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{leadsStats.converted}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-slate-600">Avg Score</CardTitle><TrendingUp className="h-5 w-5 text-purple-600" /></CardHeader><CardContent><div className="text-3xl font-bold">{leadsStats.avgScore}</div></CardContent></Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Search leads..." value={leadsSearch} onChange={(e) => setLeadsSearch(e.target.value)} className="pl-10" />
          </div>

          <Tabs value={leadsFilter} onValueChange={setLeadsFilter}>
            <TabsList>
              <TabsTrigger value="all">All ({leadsStats.total})</TabsTrigger>
              <TabsTrigger value="unassigned">Unassigned ({leadsStats.unassigned})</TabsTrigger>
              <TabsTrigger value="converted">Converted ({leadsStats.converted})</TabsTrigger>
            </TabsList>
            <TabsContent value={leadsFilter} className="mt-6">
              {leadsLoading ? (
                <div className="animate-pulse h-48 bg-slate-100 rounded-lg" />
              ) : filteredLeads.length === 0 ? (
                <Card className="p-12 text-center"><Users className="w-16 h-16 mx-auto text-slate-300 mb-4" /><p className="text-slate-500">No leads found</p></Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onRoute={(l) => { setSelectedLead(l); setShowRoutingModal(true); }} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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

        {/* ===== INCOMING LEADS TAB ===== */}
        <TabsContent value="incoming" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-600">Manage and distribute estate sale leads to operators</p>
            <Button onClick={() => setShowAddModal(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />Add Lead Manually
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Total</p><p className="text-3xl font-bold">{incomingLeads.length}</p></div><div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-slate-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Unassigned</p><p className="text-3xl font-bold text-orange-600">{unassignedCount}</p></div><div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><Loader2 className="w-5 h-5 text-orange-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Assigned</p><p className="text-3xl font-bold text-cyan-600">{assignedCount}</p></div><div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-cyan-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Converted</p><p className="text-3xl font-bold text-green-600">{convertedCount}</p></div><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <Tabs value={incomingFilter} onValueChange={setIncomingFilter}>
                  <TabsList>
                    <TabsTrigger value="unassigned">Unassigned ({unassignedCount})</TabsTrigger>
                    <TabsTrigger value="assigned">Assigned ({assignedCount})</TabsTrigger>
                    <TabsTrigger value="converted">Converted ({convertedCount})</TabsTrigger>
                    <TabsTrigger value="all">All ({incomingLeads.length})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input placeholder="Search leads..." value={incomingSearch} onChange={(e) => setIncomingSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {incomingLoading ? (
            <div className="animate-pulse h-64 bg-slate-100 rounded-lg" />
          ) : filteredIncoming.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">No leads found</p></CardContent></Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {filteredIncoming.map(lead => {
                const assignedOperator = operators.find(o => o.id === lead.routed_to);
                return (
                  <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSituationBadge(lead.situation)}
                            <Badge className={getScoreColor(lead.score)}>Score: {lead.score}</Badge>
                          </div>
                          {lead.converted && <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Converted</Badge>}
                        </div>
                        {!lead.routed_to && !lead.converted && (
                          <Select onValueChange={(operatorId) => handleAssignLead(lead.id, operatorId)}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="Assign to operator..." /></SelectTrigger>
                            <SelectContent>
                              {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lead.property_address && <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" /><span>{lead.property_address}</span></div>}
                      {lead.contact_name && <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-slate-500" /><span>{lead.contact_name}</span></div>}
                      {lead.contact_email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-slate-500" /><a href={`mailto:${lead.contact_email}`} className="text-cyan-600 hover:text-cyan-700">{lead.contact_email}</a></div>}
                      {lead.contact_phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-slate-500" /><a href={`tel:${lead.contact_phone}`} className="text-cyan-600 hover:text-cyan-700">{lead.contact_phone}</a></div>}
                      {lead.estimated_value && <div className="text-sm"><span className="font-medium">Est. Value:</span> <span className="text-green-600 font-semibold">${lead.estimated_value.toLocaleString()}</span></div>}
                      {lead.timeline && <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-slate-500" /><span className="capitalize">{lead.timeline.replace('_', '-')}</span></div>}
                      {lead.notes && <div className="text-sm p-3 bg-slate-50 rounded-lg"><span className="font-medium">Notes:</span><p className="text-slate-600 mt-1">{lead.notes}</p></div>}
                      {assignedOperator && <div className="pt-3 border-t"><div className="text-xs text-slate-500 mb-1">Assigned to:</div><div className="font-medium">{assignedOperator.company_name || assignedOperator.full_name}</div></div>}
                      {lead.routed_to && !lead.converted && (
                        <Button onClick={() => handleMarkConverted(lead.id)} size="sm" className="w-full bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />Mark as Converted
                        </Button>
                      )}
                      <div className="text-xs text-slate-500 pt-2 border-t">
                        <span className="font-medium">Source:</span> {lead.source?.replace('_', ' ')}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Routing Modal */}
      {showRoutingModal && selectedLead && (
        <LeadRoutingModal
          lead={selectedLead}
          onClose={() => { setShowRoutingModal(false); setSelectedLead(null); }}
          onSuccess={() => { setShowRoutingModal(false); setSelectedLead(null); loadLeads(); }}
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