import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Mail, CheckCircle } from 'lucide-react';

// Shared helper: log referral + award points
export async function logReferral({ currentUser, operator, contactEmail }) {
  const referralCode = currentUser.id.slice(-8).toUpperCase();
  await base44.entities.Referral.create({
    referrer_id: currentUser.id,
    referrer_name: currentUser.full_name,
    referrer_email: currentUser.email,
    referral_code: referralCode,
    referred_email: contactEmail || '',
    referred_company_name: operator.company_name,
    account_type: 'estate_sale_operator',
    status: 'pending',
    reward_amount: 25,
    reward_status: 'pending',
  });
  const now = new Date();
  await base44.entities.UserReward.create({
    user_id: currentUser.id,
    action_id: 'operator_referral_sent',
    action_name: 'Operator Referral Sent',
    points_earned: 100,
    description: `Referred ${operator.company_name} to join EstateSalen.com`,
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  });
}

// Email modal — collects email address then sends
export function ReferByEmailModal({ operator, open, onClose, currentUser }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const referralCode = currentUser?.id?.slice(-8).toUpperCase() || 'XXXXXXXX';
  const referralLink = `${window.location.origin}/OperatorPackages?ref=${referralCode}`;

  const emailSubject = `${currentUser?.full_name || 'A colleague'} thinks you should list your estate sale company on EstateSalen.com`;
  const emailBody = `Hi ${operator?.company_name || 'there'},\n\n${currentUser?.full_name || 'Someone'} thought you'd be a great fit for EstateSalen.com — the platform helping estate sale companies grow their business with digital listings, marketing tools, and a national buyer network.\n\nSign up through their referral link and get started today:\n${referralLink}\n\nBest,\nThe EstateSalen.com Team`;

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    await logReferral({ currentUser, operator, contactEmail: email.trim() });
    await base44.integrations.Core.SendEmail({
      to: email.trim(),
      subject: emailSubject,
      body: emailBody,
    });
    setSending(false);
    setDone(true);
  };

  const handleClose = () => {
    setEmail('');
    setDone(false);
    onClose();
  };

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[90vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500" />
            Refer by Email
          </DialogTitle>
        </DialogHeader>

        {!currentUser ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-slate-600 text-sm">Sign in to send referrals and earn rewards.</p>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
              Sign In
            </Button>
          </div>
        ) : done ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="font-semibold text-slate-900">Email Sent!</p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 space-y-1 text-left">
              <p>✅ 100 points added to your account</p>
              <p>🎁 $25 bonus when they subscribe</p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 w-full min-w-0">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-semibold text-slate-900 text-sm">{operator.company_name}</p>
              <p className="text-xs text-slate-500">{operator.city}, {operator.state}</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 space-y-1">
              <p className="font-semibold text-orange-800 flex items-center gap-1"><Gift className="w-3 h-3" /> You earn:</p>
              <p>• 100 points instantly</p>
              <p>• $25 when they subscribe</p>
            </div>

            {/* Preview */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 overflow-hidden">
              <p className="text-xs font-semibold text-slate-600">Email Preview:</p>
              <p className="text-xs text-slate-500 italic line-clamp-3">{emailBody.split('\n').slice(0, 3).join(' ')}</p>
              <p className="text-xs text-cyan-600 break-all">{referralLink}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Their Email Address *</label>
              <Input
                type="email"
                placeholder="owner@estatesalecompany.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>

            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
              disabled={sending || !email.trim()}
              onClick={handleSend}
            >
              <Mail className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Email & Earn Rewards'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}