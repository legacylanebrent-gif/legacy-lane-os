import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MapPin, Gift, Star, TrendingUp, Calendar, Camera, Plus,
  CheckCircle2, Award, Target, Zap, QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import QRCodeScanner from '@/components/checkin/QRCodeScanner';

export default function RewardsCheckins() {
  const [user, setUser] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  const [rewardActions, setRewardActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [checkInsData, userRewardsData, actionsData] = await Promise.all([
        base44.entities.CheckIn.filter({ created_by: userData.email }, '-created_date', 50),
        base44.entities.UserReward.filter({ user_id: userData.id }, '-created_date'),
        base44.entities.RewardAction.filter({ is_active: true })
      ]);

      setCheckIns(checkInsData);
      setUserRewards(userRewardsData);
      setRewardActions(actionsData);

      const points = userRewardsData.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      setTotalPoints(points);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentCheckIns = checkIns.slice(0, 10);
  const thisWeekCheckIns = checkIns.filter(c => {
    const date = new Date(c.created_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }).length;

  const totalCheckIns = checkIns.length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Rewards & Check-ins</h1>
          <p className="text-slate-600 mt-1">Track your activity and earn rewards</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCheckInForm} onOpenChange={setShowCheckInForm}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Check In
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Check-in</DialogTitle>
              </DialogHeader>
              <CheckInForm
                onSuccess={() => {
                  loadData();
                  setShowCheckInForm(false);
                }}
                onCancel={() => setShowCheckInForm(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <QRCodeScanner
                onScan={async (decodedText) => {
                  try {
                    // Parse the QR code data (expecting format: saleId:saleTitle)
                    const [saleId, saleTitle] = decodedText.split(':');
                    
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const checkInData = {
                            check_in_type: 'sale_visit',
                            location_name: saleTitle || 'Estate Sale',
                            location_id: saleId,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            verified: true,
                            points_earned: 15
                          };
                          await base44.entities.CheckIn.create(checkInData);
                          
                          const user = await base44.auth.me();
                          await base44.entities.UserReward.create({
                            user_id: user.id,
                            action_id: 'qr_check_in',
                            action_name: 'QR Code Check-in Bonus',
                            points_earned: 15,
                            description: `QR check-in at ${saleTitle || 'Estate Sale'}`
                          });
                          
                          setShowQRScanner(false);
                          loadData();
                          alert('Check-in successful! +15 points earned');
                        },
                        async () => {
                          const checkInData = {
                            check_in_type: 'sale_visit',
                            location_name: saleTitle || 'Estate Sale',
                            location_id: saleId,
                            verified: true,
                            points_earned: 15
                          };
                          await base44.entities.CheckIn.create(checkInData);
                          
                          const user = await base44.auth.me();
                          await base44.entities.UserReward.create({
                            user_id: user.id,
                            action_id: 'qr_check_in',
                            action_name: 'QR Code Check-in Bonus',
                            points_earned: 15,
                            description: `QR check-in at ${saleTitle || 'Estate Sale'}`
                          });
                          
                          setShowQRScanner(false);
                          loadData();
                          alert('Check-in successful! +15 points earned');
                        }
                      );
                    }
                  } catch (error) {
                    console.error('Error processing QR code:', error);
                    alert('Failed to process QR code');
                  }
                }}
                onClose={() => setShowQRScanner(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Points</p>
                <p className="text-3xl font-bold text-orange-600">{totalPoints.toLocaleString()}</p>
              </div>
              <Star className="w-10 h-10 text-orange-600 fill-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Check-ins</p>
                <p className="text-3xl font-bold text-cyan-600">{totalCheckIns}</p>
              </div>
              <MapPin className="w-10 h-10 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">This Week</p>
                <p className="text-3xl font-bold text-green-600">{thisWeekCheckIns}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Rewards Earned</p>
                <p className="text-3xl font-bold text-purple-600">{userRewards.length}</p>
              </div>
              <Gift className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checkins" className="space-y-6">
        <TabsList>
          <TabsTrigger value="checkins">
            <MapPin className="w-4 h-4 mr-2" />
            My Check-ins
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Gift className="w-4 h-4 mr-2" />
            My Rewards
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Target className="w-4 h-4 mr-2" />
            Available Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              {recentCheckIns.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p>No check-ins yet</p>
                  <Button
                    className="mt-4 bg-orange-600 hover:bg-orange-700"
                    onClick={() => setShowCheckInForm(true)}
                  >
                    Create Your First Check-in
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCheckIns.map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">
                              {checkIn.location_name || 'Check-in'}
                            </h4>
                            <Badge variant="outline" className="mt-1 capitalize">
                              {checkIn.check_in_type?.replace('_', ' ')}
                            </Badge>
                            {checkIn.notes && (
                              <p className="text-sm text-slate-600 mt-2">{checkIn.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {checkIn.points_earned > 0 && (
                              <Badge className="bg-orange-100 text-orange-700">
                                +{checkIn.points_earned} pts
                              </Badge>
                            )}
                            {checkIn.verified && (
                              <Badge className="bg-green-100 text-green-700 mt-1">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {format(new Date(checkIn.created_date), 'PPp')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Earned Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {userRewards.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p>No rewards earned yet</p>
                  <p className="text-sm mt-2">Complete actions to earn points and rewards</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{reward.action_name}</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {reward.description || 'Reward earned'}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {format(new Date(reward.created_date), 'PPP')}
                        </p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 text-lg px-3 py-1">
                        +{reward.points_earned} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Reward Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {rewardActions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p>No reward actions available</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {rewardActions.map((action) => (
                    <Card key={action.id} className="border-2 hover:border-orange-300 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Zap className="w-6 h-6 text-orange-600" />
                          </div>
                          <Badge className="bg-orange-100 text-orange-700 text-lg px-3 py-1">
                            {action.points} pts
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-2">{action.action_name}</h4>
                        <p className="text-sm text-slate-600 mb-3">{action.action_description}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <Badge variant="outline" className="capitalize">
                            {action.category}
                          </Badge>
                          <span className="capitalize">{action.frequency}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CheckInForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    check_in_type: 'sale_visit',
    location_name: '',
    location_id: '',
    notes: '',
    points_earned: 10
  });
  const [nearbySales, setNearbySales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    loadNearbySales();
  }, []);

  const loadNearbySales = async () => {
    setLoadingSales(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const sales = await base44.entities.EstateSale.filter({
              status: ['upcoming', 'active']
            }, '-created_date', 50);

            // Calculate distances and sort
            const salesWithDistance = sales
              .map(sale => {
                if (sale.location && sale.location.lat && sale.location.lng) {
                  const distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    sale.location.lat,
                    sale.location.lng
                  );
                  return { ...sale, distance };
                }
                return null;
              })
              .filter(s => s && s.distance < 50) // Within 50 miles
              .sort((a, b) => a.distance - b.distance);

            setNearbySales(salesWithDistance);
            setLoadingSales(false);
          },
          () => {
            setLoadingSales(false);
          }
        );
      } else {
        setLoadingSales(false);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      setLoadingSales(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleSaleSelect = (saleId) => {
    const sale = nearbySales.find(s => s.id === saleId);
    if (sale) {
      setFormData({
        ...formData,
        location_id: saleId,
        location_name: sale.title
      });
    }
  };

  const handleScanQR = () => {
    setShowScanner(true);
    // In a real implementation, you would use a QR scanner library
    // For now, we'll show a placeholder
    alert('QR Scanner would launch here. You can integrate a library like react-qr-reader for full functionality.');
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get current location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const checkInData = {
              ...formData,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              verified: true
            };
            await base44.entities.CheckIn.create(checkInData);
            
            // Also create a user reward
            const user = await base44.auth.me();
            await base44.entities.UserReward.create({
              user_id: user.id,
              action_id: 'check_in',
              action_name: 'Check-in Bonus',
              points_earned: formData.points_earned,
              description: `Check-in at ${formData.location_name}`
            });
            
            onSuccess();
          },
          async () => {
            // Location not available, create without coords
            await base44.entities.CheckIn.create(formData);
            
            const user = await base44.auth.me();
            await base44.entities.UserReward.create({
              user_id: user.id,
              action_id: 'check_in',
              action_name: 'Check-in Bonus',
              points_earned: formData.points_earned,
              description: `Check-in at ${formData.location_name}`
            });
            
            onSuccess();
          }
        );
      } else {
        await base44.entities.CheckIn.create(formData);
        
        const user = await base44.auth.me();
        await base44.entities.UserReward.create({
          user_id: user.id,
          action_id: 'check_in',
          action_name: 'Check-in Bonus',
          points_earned: formData.points_earned,
          description: `Check-in at ${formData.location_name}`
        });
        
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating check-in:', error);
      alert('Error creating check-in');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Check-in Type</Label>
        <Select value={formData.check_in_type} onValueChange={(v) => setFormData({...formData, check_in_type: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale_visit">Estate Sale Visit</SelectItem>
            <SelectItem value="event_attendance">Event Attendance</SelectItem>
            <SelectItem value="daily">Daily Check-in</SelectItem>
            <SelectItem value="milestone">Milestone</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Select Nearby Sale</Label>
        <div className="flex gap-2">
          <Select value={formData.location_id} onValueChange={handleSaleSelect} disabled={loadingSales}>
            <SelectTrigger>
              <SelectValue placeholder={loadingSales ? "Loading nearby sales..." : "Select a nearby sale"} />
            </SelectTrigger>
            <SelectContent>
              {nearbySales.length === 0 ? (
                <SelectItem value="none" disabled>No sales found nearby</SelectItem>
              ) : (
                nearbySales.map(sale => (
                  <SelectItem key={sale.id} value={sale.id}>
                    {sale.title} - {sale.distance.toFixed(1)} mi away
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleScanQR}
            title="Scan QR Code"
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">Or enter location manually below</p>
      </div>

      <div>
        <Label>Location Name *</Label>
        <Input
          value={formData.location_name}
          onChange={(e) => setFormData({...formData, location_name: e.target.value})}
          placeholder="Estate sale location, event name, etc."
          required
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
          placeholder="Add any notes about this check-in..."
        />
      </div>

      <div>
        <Label>Points to Award</Label>
        <Input
          type="number"
          value={formData.points_earned}
          onChange={(e) => setFormData({...formData, points_earned: parseInt(e.target.value) || 0})}
          min="0"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
          Create Check-in
        </Button>
      </div>
    </form>
  );
}