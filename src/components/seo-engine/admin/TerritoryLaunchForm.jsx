import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Rocket, CheckCircle2 } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

const EMPTY = {
  state: '', county: '', cities: '', zip_codes: '',
  assigned_operator_name: '', assigned_agent_name: '',
  assigned_cleanout_vendor_name: '', assigned_investor_name: '',
  launch_status: 'draft', notes: '',
};

export default function TerritoryLaunchForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await base44.functions.invoke('launchTerritory', {
      state: form.state,
      county: form.county,
      cities: form.cities ? form.cities.split(',').map(s => s.trim()).filter(Boolean) : [],
      zip_codes: form.zip_codes ? form.zip_codes.split(',').map(s => s.trim()).filter(Boolean) : [],
      assigned_operator_name: form.assigned_operator_name || undefined,
      assigned_agent_name: form.assigned_agent_name || undefined,
      assigned_cleanout_vendor_name: form.assigned_cleanout_vendor_name || undefined,
      assigned_investor_name: form.assigned_investor_name || undefined,
      launch_status: form.launch_status,
      notes: form.notes,
    });
    setLoading(false);
    setResult(res.data);
    if (res.data?.success && onSuccess) onSuccess(res.data);
  };

  if (result?.success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <h3 className="font-bold text-green-800">Territory Launched!</h3>
        </div>
        <div className="text-sm text-green-700 space-y-1 mb-4">
          <p><strong>{result.county}, {result.state}</strong></p>
          <p>{result.pages_created} pages created/verified</p>
          <p>{result.routing_rules_created} routing rules created</p>
          <p>Sitemap: {result.sitemap_status}</p>
        </div>
        <div className="space-y-1">
          {result.log?.map((l, i) => (
            <p key={i} className="text-xs text-green-600 font-mono">• {l}</p>
          ))}
        </div>
        <Button className="mt-4" variant="outline" onClick={() => { setResult(null); setForm({ ...EMPTY }); }}>
          Launch Another Territory
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">State *</Label>
          <Select value={form.state} onValueChange={v => set('state', v)}>
            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select state..." /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">County *</Label>
          <Input value={form.county} onChange={e => set('county', e.target.value)} required placeholder="e.g. Monmouth" className="h-9 mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Cities (comma-separated, optional)</Label>
          <Input value={form.cities} onChange={e => set('cities', e.target.value)} placeholder="Red Bank, Freehold, Asbury Park" className="h-9 mt-1" />
        </div>
        <div>
          <Label className="text-xs">ZIP Codes (comma-separated, optional)</Label>
          <Input value={form.zip_codes} onChange={e => set('zip_codes', e.target.value)} placeholder="07701, 07728" className="h-9 mt-1" />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Provider Assignments (optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Estate Sale Company Owner Name</Label>
            <Input value={form.assigned_operator_name} onChange={e => set('assigned_operator_name', e.target.value)} placeholder="Company name..." className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Probate Realtor Name</Label>
            <Input value={form.assigned_agent_name} onChange={e => set('assigned_agent_name', e.target.value)} placeholder="Agent name..." className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Cleanout Vendor Name</Label>
            <Input value={form.assigned_cleanout_vendor_name} onChange={e => set('assigned_cleanout_vendor_name', e.target.value)} placeholder="Vendor name..." className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Investor Name</Label>
            <Input value={form.assigned_investor_name} onChange={e => set('assigned_investor_name', e.target.value)} placeholder="Investor name..." className="h-9 mt-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Launch Status</Label>
          <Select value={form.launch_status} onValueChange={v => set('launch_status', v)}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." className="h-9 mt-1" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading || !form.state || !form.county} className="bg-slate-800 hover:bg-slate-900 text-white">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Launching...</> : <><Rocket className="w-4 h-4 mr-2" />Launch Territory</>}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}