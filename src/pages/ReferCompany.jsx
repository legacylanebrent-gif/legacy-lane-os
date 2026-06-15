import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import { ArrowLeft, QrCode, Smartphone, Copy, Check, Send, Star, Building2, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import qrcode from 'qrcode';

export default function ReferCompany() {
  const [user, setUser] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Generate referral link — send to comparison page so they see value before pricing
      const link = `${window.location.origin}/CompareEstateSales?ref=${userData.id}`;
      setReferralLink(link);

      // Generate QR code
      const qrCanvas = document.createElement('canvas');
      await qrcode.toCanvas(qrCanvas, link, { width: 256, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } });
      setQrDataUrl(qrCanvas.toDataURL());
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSMS = () => {
    if (!phoneNumber.trim()) return;
    const message = encodeURIComponent(
      `Hi! I've been using EstateSalen.com to find estate sales and I think your company should list on here too. 🏠\n\n` +
      `EstateSalen.com is a full business platform for estate sale companies — everything from listing sales, AI pricing, POS checkout, marketing automation, CRM, and more. It's like EstateSales.net but a complete operating system for your business.\n\n` +
      `Check it out and get a free month trial: ${referralLink}`
    );
    window.open(`sms:${phoneNumber.replace(/\D/g, '')}&body=${message}`, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
        <Link to={createPageUrl('MyRewards')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to My Rewards
        </Link>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-sm font-semibold px-4 py-1.5 rounded-full">
            <Building2 className="w-4 h-4" /> Refer a Company
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Help Estate Sale Companies Discover EstateSalen</h1>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">
            Know an estate sale company that should be on EstateSalen? Share your referral link — they get a free month trial and you earn rewards!
          </p>
        </div>

        {/* QR Code Card */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">Your Referral QR Code</h2>
            </div>
            <p className="text-slate-600">
              Show this QR code to an estate sale company owner. When they scan it, they'll land on our pricing page with your referral tracked.
            </p>
            <div className="flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Referral QR Code" className="w-48 h-48 rounded-xl border-4 border-white shadow-lg" />
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center">
                  <div className="animate-pulse text-slate-400">Generating...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SMS Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">Send via Text Message</h2>
            </div>
            <p className="text-slate-600">
              Enter the company owner's phone number and we'll pre-fill a text message with your referral link.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Company owner's phone number"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                type="tel"
                className="flex-1"
              />
              <Button onClick={handleSendSMS} disabled={!phoneNumber.trim()} className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" /> Send SMS
              </Button>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-500">
              <p className="font-medium mb-1">Message preview:</p>
              <p>Hi! I've been using EstateSalen.com to find estate sales and I think your company should list on here too. 🏠</p>
              <p className="mt-1">EstateSalen.com is a full business platform for estate sale companies — everything from listing sales, AI pricing, POS checkout, marketing automation, CRM, and more.</p>
              <p className="mt-1 text-slate-400">Check it out and get a free month trial: {referralLink}</p>
            </div>
          </CardContent>
        </Card>

        {/* Copy Link Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Copy className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Share Your Link</h2>
            </div>
            <p className="text-slate-600">Copy your personal referral link to share anywhere — email, social media, or messaging apps.</p>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="flex-1 font-mono text-sm" />
              <Button onClick={handleCopyLink} variant="outline" className="flex-shrink-0">
                {copied ? <><Check className="w-4 h-4 mr-1" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mini Comparison */}
        <Card className="border-orange-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">Why EstateSalen Beats EstateSales.net</h2>
            </div>
            <p className="text-slate-600">
              EstateSales.net lists weekend sales. EstateSalen.com runs your entire company — from AI pricing and POS checkout to CRM, marketing automation, VIP events, contracts, and more. All for the same or less than what they already pay.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <h3 className="font-bold text-green-800 text-sm">EstateSalen Includes</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• AI item pricing & Google Lens</li>
                  <li>• QR code POS checkout</li>
                  <li>• Full CRM & lead scoring</li>
                  <li>• Marketing automation</li>
                  <li>• Mobile app for buyers</li>
                  <li>• ISO Wanted Items matching</li>
                  <li>• Free 1-month trial</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                <h3 className="font-bold text-red-800 text-sm">EstateSales.net Lacks</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• No AI tools or automation</li>
                  <li>• No CRM or lead management</li>
                  <li>• No point-of-sale checkout</li>
                  <li>• No marketing automation</li>
                  <li>• No mobile app</li>
                  <li>• No buyer matching</li>
                  <li>• No free trial</li>
                </ul>
              </div>
            </div>
            <Link to="/CompareEstateSales" className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-semibold text-sm">
              See the full 150+ feature comparison <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
      <SharedFooter />
    </div>
  );
}