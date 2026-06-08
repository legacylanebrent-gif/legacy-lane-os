import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Mail, Phone, ChevronDown, ChevronUp, Users, Activity } from 'lucide-react';

const LEVEL_COLORS = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };
const CRM_COLORS = { new: 'bg-blue-100 text-blue-800', contacted: 'bg-yellow-100 text-yellow-800', qualified: 'bg-green-100 text-green-800', routed: 'bg-purple-100 text-purple-800', in_progress: 'bg-cyan-100 text-cyan-800', closed_won: 'bg-emerald-100 text-emerald-800', closed_lost: 'bg-slate-100 text-slate-600', unqualified: 'bg-red-100 text-red-800' };
const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const LIFE_EVENTS = ['probate','downsizing','divorce','relocation','senior_transition','inherited_home','estate_settlement','bankruptcy','foreclosure','other'];

export default function SEAdminLeads({ leads, onRefresh }) {
  const [filterState, setFilterState] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterCRM, setFilterCRM] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const filtered = leads.filter(l =>
    (filterState === 'all' || l.state === filterState) &&
    (filterLevel === 'all' || l.lead_level === filterLevel) &&
    (filterEvent === 'all' || l.life_event_type === filterEvent) &&
    (filterCRM === 'all' || l.crm_status === filterCRM)
  );

  const updateCRM = async (id, status) => {
    await base44.entities.EstateTransitionLead.update(id, { crm_status: status });
    await onRefresh();
  };

  const saveNote = async (lead) => {
    if (!noteText.trim()) return;
    await base44.entities.EstateTransitionLead.update(lead.id, { notes: noteText });
    await base44.entities.LeadActivityLog.create({ lead_id: lead.id, activity_type: 'note_added', activity_notes: noteText });
    setNoteText('');
    await onRefresh();
  };

  const loadActivity = async (leadId) => {
    if (expandedId === leadId) { setExpandedId(null); return; }
    setExpandedId(leadId);
    setLoadingActivity(true);
    const logs = await base44.entities.LeadActivityLog.filter({ lead_id: leadId }, '-created_date', 20);
    setActivityLog(logs);
    setLoadingActivity(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter state" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All States</SelectItem>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Lead level" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Levels</SelectItem>{['low','medium','high','urgent'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Life event" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Events</SelectItem>{LIFE_EVENTS.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterCRM} onValueChange={setFilterCRM}>
          <SelectTrigger className="w-40"><SelectValue placeholder="CRM status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{Object.keys(CRM_COLORS).map(v => <SelectItem key={v} value={v}>{v.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-slate-500 self-center">{filtered.length} leads</span>
      </div>

      <div className="space-y-3">
        {filtered.map(lead => (
          <Card key={lead.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900">{lead.first_name} {lead.last_name}</p>
                    <Badge className={CRM_COLORS[lead.crm_status]}>{lead.crm_status?.replace(/_/g,' ')}</Badge>
                    {lead.lead_level && <Badge className={LEVEL_COLORS[lead.lead_level]}>{lead.lead_level} · {lead.lead_score}</Badge>}
                    {lead.life_event_type && <Badge className="bg-slate-100 text-slate-600 text-xs">{lead.life_event_type.replace(/_/g,' ')}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[lead.city, lead.county, lead.state].filter(Boolean).join(', ')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lead.has_real_estate && <Badge className="bg-blue-100 text-blue-700 text-xs">Real Estate</Badge>}
                    {lead.needs_estate_sale && <Badge className="bg-amber-100 text-amber-700 text-xs">Estate Sale</Badge>}
                    {lead.needs_realtor && <Badge className="bg-green-100 text-green-700 text-xs">Realtor</Badge>}
                    {lead.wants_cash_offer && <Badge className="bg-purple-100 text-purple-700 text-xs">Cash Offer</Badge>}
                    {lead.needs_cleanout && <Badge className="bg-orange-100 text-orange-700 text-xs">Cleanout</Badge>}
                    {lead.urgency_level === 'within_30_days' && <Badge className="bg-red-100 text-red-700 text-xs">URGENT</Badge>}
                  </div>
                  {lead.routed_to?.length > 0 && (
                    <p className="text-xs text-purple-600 mt-1">Routed to: {lead.routed_to.map(r => r.provider_type?.replace(/_/g,' ')).join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <Select value={lead.crm_status} onValueChange={(v) => updateCRM(lead.id, v)}>
                    <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(CRM_COLORS).map(v => <SelectItem key={v} value={v}>{v.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => loadActivity(lead.id)}>
                    <Activity className="w-3 h-3" /> Activity {expandedId === lead.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {expandedId === lead.id && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Add a note..." value={noteText} onChange={e => setNoteText(e.target.value)} className="text-sm" />
                    <Button size="sm" onClick={() => saveNote(lead)} className="bg-slate-800 hover:bg-slate-900">Save Note</Button>
                  </div>
                  {lead.notes && <p className="text-xs text-slate-500 bg-slate-50 rounded p-2">"{lead.notes}"</p>}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Activity Log</p>
                    {loadingActivity ? <p className="text-xs text-slate-400">Loading...</p> : activityLog.map(a => (
                      <div key={a.id} className="text-xs bg-slate-50 rounded p-2">
                        <span className="font-medium text-slate-700">{a.activity_type?.replace(/_/g,' ')}</span>
                        {a.activity_notes && <span className="text-slate-500"> — {a.activity_notes}</span>}
                        <span className="text-slate-400 ml-2">{a.created_date ? new Date(a.created_date).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                    {!loadingActivity && activityLog.length === 0 && <p className="text-xs text-slate-400">No activity logged yet.</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500"><Users className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No leads match current filters.</p></div>
        )}
      </div>
    </div>
  );
}