import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Mail, Send, Eye, RefreshCw, AlertCircle, MapPin, Building, Users } from 'lucide-react';
import { isAdminUser } from '@/lib/isAdminUser';
import { useToast } from '@/components/ui/use-toast';

const STATUS_COLORS = {
  draft: 'bg-amber-100 text-amber-700 border-amber-300',
  sent: 'bg-green-100 text-green-700 border-green-300',
  failed: 'bg-red-100 text-red-700 border-red-300',
};
const VARIANT_COLORS = { full: 'bg-blue-100 text-blue-700', reminder: 'bg-purple-100 text-purple-700' };

export default function AdminPropstreamAgentEmailDrafts() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('draft');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ['propstream-agent-email-drafts', statusFilter],
    queryFn: () => base44.entities.PropstreamAgentEmailDraft.filter(
      statusFilter === 'all' ? {} : { status: statusFilter },
      '-created_date', 500
    ),
    initialData: [],
  });

  const handleSend = async (draft) => {
    setSendingId(draft.id);
    try {
      const res = await base44.functions.invoke('sendPropstreamAgentEmailDraft', { draft_id: draft.id });
      if (res?.data?.success) {
        toast({ title: 'Sent to Customer.io', description: draft.agent_email });
        queryClient.invalidateQueries({ queryKey: ['propstream-agent-email-drafts'] });
        setDetailOpen(false);
      } else {
        toast({ title: 'Send failed', description: res?.data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  const openDetail = (d) => { setSelected(d); setDetailOpen(true); };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: drafts.length,
    draft: drafts.filter(d => d.status === 'draft').length,
    sent: drafts.filter(d => d.status === 'sent').length,
    failed: drafts.filter(d => d.status === 'failed').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Mail className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 font-serif">Agent Congrats Email Drafts</h1>
              <p className="text-sm text-slate-500 mt-0.5">Review drafts, then send to Customer.io manually — no auto-blasting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Drafts (unsent)</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['propstream-agent-email-drafts'] })}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Showing</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-slate-800">{stats.total}</div></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Unsent Drafts</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{stats.draft}</div></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Sent</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{stats.sent}</div></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-500">Failed</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{stats.failed}</div></CardContent></Card>
        </div>

        {/* Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-sm font-semibold text-slate-700">Email Drafts ({drafts.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" /><p>Loading drafts...</p></div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-12 text-slate-400"><Mail className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No drafts found. Drafts are generated twice daily (9am / 9pm ET) from new PropStream agent leads.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Variant</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Listings</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">City</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Matched Operator</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{d.agent_name || '—'}</div>
                          <div className="text-xs text-slate-500">{d.agent_email}</div>
                        </td>
                        <td className="py-3 px-4"><Badge className={`text-xs ${VARIANT_COLORS[d.variant] || ''}`}>{d.variant}</Badge></td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700">{d.listing_count || 1}{d.is_multiple ? ' (multi)' : ''}</div>
                        </td>
                        <td className="py-3 px-4"><div className="text-sm text-slate-700 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{d.primary_city || '—'}</div></td>
                        <td className="py-3 px-4"><div className="text-sm text-slate-700 flex items-center gap-1"><Building className="w-3 h-3 text-slate-400" />{d.matched_operator_name || '—'}</div></td>
                        <td className="py-3 px-4"><Badge className={`text-xs ${STATUS_COLORS[d.status] || ''}`}>{d.status}</Badge></td>
                        <td className="text-right py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(d)}><Eye className="w-4 h-4" /></Button>
                            {d.status === 'draft' && (
                              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1" disabled={sendingId === d.id} onClick={() => handleSend(d)}>
                                {sendingId === d.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail / Preview Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">{selected.email_subject}</DialogTitle>
                <DialogDescription>
                  {selected.agent_name} · {selected.agent_email} · <Badge className={`text-xs ml-1 ${VARIANT_COLORS[selected.variant] || ''}`}>{selected.variant}</Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">City:</span> <span className="text-slate-800 font-medium">{selected.primary_city || '—'}</span></div>
                  <div><span className="text-slate-500">Listings:</span> <span className="text-slate-800 font-medium">{selected.listing_count || 1}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Matched operator:</span> <span className="text-slate-800 font-medium">{selected.matched_operator_name || '—'}{selected.matched_operator_phone ? ` (${selected.matched_operator_phone})` : ''}</span></div>
                </div>

                {selected.listings && selected.listings.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Listings</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selected.listings.map((l, i) => (
                        <div key={i} className="text-sm text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                          {l.address}{l.city ? ` — ${l.city}, ${l.state}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Email Body</div>
                  <pre className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-4 font-sans">{selected.email_body}</pre>
                </div>

                {selected.status === 'sent' && (
                  <div className="text-xs text-green-700">Sent {selected.sent_at ? new Date(selected.sent_at).toLocaleString() : ''}{selected.sent_by ? ` by ${selected.sent_by}` : ''}</div>
                )}
                {selected.status === 'failed' && (
                  <div className="text-xs text-red-700">Failed: {selected.error_message}</div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {selected.status === 'draft' && (
                  <Button className="bg-amber-600 hover:bg-amber-700 gap-1" disabled={sendingId === selected.id} onClick={() => handleSend(selected)}>
                    {sendingId === selected.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send to Customer.io
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}