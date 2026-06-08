import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'probate', label: 'Probate / Estate Settlement' },
  { value: 'downsizing', label: 'Downsizing' },
  { value: 'divorce', label: 'Divorce Property Sale' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'senior_transition', label: 'Senior Transition' },
  { value: 'inherited_home', label: 'Inherited Home' },
  { value: 'estate_settlement', label: 'General Estate Settlement' },
  { value: 'bankruptcy', label: 'Bankruptcy' },
  { value: 'foreclosure', label: 'Foreclosure Cleanout' },
];

export default function LifeEventContentGenerator({ hubs, onRefresh }) {
  const [eventType, setEventType] = useState('probate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke('generateLifeEventHub', {
      event_type: eventType,
      force_regenerate: false,
    });
    setResult(res.data);
    setLoading(false);
    onRefresh();
  };

  const existing = hubs.find(h => h.event_type === eventType);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Generate or regenerate life event hub content. Each hub is the top-level educational page for a life transition type.</p>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label className="text-xs">Life Event Type</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="bg-slate-800 hover:bg-slate-900 text-white h-9 gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />{existing ? 'Regenerate' : 'Generate'} Hub</>}
        </Button>
      </div>

      {existing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
          Existing hub found: <strong>{existing.title}</strong> · Status: {existing.status}
        </div>
      )}

      {result && (
        <div className={`rounded-lg p-3 text-xs border ${result.success || result.id ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {result.success || result.id ? (
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Generated: <strong>{result.title || result.seo_title}</strong> · Saved as draft</span></div>
          ) : (
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{result.error || 'Generation failed'}</span></div>
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Existing Life Event Hubs</p>
        <div className="space-y-1">
          {hubs.map(h => (
            <div key={h.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-2">
              <span className="text-slate-700 font-medium">{h.title || h.event_type}</span>
              <span className={`px-2 py-0.5 rounded-full ${h.status === 'published' ? 'bg-green-100 text-green-700' : h.status === 'review' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                {h.status}
              </span>
            </div>
          ))}
          {!hubs.length && <p className="text-xs text-slate-400">No hubs generated yet.</p>}
        </div>
      </div>
    </div>
  );
}