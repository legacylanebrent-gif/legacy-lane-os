import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';

const OBJECTIVES = [
  { value: 'TRAFFIC', label: 'Traffic — Drive people to your listing' },
  { value: 'REACH', label: 'Reach — Maximize local awareness' },
  { value: 'LEAD_GENERATION', label: 'Lead Generation — Collect interested buyers' },
  { value: 'CONVERSIONS', label: 'Conversions — Drive sale day attendees' },
];

export default function LaunchFbAdModal({ campaign, open, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    objective: 'REACH',
    daily_budget: '25',
    start_date: '',
    end_date: '',
    target_location: '',
    radius_miles: '25',
    landing_page_url: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLaunch = async () => {
    setStep('loading');
    setErrorMsg('');
    try {
      const res = await base44.functions.invoke('generateFacebookAdCampaign', {
        campaign_name: campaign.title,
        objective: form.objective,
        daily_budget: parseFloat(form.daily_budget) || 25,
        start_date: form.start_date,
        end_date: form.end_date,
        target_location: form.target_location,
        radius_miles: parseInt(form.radius_miles) || 25,
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
    setStep('form');
    setResult(null);
    setErrorMsg('');
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

            {/* Post preview snippet */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Ad Creative</p>
              <p className="text-xs font-semibold text-slate-700 truncate">{campaign.title?.replace(/\[AI-[^\]]+\]\s*/, '') || campaign.title}</p>
              {campaign.image_url && (
                <img src={campaign.image_url} alt="Ad visual" className="mt-2 rounded-md w-full aspect-video object-cover" />
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-600">Campaign Objective</Label>
              <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                {OBJECTIVES.map(o => (
                  <button
                    key={o.value}
                    onClick={() => set('objective', o.value)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${form.objective === o.value ? 'border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2] font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Daily Budget ($)</Label>
                <Input type="number" value={form.daily_budget} onChange={e => set('daily_budget', e.target.value)} className="mt-1 text-sm" placeholder="25" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Radius (miles)</Label>
                <Input type="number" value={form.radius_miles} onChange={e => set('radius_miles', e.target.value)} className="mt-1 text-sm" placeholder="25" />
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
              <Label className="text-xs text-slate-600">Landing Page URL (optional)</Label>
              <Input value={form.landing_page_url} onChange={e => set('landing_page_url', e.target.value)} className="mt-1 text-sm" placeholder="https://..." />
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