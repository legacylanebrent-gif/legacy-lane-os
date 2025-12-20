import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, Wand2 } from 'lucide-react';
import FunnelBuilder from '@/components/marketing/FunnelBuilder';

const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email Campaign' },
  { value: 'sms', label: 'SMS Campaign' },
  { value: 'postcard', label: 'Postcard Campaign' },
  { value: 'social', label: 'Social Media' },
  { value: 'funnel', label: 'Automated Funnel' },
  { value: 'multi_channel', label: 'Multi-Channel' }
];

const LIFE_EVENTS = [
  { value: 'probate', label: 'Probate' },
  { value: 'divorce', label: 'Divorce' },
  { value: 'downsizing', label: 'Downsizing' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'foreclosure', label: 'Foreclosure' },
  { value: 'investment', label: 'Investment' },
  { value: 'all', label: 'All Situations' }
];

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'email',
    life_event_target: 'all',
    funnel_steps: [],
    automation_triggers: []
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = await base44.auth.me();
      
      await base44.entities.Campaign.create({
        ...campaign,
        creator_id: user.id,
        status: 'draft'
      });

      navigate(createPageUrl('Campaigns'));
    } catch (error) {
      console.error('Error saving campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Campaigns'))}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900">
                Campaign Builder
              </h1>
              <p className="text-slate-600">Step {step} of 3</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gold-600 hover:bg-gold-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Campaign'}
          </Button>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-navy-900">
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={campaign.name}
                  onChange={(e) => setCampaign({...campaign, name: e.target.value})}
                  placeholder="e.g., Probate Lead Nurture"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaign.description}
                  onChange={(e) => setCampaign({...campaign, description: e.target.value})}
                  placeholder="Describe the goal of this campaign..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="type">Campaign Type *</Label>
                  <Select 
                    value={campaign.campaign_type} 
                    onValueChange={(val) => setCampaign({...campaign, campaign_type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="life_event">Target Life Event</Label>
                  <Select 
                    value={campaign.life_event_target} 
                    onValueChange={(val) => setCampaign({...campaign, life_event_target: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFE_EVENTS.map(event => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button onClick={() => setStep(2)} className="bg-gold-600 hover:bg-gold-700">
                  Next: Build Funnel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-navy-900">
                Build Your Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelBuilder
                steps={campaign.funnel_steps}
                onChange={(steps) => setCampaign({...campaign, funnel_steps: steps})}
              />

              <div className="flex justify-between pt-6 border-t mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="bg-gold-600 hover:bg-gold-700">
                  Next: Automation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-navy-900">
                Automation & Triggers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-12">
                  <Wand2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">
                    Smart Automation Coming Soon
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Behavior-based triggers, auto-follow-ups, and AI-powered optimization will be available here.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-gold-600 hover:bg-gold-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Campaign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}