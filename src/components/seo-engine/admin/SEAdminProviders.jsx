import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Edit, CheckCircle2, XCircle, Building2 } from 'lucide-react';

const PROVIDER_TYPES = ['estate_sale_operator','realtor','cleanout_vendor','investor','attorney_resource'];
const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const BLANK = { business_name:'', provider_type:'', contact_name:'', email:'', phone:'', website:'', state:'', description:'', counties_served_json:[], zip_codes_served_json:[], specialties_json:[], status:'pending' };

export default function SEAdminProviders({ providers, onRefresh }) {
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const data = {
      ...form,
      counties_served_json: typeof form.counties_served_json === 'string' ? form.counties_served_json.split(',').map(s=>s.trim()).filter(Boolean) : form.counties_served_json,
      zip_codes_served_json: typeof form.zip_codes_served_json === 'string' ? form.zip_codes_served_json.split(',').map(s=>s.trim()).filter(Boolean) : form.zip_codes_served_json,
      specialties_json: typeof form.specialties_json === 'string' ? form.specialties_json.split(',').map(s=>s.trim()).filter(Boolean) : form.specialties_json,
    };
    if (editingId) await base44.entities.ProviderDirectory.update(editingId, data);
    else await base44.entities.ProviderDirectory.create(data);
    setForm(BLANK); setEditingId(null);
    await onRefresh();
    setSaving(false);
  };

  const toggleActive = async (p) => {
    const status = p.status === 'active' ? 'inactive' : 'active';
    await base44.entities.ProviderDirectory.update(p.id, { status });
    await onRefresh();
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...p, counties_served_json: (p.counties_served_json||[]).join(', '), zip_codes_served_json: (p.zip_codes_served_json||[]).join(', '), specialties_json: (p.specialties_json||[]).join(', ') });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{editingId ? 'Edit Provider' : 'Add Provider'}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Business Name *</Label><Input value={form.business_name} onChange={e=>set('business_name',e.target.value)} /></div>
            <div><Label className="text-xs">Provider Type *</Label>
              <Select value={form.provider_type} onValueChange={v=>set('provider_type',v)}>
                <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                <SelectContent>{PROVIDER_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Contact Name</Label><Input value={form.contact_name} onChange={e=>set('contact_name',e.target.value)} /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e=>set('email',e.target.value)} /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
            <div><Label className="text-xs">Website</Label><Input value={form.website} onChange={e=>set('website',e.target.value)} /></div>
            <div><Label className="text-xs">State</Label>
              <Select value={form.state} onValueChange={v=>set('state',v)}>
                <SelectTrigger><SelectValue placeholder="State..." /></SelectTrigger>
                <SelectContent>{US_STATES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Counties Served (comma separated)</Label><Input value={typeof form.counties_served_json === 'string' ? form.counties_served_json : (form.counties_served_json||[]).join(', ')} onChange={e=>set('counties_served_json',e.target.value)} placeholder="Monmouth, Ocean, Bergen" /></div>
            <div><Label className="text-xs">ZIP Codes (comma separated)</Label><Input value={typeof form.zip_codes_served_json === 'string' ? form.zip_codes_served_json : (form.zip_codes_served_json||[]).join(', ')} onChange={e=>set('zip_codes_served_json',e.target.value)} /></div>
            <div><Label className="text-xs">Specialties (comma separated)</Label><Input value={typeof form.specialties_json === 'string' ? form.specialties_json : (form.specialties_json||[]).join(', ')} onChange={e=>set('specialties_json',e.target.value)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Input value={form.description} onChange={e=>set('description',e.target.value)} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} disabled={saving||!form.business_name||!form.provider_type} className="bg-slate-800 hover:bg-slate-900 gap-2">
              {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>} {editingId?'Update':'Add'} Provider
            </Button>
            {editingId && <Button variant="outline" onClick={()=>{setEditingId(null);setForm(BLANK);}}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {providers.map(p => (
          <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{p.business_name}</p>
                <Badge className="bg-slate-100 text-slate-600 text-xs">{p.provider_type?.replace(/_/g,' ')}</Badge>
                <Badge className={p.status==='active'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}>{p.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{p.state} {p.email && `· ${p.email}`}</p>
              {p.counties_served_json?.length>0 && <p className="text-xs text-slate-400">{p.counties_served_json.slice(0,4).join(', ')}{p.counties_served_json.length>4?' ...':''}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={()=>startEdit(p)}><Edit className="w-3 h-3"/></Button>
              <Button size="sm" onClick={()=>toggleActive(p)} className={p.status==='active'?'bg-slate-500 hover:bg-slate-600 text-white':'bg-green-600 hover:bg-green-700 text-white'}>
                {p.status==='active'?<XCircle className="w-3 h-3"/>:<CheckCircle2 className="w-3 h-3"/>}
              </Button>
            </div>
          </div>
        ))}
        {providers.length===0 && <div className="text-center py-10 text-slate-500"><Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300"/><p>No providers yet.</p></div>}
      </div>
    </div>
  );
}