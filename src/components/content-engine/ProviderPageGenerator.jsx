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

const PRIORITY_STATES = ['New Jersey','New York','Pennsylvania','Florida','Texas','California'];

export default function ProviderPageGenerator({ onRefresh }) {
  const [selectedStates, setSelectedStates] = useState([...PRIORITY_STATES]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const toggleState = (s) => setSelectedStates(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleGenerate = async () => {
    setRunning(true);
    setResults([]);
    for (const state_name of selectedStates) {
      const res = await base44.functions.invoke('generateStateHubPage', { state_name });
      setResults(p => [...p, { state: state_name, ...res.data }]);
    }
    setRunning(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Generate state-level provider hub pages for estate sale companies and probate realtors. 
        These populate the <code className="text-xs bg-slate-100 px-1 rounded">/estate-sale-companies/{'{state}'}</code> and <code className="text-xs bg-slate-100 px-1 rounded">/probate-realtors/{'{state}'}</code> pages.
      </p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Select States</Label>
          <div className="flex gap-2">
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setSelectedStates([...PRIORITY_STATES])}>Priority 6</button>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setSelectedStates([...US_STATES])}>All 50</button>
            <button className="text-xs text-slate-400 hover:underline" onClick={() => setSelectedStates([])}>Clear</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-lg bg-slate-50 max-h-40 overflow-y-auto">
          {US_STATES.map(s => (
            <button key={s} onClick={() => toggleState(s)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${selectedStates.includes(s) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={running || !selectedStates.length} className="bg-slate-800 hover:bg-slate-900 text-white gap-2">
        {running ? <><Loader2 className="w-4 h-4 animate-spin" />Generating provider pages...</> : <><Sparkles className="w-4 h-4" />Generate {selectedStates.length} State Provider Pages</>}
      </Button>

      {results.length > 0 && (
        <div className="space-y-1.5 border-t pt-4">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {r.success || r.id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className="font-medium text-slate-700">{r.state}</span>
              {r.error && <span className="text-red-500">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}