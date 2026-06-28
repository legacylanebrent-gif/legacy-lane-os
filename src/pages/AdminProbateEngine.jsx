import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  MapPin, FileText, Users, Zap, BarChart3, Settings,
  Plus, RefreshCw, Eye, Edit, CheckCircle2, Clock, AlertTriangle, Loader2, Globe, Phone, Mail
} from 'lucide-react';

const US_STATES_LIST = [
  { name: 'Alabama', abbr: 'AL' }, { name: 'Alaska', abbr: 'AK' }, { name: 'Arizona', abbr: 'AZ' },
  { name: 'Arkansas', abbr: 'AR' }, { name: 'California', abbr: 'CA' }, { name: 'Colorado', abbr: 'CO' },
  { name: 'Connecticut', abbr: 'CT' }, { name: 'Delaware', abbr: 'DE' }, { name: 'Florida', abbr: 'FL' },
  { name: 'Georgia', abbr: 'GA' }, { name: 'Hawaii', abbr: 'HI' }, { name: 'Idaho', abbr: 'ID' },
  { name: 'Illinois', abbr: 'IL' }, { name: 'Indiana', abbr: 'IN' }, { name: 'Iowa', abbr: 'IA' },
  { name: 'Kansas', abbr: 'KS' }, { name: 'Kentucky', abbr: 'KY' }, { name: 'Louisiana', abbr: 'LA' },
  { name: 'Maine', abbr: 'ME' }, { name: 'Maryland', abbr: 'MD' }, { name: 'Massachusetts', abbr: 'MA' },
  { name: 'Michigan', abbr: 'MI' }, { name: 'Minnesota', abbr: 'MN' }, { name: 'Mississippi', abbr: 'MS' },
  { name: 'Missouri', abbr: 'MO' }, { name: 'Montana', abbr: 'MT' }, { name: 'Nebraska', abbr: 'NE' },
  { name: 'Nevada', abbr: 'NV' }, { name: 'New Hampshire', abbr: 'NH' }, { name: 'New Jersey', abbr: 'NJ' },
  { name: 'New Mexico', abbr: 'NM' }, { name: 'New York', abbr: 'NY' }, { name: 'North Carolina', abbr: 'NC' },
  { name: 'North Dakota', abbr: 'ND' }, { name: 'Ohio', abbr: 'OH' }, { name: 'Oklahoma', abbr: 'OK' },
  { name: 'Oregon', abbr: 'OR' }, { name: 'Pennsylvania', abbr: 'PA' }, { name: 'Rhode Island', abbr: 'RI' },
  { name: 'South Carolina', abbr: 'SC' }, { name: 'South Dakota', abbr: 'SD' }, { name: 'Tennessee', abbr: 'TN' },
  { name: 'Texas', abbr: 'TX' }, { name: 'Utah', abbr: 'UT' }, { name: 'Vermont', abbr: 'VT' },
  { name: 'Virginia', abbr: 'VA' }, { name: 'Washington', abbr: 'WA' }, { name: 'West Virginia', abbr: 'WV' },
  { name: 'Wisconsin', abbr: 'WI' }, { name: 'Wyoming', abbr: 'WY' }
];

const statusColor = { draft: 'bg-yellow-100 text-yellow-800', published: 'bg-green-100 text-green-800', archived: 'bg-slate-100 text-slate-600' };
const leadStatusColor = { new: 'bg-blue-100 text-blue-800', contacted: 'bg-yellow-100 text-yellow-800', qualified: 'bg-green-100 text-green-800', routed: 'bg-purple-100 text-purple-800', closed: 'bg-slate-100 text-slate-600', unqualified: 'bg-red-100 text-red-800' };

