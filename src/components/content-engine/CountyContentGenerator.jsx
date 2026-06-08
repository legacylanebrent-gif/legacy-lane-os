import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';

const US_STATES = [
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

const NJ_PRIORITY_COUNTIES = [
  'Monmouth County','Ocean County','Middlesex County','Bergen County','Essex County',
  'Morris County','Union County','Hudson County','Mercer County','Burlington County'
];

export default function CountyContentGenerator({ countyGuides, onRefresh }) {
  const [guideType, setGuideType] = useState('probate');
  const [singleState, setSingleState] = useState('New Jersey');
  const [singleCounty, setSingleCounty] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [bulkList, setBulkList] = useState(
    NJ_PRIORITY_COUNTIES.map(c => ({ state_name: 'New Jersey', county_name: c }))
  );
  const [bulkAddState, setBulkAddState] = useState('New Jersey');
  const [bulkAddCounty, setBulkAddCounty] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const handleSingle = async () => {
    if (!singleState || !singleCounty) return;
    setSingleLoading(true);
    const res = await base44.functions.invoke('populateCountyContent', {
      state_name: singleState, county_name: singleCounty, guide_type: guideType
    });
    setSingleLoading(false);
    setResults(p => [{ state: singleState, county: singleCounty, ...res.data }, ...p]);
    onRefresh();
  };

  const addToBulk = () => {
    if (!bulkAddState || !bulkAddCounty) return;
    setBulkList(p => [...p, { state_name: bulkAddState, county_name: bulkAddCounty }]);
    setBulkAddCounty('');
  };

  const removeFromBulk = (i) => setBulkList(p => p.filter((_, idx) => idx !== i));

  const handleBulk = async () => {
    setRunning(true);
    setResults([]);
    const res = await base44.functions.invoke('bulkGenerateCountyContent', {
      guide_type: guideType,
      counties_json: bulkList,
    });
    setResults(res.data?.results || []);
    setRunning(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs">Guide Type</Label>
        <Select value={guideType} onValueChange={setGuideType}>
          <SelectTrigger className="h-9 mt-1 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{GUIDE_TYPES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Single county */}
      <div className="border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">Single County Generate</p>
        <div className="flex gap-2 flex-wrap">
          <Select value={singleState} onValueChange={setSingleState}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={singleCounty} onChange={e => setSingleCounty(e.target.value)} placeholder="County name e.g. Monmouth County" className="h-9 w-56" />
          <Button onClick={handleSingle} disabled={singleLoading || !singleCounty} size="sm" className="h-9">
            {singleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" />Generate</>}
          </Button>
        </div>
      </div>

      {/* Bulk queue */}
      <div className="border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">Bulk Queue ({bulkList.length} counties)</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Select value={bulkAddState} onValueChange={setBulkAddState}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={bulkAddCounty} onChange={e => setBulkAddCounty(e.target.value)} placeholder="County name..." className="h-8 w-48 text-xs" />
          <Button onClick={addToBulk} size="sm" variant="outline" className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" />Add
          </Button>
          <button className="text-xs text-slate-400 hover:text-slate-600 ml-2" onClick={() => setBulkList([])}>Clear all</button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {bulkList.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
              <span className="text-slate-700">{item.county_name}, {item.state_name}</span>
              <button onClick={() => removeFromBulk(i)} className="text-slate-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <Button onClick={handleBulk} disabled={running || !bulkList.length} className="mt-3 bg-slate-800 hover:bg-slate-900 text-white gap-2 text-sm">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate {bulkList.length} County Drafts</>}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5 border-t pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Results</p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {r.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className="font-medium text-slate-700">{r.county}, {r.state}</span>
              {r.seo_title && <span className="text-slate-400 truncate">{r.seo_title}</span>}
              {r.error && <span className="text-red-500">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}