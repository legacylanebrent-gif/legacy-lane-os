import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Mail, MessageSquare, CheckCircle, Copy, Check } from 'lucide-react';

export default function ReferOperatorModal({ operator, open, onClose, currentUser }) {
  const [method, setMethod] = useState('email'); // 'email' | 'sms'
  const [contactValue, setContactValue] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralCode = currentUser?.id?.slice(-8).toUpperCase() || 'XXXXXXXX';
  const referralLink = `${window.location.origin}/OperatorPackages?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!contactValue.trim()) return;
    setSending(true);

    // 1. Create Referral record
    await base44.entities.Referral.create({
      referrer_id: currentUser.id,
      referrer_name: currentUser.full_name,
      referrer_email: currentUser.email,
      referral_code: referralCode,
      referred_email: method === 'email' ? contactValue.trim() : operator.email || '',
      referred_company_name: operator.company_name,
      account_type: 'estate_sale_operator',
      status: 'pending',
      reward_amount: 25,
      reward_status: 'pending',
    });

    // 2. Award points to referrer (100 points for sending a referral)
    await base44.entities.UserReward.create({
      user_id: currentUser.id,
      action_id: 'operator_referral_sent',
      action_name: 'Operator Referral Sent',
      points_earned: 100,
      description: `Referred ${operator.company_name} to join EstateSalen.com`,
    });

    // 3. Send email invite
    if (method === 'email') {
      await base44.integrations.Core.SendEmail({
        to: contactValue.trim(),
        subject: `${currentUser.full_name || 'A colleague'} thinks you should list your company on EstateSalen.com`,
        body: `Hi ${operator.company_name},\n\n${currentUser.full_name || 'Someone'} thought you'd be a great fit for EstateSalen.com — the platform helping estate sale companies grow their business with digital listings, marketing tools, and a national buyer network.\n\nSign up through their referral link and get started today:\n${referralLink}\n\nBest,\nThe EstateSalen.com Team`,
      });
    }

    setSending(false);
    setDone(true);
  };

  const handleClose = () => {
    setDone(false);
    setContactValue('');
    setMethod('email');
    onClose();
  };

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="w-5 h-5 text-orange-500" />
            Refer This Company
          </DialogTitle>
        </DialogHeader>

        {!currentUser ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-slate-600">You need to be signed in to send referrals and earn rewards.</p>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
            >
              Sign In to Refer
            </Button>
          </div>
        ) : done ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Referral Sent!</h3>
            <p className="text-slate-600 text-sm">
              Your referral to <strong>{operator.company_name}</strong> has been recorded.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-orange-800">You earned:</p>
              <p className="text-xs text-orange-700">✅ 100 points added to your account</p>
              <p className="text-xs text-orange-700">🎁 $25 bonus when they subscribe</p>
            </div>
            <Button onClick={handleClose} className="w-full">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Company info */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-semibold text-slate-900 text-sm">{operator.company_name}</p>
              <p className="text-xs text-slate-500">{operator.city}, {operator.state}</p>
            </div>

            {/* Reward callout */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                <Gift className="w-4 h-4" /> Your Rewards
              </p>
              <p className="text-xs text-orange-700">• 100 points instantly when you send the referral</p>
              <p className="text-xs text-orange-700">• $25 bonus when they subscribe to a plan</p>
            </div>

            {/* Method toggle */}
            <div className="flex gap-2">
              <Button
                variant={method === 'email' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => { setMethod('email'); setContactValue(''); }}
              >
                <Mail className="w-4 h-4" /> Email
              </Button>
              <Button
                variant={method === 'sms' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => { setMethod('sms'); setContactValue(''); }}
              >
                <MessageSquare className="w-4 h-4" /> SMS / Text
              </Button>
            </div>

            {method === 'email' ? (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Their Email Address *
                </label>
                <Input
                  type="email"
                  placeholder="owner@estatesalecompany.com"
                  value={contactValue}
                  onChange={e => setContactValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <p className="text-xs text-slate-400 mt-1">We'll send them a personalized invite with your referral link.</p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Their Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={contactValue}
                  onChange={e => setContactValue(e.target.value)}
                />
                <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 font-medium">Copy this message to text them:</p>
                  <p className="text-xs text-slate-600 italic">
                    "Hey! I think you should list your estate sale company on EstateSalen.com. Use my link to sign up: {referralLink}"
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                  {contactValue && (
                    <a
                      href={`sms:${contactValue}?body=${encodeURIComponent(`Hey! I think you should list your estate sale company on EstateSalen.com. Use my link: ${referralLink}`)}`}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5">
                        <MessageSquare className="w-3 h-3" /> Open SMS
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              disabled={sending || !contactValue.trim()}
              onClick={handleSend}
            >
              {sending ? 'Sending...' : 'Send Referral & Earn Rewards'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}