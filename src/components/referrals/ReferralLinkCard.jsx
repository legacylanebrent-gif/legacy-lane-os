import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy, Check, Mail, Share2 } from 'lucide-react';

export default function ReferralLinkCard({ user, isOperator }) {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const referralCode = user?.id?.slice(-8).toUpperCase() || 'XXXXXXXX';
  const baseUrl = window.location.origin;
  const referralLink = isOperator
    ? `${baseUrl}/OperatorPackages?ref=${referralCode}`
    : `${baseUrl}/?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);

    // Create a pending referral record
    await base44.entities.Referral.create({
      referrer_id: user.id,
      referrer_name: user.full_name,
      referrer_email: user.email,
      referral_code: referralCode,
      referred_email: inviteEmail.trim(),
      status: 'pending',
      reward_status: 'pending',
    });

    // Send an email invite
    await base44.integrations.Core.SendEmail({
      to: inviteEmail.trim(),
      subject: `${user.full_name || 'A friend'} invited you to join Legacy Lane!`,
      body: isOperator
        ? `Hi there!\n\n${user.full_name || 'Someone'} thinks you'd love Legacy Lane OS — the all-in-one platform for estate sale companies.\n\nSign up using their referral link and both of you earn rewards:\n${referralLink}\n\nSee you inside!`
        : `Hi there!\n\n${user.full_name || 'A friend'} invited you to join EstateSalen.com to discover amazing estate sales near you!\n\nUse this link to sign up:\n${referralLink}\n\nSee you there!`,
    });

    setInviteEmail('');
    setSent(true);
    setSending(false);
    setTimeout(() => setSent(false), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on Legacy Lane!',
        text: isOperator
          ? 'Check out Legacy Lane OS — the platform for estate sale companies. Use my referral link:'
          : 'Join me on EstateSalen.com to find amazing estate sales near you!',
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Your Referral Link</h3>
            <p className="text-sm text-slate-500">
              {isOperator
                ? 'Share with other estate sale companies — earn $25 when they subscribe'
                : 'Share with friends — earn 100 points when they sign up'}
            </p>
          </div>
        </div>

        {/* Link display + copy */}
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-white font-mono text-sm text-slate-700 border-orange-200"
          />
          <Button
            onClick={handleCopy}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0 gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Code badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Your code:</span>
          <span className="bg-orange-100 text-orange-700 font-mono font-bold px-3 py-0.5 rounded-full text-sm tracking-widest">
            {referralCode}
          </span>
        </div>

        {/* Email invite */}
        <div className="border-t border-orange-200 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Send an Email Invite</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
              className="bg-white border-orange-200"
            />
            <Button
              onClick={handleSendInvite}
              disabled={sending || !inviteEmail.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white flex-shrink-0 gap-1.5"
            >
              {sent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              {sending ? 'Sending…' : sent ? 'Sent!' : 'Invite'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}