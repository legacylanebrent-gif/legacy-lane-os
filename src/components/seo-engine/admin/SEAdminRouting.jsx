import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, XCircle, CheckCircle2, GitBranch } from 'lucide-react';

const PROVIDER_TYPES = ['estate_sale_operator','realtor','cleanout_vendor','investor','attorney_resource'];
const LIFE_EVENTS = ['probate','downsizing','divorce','relocation','senior_transition','inherited_home','estate_settlement','bankruptcy','foreclosure','any'];
const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const BLANK = { provider_id:'', provider_type:'', state:'', county:'', zip_code:'', life_event_type:'any', priority_order:0, exclusive_until_date:'', is_active:true };

export default function SEAdminRouting({ rules, providers, onRefresh }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = async () => {
    if (!form.provider_id || !form.provider_type || !form.state) return;
    setSaving(true);
    await base44.entities.ProviderRoutingRule.create({ ...form, priority_order: parseInt(form.priority_order)||0 });
    setForm(BLANK);
    await onRefresh();
    setSaving(false);
  };

  const toggleActive = async (rule) => {
    await base44.entities.ProviderRoutingRule.update(rule.id, { is_active: !rule.is_active });
    await onRefresh();
  };

  const providerName = (id) => providers.find(p=>p.id===id)?.business_name || id;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Create Routing Rule</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><Label className="text-xs">Provider *</Label>
              <Select value={form.provider_id} onValueChange={v=>set('provider_id',v)}>
                <SelectTrigger><SelectValue placeholder="Select provider..." /></SelectTrigger>
                <SelectContent>{providers.map(p=><SelectItem key={p.id} value={p.id}>{p.business_name} ({p.provider_type?.replace(/_/g,' ')})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Provider Type *</Label>
              <Select value={form.provider_type} onValueChange={v=>set('provider_type',v)}>
                <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                <SelectContent>{PROVIDER_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">State *</Label>
              <Select value={form.state} onValueChange={v=>set('state',v)}>
                <SelectTrigger><SelectValue placeholder="State..." /></SelectTrigger>
                <SelectContent>{US_STATES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">County</Label><Input value={form.county} onChange={e=>set('county',e.target.value)} placeholder="e.g. Monmouth" /></div>
            <div><Label className="text-xs">ZIP Code</Label><Input value={form.zip_code} onChange={e=>set('zip_code',e.target.value)} placeholder="e.g. 07701" /></div>
            <div><Label className="text-xs">Life Event</Label>
              <Select value={form.life_event_type} onValueChange={v=>set('life_event_type',v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIFE_EVENTS.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Priority (lower = higher priority)</Label><Input type="number" value={form.priority_order} onChange={e=>set('priority_order',e.target.value)} /></div>
            <div><Label className="text-xs">Exclusive Until Date</Label><Input type="date" value={form.exclusive_until_date} onChange={e=>set('exclusive_until_date',e.target.value)} /></div>
          </div>
          <Button onClick={save} disabled={saving||!form.provider_id||!form.provider_type||!form.state} className="mt-4 bg-slate-800 hover:bg-slate-900 gap-2">
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>} Create Rule
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{providerName(r.provider_id)}</p>
                <Badge className="bg-slate-100 text-slate-600 text-xs">{r.provider_type?.replace(/_/g,' ')}</Badge>
                <Badge className={r.is_active?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}>{r.is_active?'Active':'Inactive'}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {r.state}{r.county?` → ${r.county}`:''}{r.zip_code?` → ${r.zip_code}`:''} · {r.life_event_type?.replace(/_/g,' ')} · priority {r.priority_order}
                {r.exclusive_until_date && ` · exclusive until ${r.exclusive_until_date}`}
              </p>
            </div>
            <Button size="sm" onClick={()=>toggleActive(r)} className={r.is_active?'bg-slate-500 hover:bg-slate-600 text-white':'bg-green-600 hover:bg-green-700 text-white'}>
              {r.is_active?<XCircle className="w-3 h-3"/>:<CheckCircle2 className="w-3 h-3"/>}
            </Button>
          </div>
        ))}
        {rules.length===0 && <div className="text-center py-10 text-slate-500"><GitBranch className="w-10 h-10 mx-auto mb-3 text-slate-300"/><p>No routing rules yet.</p></div>}
      </div>
    </div>
  );
}