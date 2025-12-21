import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Star, Gift, TrendingUp, Calendar, CheckCircle, 
  Users, DollarSign, Heart, Share2, Camera, ShoppingBag,
  MessageSquare, ThumbsUp, Award
} from 'lucide-react';

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  const [monthlyDraws, setMonthlyDraws] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

      // Load recent monthly draws
      const drawsData = await base44.entities.MonthlyDraw.list('-created_date', 3);
      setMonthlyDraws(drawsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalPoints = userRewards.reduce((sum, r) => sum + (r.points_earned || 0), 0);
  const actionsCompleted = new Set(userRewards.map(r => r.action_id)).size;

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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Rewards</h1>
        <p className="text-slate-600">Earn points for actions and enter monthly prize draws</p>
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
                All points you earn this month give you entries into our monthly prize draw. 
                The more points you earn, the higher your chances of winning a Visa gift card or other prizes!
              </p>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-purple-200">Draw Date:</span>
                  <span className="font-semibold ml-2">End of {new Date().toLocaleString('default', { month: 'long' })}</span>
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
            <div className="text-xs text-slate-500 mt-1">This month</div>
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
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-600">Rank</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">-</div>
            <div className="text-xs text-slate-500 mt-1">Coming soon</div>
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
          const canComplete = action.frequency === 'unlimited' || 
            (action.frequency === 'once' && timesCompleted === 0) ||
            (action.frequency === 'daily' && timesCompleted < 30) ||
            (action.frequency === 'weekly' && timesCompleted < 4);

          return (
            <Card key={action.id} className={`${!canComplete ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[action.category]}`}>
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {action.action_name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        {action.action_description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {action.frequency}
                        </Badge>
                        {timesCompleted > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Done {timesCompleted}x
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="w-5 h-5 fill-yellow-600" />
                      <span className="text-2xl font-bold">{action.points}</span>
                    </div>
                    <div className="text-xs text-slate-500">points</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
  );
}