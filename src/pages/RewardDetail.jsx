import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import { ArrowLeft, Star, Trophy, Gift, Calendar, Heart, Share2, ShoppingBag, Users, DollarSign, Camera, MessageSquare, ThumbsUp, Phone, UserPlus, ShoppingCart, ExternalLink } from 'lucide-react';

const CATEGORY_ICONS = {
  engagement: Heart,
  social: Share2,
  sales: ShoppingBag,
  referrals: Users,
  purchases: DollarSign,
  content: Camera,
};

const CATEGORY_COLORS = {
  engagement: 'bg-pink-100 text-pink-700',
  social: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
  referrals: 'bg-purple-100 text-purple-700',
  purchases: 'bg-orange-100 text-orange-700',
  content: 'bg-cyan-100 text-cyan-700',
};

const CATEGORY_LABELS = {
  engagement: 'Engagement',
  social: 'Social Sharing',
  sales: 'Sales',
  referrals: 'Referrals',
  purchases: 'Purchases',
  content: 'Content',
};

// CTA button config per action_id
const ACTION_CTAS = {
  phone_verified: { label: 'Verify Phone Now', icon: Phone, page: 'MyProfile', param: '?tab=account' },
  refer_user: { label: 'Refer a User', icon: UserPlus, page: 'ReferCompany' },
  document_purchase: { label: 'Record a Purchase', icon: ShoppingCart, page: 'RecordPurchase' },
  save_sale: { label: 'Browse Estate Sales', icon: Heart, page: '/' },
  share_app: { label: 'Share the App', icon: Share2, page: null, action: 'share' },
  create_wishlist: { label: 'Add Wanted Item', icon: Gift, page: 'MyProfile', param: '?tab=buyer_prefs' },
  add_calendar: { label: 'Browse Sales', icon: Calendar, page: '/' },
  rate_app: { label: 'Rate the App', icon: Star, page: null, action: 'rate' },
  write_review: { label: 'Write a Review', icon: MessageSquare, page: '/' },
  feedback_submit: { label: 'Submit Feedback', icon: MessageSquare, page: 'HowToUse' },
};

const REWARD_TIPS = {
  engagement: [
    'Log in daily to stay active',
    'Browse sales and save your favorites',
    'Interact with listings to build your profile',
  ],
  social: [
    'Share sales with friends and family',
    'Post about your finds on social media',
    'Refer estate sale companies to join EstateSalen',
  ],
  sales: [
    'Attend estate sales in your area',
    'Check in at sales using the QR code scanner',
    'Record your purchases to earn points',
  ],
  referrals: [
    'Share your personal referral link',
    'Invite friends to join EstateSalen',
    'Refer estate sale companies to subscribe',
  ],
  purchases: [
    'Record every purchase you make at estate sales',
    'Upload photos of your finds',
    'Review items you\'ve purchased',
  ],
  content: [
    'Upload photos from estate sales you attend',
    'Share item photos with the community',
    'Contribute to the marketplace by posting finds',
  ],
};

export default function RewardDetail() {
  const navigate = useNavigate();
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timesCompleted, setTimesCompleted] = useState(0);

  useEffect(() => {
    loadAction();
  }, []);

  const loadAction = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const actionId = params.get('actionId');
      if (!actionId) { navigate(createPageUrl('MyRewards')); return; }

      const userData = await base44.auth.me();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const actions = await base44.entities.RewardAction.filter({ action_id: actionId, is_active: true });
      if (actions.length === 0) { navigate(createPageUrl('MyRewards')); return; }
      setAction(actions[0]);

      const rewards = await base44.entities.UserReward.filter({
        user_id: userData.id,
        month: currentMonth,
      });
      const count = rewards.filter(r => r.action_id === actionId).length;
      setTimesCompleted(count);
    } catch (error) {
      console.error('Error loading reward:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-1/4" /><div className="h-64 bg-slate-200 rounded" /></div></div>
  );

  if (!action) return null;

  const Icon = CATEGORY_ICONS[action.category] || Star;
  const colorClass = CATEGORY_COLORS[action.category] || 'bg-slate-100 text-slate-700';
  const categoryLabel = CATEGORY_LABELS[action.category] || action.category;
  const tips = REWARD_TIPS[action.category] || REWARD_TIPS.engagement;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(createPageUrl('MyRewards'))} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to My Rewards
        </button>

        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-5">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${action.category === 'referrals' ? 'bg-white/30' : 'bg-white/20'}`}>
                <Icon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{action.action_name}</h1>
                <p className="text-purple-100 leading-relaxed text-lg">{action.action_description}</p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                    {action.frequency}
                  </Badge>
                  <Badge className="bg-yellow-400/20 text-yellow-200 border-yellow-400/30 text-sm px-3 py-1">
                    <Star className="w-4 h-4 mr-1 fill-yellow-200" /> {action.points} points
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">How to Earn This Reward</h2>
            <p className="text-slate-600 leading-relaxed">
              Complete this action to earn <strong>{action.points} points</strong> towards the monthly prize draw. 
              {action.frequency === 'unlimited' ? ' You can complete this action as many times as you want!' :
               action.frequency === 'once' ? ' This action can only be completed once.' :
               action.frequency === 'daily' ? ' You can complete this action once per day.' :
               ' You can complete this action once per week.'}
            </p>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" /> Tips for {categoryLabel}
              </h3>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <span className="text-purple-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {timesCompleted > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-green-600 fill-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">You've earned this reward!</p>
                  <p className="text-green-700 text-sm">Completed {timesCompleted} time{timesCompleted > 1 ? 's' : ''} this month</p>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Gift className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Monthly Prize Draw</p>
                  <p className="text-amber-700 text-sm">
                    Every point you earn enters you into our monthly prize draw for Visa gift cards and other prizes. The more points, the higher your chances!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Button */}
        {(() => {
          const cta = ACTION_CTAS[action.action_id];
          if (!cta) return null;
          const CtaIcon = cta.icon || ArrowLeft;
          
          if (cta.action === 'share') {
            return (
              <Button
                onClick={() => {
                  const shareData = { title: 'EstateSalen.com', text: 'Find estate sales near you — EstateSalen.com', url: window.location.origin };
                  if (navigator.share) {
                    navigator.share(shareData).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.origin);
                    alert('Link copied! Share it with friends.');
                  }
                }}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <CtaIcon className="w-4 h-4 mr-2" /> {cta.label}
              </Button>
            );
          }
          
          if (cta.action === 'rate') {
            return (
              <Button
                onClick={() => window.open('https://apps.apple.com/app/estatesalen', '_blank')}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> {cta.label}
              </Button>
            );
          }

          const targetPage = cta.page || '/';
          const targetUrl = cta.page ? createPageUrl(cta.page) + (cta.param || '') : targetPage;
          
          return (
            <Button
              onClick={() => navigate(targetUrl)}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <CtaIcon className="w-4 h-4 mr-2" /> {cta.label}
            </Button>
          );
        })()}

        <Button onClick={() => navigate(createPageUrl('MyRewards'))} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Rewards
        </Button>
      </div>
      <SharedFooter />
    </div>
  );
}