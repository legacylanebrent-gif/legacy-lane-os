import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, CheckCircle2 } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

export default function ChecklistDownloadForm({ magnet, lifeEventType, stateContext, countyContext, onSuccess }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    state: stateContext || '', county: countyContext || '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.email) { setError('Please fill in your name and email.'); return; }
    setError('');
    setLoading(true);
    const res = await base44.functions.invoke('downloadLeadMagnet', {
      ...form,
      life_event_type: lifeEventType || magnet?.life_event_type || 'probate',
      magnet_id: magnet?.id,
      magnet_slug: magnet?.slug,
      source_url: window.location.pathname,
    });
    setLoading(false);
    if (res.data?.success) {
      setSubmitted(true);
      if (onSuccess) onSuccess(res.data);
    } else {
      setError(res.data?.error || 'Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Checklist Sent!</h3>
        <p className="text-slate-600 text-sm">Check your inbox — we've emailed your checklist to <strong>{form.email}</strong>.</p>
        <p className="text-slate-500 text-xs mt-2">Also scroll down to view the full checklist on this page.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-600">First Name *</Label>
          <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jane" className="mt-1 h-9" required />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Last Name</Label>
          <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" className="mt-1 h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-slate-600">Email Address *</Label>
        <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@email.com" className="mt-1 h-9" required />
      </div>
      <div>
        <Label className="text-xs text-slate-600">Phone (optional)</Label>
        <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className="mt-1 h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-600">State</Label>
          <Select value={form.state} onValueChange={v => set('state', v)}>
            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">County (optional)</Label>
          <Input value={form.county} onChange={e => set('county', e.target.value)} placeholder="e.g. Monmouth" className="mt-1 h-9" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-slate-400">By submitting, you agree to receive helpful estate transition resources from EstateSalen. We never sell your information.</p>
      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 font-semibold">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Download className="w-4 h-4" />Email Me the Checklist</>}
      </Button>
    </form>
  );
}