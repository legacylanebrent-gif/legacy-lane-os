import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, Phone, MapPin, Clock, TrendingUp, User,
  CheckCircle, Search, Users, AlertCircle, Plus, DollarSign, Gift
} from 'lucide-react';

const PIPELINE_STAGES = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closing', label: 'Closing' }
];

const getScoreColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-100';
  if (score >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export default function Leads() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const [hasEnterprisePackage, setHasEnterprisePackage] = useState(false);

  // Leads (assigned to this operator)
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralLead, setReferralLead] = useState(null);

  // Pipeline (deals linked to this operator's leads)
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    
    // Check if user has Enterprise Package subscription
    const subscriptions = await base44.entities.Subscription.filter({ user_id: me.id, status: 'active' });
    const hasEnterprise = subscriptions.some(sub => sub.package_type === 'Enterprise' || sub.package_name?.includes('Enterprise'));
    setHasEnterprisePackage(hasEnterprise);
    
    loadLeads(me.id);
    loadDeals(me.id);
  };

  const loadLeads = async (userId) => {
    setLoading(true);
    // Only leads assigned to this operator
    const data = await base44.entities.Lead.filter({ routed_to: userId }, '-created_date');
    setLeads(data);
    setLoading(false);
  };

  const loadDeals = async (userId) => {
    setDealsLoading(true);
    // Deals where assigned_owner matches this user
    const allDeals = await base44.entities.Deal.filter({ stage: { $ne: 'lost' } });
    // Filter to deals owned by this user
    setDeals(allDeals.filter(d => d.assigned_owner === userId || d.assigned_owner === user?.email));
    setDealsLoading(false);
  };

  const activeCount = leads.filter(l => l.routed_to && !l.converted).length;
  const convertedCount = leads.filter(l => l.converted).length;
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  const filteredLeads = leads.filter(lead => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      lead.property_address?.toLowerCase().includes(q) ||
      lead.contact_name?.toLowerCase().includes(q) ||
      lead.contact_email?.toLowerCase().includes(q);
    if (filter === 'active') return matchesSearch && !lead.converted;
    if (filter === 'converted') return matchesSearch && lead.converted;
    return matchesSearch;
  });

  const handleMarkConverted = async (leadId) => {
    await base44.entities.Lead.update(leadId, {
      converted: true,
      conversion_date: new Date().toISOString()
    });
    setShowDetail(false);
    loadLeads(user.id);
  };

  const handleAcceptReferral = async (leadId) => {
    await base44.entities.Lead.update(leadId, {
      referral_status: 'pending',
      referral_accepted_at: new Date().toISOString()
    });
    setShowReferralModal(false);
    setShowDetail(false);
    loadLeads(user.id);
  };

  const getDealsByStage = (stage) => deals.filter(d => d.stage === stage);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">My Lead Center</h1>
        <p className="text-slate-600">Leads assigned to you and your active deal pipeline</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="leads">Assigned Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
        </TabsList>

        {/* ===== LEADS TAB ===== */}
        <TabsContent value="leads" className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Total Assigned</p><p className="text-3xl font-bold">{leads.length}</p></div><div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-slate-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Active</p><p className="text-3xl font-bold text-cyan-600">{activeCount}</p></div><div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center"><User className="w-5 h-5 text-cyan-600" /></div></CardContent></Card>
            <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Converted</p><p className="text-3xl font-bold text-green-600">{convertedCount}</p></div><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div></CardContent></Card>
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
                <TabsTrigger value="converted">Converted ({convertedCount})</TabsTrigger>
                <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {/* Lead Cards */}
          {loading ? (
            <div className="animate-pulse h-48 bg-slate-100 rounded-lg" />
          ) : filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No leads assigned to you yet</p>
                <p className="text-slate-400 text-sm mt-1">Leads are assigned by the admin team from paid advertising</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeads.map(lead => (
                <Card key={lead.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedLead(lead); setShowDetail(true); }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg ${getScoreColor(lead.score || 0)}`}>
                        {lead.score || 0}
                      </div>
                      <div className="text-right">
                        {lead.converted
                          ? <Badge className="bg-green-100 text-green-800">Converted</Badge>
                          : <Badge className="bg-cyan-100 text-cyan-800">Active</Badge>}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm mb-3">
                      {lead.contact_name && <div className="flex items-center gap-2 font-medium"><User className="w-3.5 h-3.5 text-slate-400" />{lead.contact_name}</div>}
                      {lead.contact_email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><a href={`mailto:${lead.contact_email}`} onClick={e => e.stopPropagation()} className="text-cyan-600 hover:underline truncate">{lead.contact_email}</a></div>}
                      {lead.contact_phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><a href={`tel:${lead.contact_phone}`} onClick={e => e.stopPropagation()} className="text-cyan-600 hover:underline">{lead.contact_phone}</a></div>}
                      {lead.property_address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" /><span className="text-slate-600 line-clamp-1">{lead.property_address}</span></div>}
                    </div>

                    {(lead.estimated_value || lead.timeline) && (
                      <div className="space-y-2 text-xs border-t pt-2">
                        {lead.estimated_value && (
                          <>
                            <div className="flex justify-between"><span className="text-slate-500">Lead Fee:</span><span className={hasEnterprisePackage ? 'text-green-600 font-semibold line-through' : 'text-red-600 font-semibold'}>$75</span>{hasEnterprisePackage && <span className="text-green-600 font-semibold text-xs">WAIVED</span>}</div>
                            <div className="flex justify-between"><span className="text-slate-500">Refer Lead and Earn Approx:</span><span className="text-amber-600 font-semibold">${(lead.estimated_value * 0.02 * 0.25 * 0.30).toLocaleString('en-US', {maximumFractionDigits: 0})}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Timeline:</span><span className="capitalize">{lead.timeline?.replace(/_/g, ' ') || 'N/A'}</span></div>
                          </>
                        )}
                        {!lead.estimated_value && lead.timeline && <div className="flex justify-between"><span className="text-slate-500">Timeline:</span><span className="capitalize">{lead.timeline.replace(/_/g, ' ')}</span></div>}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-slate-400">
                      <span className="capitalize">{lead.intent?.replace(/_/g, ' ')}</span>
                      <span>{new Date(lead.created_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== PIPELINE TAB ===== */}
        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-600">{deals.length} active deals • <span className="font-semibold text-green-700">${totalDealValue.toLocaleString()}</span> total value</p>
            <Button className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" />New Deal</Button>
          </div>

          {dealsLoading ? (
            <div className="animate-pulse h-64 bg-slate-100 rounded-lg" />
          ) : deals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No active deals in your pipeline</p>
                <p className="text-slate-400 text-sm mt-1">Deals appear here once leads are converted and tracked</p>
              </CardContent>
            </Card>
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

      {/* Referral Acceptance Modal */}
      <Dialog open={showReferralModal} onOpenChange={setShowReferralModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Referral Agreement</DialogTitle></DialogHeader>
          {referralLead && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm"><span className="font-semibold">Client:</span> {referralLead.contact_name}</p>
                <p className="text-sm"><span className="font-semibold">Property:</span> {referralLead.property_address}</p>
                <p className="text-sm"><span className="font-semibold">Est. Value:</span> ${referralLead.estimated_value?.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 mb-2">Your Finder Fee</p>
                <p className="text-2xl font-bold text-amber-700 mb-3">${(referralLead.estimated_value * 0.02 * 0.25 * 0.30).toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                <p className="text-xs text-amber-800">This fee is paid upon closing when the client purchases a home through our realtor network. EstateSalen.com acts as the licensed referral agent.</p>
              </div>
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p>✓ $75 lead fee required to accept and book this lead</p>
                <p>✓ If you refer this client to a realtor and the property closes, the $75 lead fee is waived</p>
                <p>✓ Finder fee applies if referral converts to actual closing: approximately $513 is based on property value. Could be more or less depending on final sale value</p>
                <p>✓ You receive payment approximately 7 days after property closes</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowReferralModal(false)} className="flex-1">Cancel</Button>
                <Button 
                  onClick={() => handleAcceptReferral(referralLead.id)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  <Gift className="w-4 h-4 mr-2" />Accept Terms
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lead Detail Modal */}
      <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setSelectedLead(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
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
                {selectedLead.contact_email && <div><p className="text-xs text-slate-500 mb-0.5">Email</p><a href={`mailto:${selectedLead.contact_email}`} className="text-cyan-600 hover:underline break-all">{selectedLead.contact_email}</a></div>}
                {selectedLead.contact_phone && <div><p className="text-xs text-slate-500 mb-0.5">Phone</p><a href={`tel:${selectedLead.contact_phone}`} className="text-cyan-600 hover:underline">{selectedLead.contact_phone}</a></div>}
                {selectedLead.timeline && <div><p className="text-xs text-slate-500 mb-0.5">Timeline</p><p className="capitalize">{selectedLead.timeline.replace(/_/g, ' ')}</p></div>}
                {selectedLead.estimated_value && <div><p className="text-xs text-slate-500 mb-0.5">Est. Value</p><p className="text-green-600 font-semibold">${selectedLead.estimated_value.toLocaleString()}</p></div>}
                {selectedLead.situation && <div><p className="text-xs text-slate-500 mb-0.5">Situation</p><p className="capitalize">{selectedLead.situation}</p></div>}
                {selectedLead.home_size && <div><p className="text-xs text-slate-500 mb-0.5">Home Size</p><p className="capitalize">{selectedLead.home_size.replace(/_/g, ' ')}</p></div>}
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

              {selectedLead.referral_eligible && selectedLead.referral_status === 'no_referral' && selectedLead.estimated_value && (
               <div className="space-y-3 p-3 bg-amber-50 border-l-4 border-l-amber-500 rounded-lg">
                 <div>
                   <p className="font-semibold text-amber-900 text-sm mb-2">Potential Finder Fee</p>
                   <p className="text-sm text-amber-800 mb-3">If you refer this client to a realtor and they successfully list and close the property, you could earn a finder fee of approximately <span className="font-bold">${(selectedLead.estimated_value * 0.02 * 0.25 * 0.30).toLocaleString('en-US', {maximumFractionDigits: 0})}</span>. We handle the entire referral process with the realtor and you get paid 7 days after the property closes.</p>
                 </div>
                 <div className="space-y-2 p-3 bg-white rounded-lg text-xs text-slate-600 border border-amber-200">
                   {!hasEnterprisePackage && <p>✓ $75 lead fee required to accept and book this lead</p>}
                   {hasEnterprisePackage && <p className="text-green-600 font-semibold">✓ Lead fee waived (Enterprise Package)</p>}
                   <p>✓ If you refer this client to a realtor and the property closes, the $75 lead fee is waived</p>
                   <p>✓ Finder fee applies if referral converts to actual closing: approximately $513 is based on property value. Could be more or less depending on final sale value</p>
                   <p>✓ You receive payment approximately 7 days after property closes</p>
                 </div>
                 <Button 
                   onClick={() => { setReferralLead(selectedLead); setShowReferralModal(true); }}
                   className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                 >
                   <Gift className="w-4 h-4 mr-2" />Accept Lead Fee and Referral Terms
                 </Button>
               </div>
              )}

              {selectedLead.referral_status === 'pending' && !selectedLead.converted && (
               <Button onClick={() => handleMarkConverted(selectedLead.id)} className="w-full bg-green-600 hover:bg-green-700">
                 <CheckCircle className="w-4 h-4 mr-2" />Mark as Converted
               </Button>
              )}

              <div className="flex items-center gap-2 pt-2 border-t text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                Assigned {new Date(selectedLead.created_date).toLocaleDateString()}
                {selectedLead.converted && <Badge className="ml-auto bg-green-100 text-green-800">Converted</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}