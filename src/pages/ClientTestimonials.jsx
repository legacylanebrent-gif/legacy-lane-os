import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Quote, Eye, EyeOff, Archive, CheckCircle2, Copy } from 'lucide-react';

const SOURCES = ['PHONE', 'EMAIL', 'TEXT', 'WRITTEN', 'IN_PERSON', 'CARD', 'OTHER'];

const STATUS_STYLE = {
  CAPTURED: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-cyan-100 text-cyan-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-amber-100 text-amber-800',
};

const REQUEST_TEMPLATE = (name) => `Hi ${name || 'there'},

Thank you again for trusting us with your estate sale. If you have a moment, we'd be grateful for a few words about your experience working with us — what it was like, and whether you'd recommend us to someone in a similar situation.

If you're comfortable with us sharing your words publicly (first name only), just reply and let us know we have your permission.

Thank you — it means a lot to a small business.`;

const EMPTY_FORM = {
  id: null, testimonial_text: '', client_display_name: '', public_display_name: '',
  source: 'EMAIL', received_at: '', permission_to_publish: false, sale_id: '', notes: '',
};

export default function ClientTestimonials() {
  const [items, setItems] = useState(null);
  const [sales, setSales] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      const [list, saleList] = await Promise.all([
        base44.entities.ClientTestimonial.filter({ operator_id: user.id }),
        base44.entities.EstateSale.filter({ operator_id: user.id }),
      ]);
      setItems(list);
      setSales(saleList.slice(0, 50));
    } catch (e) {
      setItems([]);
    }
  };

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.testimonial_text.trim()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();
      const payload = {
        operator_id: user.id,
        company_id: user.company_id || undefined,
        sale_id: form.sale_id || undefined,
        client_display_name: form.client_display_name,
        testimonial_text: form.testimonial_text.trim(),
        source: form.source,
        received_at: form.received_at ? new Date(form.received_at).toISOString() : now,
        permission_to_publish: form.permission_to_publish,
        permission_recorded_at: form.permission_to_publish ? now : undefined,
        public_display_name: form.public_display_name,
        status: 'CAPTURED',
        notes: form.notes,
      };
      if (form.id) {
        await base44.entities.ClientTestimonial.update(form.id, payload);
      } else {
        await base44.entities.ClientTestimonial.create(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      alert('Could not save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (t, status) => {
    if (status === 'PUBLISHED' && !t.permission_to_publish) {
      alert('This client has not given permission to publish. Record their permission first.');
      return;
    }
    try {
      await base44.entities.ClientTestimonial.update(t.id, { status });
      await load();
    } catch (e) {
      alert('Could not update: ' + e.message);
    }
  };

  const revokePermission = async (t) => {
    if (!window.confirm('Revoke publication permission? The record becomes private again and leaves any public surface it was projected to.')) return;
    try {
      await base44.entities.ClientTestimonial.update(t.id, {
        permission_to_publish: false,
        permission_recorded_at: undefined,
        status: t.status === 'ARCHIVED' ? 'ARCHIVED' : 'CAPTURED',
      });
      await load();
    } catch (e) {
      alert('Could not update: ' + e.message);
    }
  };

  const copyRequest = async () => {
    try {
      await navigator.clipboard.writeText(REQUEST_TEMPLATE(form.client_display_name));
      alert('Request template copied. Send it through your usual email or messaging — nothing sends automatically.');
    } catch (e) {
      alert('Copy failed — select the text manually.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Quote className="w-6 h-6 text-cyan-600" /> Client Testimonials
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Authentic words from real clients. Records stay private until the client gives permission AND you approve
          them. Never create a testimonial from AI — only record what clients actually said.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Record a testimonial</Button>
        <Button variant="outline" onClick={() => setRequestOpen(true)}>Request template</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Testimonials ({(items || []).length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items === null && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
          {items !== null && items.length === 0 && (
            <p className="text-sm text-slate-500 py-4">No testimonials yet. Ask happy clients after closeout — real work is your best proof.</p>
          )}
          {(items || []).map(t => (
            <div key={t.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={STATUS_STYLE[t.status] || ''}>{t.status}</Badge>
                {t.permission_to_publish
                  ? <Badge className="bg-green-100 text-green-800">Publish permission</Badge>
                  : <Badge variant="secondary">Private</Badge>}
                {t.sale_id && <Badge variant="outline">{(sales.find(s => s.id === t.sale_id) || {}).title || 'Linked sale'}</Badge>}
                <span className="text-xs text-slate-400 ml-auto">{t.source} · {t.received_at ? new Date(t.received_at).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-sm text-slate-700 italic">"{t.testimonial_text}"</p>
              <p className="text-xs text-slate-500">— {t.client_display_name || 'Client'}{t.public_display_name ? ` (public: ${t.public_display_name})` : ''}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {t.status === 'CAPTURED' && <Button size="sm" variant="outline" onClick={() => setStatus(t, 'APPROVED')}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>}
                {t.status === 'APPROVED' && <Button size="sm" variant="outline" onClick={() => setStatus(t, 'PUBLISHED')}><Eye className="w-3.5 h-3.5" /> Publish</Button>}
                {t.status === 'PUBLISHED' && <Button size="sm" variant="outline" onClick={() => setStatus(t, 'APPROVED')}><EyeOff className="w-3.5 h-3.5" /> Unpublish</Button>}
                {t.permission_to_publish && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => revokePermission(t)}>Revoke permission</Button>
                )}
                {t.status !== 'ARCHIVED' && <Button size="sm" variant="ghost" onClick={() => setStatus(t, 'ARCHIVED')}><Archive className="w-3.5 h-3.5" /> Archive</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record a testimonial</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>What the client said</Label>
              <Textarea rows={4} value={form.testimonial_text} onChange={e => setForm(f => ({ ...f, testimonial_text: e.target.value }))} placeholder="Their words, as they said or wrote them." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client name (internal)</Label>
                <Input value={form.client_display_name} onChange={e => setForm(f => ({ ...f, client_display_name: e.target.value }))} />
              </div>
              <div>
                <Label>Public display name</Label>
                <Input value={form.public_display_name} onChange={e => setForm(f => ({ ...f, public_display_name: e.target.value }))} placeholder="e.g. Mary T." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Received via</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date received</Label>
                <Input type="date" value={form.received_at} onChange={e => setForm(f => ({ ...f, received_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Related sale (strongly preferred)</Label>
              <Select value={form.sale_id || 'none'} onValueChange={v => setForm(f => ({ ...f, sale_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sale link</SelectItem>
                  {sales.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <Label>Client gave permission to publish</Label>
                <p className="text-xs text-slate-400 mt-0.5">Only with explicit permission may a testimonial ever be shown publicly.</p>
              </div>
              <Switch checked={form.permission_to_publish} onCheckedChange={v => setForm(f => ({ ...f, permission_to_publish: v }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.testimonial_text.trim()}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Request a testimonial</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500">
            Sending stays in your hands — this only prepares an honest draft. Send it through your usual email or
            messaging. Nothing is sent automatically, and a reply is never recorded until you enter it here with
            permission.
          </p>
          <Textarea rows={9} defaultValue={REQUEST_TEMPLATE('')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Close</Button>
            <Button onClick={copyRequest}><Copy className="w-4 h-4" /> Copy template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}