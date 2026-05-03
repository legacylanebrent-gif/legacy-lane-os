import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, X, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUS_COLORS = {
  available: 'bg-green-100 text-green-700 border-green-200',
  full: 'bg-red-100 text-red-700 border-red-200',
  paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

function TagInput({ label, values, onChange }) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };

  const remove = (v) => onChange(values.filter(x => x !== v));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full border border-slate-200">
            {v}
            <button onClick={() => remove(v)} className="hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TerritoryProfileCard({ profile, operatorId, onSaved }) {
  const [editing, setEditing] = useState(!profile);
  const [form, setForm] = useState({
    company_name: profile?.company_name || '',
    service_counties: profile?.service_counties || [],
    service_zip_codes: profile?.service_zip_codes || [],
    service_towns: profile?.service_towns || [],
    max_agent_partnerships: profile?.max_agent_partnerships || 3,
    status: profile?.status || 'available',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, operator_id: operatorId };
    if (profile?.id) {
      await base44.entities.OperatorTerritoryProfile.update(profile.id, data);
    } else {
      await base44.entities.OperatorTerritoryProfile.create(data);
    }
    setSaving(false);
    setEditing(false);
    onSaved();
  };

  if (!editing && profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-900 text-lg">{profile.company_name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${STATUS_COLORS[profile.status]}`}>
              {profile.status}
            </span>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Counties</p>
            <div className="flex flex-wrap gap-1">
              {profile.service_counties?.length ? profile.service_counties.map(c => (
                <Badge key={c} variant="secondary">{c}</Badge>
              )) : <span className="text-slate-400 italic">None set</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">ZIP Codes</p>
            <div className="flex flex-wrap gap-1">
              {profile.service_zip_codes?.length ? profile.service_zip_codes.map(z => (
                <Badge key={z} variant="secondary">{z}</Badge>
              )) : <span className="text-slate-400 italic">None set</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Towns</p>
            <div className="flex flex-wrap gap-1">
              {profile.service_towns?.length ? profile.service_towns.map(t => (
                <Badge key={t} variant="secondary">{t}</Badge>
              )) : <span className="text-slate-400 italic">None set</span>}
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Partnerships: <span className="font-semibold text-slate-800">{profile.current_agent_partnerships || 0}</span> / {profile.max_agent_partnerships}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-orange-200 rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
        <MapPin className="w-5 h-5 text-orange-500" />
        {profile ? 'Edit Territory Profile' : 'Set Up Your Territory Profile'}
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company_name">Company Name *</Label>
          <Input id="company_name" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Your company name" />
        </div>
        <div>
          <Label htmlFor="max_partners">Max Agent Partnerships</Label>
          <Input id="max_partners" type="number" min={1} max={20} value={form.max_agent_partnerships} onChange={e => setForm({ ...form, max_agent_partnerships: Number(e.target.value) })} />
        </div>
      </div>
      <TagInput label="Service Counties" values={form.service_counties} onChange={v => setForm({ ...form, service_counties: v })} />
      <TagInput label="Service ZIP Codes" values={form.service_zip_codes} onChange={v => setForm({ ...form, service_zip_codes: v })} />
      <TagInput label="Service Towns" values={form.service_towns} onChange={v => setForm({ ...form, service_towns: v })} />
      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
        >
          <option value="available">Available</option>
          <option value="full">Full</option>
          <option value="paused">Paused</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving || !form.company_name} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save Profile'}
        </Button>
        {profile && <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
    </div>
  );
}