import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

export default function ChecklistContentGenerator({ onRefresh }) {
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    // Use generateLifeEventHub to produce a state-specific checklist hub
    const res = await base44.functions.invoke('generateLifeEventHub', {
      event_type: 'estate_settlement',
      state_context: state || undefined,
    });
    setResult(res.data);
    setLoading(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        The estate settlement checklist page at <code className="text-xs bg-slate-100 px-1 rounded">/estate-checklist</code> is a static component. 
        Use this tool to generate state-specific checklist content that can be embedded on state landing pages.
      </p>

      <div className="flex gap-3 items-end">
        <div>
          <Label className="text-xs">State Context (optional)</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="h-9 mt-1 w-48"><SelectValue placeholder="All states (generic)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Generic (all states)</SelectItem>
              {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="bg-slate-800 hover:bg-slate-900 text-white h-9 gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Checklist Hub</>}
        </Button>
      </div>

      {result && (
        <div className={`rounded-lg p-3 text-xs border ${result.id || result.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {result.id || result.success
            ? <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Generated: <strong>{result.title || result.seo_title}</strong></span></div>
            : <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{result.error || 'Failed'}</span></div>}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700 mb-2">Checklist pages are dynamically served at:</p>
        <p>• <code>/estate-checklist</code> — universal checklist</p>
        <p>• <code>/estate-checklist?state=New+Jersey</code> — state-filtered</p>
        <p>• <code>/estate-checklist?state=New+Jersey&county=Monmouth+County</code> — county-filtered</p>
        <p className="mt-2 text-slate-400">These parameters pre-fill the checklist and lead form with state/county context.</p>
      </div>
    </div>
  );
}