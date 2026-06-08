import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Eye, CheckCircle2, XCircle, Zap, Loader2, MapPin } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington',
  'West Virginia','Wisconsin','Wyoming'
];
const GUIDE_TYPES = ['probate','inherited-property','senior-downsizing','assisted-living-transition','divorce-property-sale','foreclosure-cleanout','estate-cleanout','moving-sale'];
const STATUS_COLORS = { draft: 'bg-yellow-100 text-yellow-800', review: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

export default function SEAdminStateGuides({ guides, onRefresh }) {
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ state: '', guide_type: '' });
  const [filterState, setFilterState] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const generateGuide = async () => {
    if (!genForm.state || !genForm.guide_type) return;
    setGenerating(true);
    await base44.functions.invoke('generateStateGuide', { ...genForm, save_to_db: true });
    await onRefresh();
    setGenerating(false);
  };

  const togglePublish = async (guide) => {
    const newStatus = guide.status === 'published' ? 'draft' : 'published';
    await base44.entities.StateGuide.update(guide.id, { status: newStatus });
    await onRefresh();
  };

  const filtered = guides.filter(g =>
    (filterState === 'all' || g.state_name === filterState) &&
    (filterType === 'all' || g.guide_type === filterType)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Generate State Guide</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">State</Label>
              <Select value={genForm.state} onValueChange={v => setGenForm(p => ({ ...p, state: v }))}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Select state..." /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Guide Type</Label>
              <Select value={genForm.guide_type} onValueChange={v => setGenForm(p => ({ ...p, guide_type: v }))}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Guide type..." /></SelectTrigger>
                <SelectContent>{GUIDE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/-/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={generateGuide} disabled={generating || !genForm.state || !genForm.guide_type} className="bg-amber-600 hover:bg-amber-700 gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by state" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All States</SelectItem>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{GUIDE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/-/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-slate-500 self-center">{filtered.length} guides</span>
      </div>

      <div className="space-y-2">
        {filtered.map(g => (
          <div key={g.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{g.title || `${g.state_name} — ${g.guide_type}`}</p>
                <Badge className={STATUS_COLORS[g.status]}>{g.status}</Badge>
                <Badge className="bg-slate-100 text-slate-600 text-xs">{g.guide_type?.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{g.state_name} · /{g.state_slug}/{g.guide_type}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={`/${g.guide_type}/${g.state_slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><Eye className="w-3 h-3" /></Button>
              </a>
              <Button size="sm" onClick={() => togglePublish(g)}
                className={g.status === 'published' ? 'bg-slate-500 hover:bg-slate-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}>
                {g.status === 'published' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500"><MapPin className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No state guides yet.</p></div>
        )}
      </div>
    </div>
  );
}