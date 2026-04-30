import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Megaphone, DollarSign, Target, Users, Globe, Loader2, CheckCircle2 } from 'lucide-react';

const OBJECTIVES = [
  { value: 'OUTCOME_LEADS', label: 'Lead Generation', icon: '🎯' },
  { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness', icon: '📢' },
  { value: 'OUTCOME_TRAFFIC', label: 'Website Traffic', icon: '🌐' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Post Engagement', icon: '❤️' },
  { value: 'OUTCOME_SALES', label: 'Conversions / Sales', icon: '💰' },
];

const BILLING_EVENTS = [
  { value: 'IMPRESSIONS', label: 'Per 1,000 Impressions (CPM)' },
  { value: 'LINK_CLICKS', label: 'Per Click (CPC)' },
  { value: 'THRUPLAY', label: 'Per Video View (ThruPlay)' },
];

const OPTIMIZATION_GOALS = [
  { value: 'LEAD_GENERATION', label: 'Lead Generation' },
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'REACH', label: 'Reach' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'CONVERSIONS', label: 'Conversions' },
];

export default function CampaignBuilder({ adsCredentials, user }) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [campaign, setCampaign] = useState({
    name: '',
    objective: 'OUTCOME_LEADS',
    daily_budget: '20',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  const [adSet, setAdSet] = useState({
    name: '',
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LEAD_GENERATION',
    age_min: '25',
    age_max: '65',
    geo_locations: '',
    interests: '',
    bid_amount: '',
  });

  const [ad, setAd] = useState({
    name: '',
    headline: '',
    body: '',
    call_to_action: 'LEARN_MORE',
    link_url: 'https://estatesalen.com',
    image_url: '',
  });

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createFacebookCampaign', {
        credentials: adsCredentials,
        campaign,
        adSet,
        ad,
      });
      setResult(res.data);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to create campaign. Check your credentials and try again.');
    } finally {
      setCreating(false);
    }
  };

  const stepLabels = ['Campaign', 'Ad Set', 'Ad Creative', 'Launch'];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <React.Fragment key={i}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${
                step === i + 1 ? 'bg-blue-700 text-white' : step > i + 1 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
              onClick={() => step > i + 1 && setStep(i + 1)}
            >
              {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Campaign */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-700" /> Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input value={campaign.name} onChange={e => setCampaign({ ...campaign, name: e.target.value })} placeholder="e.g. Estate Sale - Scottsdale June" />
            </div>
            <div>
              <Label>Objective *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {OBJECTIVES.map(obj => (
                  <div
                    key={obj.value}
                    onClick={() => setCampaign({ ...campaign, objective: obj.value })}
                    className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${campaign.objective === obj.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="text-2xl mb-1">{obj.icon}</div>
                    <div className="text-sm font-medium text-slate-800">{obj.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Daily Budget ($) *</Label>
                <Input type="number" value={campaign.daily_budget} onChange={e => setCampaign({ ...campaign, daily_budget: e.target.value })} placeholder="20" />
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={campaign.start_date} onChange={e => setCampaign({ ...campaign, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input type="date" value={campaign.end_date} onChange={e => setCampaign({ ...campaign, end_date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!campaign.name || !campaign.daily_budget} className="bg-blue-700 hover:bg-blue-800">
                Next: Ad Set →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Ad Set */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-700" /> Ad Set & Targeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ad Set Name *</Label>
              <Input value={adSet.name} onChange={e => setAdSet({ ...adSet, name: e.target.value })} placeholder="e.g. Homeowners 35-65 Phoenix" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Optimization Goal</Label>
                <Select value={adSet.optimization_goal} onValueChange={v => setAdSet({ ...adSet, optimization_goal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPTIMIZATION_GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Event</Label>
                <Select value={adSet.billing_event} onValueChange={v => setAdSet({ ...adSet, billing_event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_EVENTS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Age</Label>
                <Input type="number" value={adSet.age_min} onChange={e => setAdSet({ ...adSet, age_min: e.target.value })} />
              </div>
              <div>
                <Label>Max Age</Label>
                <Input type="number" value={adSet.age_max} onChange={e => setAdSet({ ...adSet, age_max: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Target Cities / Zip Codes</Label>
              <Input value={adSet.geo_locations} onChange={e => setAdSet({ ...adSet, geo_locations: e.target.value })} placeholder="e.g. Phoenix, AZ; Scottsdale, AZ; 85250" />
              <p className="text-xs text-slate-400 mt-1">Separate multiple locations with semicolons</p>
            </div>
            <div>
              <Label>Interests (optional)</Label>
              <Input value={adSet.interests} onChange={e => setAdSet({ ...adSet, interests: e.target.value })} placeholder="e.g. Antiques, Home Decor, Estate Sales, Real Estate" />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)} disabled={!adSet.name} className="bg-blue-700 hover:bg-blue-800">
                Next: Ad Creative →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Ad Creative */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-700" /> Ad Creative
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ad Name *</Label>
              <Input value={ad.name} onChange={e => setAd({ ...ad, name: e.target.value })} placeholder="e.g. Estate Sale - June Promo - Image A" />
            </div>
            <div>
              <Label>Headline *</Label>
              <Input value={ad.headline} onChange={e => setAd({ ...ad, headline: e.target.value })} placeholder="e.g. Massive Estate Sale - This Weekend Only!" maxLength={40} />
              <p className="text-xs text-slate-400 mt-1">{ad.headline.length}/40 characters</p>
            </div>
            <div>
              <Label>Ad Body *</Label>
              <Textarea value={ad.body} onChange={e => setAd({ ...ad, body: e.target.value })} placeholder="Describe your estate sale, items available, dates and address..." rows={4} maxLength={125} />
              <p className="text-xs text-slate-400 mt-1">{ad.body.length}/125 characters</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Call to Action</Label>
                <Select value={ad.call_to_action} onValueChange={v => setAd({ ...ad, call_to_action: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                    <SelectItem value="GET_DIRECTIONS">Get Directions</SelectItem>
                    <SelectItem value="SHOP_NOW">Shop Now</SelectItem>
                    <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                    <SelectItem value="CONTACT_US">Contact Us</SelectItem>
                    <SelectItem value="GET_OFFER">Get Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destination URL *</Label>
                <Input value={ad.link_url} onChange={e => setAd({ ...ad, link_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={ad.image_url} onChange={e => setAd({ ...ad, image_url: e.target.value })} placeholder="https://your-image-cdn.com/photo.jpg" />
              {ad.image_url && (
                <img src={ad.image_url} alt="Ad preview" className="mt-2 rounded-lg max-h-40 object-cover border" />
              )}
            </div>

            {/* Preview */}
            <div className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50">
              <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Ad Preview</p>
              <div className="bg-white rounded-lg border border-slate-200 p-4 max-w-sm">
                {ad.image_url && <img src={ad.image_url} alt="preview" className="rounded-lg w-full h-32 object-cover mb-3" />}
                <p className="text-xs text-slate-400 mb-1">Sponsored</p>
                <p className="font-bold text-slate-900">{ad.headline || 'Your Headline Here'}</p>
                <p className="text-sm text-slate-600 mt-1">{ad.body || 'Your ad body text will appear here...'}</p>
                <div className="mt-3">
                  <span className="inline-block bg-blue-700 text-white text-xs px-3 py-1 rounded-full">{ad.call_to_action.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={handleCreate} disabled={creating || !ad.name || !ad.headline || !ad.body} className="bg-blue-800 hover:bg-blue-900">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Campaign…</> : <><Megaphone className="w-4 h-4 mr-2" /> Launch Campaign</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Campaign Created!</h2>
            {result && (
              <div className="space-y-2 text-sm text-slate-600 mt-4 text-left max-w-sm mx-auto bg-white border border-green-200 rounded-lg p-4">
                {result.campaign_id && <p>📁 <strong>Campaign ID:</strong> {result.campaign_id}</p>}
                {result.ad_set_id && <p>🎯 <strong>Ad Set ID:</strong> {result.ad_set_id}</p>}
                {result.ad_id && <p>🖼 <strong>Ad ID:</strong> {result.ad_id}</p>}
                {result.status && <p>📊 <strong>Status:</strong> <Badge className="bg-yellow-100 text-yellow-700 ml-1">{result.status}</Badge></p>}
              </div>
            )}
            <p className="text-slate-600 mt-4 text-sm">Your campaign is now in review by Facebook. It typically goes live within a few hours.</p>
            <Button onClick={() => { setStep(1); setCampaign({ name: '', objective: 'OUTCOME_LEADS', daily_budget: '20', start_date: new Date().toISOString().split('T')[0], end_date: '' }); setAdSet({ name: '', billing_event: 'IMPRESSIONS', optimization_goal: 'LEAD_GENERATION', age_min: '25', age_max: '65', geo_locations: '', interests: '', bid_amount: '' }); setAd({ name: '', headline: '', body: '', call_to_action: 'LEARN_MORE', link_url: 'https://estatesalen.com', image_url: '' }); setResult(null); }} className="mt-6 bg-blue-700 hover:bg-blue-800">
              <Plus className="w-4 h-4 mr-2" /> Create Another Campaign
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}