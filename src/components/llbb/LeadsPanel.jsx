// LLBB Website Manager — Leads dashboard (Phase 4C, Parts 27/28/29).
// Tenant/company-scoped WebsiteLead view: summary counters, type breakdown,
// recent leads table, and a full-record detail modal (photos via signed
// URLs, consent evidence, call/email/text links). Company isolation is
// enforced server-side by the llbbAdmin seam.
import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Phone, Mail, MessageSquare, Globe, Tag, User, Clock, ShieldCheck } from 'lucide-react';

const TYPE_LABELS = {
  seller_inquiry: 'Seller Inquiry',
  contact: 'Contact',
  vip_signup: 'Buyer Alert',
  sale_question: 'Sale Question',
  consultation_request: 'Consultation'
};

const STATUS_OPTIONS = ['new', 'in_review', 'contacted', 'qualified', 'closed_won', 'closed_lost', 'spam'];
const STATUS_BADGE = {
  new: 'bg-blue-100 text-blue-800 border border-blue-200',
  in_review: 'bg-amber-100 text-amber-800 border border-amber-200',
  contacted: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  qualified: 'bg-green-100 text-green-800 border border-green-200',
  closed_won: 'bg-green-100 text-green-800 border border-green-200',
  closed_lost: 'bg-slate-200 text-slate-600 border border-slate-300',
  spam: 'bg-red-100 text-red-700 border border-red-200'
};

