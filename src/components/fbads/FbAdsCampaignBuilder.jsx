import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';

const LANDING_PAGE_OPTIONS = [
  { label: 'Legacy Lane OS Demo Page', url: 'https://legacylaneos.com/demo' },
  { label: 'Legacy Lane OS Operator Sign-Up', url: 'https://legacylaneos.com/start' },
  { label: 'Landing Page: Offer Close', url: '/LandingPageOfferClose' },
  { label: 'Landing Page: Profit Levers', url: '/LandingPageProfitLevers' },
  { label: 'Landing Page: Fit Finder', url: '/LandingPageFitFinder' },
  { label: 'Landing Page: Calculator', url: '/LandingPageCalculator' },
];

export default function FbAdsCampaignBuilder({ settings, onCampaignCreated }) {
  const [form, setForm] = useState({
    campaign_goal: 'Generate demo requests from estate sale company owners looking to grow their business.',
    target_audience: 'Estate sale operators, estate liquidators, downsizing specialists in New Jersey. Ages 35-65, small business owners.',
    offer: 'Free Legacy Lane OS demo — see how operators grow revenue and automate referrals.',
    budget: settings?.default_daily_ad_budget || 25,
    start_date: '',
    end_date: '',
    creative_count: 3,
    selected_landing: LANDING_PAGE_OPTIONS[0].url,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!form.campaign_goal.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateFacebookAdCampaign', {
        campaign_goal: form.campaign_goal,
        target_audience: form.target_audience,
        offer: form.offer,
        landing_page_options: LANDING_PAGE_OPTIONS,
        budget: form.budget,
        start_date: form.start_date,
        end_date: form.end_date,
        creative_count: form.creative_count,
      });
      setResult(res.data);
      onCampaignCreated && onCampaignCreated(res.data.campaign_draft);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">AI will <strong>draft</strong> a complete campaign strategy + ad creatives. Nothing is published until you review, approve, and explicitly launch.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">Campaign Goal</label>
          <Textarea value={form.campaign_goal} onChange={e => set('campaign_goal', e.target.value)}
            className="min-h-[80px] text-sm resize-none" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">Target Audience Description</label>
          <Textarea value={form.target_audience} onChange={e => set('target_audience', e.target.value)}
            className="min-h-[70px] text-sm resize-none" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">Offer / Hook</label>
          <Input value={form.offer} onChange={e => set('offer', e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">Daily Budget ($)</label>
          <Input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">Ad Creatives to Generate</label>
          <Input type="number" min="1" max="5" value={form.creative_count} onChange={e => set('creative_count', parseInt(e.target.value))} className="text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">Start Date</label>
          <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-1.5">End Date</label>
          <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="text-sm" />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 uppercase tracking-widest block mb-2">Landing Page</label>
        <div className="flex flex-wrap gap-2">
          {LANDING_PAGE_OPTIONS.map(lp => (
            <button key={lp.url} onClick={() => set('selected_landing', lp.url)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${form.selected_landing === lp.url ? 'border-blue-400 bg-blue-100 text-blue-700' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'}`}>
              {lp.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <Button onClick={handleGenerate} disabled={loading || !form.campaign_goal.trim()}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI is building your campaign...</> : <><Zap className="w-4 h-4 mr-2" />Generate Campaign with AI</>}
      </Button>

      {result && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-green-700">✓ Campaign Draft Created: <span className="font-bold">{result.campaign_draft?.campaign_name}</span></p>
          <p className="text-xs text-green-600">{result.creatives?.length} ad creatives drafted. Review them in the Creative Builder tab.</p>
          {result.plan?.compliance_notes && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{result.plan.compliance_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}