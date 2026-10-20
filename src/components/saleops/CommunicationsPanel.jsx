import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MessageSquare, Users, Voicemail, Megaphone, StickyNote, ArrowUpRight, ArrowDownLeft, Loader2, Plus, History } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

// Chapter 3 P1 — sale-scoped client communication log on the canonical CRM Activity
// record. This is COMMUNICATION THAT OCCURRED — it is never SaleNote (internal
// operational memory) and never SaleClientDecision (client instructions/decisions).
const CHANNELS = [
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'Text / SMS', icon: MessageSquare },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'in_person', label: 'In Person', icon: Users },
  { value: 'voicemail', label: 'Voicemail', icon: Voicemail },
  { value: 'client_update', label: 'Client Update', icon: Megaphone },
  { value: 'other', label: 'Other', icon: StickyNote },
];

const channelLabel = (v) => (CHANNELS.find(c => c.value === v) || CHANNELS[CHANNELS.length - 1]).label;
const ChannelIcon = ({ value, className }) => {
  const C = (CHANNELS.find(c => c.value === value) || CHANNELS[CHANNELS.length - 1]).icon;
  return <C className={className} />;
};

export default function CommunicationsPanel({ saleId }) {
  const [me, setMe] = useState(null);
  const [sale, setSale] = useState(null);
  const [records, setRecords] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirFilter, setDirFilter] = useState('all');
  const [form, setForm] = useState({
    channel: 'call',
    direction: 'outbound',
    contact_id: 'none',
    deal_id: 'none',
    recipient_name: '',
    subject: '',
    description: '',
    occurred_at: '',
  });

  useEffect(() => { load(); }, [saleId]);

  const load = async () => {
    try {
      setLoading(true);
      const [user, saleList, recPage, contactPage] = await Promise.all([
        base44.auth.me(),
        base44.entities.EstateSale.filter({ id: saleId }),
        base44.entities.Activity.filter({ sale_id: saleId }, { sort: '-created_date', limit: 200 }),
        base44.entities.Contact.filter({}, { sort: '-created_date', limit: 100 }).catch(() => ({ items: [] })),
      ]);
      setMe(user);
      setSale(saleList[0] || null);
      setRecords(recPage.items || []);
      setContacts(contactPage.items || []);
      if (saleList[0]) {
        const dealList = await base44.entities.SaleConversionPipeline
          .filter({ operator_id: saleList[0].operator_id })
          .catch(() => []);
        setDeals(dealList);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.subject.trim() && !form.description.trim()) {
      toast.error('Add a subject or details before logging the communication.');
      return;
    }
    if (form.contact_id === 'none' && !form.recipient_name.trim()) {
      toast.error('Choose an existing contact or enter who it was with.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Activity.create({
        sale_id: saleId,
        operator_id: sale?.operator_id || '',
        user_id: me.id,
        activity_type: form.channel,
        direction: form.direction,
        contact_id: form.contact_id !== 'none' ? form.contact_id : undefined,
        deal_id: form.deal_id !== 'none' ? form.deal_id : undefined,
        recipient_name: form.contact_id !== 'none' ? '' : form.recipient_name.trim(),
        subject: form.subject.trim() || null,
        description: form.description.trim() || null,
        status: 'completed',
        completed_date: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
      });
      toast.success('Communication logged');
      setForm({
        channel: 'call', direction: 'outbound', contact_id: 'none', deal_id: 'none',
        recipient_name: '', subject: '', description: '', occurred_at: '',
      });
      const recPage = await base44.entities.Activity.filter({ sale_id: saleId }, { sort: '-created_date', limit: 200 });
      setRecords(recPage.items || []);
    } catch (error) {
      toast.error('Could not log communication: ' + (error.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const contactName = (id) => {
    const c = contacts.find(c => c.id === id);
    return c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
  };

  const visible = dirFilter === 'all' ? records : records.filter(r => r.direction === dirFilter);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Client Communications</h2>
              <p className="text-sm text-slate-600">
                A record of what was communicated, to whom, when, by whom, and how — attached to {sale?.title ? <span className="font-medium">{sale.title}</span> : 'this sale'}.
              </p>
            </div>
            <Badge variant="outline" className="border-slate-300 text-slate-600">Log what occurred — drafts never auto-log</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={v => setField('channel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={v => setField('direction', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound (we reached out)</SelectItem>
                  <SelectItem value="inbound">Inbound (they reached out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Who (existing contact — optional)</Label>
              <Select value={form.contact_id} onValueChange={v => setField('contact_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select a contact…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unnamed contact'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Who (name, if no contact record)</Label>
              <Input
                placeholder="e.g. Margaret (seller's daughter)"
                value={form.contact_id !== 'none' ? '' : form.recipient_name}
                disabled={form.contact_id !== 'none'}
                onChange={e => setField('recipient_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Linked pipeline deal (optional)</Label>
              <Select value={form.deal_id} onValueChange={v => setField('deal_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select a deal…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {deals.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.client_name || 'Unnamed deal'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>When (leave blank for now)</Label>
              <Input
                type="datetime-local"
                value={form.occurred_at}
                onChange={e => setField('occurred_at', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. Confirmed pickup instructions for the dining set"
                value={form.subject}
                onChange={e => setField('subject', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>What was communicated</Label>
              <Textarea
                rows={3}
                placeholder="Summary of the conversation, instructions given or received, agreements made…"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Log Communication
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Communication History ({records.length})
            </h3>
            <div className="flex gap-1">
              {[['all', 'All'], ['outbound', 'Outbound'], ['inbound', 'Inbound']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setDirFilter(v)}
                  className={`px-3 py-1 text-xs rounded-full border ${dirFilter === v ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-500 text-sm">Loading communications…</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No communications logged for this sale yet. Log calls, emails, texts, and in-person conversations above so the record never depends on someone's recollection.
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map(r => (
                <div key={r.id} className="border border-slate-200 rounded-lg p-3 flex items-start gap-3 hover:bg-slate-50">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <ChannelIcon value={r.activity_type} className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 text-sm">{r.subject || channelLabel(r.activity_type)}</span>
                      <Badge variant="secondary" className="text-[11px]">{channelLabel(r.activity_type)}</Badge>
                      {r.direction && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          {r.direction === 'inbound' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {r.direction}
                        </span>
                      )}
                    </div>
                    {r.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.description}</p>}
                    <p className="text-xs text-slate-500 mt-1.5">
                      With: <span className="font-medium">{contactName(r.contact_id) || r.recipient_name || '—'}</span>
                      {' · '}When: <span className="font-medium">{moment(r.completed_date || r.created_date).format('MMM D, YYYY h:mm A')}</span>
                      {' · '}Logged by: <span className="font-medium">{me && r.user_id === me.id ? 'You' : 'Team'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}