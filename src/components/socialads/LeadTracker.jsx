import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, RefreshCw, CheckCircle2, Circle, Clock, X, Phone, Mail, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const STAGES = ['new', 'contacted', 'qualified', 'appointment', 'converted', 'lost'];
const STAGE_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  appointment: 'bg-orange-100 text-orange-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

export default function LeadTracker({ user }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Lead.filter({ source: 'social_ads' }, '-created_date', 50);
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (leadId, stage) => {
    await base44.entities.Lead.update(leadId, { referral_status: stage === 'converted' ? 'paid' : 'no_referral', converted: stage === 'converted' });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, _stage: stage } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => ({ ...prev, _stage: stage }));
  };

  const saveNote = async () => {
    if (!note.trim() || !selectedLead) return;
    setSaving(true);
    const updatedNotes = `${selectedLead.notes || ''}\n[${format(new Date(), 'MM/dd/yyyy HH:mm')}] ${note}`.trim();
    await base44.entities.Lead.update(selectedLead.id, { notes: updatedNotes });
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes } : l));
    setSelectedLead(prev => ({ ...prev, notes: updatedNotes }));
    setNote('');
    setSaving(false);
  };

  const filtered = leads
    .filter(l => stageFilter === 'all' || (l._stage || 'new') === stageFilter)
    .filter(l => !search || l.contact_name?.toLowerCase().includes(search.toLowerCase()) || l.contact_email?.toLowerCase().includes(search.toLowerCase()));

  const conversionRate = leads.length > 0 ? ((leads.filter(l => l.converted).length / leads.length) * 100).toFixed(1) : 0;
  const totalRevenue = leads.reduce((s, l) => s + (l.revenue_generated || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total FB Leads', value: leads.length, icon: Users, color: 'text-blue-700 bg-blue-50' },
          { label: 'Converted', value: leads.filter(l => l.converted).length, icon: CheckCircle2, color: 'text-green-700 bg-green-50' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: DollarSign, color: 'text-orange-700 bg-orange-50' },
          { label: 'Revenue Generated', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-700 bg-purple-50' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-xl font-bold text-slate-900">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-700" /> Lead Pipeline</span>
            <Button variant="outline" size="sm" onClick={loadLeads}><RefreshCw className="w-4 h-4" /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Stage summary strip */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
            {STAGES.map(stage => {
              const count = leads.filter(l => (l._stage || 'new') === stage).length;
              return (
                <div key={stage} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${stageFilter === stage ? 'ring-2 ring-offset-1 ring-blue-600' : ''} ${STAGE_COLORS[stage]} border-transparent`}
                  onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)} ({count})
                </div>
              );
            })}
          </div>

          {loading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No Facebook Ads leads found. Once your campaigns generate leads, they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(lead => {
                const stage = lead._stage || 'new';
                return (
                  <div key={lead.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-3"
                    onClick={() => setSelectedLead(lead)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{lead.contact_name || 'Unknown'}</p>
                        <Badge className={`text-xs ${STAGE_COLORS[stage]}`}>{stage}</Badge>
                        {lead.converted && <Badge className="bg-green-100 text-green-700 text-xs">Converted</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                        {lead.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.contact_email}</span>}
                        {lead.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.contact_phone}</span>}
                        {lead.ad_campaign && <span>📢 {lead.ad_campaign}</span>}
                        {lead.estimated_value && <span className="flex items-center gap-1 text-green-700"><DollarSign className="w-3 h-3" />${lead.estimated_value.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={stage} onValueChange={v => { updateStage(lead.id, v); }} onClick={e => e.stopPropagation()}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAGES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400 whitespace-nowrap">{lead.created_date ? format(new Date(lead.created_date), 'MMM d') : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead?.contact_name || 'Lead Detail'}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Email', value: selectedLead.contact_email },
                  { label: 'Phone', value: selectedLead.contact_phone },
                  { label: 'Campaign', value: selectedLead.ad_campaign },
                  { label: 'Platform', value: selectedLead.ad_platform },
                  { label: 'Property Address', value: selectedLead.property_address },
                  { label: 'Estimated Value', value: selectedLead.estimated_value ? `$${selectedLead.estimated_value.toLocaleString()}` : null },
                  { label: 'Timeline', value: selectedLead.timeline?.replace(/_/g, ' ') },
                  { label: 'Intent', value: selectedLead.intent?.replace(/_/g, ' ') },
                ].filter(f => f.value).map(f => (
                  <div key={f.label}>
                    <Label className="text-xs text-slate-500">{f.label}</Label>
                    <p className="font-medium text-slate-900">{f.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs text-slate-500 mb-2 block">Conversion Stage</Label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => (
                    <button key={s}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${(selectedLead._stage || 'new') === s ? `${STAGE_COLORS[s]} ring-2 ring-offset-1 ring-blue-500` : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                      onClick={() => updateStage(selectedLead.id, s)}
                    >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                  ))}
                </div>
              </div>

              {selectedLead.notes && (
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Notes History</Label>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">{selectedLead.notes}</div>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Add Note</Label>
                <div className="flex gap-2">
                  <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a follow-up note…" rows={2} className="flex-1" />
                  <Button onClick={saveNote} disabled={saving || !note.trim()} className="bg-blue-700 hover:bg-blue-800 self-end">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}