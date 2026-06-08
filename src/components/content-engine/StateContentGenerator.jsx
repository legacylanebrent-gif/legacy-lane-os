import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const PRIORITY_STATES = ['New Jersey','New York','Pennsylvania','Florida','Texas','California'];
const ALL_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

const GUIDE_TYPES = [
  { value: 'probate', label: 'Probate' },
  { value: 'inherited_home', label: 'Inherited Home' },
  { value: 'senior_transition', label: 'Senior Downsizing' },
  { value: 'estate_sale', label: 'Estate Cleanout' },
  { value: 'general', label: 'Moving Sale / General' },
];

export default function StateContentGenerator({ stateGuides, onRefresh }) {
  const [guideType, setGuideType] = useState('probate');
  const [selectedStates, setSelectedStates] = useState([...PRIORITY_STATES]);
  const [running, setRunning] = useState(false);
  const [singleState, setSingleState] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [results, setResults] = useState([]);

  const toggleState = (s) => setSelectedStates(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSingle = async () => {
    if (!singleState) return;
    setSingleLoading(true);
    const res = await base44.functions.invoke('populateStateContent', { state_name: singleState, guide_type: guideType });
    setSingleLoading(false);
    setResults(p => [{ state: singleState, ...res.data }, ...p]);
    onRefresh();
  };

  const handleBulk = async () => {
    setRunning(true);
    setResults([]);
    const res = await base44.functions.invoke('bulkGenerateStateContent', {
      guide_type: guideType,
      states_json: selectedStates,
    });
    setResults(res.data?.results || []);
    setRunning(false);
    onRefresh();
  };

  const existingMap = {};
  stateGuides.forEach(g => { existingMap[`${g.state_slug}-${g.guide_type}`] = g.status; });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Guide Type</Label>
          <Select value={guideType} onValueChange={setGuideType}>
            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{GUIDE_TYPES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Single State Generate</Label>
          <div className="flex gap-2 mt-1">
            <Select value={singleState} onValueChange={setSingleState}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pick a state..." /></SelectTrigger>
              <SelectContent>{ALL_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleSingle} disabled={singleLoading || !singleState} size="sm" className="h-9 shrink-0">
              {singleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Bulk Generate — Select States</Label>
          <div className="flex gap-2">
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setSelectedStates([...PRIORITY_STATES])}>Priority 6</button>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setSelectedStates([...ALL_STATES])}>All 50</button>
            <button className="text-xs text-slate-400 hover:underline" onClick={() => setSelectedStates([])}>Clear</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-lg bg-slate-50 max-h-40 overflow-y-auto">
          {ALL_STATES.map(s => {
            const slug = s.toLowerCase().replace(/\s+/g, '-');
            const existing = existingMap[`${slug}-${guideType}`];
            return (
              <button
                key={s}
                onClick={() => toggleState(s)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  selectedStates.includes(s)
                    ? 'bg-slate-800 text-white border-slate-800'
                    : existing === 'published'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : existing === 'draft'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s}{existing ? ` (${existing})` : ''}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1">{selectedStates.length} states selected · Green = published · Yellow = draft</p>
      </div>

      <Button onClick={handleBulk} disabled={running || !selectedStates.length} className="bg-slate-800 hover:bg-slate-900 text-white gap-2">
        {running ? <><Loader2 className="w-4 h-4 animate-spin" />Generating {selectedStates.length} states...</> : <><Sparkles className="w-4 h-4" />Generate {selectedStates.length} State Drafts</>}
      </Button>

      {results.length > 0 && (
        <div className="space-y-1.5 border-t pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Results</p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {r.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className="font-medium text-slate-700">{r.state}</span>
              {r.seo_title && <span className="text-slate-400 truncate">{r.seo_title}</span>}
              {r.error && <span className="text-red-500">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}