import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import SharedFooter from '@/components/layout/SharedFooter';
import { createPageUrl } from '@/utils';
import { 
  Trophy, Star, Gift, TrendingUp, Calendar, CheckCircle, 
  Users, DollarSign, Heart, Share2, Camera, ShoppingBag,
  MessageSquare, ThumbsUp, Award, ArrowRight, MapPin,
  PlusCircle, ExternalLink, UserCheck, Send, RefreshCw, CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import RecordPurchaseModal from '@/components/purchase/RecordPurchaseModal';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  engagement: Heart,
  social: Share2,
  sales: ShoppingBag,
  referrals: Users,
  purchases: DollarSign,
  content: Camera
};

const CATEGORY_COLORS = {
  engagement: 'bg-pink-100 text-pink-700',
  social: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
  referrals: 'bg-purple-100 text-purple-700',
  purchases: 'bg-orange-100 text-orange-700',
  content: 'bg-cyan-100 text-cyan-700'
};

export default function MyRewards() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  const [allTimeRewards, setAllTimeRewards] = useState([]);
  const [monthlyDraws, setMonthlyDraws] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentCheckIns, setRecentCheckIns] = useState(0);
  const [showRecordPurchase, setShowRecordPurchase] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const currentMonth = new Date().toISOString().slice(0, 7);

      // Load all reward actions
      const actionsData = await base44.entities.RewardAction.filter({ is_active: true });
      setActions(actionsData);

      // Load user's rewards for current month
      const rewardsData = await base44.entities.UserReward.filter({ 
        user_id: userData.id,
        month: currentMonth
      }, '-created_date');
      setUserRewards(rewardsData);

      // Load all-time rewards for annual count and once-action dedup
      const allYearPrefix = new Date().getFullYear().toString() + '-';
      const allRewards = await base44.entities.UserReward.filter({ 
        user_id: userData.id,
      }, '-created_date', 5000);
      setAllTimeRewards(allRewards);

      // Load recent monthly draws
      const drawsData = await base44.entities.MonthlyDraw.list('-created_date', 3);
      setMonthlyDraws(drawsData);

      // Load user context: recent check-ins (past 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const allCheckInRewards = await base44.entities.UserReward.filter({
        user_id: userData.id,
        action_id: 'checkin_sale'
      });
      const recentCheckInCount = allCheckInRewards.filter(r => 
        r.created_date && new Date(r.created_date) > new Date(weekAgo)
      ).length;
      setRecentCheckIns(recentCheckInCount);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear().toString();
  const totalPoints = userRewards.reduce((sum, r) => sum + (r.points_earned || 0), 0);
  const actionsCompleted = new Set(userRewards.map(r => r.action_id)).size;

  // Annual points — all rewards in current calendar year
  const annualPoints = allTimeRewards
    .filter(r => r.month && r.month.startsWith(currentYear))
    .reduce((sum, r) => sum + (r.points_earned || 0), 0);

  // All-time completion counts (for true one-time-only actions)
  const allTimeCompletionCounts = allTimeRewards.reduce((acc, reward) => {
    acc[reward.action_id] = (acc[reward.action_id] || 0) + 1;
    return acc;
  }, {});

  // Group actions by category
  const actionsByCategory = actions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {});

  const filteredActions = selectedCategory === 'all' 
    ? actions 
    : actions.filter(a => a.category === selectedCategory);

  // Check how many times user completed each action this month
  const completionCounts = userRewards.reduce((acc, reward) => {
    acc[reward.action_id] = (acc[reward.action_id] || 0) + 1;
    return acc;
  }, {});

  // ── CTA Configuration per action ──
  const getActionCTA = (action) => {
    const ctaMap = {
      spend_100: { 
        label: 'Record Purchase', icon: DollarSign, 
        onClick: () => setShowRecordPurchase(true),
        context: `You have ${recentCheckIns} sales on your calendar this week — record your purchases to earn 75 points.` 
      },
      spend_500: { 
        label: 'Record Purchase', icon: DollarSign, 
        onClick: () => setShowRecordPurchase(true),
        context: `You have ${recentCheckIns} sales on your calendar this week — document big spending for 200 points.` 
      },
      document_purchase: { 
        label: 'Record Purchase', icon: Camera, 
        onClick: () => setShowRecordPurchase(true),
        context: 'Upload a photo and details of items you bought to earn 15 points.' 
      },
      checkin_sale: { 
        label: 'Find Nearby Sales', icon: MapPin, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: `You've checked into ${recentCheckIns} sales this week. Find more to earn points!` 
      },
      first_checkin: { 
        label: 'Find Your First Sale', icon: MapPin, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Find an estate sale near you and check in to earn 25 bonus points.' 
      },
      attend_3_sales: { 
        label: 'Find Sales', icon: MapPin, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: `You've attended ${completionCounts.checkin_sale || 0} sales this month.` 
      },
      attend_5_sales: { 
        label: 'Find Sales', icon: MapPin, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: `You've attended ${completionCounts.checkin_sale || 0} sales this month. Keep going!` 
      },
      add_calendar: { 
        label: 'Browse Sales', icon: Calendar, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Find upcoming sales and add them to your calendar to earn points.' 
      },
      refer_user: { 
        label: 'Refer a Friend', icon: Users, 
        onClick: () => navigate(createPageUrl('ReferCompany')),
        context: 'Share EstateSalen.com with friends — you both earn points!' 
      },
      refer_operator: { 
        label: 'Refer an Operator', icon: Users, 
        onClick: () => navigate(createPageUrl('ReferCompany')),
        context: 'Get an estate sale company to join — earn 500 bonus points!' 
      },
      share_sale: { 
        label: 'Share Sale', icon: Share2, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Browse sales and share your favorites to earn points.' 
      },
      share_app: { 
        label: 'Share App', icon: Share2, 
        onClick: async () => {
          if (navigator.share) {
            await navigator.share({ title: 'EstateSalen.com', text: 'Find estate sales near you!', url: window.location.origin });
          } else {
            await navigator.clipboard.writeText(window.location.origin);
            toast.success('Link copied! Share it with friends.');
          }
        },
        context: 'Share the app link with friends to earn 10 points.' 
      },
      profile_complete: { 
        label: 'Complete Profile', icon: UserCheck, 
        onClick: () => navigate(createPageUrl('MyProfile')),
        context: 'Fill out your profile details to unlock rewards.' 
      },
      create_wishlist: { 
        label: 'Create Wishlist', icon: Heart, 
        onClick: () => navigate(createPageUrl('Favorites')),
        context: 'Save items you\'re looking for — earn 15 points for your first wishlist.' 
      },
      save_sale: { 
        label: 'Browse Sales', icon: Heart, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Browse sales and save your favorites to earn points.' 
      },
      write_review: { 
        label: 'Write a Review', icon: MessageSquare, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Leave a review for a sale or item you loved.' 
      },
      upload_photo: { 
        label: 'Upload Photo', icon: Camera, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Check in to a sale and upload a photo to earn points.' 
      },
      rate_app: { 
        label: 'Rate the App', icon: Star, 
        onClick: () => toast.success('Thanks! We\'d love your review in the app store.'),
        context: 'Leave a rating in the app store to earn 25 points.' 
      },
      newsletter_signup: { 
        label: 'Subscribe', icon: Send, 
        onClick: () => toast.success('You\'re subscribed! Watch your inbox for updates.'),
        context: 'Sign up for email updates to earn 15 points.' 
      },
      message_operator: { 
        label: 'Message an Operator', icon: Send, 
        onClick: () => navigate(createPageUrl('EstateSaleFinder')),
        context: 'Find a sale and message the operator to earn points.' 
      },
    };
    return ctaMap[action.action_id] || null;
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
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Rewards</h1>
          <p className="text-slate-600">Earn points for actions and enter monthly prize draws</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setRefreshing(true);
            await loadData();
            setRefreshing(false);
          }}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Prize Banner */}
      <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">Monthly Prize Draw</h3>
              <p className="text-purple-100 leading-relaxed mb-3">
                Earn points all month long. We draw winners on the last day of {new Date().toLocaleString('default', { month: 'long' })}, 
                and points reset on the 1st so everyone starts fresh. The more points you earn, the higher your chances!
              </p>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-purple-200">Draw Date:</span>
                  <span className="font-semibold ml-2">
                    {(() => {
                      const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-purple-200">Your Entries:</span>
                  <span className="font-semibold ml-2">{totalPoints} points</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-slate-600">Total Points</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600">{totalPoints}</div>
            <div className="text-xs text-slate-500 mt-1">Resets on the 1st</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-600">Actions Done</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{actionsCompleted}</div>
            <div className="text-xs text-slate-500 mt-1">Out of {actions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-slate-600">Annual Points</span>
            </div>
            <div className="text-3xl font-bold text-emerald-600">{annualPoints}</div>
            <div className="text-xs text-slate-500 mt-1">Year-end drawing entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-slate-600">Prize Chance</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {totalPoints > 0 ? '✓' : '-'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Entered</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          className={`cursor-pointer ${selectedCategory === 'all' ? 'bg-slate-800' : 'bg-slate-200 text-slate-700'}`}
          onClick={() => setSelectedCategory('all')}
        >
          All Actions
        </Badge>
        {Object.keys(actionsByCategory).map((category) => {
          const Icon = CATEGORY_ICONS[category];
          return (
            <Badge 
              key={category}
              className={`cursor-pointer ${selectedCategory === category ? CATEGORY_COLORS[category] : 'bg-slate-200 text-slate-700'}`}
              onClick={() => setSelectedCategory(category)}
            >
              {Icon && <Icon className="w-3 h-3 mr-1" />}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          );
        })}
      </div>

      {/* Actions Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredActions.map((action) => {
          const Icon = CATEGORY_ICONS[action.category];
          const timesCompleted = completionCounts[action.action_id] || 0;
          const allTimeCompleted = allTimeCompletionCounts[action.action_id] || 0;
          const canComplete = action.frequency === 'unlimited' || 
            (action.frequency === 'once' && allTimeCompleted === 0) ||
            (action.frequency === 'daily' && timesCompleted < 30) ||
            (action.frequency === 'weekly' && timesCompleted < 4);
          const cta = getActionCTA(action);

          return (
            <Card 
              key={action.id} 
              className={`${!canComplete ? 'opacity-60' : ''} hover:shadow-md transition-shadow overflow-hidden`}
            >
              <CardContent className="p-0">
                {/* Main card content */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => navigate(createPageUrl('RewardDetail') + '?actionId=' + action.action_id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[action.category]}`}>
                        {Icon && <Icon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {action.action_name}
                        </h3>
                        <p className="text-sm text-slate-600 mb-2">
                          {action.action_description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {action.frequency === 'once' ? 'one-time' : action.frequency}
                          </Badge>
                          {timesCompleted > 0 && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Done {timesCompleted}x
                            </Badge>
                          )}
                          {action.frequency === 'once' && allTimeCompleted > 0 && timesCompleted === 0 && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed previously
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="w-5 h-5 fill-yellow-600" />
                        <span className="text-2xl font-bold">{action.points}</span>
                      </div>
                      <div className="text-xs text-slate-500">points</div>
                    </div>
                  </div>
                </div>

                {/* CTA Footer — only if action is completable */}
                {canComplete && cta && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    {cta.context && (
                      <p className="text-xs text-slate-500 mb-2">{cta.context}</p>
                    )}
                    <Button
                      onClick={(e) => { e.stopPropagation(); cta.onClick(); }}
                      variant="outline"
                      size="sm"
                      className="w-full justify-between border-slate-300 hover:bg-white hover:border-slate-400 text-slate-700"
                    >
                      <span className="flex items-center gap-1.5">
                        {cta.icon && <cta.icon className="w-3.5 h-3.5" />}
                        {cta.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Record Purchase Modal */}
      {showRecordPurchase && (
        <RecordPurchaseModal
          open={showRecordPurchase}
          onClose={() => setShowRecordPurchase(false)}
        />
      )}

      {/* Recent Activity */}
      {userRewards.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {userRewards.slice(0, 10).map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{reward.action_name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(reward.created_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600 font-semibold">
                    <Star className="w-4 h-4 fill-yellow-600" />
                    +{reward.points_earned}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Winners */}
      {monthlyDraws.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Recent Winners
            </h3>
            <div className="space-y-3">
              {monthlyDraws.filter(d => d.status === 'completed' || d.status === 'prize_sent').map((draw) => (
                <div key={draw.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{draw.winner_name}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(draw.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{draw.prize}</p>
                    <p className="text-xs text-slate-500">{draw.winner_points} points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
      <SharedFooter />
    </div>
  );
}