function StatsRow({ states, counties, leads, jobs }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'State Pages', value: states.length, published: states.filter(s => s.status === 'published').length, icon: MapPin, color: 'text-blue-600' },
        { label: 'County Pages', value: counties.length, published: counties.filter(c => c.status === 'published').length, icon: Globe, color: 'text-amber-600' },
        { label: 'Total Leads', value: leads.length, published: leads.filter(l => l.status === 'new').length, icon: Users, color: 'text-green-600' },
        { label: 'Content Jobs', value: jobs.length, published: jobs.filter(j => j.status === 'pending').length, icon: Zap, color: 'text-purple-600' },
      ].map(({ label, value, published, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-4 flex items-center gap-3">
            <Icon className={`w-8 h-8 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label} · {published} active</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminProbateEngine() {
  const [tab, setTab] = useState('states');
  const [states, setStates] = useState([]);
  const [counties, setCounties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [providers, setProviders] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [generating, setGenerating] = useState({});
  const [selectedState, setSelectedState] = useState('');
  const [leadFilter, setLeadFilter] = useState('all');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [s, c, l, p, j] = await Promise.all([
      base44.entities.ProbateState.list('-created_date', 100),
      base44.entities.ProbateCounty.list('-created_date', 100),
      base44.entities.ProbateLead.list('-created_date', 200),
      base44.entities.ProbateProviderRoutingRule.list('-created_date', 100),
      base44.entities.ProbateContentJob.list('-created_date', 50),
    ]);
    setStates(s); setCounties(c); setLeads(l); setProviders(p); setJobs(j);
  };

  const generateStatePage = async (stateObj) => {
    setGenerating(prev => ({ ...prev, [stateObj.abbr]: true }));
    await base44.functions.invoke('generateProbateStatePage', {
      state_name: stateObj.name,
      state_abbreviation: stateObj.abbr,
      slug: stateObj.name.toLowerCase().replace(/\s+/g, '-')
    });
    await loadAll();
    setGenerating(prev => ({ ...prev, [stateObj.abbr]: false }));
  };

  const publishState = async (id) => {
    await base44.entities.ProbateState.update(id, { status: 'published' });
    await loadAll();
  };

  const updateLeadStatus = async (id, status) => {
    await base44.entities.ProbateLead.update(id, { status });
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const existingSlugs = new Set(states.map(s => s.slug));
  const filteredLeads = leadFilter === 'all' ? leads : leads.filter(l => l.status === leadFilter);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Probate SEO Engine</h1>
          <p className="text-slate-500 text-sm">National Probate → Estate Sale → Inherited Home Sale Lead Engine</p>
        </div>
        <Button onClick={loadAll} variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <StatsRow states={states} counties={counties} leads={leads} jobs={jobs} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="states">States ({states.length})</TabsTrigger>
          <TabsTrigger value="counties">Counties ({counties.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="routing">Provider Routing</TabsTrigger>
          <TabsTrigger value="jobs">Content Jobs</TabsTrigger>
        </TabsList>

        {/* STATES TAB */}
        <TabsContent value="states">
          <div className="mb-4 flex items-center gap-3">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select state to generate..." /></SelectTrigger>
              <SelectContent>
                {US_STATES_LIST.map(s => (
                  <SelectItem key={s.abbr} value={s.abbr}>
                    {s.name} {existingSlugs.has(s.name.toLowerCase().replace(/\s+/g, '-')) ? '✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const s = US_STATES_LIST.find(s => s.abbr === selectedState);
                if (s) generateStatePage(s);
              }}
              disabled={!selectedState || generating[selectedState]}
              className="bg-amber-600 hover:bg-amber-700 gap-2"
            >
              {generating[selectedState] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generate State Page
            </Button>
          </div>

          <div className="space-y-3">
            {states.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-500 w-8">{s.state_abbreviation}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{s.state_name}</p>
                    <p className="text-xs text-slate-500">/probate/{s.slug}</p>
                  </div>
                  <Badge className={statusColor[s.status]}>{s.status}</Badge>
                </div>
                <div className="flex gap-2">
                  <a href={`/probate/${s.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><Eye className="w-3 h-3" /></Button>
                  </a>
                  {s.status !== 'published' && (
                    <Button size="sm" onClick={() => publishState(s.id)} className="bg-green-600 hover:bg-green-700 text-white gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Publish
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    const stateObj = US_STATES_LIST.find(x => x.abbr === s.state_abbreviation);
                    if (stateObj) generateStatePage(stateObj);
                  }} disabled={generating[s.state_abbreviation]}>
                    {generating[s.state_abbreviation] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            ))}

            {states.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No state pages yet. Select a state above and click Generate to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* COUNTIES TAB */}
        <TabsContent value="counties">
          <div className="text-center py-12 text-slate-500">
            <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">County pages are Phase 2</p>
            <p className="text-sm mt-1">Will cover NJ, NY, PA, FL, TX, CA first. Coming soon.</p>
          </div>
        </TabsContent>

        {/* LEADS TAB */}
        <TabsContent value="leads">
          <div className="flex items-center gap-3 mb-4">
            <Select value={leadFilter} onValueChange={setLeadFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="routed">Routed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="unqualified">Unqualified</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500">{filteredLeads.length} leads</span>
          </div>
          <div className="space-y-3">
            {filteredLeads.map(lead => (
              <Card key={lead.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{lead.first_name} {lead.last_name}</p>
                        <Badge className={leadStatusColor[lead.status]}>{lead.status}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">Score: {lead.lead_score}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city ? `${lead.city}, ` : ''}{lead.state} {lead.zip_code}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.has_real_estate && <Badge className="bg-blue-100 text-blue-700 text-xs">Has Real Estate</Badge>}
                        {lead.needs_estate_sale && <Badge className="bg-amber-100 text-amber-700 text-xs">Estate Sale</Badge>}
                        {lead.needs_realtor && <Badge className="bg-green-100 text-green-700 text-xs">Needs Realtor</Badge>}
                        {lead.wants_cash_offer && <Badge className="bg-purple-100 text-purple-700 text-xs">Cash Offer</Badge>}
                        {lead.needs_cleanout && <Badge className="bg-orange-100 text-orange-700 text-xs">Cleanout</Badge>}
                        {lead.needs_attorney && <Badge className="bg-red-100 text-red-700 text-xs">Attorney</Badge>}
                        {lead.urgency_level === 'within_30_days' && <Badge className="bg-red-100 text-red-700 text-xs">URGENT</Badge>}
                      </div>
                    </div>
                    <Select value={lead.status} onValueChange={(v) => updateLeadStatus(lead.id, v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="routed">Routed</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="unqualified">Unqualified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {lead.notes && <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded p-2">"{lead.notes}"</p>}
                </CardContent>
              </Card>
            ))}
            {filteredLeads.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No leads yet in this category.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ROUTING TAB */}
        <TabsContent value="routing">
          <AddProviderForm onSave={loadAll} />
          <div className="mt-6 space-y-3">
            {providers.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{p.provider_name}</p>
                    <div className="flex gap-2 mt-1 flex-wrap text-xs">
                      <Badge className="bg-slate-100 text-slate-700">{p.provider_type?.replace(/_/g, ' ')}</Badge>
                      {p.states?.map(s => <Badge key={s} className="bg-blue-100 text-blue-700">{s}</Badge>)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{p.contact_email} {p.contact_phone}</p>
                  </div>
                  <Badge className={p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {providers.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">No providers configured yet.</div>
            )}
          </div>
        </TabsContent>

        {/* JOBS TAB */}
        <TabsContent value="jobs">
          <div className="space-y-3">
            {jobs.map(j => (
              <div key={j.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-900">{j.target_name}</p>
                  <p className="text-xs text-slate-500">{j.job_type} · {j.started_at ? new Date(j.started_at).toLocaleString() : 'Not started'}</p>
                  {j.result_summary && <p className="text-xs text-green-600 mt-1">{j.result_summary}</p>}
                  {j.error_message && <p className="text-xs text-red-600 mt-1">{j.error_message}</p>}
                </div>
                <Badge className={
                  j.status === 'completed' ? 'bg-green-100 text-green-800' :
                  j.status === 'failed' ? 'bg-red-100 text-red-800' :
                  j.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }>{j.status}</Badge>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">No content jobs yet.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddProviderForm({ onSave }) {
  const [form, setForm] = useState({ provider_name: '', provider_type: '', contact_email: '', contact_phone: '', states: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    await base44.entities.ProbateProviderRoutingRule.create({
      ...form,
      states: form.states ? form.states.split(',').map(s => s.trim()) : []
    });
    setForm({ provider_name: '', provider_type: '', contact_email: '', contact_phone: '', states: '', is_active: true });
    await onSave();
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Add Provider Routing Rule</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Provider Name</Label><Input value={form.provider_name} onChange={e => set('provider_name', e.target.value)} /></div>
          <div>
            <Label>Provider Type</Label>
            <Select value={form.provider_type} onValueChange={v => set('provider_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estate_sale_company">Estate Sale Company</SelectItem>
                <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                <SelectItem value="cleanout_vendor">Cleanout Vendor</SelectItem>
                <SelectItem value="attorney">Attorney</SelectItem>
                <SelectItem value="investor_buyer">Investor Buyer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} /></div>
          <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>States (comma separated, e.g. NJ, NY, PA)</Label><Input value={form.states} onChange={e => set('states', e.target.value)} /></div>
        </div>
        <Button onClick={save} disabled={saving || !form.provider_name || !form.provider_type} className="mt-4 bg-slate-800 hover:bg-slate-900 gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Provider
        </Button>
      </CardContent>
    </Card>
  );
}