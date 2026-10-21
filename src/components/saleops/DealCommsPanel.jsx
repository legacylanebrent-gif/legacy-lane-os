import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, Mail, MessageSquare, Users, StickyNote, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Chapter 10 P1 — pre-sale communication history for an OPPORTUNITY (not only a
// live sale). Records CALL / EMAIL / SMS / NOTE on the canonical CRM Activity
// record (deal_id-scoped) — no new communication entity. The FIRST human
// call/email/sms/meeting sets first_meaningful_response_at; automated
// acknowledgments and system notifications never count.
const CHANNELS = [
  { value: 'call', label: 'Call', icon: Phone, human: true },
  { value: 'email', label: 'Email', icon: Mail, human: true },
  { value: 'sms', label: 'SMS', icon: MessageSquare, human: true },
  { value: 'meeting', label: 'Meeting', icon: Users, human: true },
  { value: 'note', label: 'Note', icon: StickyNote, human: false },
];

export default function DealCommsPanel({ deal, user, onPersist }) {
  const [activities, setActivities] = useState([]);
  const [channel, setChannel] = useState('call');
  const [direction, setDirection] = useState('outbound');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.Activity.filter({ deal_id: deal.id }, '-created_date', 20);
      setActivities(rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [deal.id]);

  useEffect(() => { load(); }, [load]);

  const record = async () => {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const meta = CHANNELS.find(c => c.value === channel);
      await base44.entities.Activity.create({
        user_id: user.id,
        operator_id: user.id,
        deal_id: deal.id,
        activity_type: channel,
        direction: channel === 'note' ? null : direction,
        recipient_name: deal.client_name || null,
        subject: meta ? meta.label : channel,
        description: summary.trim(),
        status: 'completed',
        completed_date: now,
      });
      if (meta && meta.human && !deal.first_meaningful_response_at) {
        await onPersist({ first_meaningful_response_at: now });
      }
      setSummary('');
      await load();
    } catch (e) {
      console.error(e);
      alert('Could not record the communication.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = iso => (iso ? format(parseISO(iso), 'MMM d, h:mm a') : null);

  return (
    <div className="space-y-4">
      {/* Response truth strip */}
      <div className="flex flex-wrap gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
        <span className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          Inquiry received: {deal.inquiry_received_at ? fmt(deal.inquiry_received_at) : 'Unknown'}
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          First human response: {deal.first_meaningful_response_at
            ? <span className="text-green-700 font-medium">{fmt(deal.first_meaningful_response_at)}</span>
            : <span className="text-amber-600 font-medium">None recorded</span>}
        </span>
        <span className="text-slate-400">Automated acknowledgments never count as a response.</span>
      </div>

      {/* Record form */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map(c => {
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                onClick={() => setChannel(c.value)}
                className={`text-xs px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 transition-colors ${channel === c.value ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            );
          })}
        </div>
        {channel !== 'note' && (
          <div>
            <Label className="text-xs">Direction</Label>
            <div className="flex gap-1.5 mt-1">
              {['outbound', 'inbound'].map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`text-xs px-2.5 py-1 rounded-full border capitalize ${direction === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label className="text-xs">{channel === 'note' ? 'Note' : 'Summary of what happened'} *</Label>
          <Input
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder={channel === 'note' ? 'e.g. Family prefers email; executor decides Friday' : 'e.g. Left voicemail about consultation times'}
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={record} disabled={saving || !summary.trim()} className="bg-orange-600 hover:bg-orange-700 gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Record {channel === 'note' ? 'Note' : 'Communication'}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Communication history (this opportunity)</p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">No communication recorded yet for this opportunity.</p>
        ) : activities.map(a => {
          const meta = CHANNELS.find(c => c.value === a.activity_type);
          const Icon = meta ? meta.icon : StickyNote;
          return (
            <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-white">
              <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-800">{a.description}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {meta ? meta.label : a.activity_type}
                  {a.direction ? ` · ${a.direction}` : ''} · {a.completed_date ? fmt(a.completed_date) : ''}
                </div>
              </div>
              {a.activity_type !== 'note' && <Badge variant="outline" className="text-[10px] flex-shrink-0">{a.direction || '—'}</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}