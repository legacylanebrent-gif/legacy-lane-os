import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Users, Star, TrendingUp, Calendar, Gift, Award
} from 'lucide-react';

export default function AdminRewards() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [leaderboard, setLeaderboard] = useState([]);
  const [draws, setDraws] = useState([]);
  const [conducting, setConducting] = useState(false);
  const [prize, setPrize] = useState('$100 Visa Gift Card');
  const [prizeValue, setPrizeValue] = useState(100);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      // Load user rewards for the month
      const rewards = await base44.asServiceRole.entities.UserReward.filter({ 
        month: currentMonth 
      });

      // Group by user and calculate totals
      const userPoints = {};
      rewards.forEach(reward => {
        if (!userPoints[reward.user_id]) {
          userPoints[reward.user_id] = {
            user_id: reward.user_id,
            points: 0,
            actions_completed: 0
          };
        }
        userPoints[reward.user_id].points += reward.points_earned;
        userPoints[reward.user_id].actions_completed++;
      });

      // Get user details
      const users = await base44.asServiceRole.entities.User.list();
      const leaderboardData = Object.values(userPoints).map(up => {
        const user = users.find(u => u.id === up.user_id);
        return {
          ...up,
          user_name: user?.full_name || 'Unknown User',
          user_email: user?.email || ''
        };
      }).sort((a, b) => b.points - a.points);

      setLeaderboard(leaderboardData);

      // Load draws
      const drawsData = await base44.entities.MonthlyDraw.list('-created_date', 12);
      setDraws(drawsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const conductDraw = async () => {
    if (!confirm(`Conduct draw for ${currentMonth}? This will select a random winner based on their points.`)) {
      return;
    }

    setConducting(true);
    try {
      // Create weighted array based on points
      const weightedEntries = [];
      leaderboard.forEach(user => {
        for (let i = 0; i < user.points; i++) {
          weightedEntries.push(user.user_id);
        }
      });

      if (weightedEntries.length === 0) {
        alert('No participants for this month');
        return;
      }

      // Random selection
      const randomIndex = Math.floor(Math.random() * weightedEntries.length);
      const winnerId = weightedEntries[randomIndex];
      const winner = leaderboard.find(u => u.user_id === winnerId);

      // Create draw record
      await base44.entities.MonthlyDraw.create({
        month: currentMonth,
        total_participants: leaderboard.length,
        total_points: leaderboard.reduce((sum, u) => sum + u.points, 0),
        winner_user_id: winnerId,
        winner_name: winner.user_name,
        winner_points: winner.points,
        prize: prize,
        prize_value: parseFloat(prizeValue),
        draw_date: new Date().toISOString(),
        status: 'completed'
      });

      alert(`Winner: ${winner.user_name} with ${winner.points} points!`);
      await loadData();
    } catch (error) {
      console.error('Error conducting draw:', error);
      alert('Failed to conduct draw');
    } finally {
      setConducting(false);
    }
  };

  const totalPoints = leaderboard.reduce((sum, u) => sum + u.points, 0);
  const totalParticipants = leaderboard.length;

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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Rewards Administration</h1>
        <p className="text-slate-600">Manage monthly prize draws and view leaderboards</p>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <Label>Select Month</Label>
              <Input 
                type="month" 
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="mt-2 w-full sm:w-64"
              />
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-sm text-slate-600">Current Month</div>
              <div className="text-2xl font-bold text-slate-900">
                {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-600">Participants</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{totalParticipants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-slate-600">Total Points</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600">{totalPoints}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-600">Avg Points</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {totalParticipants > 0 ? Math.round(totalPoints / totalParticipants) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conduct Draw */}
      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Conduct Monthly Draw</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm">Prize Description</Label>
                  <Input 
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    placeholder="e.g., $100 Visa Gift Card"
                  />
                </div>
                <div>
                  <Label className="text-sm">Prize Value ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={prizeValue}
                    onChange={(e) => setPrizeValue(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
              <Button 
                onClick={conductDraw}
                disabled={conducting || totalParticipants === 0}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
              >
                <Gift className="w-4 h-4 mr-2" />
                {conducting ? 'Conducting Draw...' : 'Conduct Draw'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Leaderboard - {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((user, index) => (
                <div 
                  key={user.user_id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300' :
                    index === 1 ? 'bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-300' :
                    index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-300' :
                    'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-slate-400 text-white' :
                      index === 2 ? 'bg-orange-500 text-white' :
                      'bg-slate-300 text-slate-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{user.user_name}</p>
                      <p className="text-sm text-slate-600 truncate">{user.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 sm:text-right w-full sm:w-auto sm:flex-col sm:items-end pl-14 sm:pl-0">
                    <div className="flex items-center gap-1 text-yellow-600 font-bold text-lg">
                      <Star className="w-5 h-5 fill-yellow-600" />
                      {user.points}
                    </div>
                    <div className="text-xs text-slate-500">{user.actions_completed} actions</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No participants for this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Draws */}
      {draws.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Past Draws</h3>
            <div className="space-y-3">
              {draws.map((draw) => (
                <div key={draw.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <Trophy className="w-6 h-6 text-purple-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">
                        {new Date(draw.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        Winner: {draw.winner_name} ({draw.winner_points} points)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end w-full sm:w-auto pl-10 sm:pl-0">
                    <p className="font-bold text-green-600">{draw.prize}</p>
                    <Badge className={
                      draw.status === 'prize_sent' ? 'bg-green-100 text-green-700' :
                      draw.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {draw.status}
                    </Badge>
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