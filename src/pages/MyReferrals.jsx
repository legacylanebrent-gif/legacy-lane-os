import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QRCode from 'qrcode';
import { 
  Users, DollarSign, Gift, Copy, Download, CheckCircle, 
  Clock, TrendingUp, Share2 
} from 'lucide-react';

export default function MyReferrals() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Generate or get referral code
      const code = userData.id.slice(0, 8).toUpperCase();
      setReferralCode(code);

      // Generate referral link
      const referralLink = `${window.location.origin}/ReferralLanding?ref=${code}`;

      // Generate QR code
      const qr = await QRCode.toDataURL(referralLink, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qr);

      // Load referrals
      const referralData = await base44.entities.Referral.filter({ 
        referrer_id: userData.id 
      }, '-created_date');
      setReferrals(referralData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/ReferralLanding?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = 'legacy-lane-referral-qr.png';
    link.href = qrCodeUrl;
    link.click();
  };

  const stats = {
    total: referrals.length,
    signedUp: referrals.filter(r => r.status === 'signed_up' || r.status === 'subscribed' || r.status === 'paid').length,
    subscribed: referrals.filter(r => r.status === 'subscribed' || r.status === 'paid').length,
    paid: referrals.filter(r => r.status === 'paid').length,
    totalEarned: referrals.filter(r => r.status === 'paid').length * 25
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Referrals</h1>
        <p className="text-slate-600">Earn $25 for every company that signs up and pays for their first month</p>
      </div>

      {/* Incentive Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Earn $25 Visa Gift Cards!
              </h3>
              <p className="text-slate-700 leading-relaxed">
                Refer estate sale operators to Legacy Lane and earn a <strong>$25 Visa gift card</strong> for 
                each company that signs up and completes their first monthly subscription payment. 
                Share your QR code or referral link below to get started.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600">Total Referrals</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-600">Signed Up</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.signedUp}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-slate-600">Subscribed</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.subscribed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-600">Paid</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-green-700" />
              <span className="text-sm text-green-700 font-semibold">Total Earned</span>
            </div>
            <div className="text-3xl font-bold text-green-700">${stats.totalEarned}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QR Code Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Referral QR Code
            </h3>
            <div className="space-y-4">
              <div className="bg-white border-2 border-slate-200 rounded-lg p-6 flex flex-col items-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="Referral QR Code" className="w-64 h-64" />
                )}
                <p className="text-sm text-slate-600 mt-4 text-center">
                  Operators can scan this QR code to sign up with your referral
                </p>
              </div>
              <Button 
                onClick={downloadQRCode}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Your Referral Link
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">Referral Code</label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                  <span className="text-2xl font-bold text-slate-900 tracking-wider">
                    {referralCode}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">Share Link</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/ReferralLanding?ref=${referralCode}`}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm"
                  />
                  <Button onClick={copyReferralLink} variant="outline">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">How to Share</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• Print and display your QR code at estate sales</li>
                  <li>• Share the link via email or text message</li>
                  <li>• Post on social media with your referral code</li>
                  <li>• Include in your email signature</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      {referrals.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral History</h3>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div 
                  key={referral.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {referral.referred_company_name || 'Company Name Not Yet Provided'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {referral.referred_email || 'Email not provided'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Referred on {new Date(referral.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={
                      referral.status === 'paid' ? 'bg-green-100 text-green-700' :
                      referral.status === 'subscribed' ? 'bg-purple-100 text-purple-700' :
                      referral.status === 'signed_up' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {referral.status === 'paid' ? 'Paid - $25 Earned!' :
                       referral.status === 'subscribed' ? 'Subscribed' :
                       referral.status === 'signed_up' ? 'Signed Up' :
                       'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {referrals.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Referrals Yet</h3>
          <p className="text-slate-600 mb-6">
            Start sharing your QR code or referral link to earn rewards!
          </p>
        </Card>
      )}
    </div>
  );
}