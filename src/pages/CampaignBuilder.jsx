import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Save, Wand2, Send, Mail, Users, AlertCircle, CheckCircle2, Loader2, ShoppingCart } from 'lucide-react';
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

const AUDIENCE_TYPES = [
  { value: 'followers', label: 'My Followers' },
  { value: 'crm_connections', label: 'CRM Connections' },
  { value: 'all_subscribers', label: 'All Subscribers' }
];

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState(null);
  const [user, setUser] = useState(null);
  const [quota, setQuota] = useState(null);
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [campaign, setCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'email',
    life_event_target: 'all',
    email_subject: '',
    email_body: '',
    sender_name: '',
    reply_to_email: '',
    audience_type: 'followers',
    funnel_steps: [],
    automation_triggers: []
  });

  useEffect(() => {
    loadUser();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('purchase') === 'success') {
      setPurchaseSuccess(true);
    }
  }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      setCampaign(prev => ({ ...prev, sender_name: u.company_name || u.full_name || '' }));

      // Fetch quota
      const quotaRes = await base44.functions.invoke('sendOperatorCampaign', { action: 'getQuota' });
      if (quotaRes.data?.success) setQuota(quotaRes.data.quota);

      // Fetch recipient preview
      const recRes = await base44.functions.invoke('sendOperatorCampaign', { action: 'getRecipients' });
      if (recRes.data?.success) setRecipientPreview(recRes.data);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const u = user || await base44.auth.me();
      const created = await base44.entities.Campaign.create({
        ...campaign,
        creator_id: u.id,
        status: 'draft'
      });
      setSavedCampaignId(created.id);
    } catch (error) {
      console.error('Error saving campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!savedCampaignId) return;
    try {
      setSending(true);
      setSendResult(null);
      const res = await base44.functions.invoke('sendOperatorCampaign', {
        action: 'sendCampaign',
        campaign_id: savedCampaignId,
      });
      setSendResult(res.data);
      // Refresh quota
      const quotaRes = await base44.functions.invoke('sendOperatorCampaign', { action: 'getQuota' });
      if (quotaRes.data?.success) setQuota(quotaRes.data.quota);
    } catch (err) {
      setSendResult({ error: err.message || 'Failed to send campaign' });
    } finally {
      setSending(false);
    }
  };

  const handleBuyProfiles = async () => {
    try {
      const res = await base44.functions.invoke('create-checkout', { product: 'additional_profiles' });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const isEmail = campaign.campaign_type === 'email';
  const availableQuota = quota ? quota.available : 0;
  const recipientCount = recipientPreview?.would_send || 0;
  const needsPurchase = recipientPreview?.needs_purchase || (recipientCount > availableQuota);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(createPageUrl('Campaigns'))}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900">Campaign Builder</h1>
              <p className="text-slate-600">Step {step} of 3</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gold-600 hover:bg-gold-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Campaign'}
          </Button>
        </div>

        {/* Purchase success banner */}
        {purchaseSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">
              Payment received! 1,000 additional email profiles have been added to your quota.
            </p>
          </div>
        )}

        {/* Quota bar */}
        {quota && (
          <div className="mb-6 bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gold-600" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Email Campaign Quota</p>
                <p className="text-xs text-slate-500">
                  {quota.profiles_used} used of {quota.profiles_included + quota.additional_purchased} available
                  {quota.additional_purchased > 0 && ` (${quota.additional_purchased} purchased)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={availableQuota > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {availableQuota} remaining
              </Badge>
              <Button size="sm" variant="outline" onClick={handleBuyProfiles}>
                <ShoppingCart className="w-4 h-4 mr-1" />
                Buy 1,000 More ($40)
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Campaign Details + Email Content */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-navy-900">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={campaign.name}
                  onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  placeholder="e.g., Probate Lead Nurture"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaign.description}
                  onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                  placeholder="Describe the goal of this campaign..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="type">Campaign Type *</Label>
                  <Select
                    value={campaign.campaign_type}
                    onValueChange={(val) => setCampaign({ ...campaign, campaign_type: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="life_event">Target Life Event</Label>
                  <Select
                    value={campaign.life_event_target}
                    onValueChange={(val) => setCampaign({ ...campaign, life_event_target: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LIFE_EVENTS.map(event => (
                        <SelectItem key={event.value} value={event.value}>{event.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email Content Section — only for email campaigns */}
              {isEmail && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gold-600" />
                    <h3 className="text-lg font-semibold text-navy-900">Email Content</h3>
                  </div>

                  <div>
                    <Label htmlFor="email_subject">Email Subject Line *</Label>
                    <Input
                      id="email_subject"
                      value={campaign.email_subject}
                      onChange={(e) => setCampaign({ ...campaign, email_subject: e.target.value })}
                      placeholder="e.g., New Estate Sale This Weekend in Your Area!"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email_body">Email Body (HTML) *</Label>
                    <Textarea
                      id="email_body"
                      value={campaign.email_body}
                      onChange={(e) => setCampaign({ ...campaign, email_body: e.target.value })}
                      placeholder="<h2>Hi there!</h2><p>Check out our upcoming estate sale...</p>"
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Supports HTML formatting for rich email content.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sender_name">Sender Name</Label>
                      <Input
                        id="sender_name"
                        value={campaign.sender_name}
                        onChange={(e) => setCampaign({ ...campaign, sender_name: e.target.value })}
                        placeholder="Your Company Name"
                      />
                      <p className="text-xs text-slate-500 mt-1">Defaults to your company name.</p>
                    </div>
                    <div>
                      <Label htmlFor="reply_to">Reply-To Email</Label>
                      <Input
                        id="reply_to"
                        type="email"
                        value={campaign.reply_to_email}
                        onChange={(e) => setCampaign({ ...campaign, reply_to_email: e.target.value })}
                        placeholder="replies@yourcompany.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="audience">Send To</Label>
                    <Select
                      value={campaign.audience_type}
                      onValueChange={(val) => setCampaign({ ...campaign, audience_type: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_TYPES.map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6 border-t">
                <Button onClick={() => setStep(2)} className="bg-gold-600 hover:bg-gold-700">
                  Next: Build Funnel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Build Funnel */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-navy-900">Build Your Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelBuilder
                steps={campaign.funnel_steps}
                onChange={(steps) => setCampaign({ ...campaign, funnel_steps: steps })}
              />
              <div className="flex justify-between pt-6 border-t mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="bg-gold-600 hover:bg-gold-700">
                  Next: Review & Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-navy-900">Review & Send</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Campaign summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Campaign Name</span>
                  <span className="text-sm font-medium text-slate-800">{campaign.name || 'Untitled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Type</span>
                  <span className="text-sm font-medium text-slate-800 capitalize">{campaign.campaign_type}</span>
                </div>
                {isEmail && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Subject</span>
                      <span className="text-sm font-medium text-slate-800 truncate ml-4">{campaign.email_subject || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Sender</span>
                      <span className="text-sm font-medium text-slate-800">{campaign.sender_name || '—'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Send section for email campaigns */}
              {isEmail ? (
                <div className="space-y-4">
                  {!savedCampaignId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        Save your campaign first, then you can send it to your audience.
                      </p>
                    </div>
                  )}

                  {savedCampaignId && (
                    <div className="space-y-4">
                      {/* Recipient info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {recipientPreview?.recipient_count || 0} eligible recipients
                          </p>
                          <p className="text-xs text-blue-700">
                            Will send to {recipientCount} recipients based on your available quota.
                          </p>
                        </div>
                      </div>

                      {/* Weekly limit notice */}
                      {recipientPreview?.weekly_limit_reached && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-900">
                              Weekly send limit reached
                            </p>
                            <p className="text-xs text-amber-700">
                              You last sent on {new Date(recipientPreview.last_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                              Elite companies can email their list once per week. You can send again on{' '}
                              {new Date(new Date(recipientPreview.last_sent_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Quota warning */}
                      {needsPurchase && availableQuota < recipientCount && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-800">
                              You have {availableQuota} profiles remaining but {recipientPreview?.recipient_count || 0} recipients.
                              Only {availableQuota} emails will be sent. Purchase more to reach your full audience.
                            </p>
                          </div>
                          <Button onClick={handleBuyProfiles} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buy 1,000 Additional Profiles ($40)
                          </Button>
                        </div>
                      )}

                      {/* Send button */}
                      <Button
                        onClick={handleSend}
                        disabled={sending || availableQuota <= 0}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        {sending ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending Campaign...</>
                        ) : (
                          <><Send className="w-5 h-5 mr-2" /> Send Campaign to {Math.min(recipientCount, availableQuota)} Recipients</>
                        )}
                      </Button>

                      {availableQuota <= 0 && (
                        <p className="text-center text-sm text-red-600">
                          Quota exhausted. Purchase additional profiles to send.
                        </p>
                      )}

                      {/* Send result */}
                      {sendResult?.success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              Campaign sent successfully!
                            </p>
                            <p className="text-xs text-green-700">
                              {sendResult.sent} emails delivered, {sendResult.failed} failed.
                              {sendResult.remaining_quota > 0 && ` ${sendResult.remaining_quota} profiles remaining.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {sendResult?.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <p className="text-sm text-red-800">{sendResult.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Wand2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">Smart Automation Coming Soon</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Behavior-based triggers, auto-follow-ups, and AI-powered optimization will be available here.
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-6 border-t">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  {savedCampaignId && (
                    <Button onClick={() => navigate(createPageUrl('Campaigns'))} className="bg-gold-600 hover:bg-gold-700">
                      Done
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}