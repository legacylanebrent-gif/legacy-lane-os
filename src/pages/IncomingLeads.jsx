import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Mail, Phone, MapPin, Clock, TrendingUp, User, 
  CheckCircle, XCircle, Loader2, Filter, Search
} from 'lucide-react';

export default function IncomingLeads() {
  const [leads, setLeads] = useState([]);
  const [operators, setOperators] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('unassigned');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [formData, setFormData] = useState({
    source: 'email',
    intent: 'estate_sale',
    situation: '',
    property_address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    home_size: '',
    gated_community: false,
    sales_allowed: '',
    amount_to_sell: '',
    interested_in_full_service: '',
    items_to_sell: [],
    timeline: '',
    notes: '',
    score: 50
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [searchQuery, statusFilter, leads]);

  const loadData = async () => {
    try {
      // Load estate sale leads
      const leadsData = await base44.entities.Lead.filter({ intent: 'estate_sale' }, '-created_date');
      setLeads(leadsData);

      // Load estate sale operators
      const users = await base44.entities.User.list();
      const estateOperators = users.filter(u => 
        u.primary_account_type === 'estate_sale_operator' || 
        u.account_types?.includes('estate_sale_operator')
      );
      setOperators(estateOperators);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchQuery) {
      filtered = filtered.filter(lead =>
        lead.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter === 'unassigned') {
      filtered = filtered.filter(lead => !lead.routed_to);
    } else if (statusFilter === 'assigned') {
      filtered = filtered.filter(lead => lead.routed_to && !lead.converted);
    } else if (statusFilter === 'converted') {
      filtered = filtered.filter(lead => lead.converted);
    }

    setFilteredLeads(filtered);
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Lead.create({
        source: formData.source,
        source_details: 'Manual entry via admin',
        intent: 'estate_sale',
        situation: formData.situation || 'standard',
        property_address: formData.property_address,
        home_size: formData.home_size,
        gated_community: formData.gated_community,
        sales_allowed: formData.sales_allowed,
        amount_to_sell: formData.amount_to_sell,
        interested_in_full_service: formData.interested_in_full_service,
        items_to_sell: formData.items_to_sell,
        timeline: formData.timeline,
        score: parseInt(formData.score),
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        notes: formData.notes
      });

      setShowAddModal(false);
      resetForm();
      loadData();
      alert('Lead added successfully!');
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Failed to add lead');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLead = async (leadId, operatorId) => {
    try {
      await base44.entities.Lead.update(leadId, {
        routed_to: operatorId,
        routing_criteria: {
          geography: true,
          manual_assignment: true
        }
      });
      loadData();
      alert('Lead assigned successfully!');
    } catch (error) {
      console.error('Error assigning lead:', error);
      alert('Failed to assign lead');
    }
  };

  const handleMarkConverted = async (leadId) => {
    try {
      await base44.entities.Lead.update(leadId, {
        converted: true,
        conversion_date: new Date().toISOString()
      });
      loadData();
      alert('Lead marked as converted!');
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    }
  };

  const resetForm = () => {
    setFormData({
      source: 'email',
      intent: 'estate_sale',
      situation: '',
      property_address: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      home_size: '',
      gated_community: false,
      sales_allowed: '',
      amount_to_sell: '',
      interested_in_full_service: '',
      items_to_sell: [],
      timeline: '',
      notes: '',
      score: 50
    });
  };

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const unassignedCount = leads.filter(l => !l.routed_to).length;
  const assignedCount = leads.filter(l => l.routed_to && !l.converted).length;
  const convertedCount = leads.filter(l => l.converted).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Incoming Estate Sale Leads</h1>
          <p className="text-slate-600">Manage and distribute leads to operators in their territories</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lead Manually
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                <p className="text-3xl font-bold text-slate-900">{leads.length}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Unassigned</p>
                <p className="text-3xl font-bold text-orange-600">{unassignedCount}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Assigned</p>
                <p className="text-3xl font-bold text-cyan-600">{assignedCount}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Converted</p>
                <p className="text-3xl font-bold text-green-600">{convertedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filters:</span>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="unassigned">Unassigned ({unassignedCount})</TabsTrigger>
                <TabsTrigger value="assigned">Assigned ({assignedCount})</TabsTrigger>
                <TabsTrigger value="converted">Converted ({convertedCount})</TabsTrigger>
                <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {filteredLeads.map(lead => {
          const assignedOperator = operators.find(o => o.id === lead.routed_to);
          
          return (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSituationBadge(lead.situation)}
                      <Badge className={getScoreColor(lead.score)}>
                        Score: {lead.score}
                      </Badge>
                    </div>
                    {lead.converted && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Converted
                      </Badge>
                    )}
                  </div>
                  {!lead.routed_to && !lead.converted && (
                    <Select onValueChange={(operatorId) => handleAssignLead(lead.id, operatorId)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Assign to operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.company_name || op.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.property_address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{lead.property_address}</span>
                  </div>
                )}

                {lead.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700">{lead.contact_name}</span>
                  </div>
                )}

                {lead.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <a href={`mailto:${lead.contact_email}`} className="text-cyan-600 hover:text-cyan-700">
                      {lead.contact_email}
                    </a>
                  </div>
                )}

                {lead.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <a href={`tel:${lead.contact_phone}`} className="text-cyan-600 hover:text-cyan-700">
                      {lead.contact_phone}
                    </a>
                  </div>
                )}

                {lead.estimated_value && (
                  <div className="text-sm">
                    <span className="font-medium text-slate-700">Est. Value:</span>{' '}
                    <span className="text-green-600 font-semibold">
                      ${lead.estimated_value.toLocaleString()}
                    </span>
                  </div>
                )}

                {lead.timeline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700 capitalize">{lead.timeline.replace('_', '-')}</span>
                  </div>
                )}

                {lead.notes && (
                  <div className="text-sm p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Notes:</span>
                    <p className="text-slate-600 mt-1">{lead.notes}</p>
                  </div>
                )}

                {assignedOperator && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-slate-500 mb-1">Assigned to:</div>
                    <div className="font-medium text-slate-900">
                      {assignedOperator.company_name || assignedOperator.full_name}
                    </div>
                  </div>
                )}

                {lead.routed_to && !lead.converted && (
                  <Button
                    onClick={() => handleMarkConverted(lead.id)}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Converted
                  </Button>
                )}

                <div className="text-xs text-slate-500 pt-2 border-t">
                  <span className="font-medium">Source:</span> {lead.source.replace('_', ' ')}
                  {lead.source_details && <span> - {lead.source_details}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No leads found</p>
          </CardContent>
        </Card>
      )}

      {/* Add Lead Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Estate Sale Lead</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddLead} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name *</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label>Source *</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label>Property Address *</Label>
              <Input
                value={formData.property_address}
                onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                placeholder="123 Main St, City, State ZIP"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Situation</Label>
                <Select value={formData.situation} onValueChange={(value) => setFormData({ ...formData, situation: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="probate">Probate</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="downsizing">Downsizing</SelectItem>
                    <SelectItem value="relocation">Relocation</SelectItem>
                    <SelectItem value="foreclosure">Foreclosure</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="estate">Estate</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Timeline</Label>
                <Select value={formData.timeline} onValueChange={(value) => setFormData({ ...formData, timeline: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
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
              <div>
                <Label>Size of Home</Label>
                <Select value={formData.home_size} onValueChange={(value) => setFormData({ ...formData, home_size: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="1-2_bedroom">1-2 Bedroom House</SelectItem>
                    <SelectItem value="3-4_bedroom">3-4 Bedroom House</SelectItem>
                    <SelectItem value="5+_bedroom">5+ Bedroom House</SelectItem>
                    <SelectItem value="apartment_condo">Apartment or Condo</SelectItem>
                    <SelectItem value="storefront_business">Storefront or Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lead Score (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="gated_community"
                  checked={formData.gated_community}
                  onChange={(e) => setFormData({ ...formData, gated_community: e.target.checked, sales_allowed: '' })}
                  className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                />
                <Label htmlFor="gated_community" className="cursor-pointer">Gated Community?</Label>
              </div>

              {formData.gated_community && (
                <div>
                  <Label>Are sales allowed?</Label>
                  <Select value={formData.sales_allowed} onValueChange={(value) => setFormData({ ...formData, sales_allowed: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unsure">Unsure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>How much is to be sold?</Label>
                <Select value={formData.amount_to_sell} onValueChange={(value) => setFormData({ ...formData, amount_to_sell: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (90-100%)</SelectItem>
                    <SelectItem value="most">Most (50-90%)</SelectItem>
                    <SelectItem value="some">Some (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interested in a full service option? Estate Sale, Home Sale, Clean Out</Label>
                <Select value={formData.interested_in_full_service} onValueChange={(value) => setFormData({ ...formData, interested_in_full_service: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="unsure">Unsure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>What will you be selling?</Label>
              <div className="grid grid-cols-3 gap-3 mt-2 p-4 border rounded-lg bg-slate-50">
                {['Furniture', 'Clothing', 'Decor', 'Collectables', 'Antiques', 'Art', 'Vehicles', 'Tools', 'Appliances', 'Electronics', 'Other', "I don't know"].map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`item_${item}`}
                      checked={formData.items_to_sell.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, items_to_sell: [...formData.items_to_sell, item] });
                        } else {
                          setFormData({ ...formData, items_to_sell: formData.items_to_sell.filter(i => i !== item) });
                        }
                      }}
                      className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                    />
                    <Label htmlFor={`item_${item}`} className="cursor-pointer text-sm">{item}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details about the lead..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                Add Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}