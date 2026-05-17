import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Send, CheckCircle2, MessageSquare, Calendar, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'bg-slate-100 text-slate-600',
  email_1_sent: 'bg-blue-100 text-blue-700',
  email_2_sent: 'bg-indigo-100 text-indigo-700',
  email_3_sent: 'bg-purple-100 text-purple-700',
  replied: 'bg-green-100 text-green-700',
  booked: 'bg-emerald-200 text-emerald-800',
  not_interested: 'bg-slate-100 text-slate-400',
  unsubscribed: 'bg-red-100 text-red-500',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  queued: 'Queued',
  email_1_sent: 'Email 1 Sent',
  email_2_sent: 'Email 2 Sent',
  email_3_sent: 'Email 3 Sent',
  replied: '✉ Replied',
  booked: '✓ Booked',
  not_interested: 'Not Interested',
  unsubscribed: 'Unsubscribed',
  failed: 'Failed',
};

const NEXT_EMAIL_MAP = {
  email_1_sent: 2,
  email_2_sent: 3,
};

export default function OutreachSequencePanel({ open, onClose, stateFilter }) {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sendingId, setSendingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (open) loadSequences();
  }, [open, stateFilter]);

  const loadSequences = async () => {
    setLoading(true);
    try {
      const filter = stateFilter && stateFilter !== 'all' ? { state: stateFilter } : {};
      const data = await base44.asServiceRole.entities.OutreachSequence.filter(filter, '-created_date', 500);
      setSequences(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFollowUp = async (seq) => {
    const nextNum = NEXT_EMAIL_MAP[seq.sequence_status];
    if (!nextNum) return;
    setSendingId(seq.id);
    try {
      await base44.functions.invoke('sendOutreachEmail', { sequence_id: seq.id, email_num: nextNum });
      await loadSequences();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleUpdateStatus = async (seqId, newStatus) => {
    setUpdatingId(seqId);
    try {
      await base44.asServiceRole.entities.OutreachSequence.update(seqId, { sequence_status: newStatus });
      setSequences(prev => prev.map(s => s.id === seqId ? { ...s, sequence_status: newStatus } : s));
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = statusFilter === 'all' ? sequences : sequences.filter(s => s.sequence_status === statusFilter);

  const stats = {
    total: sequences.length,
    replied: sequences.filter(s => s.sequence_status === 'replied').length,
    booked: sequences.filter(s => s.sequence_status === 'booked').length,
    sent: sequences.filter(s => ['email_1_sent', 'email_2_sent', 'email_3_sent'].includes(s.sequence_status)).length,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-600" />
            Outreach Sequences {stateFilter && stateFilter !== 'all' ? `— ${stateFilter}` : ''}
          </DialogTitle>
          <DialogDescription>Track and manage all outreach sequences. Send follow-ups and update statuses.</DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 py-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-700' },
            { label: 'In Progress', value: stats.sent, color: 'text-blue-600' },
            { label: 'Replied', value: stats.replied, color: 'text-green-600' },
            { label: 'Booked', value: stats.booked, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 border rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="email_1_sent">Email 1 Sent</SelectItem>
              <SelectItem value="email_2_sent">Email 2 Sent</SelectItem>
              <SelectItem value="email_3_sent">Email 3 Sent</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500">{filtered.length} sequences</span>
          <Button variant="outline" size="sm" onClick={loadSequences} className="ml-auto">
            Refresh
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">Company</th>
                  <th className="text-left p-3 font-medium text-slate-600">Email</th>
                  <th className="text-left p-3 font-medium text-slate-600">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600">Last Activity</th>
                  <th className="text-left p-3 font-medium text-slate-600">Reply Snippet</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(seq => (
                  <tr key={seq.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{seq.company_name}</div>
                      <div className="text-xs text-slate-400">{seq.city}, {seq.state}</div>
                    </td>
                    <td className="p-3 text-xs font-mono text-slate-600">{seq.contact_email}</td>
                    <td className="p-3">
                      <Badge className={`text-xs ${STATUS_COLORS[seq.sequence_status] || 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[seq.sequence_status] || seq.sequence_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {seq.last_reply_at
                        ? <span className="text-green-700">Replied {new Date(seq.last_reply_at).toLocaleDateString()}</span>
                        : seq.email_1_sent_at
                          ? `Sent ${new Date(seq.email_1_sent_at).toLocaleDateString()}`
                          : '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-500 max-w-48 truncate">
                      {seq.last_reply_snippet || (seq.email_1_subject ? `"${seq.email_1_subject}"` : '—')}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {/* Send follow-up */}
                        {NEXT_EMAIL_MAP[seq.sequence_status] && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-violet-300 text-violet-700"
                            onClick={() => handleSendFollowUp(seq)}
                            disabled={sendingId === seq.id}
                          >
                            {sendingId === seq.id
                              ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              : <Send className="w-3 h-3 mr-1" />}
                            Email {NEXT_EMAIL_MAP[seq.sequence_status]}
                          </Button>
                        )}
                        {/* Quick status updates */}
                        {seq.sequence_status === 'replied' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleUpdateStatus(seq.id, 'booked')}
                            disabled={updatingId === seq.id}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />Mark Booked
                          </Button>
                        )}
                        {!['replied', 'booked', 'not_interested', 'unsubscribed'].includes(seq.sequence_status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-slate-400 border-slate-200"
                            onClick={() => handleUpdateStatus(seq.id, 'not_interested')}
                            disabled={updatingId === seq.id}
                          >
                            Skip
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No sequences found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}