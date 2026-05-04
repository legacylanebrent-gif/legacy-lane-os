import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Calendar } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const PLATFORM_OPTIONS = ['Facebook','Instagram','LinkedIn','Twitter','TikTok'];
const AUDIENCE_OPTIONS = [
  'Estate sale operators and company owners',
  'Real estate agents looking for referral partnerships',
  'Estate sale operators + real estate agents',
  'Estate liquidation business owners',
  'Home sellers and downsizers',
];
const THEME_OPTIONS = [
  'Legacy Lane OS features and platform benefits',
  'Operator business growth and automation',
  'Referral program and revenue opportunities',
  'Estate sale business education',
  'Platform launch and onboarding',
];

export default function SocialCalendarGenerator({ onGenerated, loading }) {
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [platforms, setPlatforms] = useState(['Facebook','Instagram','LinkedIn']);
  const [ppw, setPpw] = useState('5');
  const [audience, setAudience] = useState(AUDIENCE_OPTIONS[0]);
  const [theme, setTheme] = useState(THEME_OPTIONS[0]);
  const [includeImages, setIncludeImages] = useState(true);

  const togglePlatform = (p) => setPlatforms(prev =>
    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
  );

  const handleGenerate = () => {
    onGenerated({ month, year: parseInt(year), platforms, posts_per_week: parseInt(ppw), target_audience: audience, campaign_theme: theme, include_images: includeImages });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Month</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {MONTHS.map(m => <SelectItem key={m} value={m} className="text-slate-200 focus:bg-slate-700">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Year</label>
          <Input value={year} onChange={e => setYear(e.target.value)} className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Posts / Week</label>
          <Select value={ppw} onValueChange={setPpw}>
            <SelectTrigger className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {['3','4','5','6','7'].map(n => <SelectItem key={n} value={n} className="text-slate-200 focus:bg-slate-700">{n} per week</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <button onClick={() => setIncludeImages(p => !p)}
            className={`w-full flex items-center justify-center gap-2 text-xs px-3 py-2.5 rounded-lg border font-medium transition-all ${includeImages ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-600 text-slate-400'}`}>
            {includeImages ? '✓ ' : ''}Generate Images
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Target Audience</label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a} className="text-slate-200 focus:bg-slate-700">{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Campaign Theme</label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {THEME_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-slate-200 focus:bg-slate-700">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map(p => (
            <button key={p} onClick={() => togglePlatform(p)}
              className={`text-xs px-4 py-2 rounded-full border font-medium transition-all ${platforms.includes(p) ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-600 bg-slate-800/40 text-slate-400 hover:border-slate-500'}`}>
              {platforms.includes(p) ? '✓ ' : ''}{p}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={loading || platforms.length === 0}
        className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm tracking-wide">
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI is writing your social calendar...</>
          : <><Sparkles className="w-4 h-4 mr-2" />Generate {month} {year} Social Calendar</>}
      </Button>
    </div>
  );
}