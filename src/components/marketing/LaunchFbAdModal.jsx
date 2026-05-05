import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Loader2, CheckCircle2, ExternalLink, AlertTriangle, Info, X } from 'lucide-react';

const OBJECTIVES = [
  {
    value: 'REACH',
    label: 'Reach',
    sublabel: 'Maximize local awareness',
    info: 'Shows your ad to as many people as possible within your target area. Best for building early buzz 3–5 days before a sale. At $25/day you can expect ~2,000–5,000 impressions per day locally.',
  },
  {
    value: 'TRAFFIC',
    label: 'Traffic',
    sublabel: 'Drive people to your listing',
    info: 'Sends interested buyers directly to your sale listing page. Best if you have a public sale URL to link to. At $25/day expect ~100–300 link clicks from local buyers.',
  },
  {
    value: 'LEAD_GENERATION',
    label: 'Lead Generation',
    sublabel: 'Collect interested buyers',
    info: 'Facebook shows a built-in form — buyers submit name & email without leaving the app. Great for building a buyer list for future sales. At $25/day expect ~5–15 quality leads.',
  },
  {
    value: 'CONVERSIONS',
    label: 'Conversions',
    sublabel: 'Drive sale day attendees',
    info: 'Optimizes for people most likely to take action (attend, buy, register). Requires Facebook Pixel on your site for best results. At $25/day expect ~50–150 high-intent clicks from motivated buyers.',
  },
];

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow(s => !s); }}
        className="text-slate-400 hover:text-[#1877F2] transition-colors ml-1 align-middle"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 left-5 top-0 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl leading-relaxed">
          <button onClick={() => setShow(false)} className="absolute top-1.5 right-1.5 text-slate-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
          {text}
        </div>
      )}
    </div>
  );
}

function buildDefaults(campaign) {
  const today = new Date();
  const start = today.toISOString().split('T')[0];
  const end = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Build sale public URL
  const saleId = campaign.sale_id || '';
  const saleUrl = saleId
    ? `${window.location.origin}/SaleLanding?id=${saleId}`
    : '';

  // City from sale_title or notes — best effort
  const city = campaign.sale_city || campaign.city || '';

  return {
    objective: 'REACH',
    daily_budget: '25',
    start_date: start,
    end_date: end,
    target_location: city ? `${city}` : '',
    radius_miles: '20',
    landing_page_url: saleUrl,
  };
}

export default function LaunchFbAdModal({ campaign, open, onClose }) {
  const [step, setStep] = useState('form');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState(() => buildDefaults(campaign));

  // Re-initialize defaults whenever modal opens or campaign changes
  useEffect(() => {
    if (open) {
      setForm(buildDefaults(campaign));
      setStep('form');
      setResult(null);
      setErrorMsg('');
    }
  }, [open, campaign]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLaunch = async () => {
    setStep('loading');
    try {
      const res = await base44.functions.invoke('generateFacebookAdCampaign', {
        campaign_name: campaign.title,
        objective: form.objective,
        daily_budget: parseFloat(form.daily_budget) || 25,
        start_date: form.start_date,
        end_date: form.end_date,
        target_location: form.target_location,
        radius_miles: parseInt(form.radius_miles) || 20,
        landing_page_url: form.landing_page_url,
        headline: campaign.title?.replace(/\[AI-[^\]]+\]\s*/, '') || campaign.title,
        primary_text: campaign.description?.slice(0, 280) || '',
        image_url: campaign.image_url || '',
        sale_title: campaign.sale_title || '',
      });
      setResult(res.data);
      setStep('success');
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err.message || 'Failed to launch campaign.');
      setStep('error');
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[#1877F2]" />
            </div>
            Launch Paid Facebook Ad
            <Badge className="bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20 text-xs">Meta Ads</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* FORM */}
        {step === 'form' && (
          <div className="space-y-4 pt-1">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">This will create a draft campaign in Meta Ads Manager. Review and approve it before it goes live.</p>
            </div>

            {/* Ad Creative */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Ad Creative</p>
              <p className="text-xs font-semibold text-slate-700 truncate">{campaign.title?.replace(/\[AI-[^\]]+\]\s*/, '') || campaign.title}</p>
              {campaign.image_url && (
                <img src={campaign.image_url} alt="Ad visual" className="mt-2 rounded-md w-full aspect-video object-cover" />
              )}
            </div>

            {/* Objectives */}
            <div>
              <Label className="text-xs text-slate-600">Campaign Objective</Label>
              <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                {OBJECTIVES.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set('objective', o.value)}
                    className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between ${form.objective === o.value ? 'border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2] font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    <span>
                      <span className="font-semibold">{o.label}</span>
                      <span className={`ml-1.5 font-normal ${form.objective === o.value ? 'text-[#1877F2]/70' : 'text-slate-400'}`}>— {o.sublabel}</span>
                    </span>
                    <InfoTooltip text={o.info} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Daily Budget ($)</Label>
                <Input type="number" value={form.daily_budget} onChange={e => set('daily_budget', e.target.value)} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Radius (miles)</Label>
                <Input type="number" value={form.radius_miles} onChange={e => set('radius_miles', e.target.value)} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="mt-1 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-600">Target Location (city, state)</Label>
              <Input value={form.target_location} onChange={e => set('target_location', e.target.value)} className="mt-1 text-sm" placeholder="e.g. Newark, NJ" />
            </div>

            <div>
              <Label className="text-xs text-slate-600">Public Sale URL</Label>
              <Input value={form.landing_page_url} onChange={e => set('landing_page_url', e.target.value)} className="mt-1 text-sm" placeholder="https://..." />
              <p className="text-[10px] text-slate-400 mt-1">The public listing page buyers will land on after clicking the ad.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleLaunch} className="bg-[#1877F2] hover:bg-[#1565d8] text-white font-semibold">
                <Megaphone className="w-4 h-4 mr-2" />
                Create Ad Campaign Draft
              </Button>
            </div>
          </div>
        )}

        {/* LOADING */}
        {step === 'loading' && (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#1877F2] animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Creating your Facebook Ad campaign draft...</p>
            <p className="text-xs text-slate-400">Connecting to Meta Ads Manager</p>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Campaign Draft Created!</p>
              <p className="text-xs text-slate-500 mt-1">Review and activate it in Meta Ads Manager before it goes live.</p>
            </div>
            {result?.campaign_id && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full text-left">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Campaign ID</p>
                <p className="text-xs font-mono text-slate-700">{result.campaign_id}</p>
              </div>
            )}
            <div className="flex gap-2">
              {result?.ads_manager_url && (
                <a href={result.ads_manager_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-[#1877F2] hover:bg-[#1565d8] text-white text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open in Ads Manager
                  </Button>
                </a>
              )}
              <Button size="sm" variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Launch Failed</p>
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep('form')}>← Try Again</Button>
              <Button size="sm" variant="outline" onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}