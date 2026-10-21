import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { STAGES, STAGE_MAP } from '@/components/saleops/pipelineStages';

export default function NewDealForm({ form, setForm, onSave, onCancel, saving, existingDeals }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSearch = (value) => {
    setSearch(value);
    if (value.trim().length < 2) { setResults([]); setShowResults(false); return; }
    const q = value.toLowerCase();
    const matches = (existingDeals || [])
      .filter(d => d.client_name && d.client_name.toLowerCase().includes(q))
      .slice(0, 5);
    setResults(matches);
    setShowResults(matches.length > 0);
  };

  const handleSelect = (deal) => {
    f('client_name', deal.client_name || '');
    f('client_email', deal.client_email || '');
    f('client_phone', deal.client_phone || '');
    f('property_address', deal.property_address || '');
    f('property_city', deal.property_city || '');
    f('property_state', deal.property_state || '');
    f('situation', deal.situation || 'standard');
    f('estimated_value', deal.estimated_value || '');
    setSearch('');
    setShowResults(false);
  };

  return (
    <div className="space-y-4">
      {/* Client search */}
      <div className="relative">
        <Label>Search Existing Clients</Label>
        <div className="relative">
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Type client name to auto-fill..."
            className="pr-8"
          />
          {search && (
            <button onClick={() => { setSearch(''); setShowResults(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showResults && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map(deal => (
              <button
                key={deal.id}
                onMouseDown={() => handleSelect(deal)}
                className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-slate-100 last:border-0"
              >
                <div className="text-sm font-medium text-slate-900">{deal.client_name}</div>
                {deal.property_city && <div className="text-xs text-slate-500">{deal.property_city}, {deal.property_state} · {STAGE_MAP[deal.stage]?.label || deal.stage}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label>Client Name *</Label><Input value={form.client_name} onChange={e=>f('client_name',e.target.value)} placeholder="Jane Smith"/></div>
        <div><Label>Phone</Label><Input value={form.client_phone} onChange={e=>f('client_phone',e.target.value)} placeholder="(555) 123-4567"/></div>
        <div className="sm:col-span-2"><Label>Email</Label><Input type="email" value={form.client_email} onChange={e=>f('client_email',e.target.value)} placeholder="client@email.com"/></div>
        <div className="sm:col-span-2"><Label>Property Address</Label><Input value={form.property_address} onChange={e=>f('property_address',e.target.value)} placeholder="123 Main St"/></div>
        <div><Label>City</Label><Input value={form.property_city} onChange={e=>f('property_city',e.target.value)} placeholder="Springfield"/></div>
        <div><Label>State</Label><Input value={form.property_state} onChange={e=>f('property_state',e.target.value)} placeholder="NJ" maxLength={2}/></div>
        <div>
          <Label>Situation</Label>
          <Select value={form.situation} onValueChange={v=>f('situation',v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {['standard','probate','divorce','downsizing','relocation','foreclosure'].map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Deal Stage</Label>
          <Select value={form.stage} onValueChange={v=>f('stage',v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {STAGES.filter(s => !['lost','referred','nurture'].includes(s.key)).map(s=><SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Estimated Value ($)</Label><Input type="number" value={form.estimated_value} onChange={e=>f('estimated_value',e.target.value)} placeholder="25000"/></div>
        <div><Label>Consultation Date/Time</Label><Input type="datetime-local" value={form.consultation_date} onChange={e=>f('consultation_date',e.target.value)}/></div>
        <div><Label>Est. Sale Start Date</Label><Input type="date" value={form.estimated_sale_start_date} onChange={e=>f('estimated_sale_start_date',e.target.value)}/></div>
        <div><Label>Est. Sale End Date</Label><Input type="date" value={form.estimated_sale_end_date} onChange={e=>f('estimated_sale_end_date',e.target.value)}/></div>
        <div><Label>Commission Rate (%)</Label><Input type="number" value={form.commission_rate} onChange={e=>f('commission_rate',e.target.value)} placeholder="35"/></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={3} placeholder="Initial notes about the client or property..."/></div>
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Saving...</> : 'Create Deal'}
        </Button>
      </div>
    </div>
  );
}