export default function LeadsPanel({ websiteTenantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('llbbAdmin', { action: 'leads_list', website_tenant_id: websiteTenantId });
      setData(res.data);
    } catch (e) {
      toast({ title: 'Could not load leads', variant: 'destructive' });
    }
    setLoading(false);
  }, [websiteTenantId]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await base44.functions.invoke('llbbAdmin', { action: 'lead_detail', website_tenant_id: websiteTenantId, lead_id: id });
      setDetail(res.data.lead);
    } catch (e) {
      toast({ title: 'Could not load lead details', variant: 'destructive' });
      setOpenId(null);
    }
    setDetailLoading(false);
  }

  async function setStatus(status) {
    try {
      await base44.entities.WebsiteLead.update(detail.id, { status });
      setDetail(d => ({ ...d, status }));
      load();
    } catch (e) {
      toast({ title: 'Could not update status', variant: 'destructive' });
    }
  }

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!data) return null;
  const s = data.summary;

  return (
    <div className="space-y-5">
      {/* Summary (Part 27) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Today', s.today], ['This Week', s.this_week], ['This Month', s.this_month], ['All Time', s.total]].map(([k, v]) => (
          <div key={k} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(s.by_type).map(([t, n]) => (
          <Badge key={t} className="bg-slate-100 text-slate-700 border border-slate-200">{TYPE_LABELS[t] || t.replace(/_/g, ' ')} · {n}</Badge>
        ))}
        {s.total === 0 && <span className="text-sm text-slate-500">No leads yet — website inquiries and buyer signups will appear here.</span>}
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="font-heading font-bold text-slate-900">Recent Leads</div>
          <div className="text-sm text-slate-500 mt-0.5">All website inquiries and buyer signups for this website.</div>
        </div>
        {data.recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No leads yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => openDetail(l.id)}>
                    <td className="px-4 py-3 font-medium text-slate-900">{l.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[l.lead_type] || l.lead_type}</td>
                    <td className="px-4 py-3 text-slate-600">{l.service_requested ? l.service_requested.replace(/_/g, ' ') : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{l.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{l.created_date ? new Date(l.created_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-3"><Badge className={STATUS_BADGE[l.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}>{(l.status || 'new').replace(/_/g, ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal (Part 28/29) */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setDetail(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail ? (detail.name || detail.contact_email || 'Lead') : 'Lead'}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STATUS_BADGE[detail.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}>{(detail.status || 'new').replace(/_/g, ' ')}</Badge>
                <Badge variant="outline" className="bg-white">{TYPE_LABELS[detail.lead_type] || detail.lead_type}</Badge>
                {detail.service_requested && <Badge variant="outline" className="bg-white capitalize">{detail.service_requested.replace(/_/g, ' ')}</Badge>}
                <select value={detail.status} onChange={e => setStatus(e.target.value)}
                  className="ml-auto text-xs border rounded-md px-2 py-1.5 bg-white">
                  {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {/* Contact + actions */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <div className="font-medium text-slate-700 flex items-center gap-2"><User className="w-3.5 h-3.5" /> Contact</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><span className="text-slate-400 text-xs">Name</span><div>{[detail.contact_first_name, detail.contact_last_name].filter(Boolean).join(' ') || '—'}</div></div>
                  <div><span className="text-slate-400 text-xs">Preferred contact</span><div className="capitalize">{detail.preferred_contact_method || 'any'}</div></div>
                  <div><span className="text-slate-400 text-xs">Email</span><div className="truncate">{detail.contact_email || '—'}</div></div>
                  <div><span className="text-slate-400 text-xs">Phone</span><div>{detail.contact_phone || '—'}</div></div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {detail.contact_phone && <Button size="sm" variant="outline" asChild><a href={`tel:${detail.contact_phone}`}><Phone className="w-3.5 h-3.5 mr-1" /> Call</a></Button>}
                  {detail.contact_phone && <Button size="sm" variant="outline" asChild><a href={`sms:${detail.contact_phone}`}><MessageSquare className="w-3.5 h-3.5 mr-1" /> Text</a></Button>}
                  {detail.contact_email && <Button size="sm" variant="outline" asChild><a href={`mailto:${detail.contact_email}`}><Mail className="w-3.5 h-3.5 mr-1" /> Email</a></Button>}
                </div>
              </div>

              {/* Inquiry */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="font-medium text-slate-700 mb-1">Inquiry</div>
                <p className="whitespace-pre-line text-slate-700">{detail.message}</p>
              </div>

              {/* Property + timeline */}
              {detail.lead_type === 'seller_inquiry' && (
                <div className="rounded-lg border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-3 font-medium text-slate-700">Property &amp; Timeline</div>
                  <div><span className="text-slate-400 text-xs">Location</span><div>{[detail.property_info.city, detail.property_info.state, detail.property_info.zip].filter(Boolean).join(', ') || '—'}</div></div>
                  <div><span className="text-slate-400 text-xs">Property type</span><div className="capitalize">{(detail.property_info.property_type || '—').replace(/_/g, ' ')}</div></div>
                  <div><span className="text-slate-400 text-xs">Occupancy</span><div className="capitalize">{(detail.property_info.occupancy || '—').replace(/_/g, ' ')}</div></div>
                  <div><span className="text-slate-400 text-xs">Approx. size</span><div>{detail.property_info.approx_size || '—'}</div></div>
                  <div><span className="text-slate-400 text-xs">Timeline</span><div>{detail.timeline ? detail.timeline.replace(/_/g, ' ') : '—'}</div></div>
                </div>
              )}
              {detail.lead_type === 'seller_inquiry' && detail.property_info.situation && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="font-medium text-slate-700 mb-1">Situation notes</div>
                  <p className="whitespace-pre-line text-slate-700">{detail.property_info.situation}</p>
                </div>
              )}

              {/* Photos (private, signed) */}
              {detail.photos && detail.photos.length > 0 && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="font-medium text-slate-700 mb-2">Seller Photos ({detail.photos.length})</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {detail.photos.map((p, i) => (
                      <a key={i} href={p.signed_url || undefined} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden bg-slate-100">
                        {p.signed_url && <img src={p.signed_url} alt={`Seller photo ${i + 1}`} className="w-full h-full object-cover" />}
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Private uploads — visible only to this company's team.</p>
                </div>
              )}

              {/* Attribution + consent */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5 text-xs">
                <div className="font-medium text-slate-700 text-sm mb-1">Attribution &amp; Consent</div>
                {detail.sale_title && <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-400" /> Sale: {detail.sale_title}</div>}
                {detail.source_url && <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-400" /> Source: <span className="truncate">{detail.source_url}</span></div>}
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Received: {detail.created_date ? new Date(detail.created_date).toLocaleString() : '—'}</div>
                <div className="flex items-center gap-1.5 flex-wrap"><ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Consent — marketing: {detail.marketing_opt_in ? 'yes' : 'no'} · buyer alerts: {detail.vip_opt_in ? 'yes' : 'no'} · SMS: {detail.sms_opt_in ? 'yes' : 'no'}{detail.consent_captured_at ? ` (captured ${new Date(detail.consent_captured_at).toLocaleDateString()})` : ''}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}