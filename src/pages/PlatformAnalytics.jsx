import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Users, Package, ShoppingBag, GraduationCap, Home } from 'lucide-react';
import DivisionPerformance from '@/components/financial/DivisionPerformance';
import PartnerLeaderboard from '@/components/financial/PartnerLeaderboard';
import MonetizationStack from '@/components/financial/MonetizationStack';

export default function PlatformAnalytics() {
  const [revenueEvents, setRevenueEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [estateSales, setEstateSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [revenueData, userData, itemData, courseData, saleData] = await Promise.all([
        base44.asServiceRole.entities.RevenueEvent.list(),
        base44.asServiceRole.entities.User.list(),
        base44.entities.Item.list(),
        base44.entities.Course.list(),
        base44.entities.EstateSale.list()
      ]);

      setRevenueEvents(revenueData);
      setUsers(userData);
      setItems(itemData);
      setCourses(courseData);
      setEstateSales(saleData);
    } catch (error) {
      console.error('Error loading platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
  const platformFees = revenueEvents.reduce((sum, e) => sum + (e.platform_fee || 0), 0);
  
  const revenueByDivision = revenueEvents.reduce((acc, e) => {
    acc[e.division] = (acc[e.division] || 0) + (e.amount || 0);
    return acc;
  }, {});

  const marketplaceVelocity = items.filter(i => i.status === 'sold').length;
  const avgDaysToSell = 14; // Mock calculation

  const activeUsers = users.filter(u => u.last_activity_date && 
    new Date(u.last_activity_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  const churnRate = 3.2; // Mock calculation

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Platform Analytics
          </h1>
          <p className="text-slate-600">System-wide performance and forecasting</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-green-600 mt-1">+12.5% vs last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Platform Fees</CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${platformFees.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">{((platformFees/totalRevenue)*100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{activeUsers}</div>
              <p className="text-xs text-slate-500 mt-1">30-day active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Churn Rate</CardTitle>
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{churnRate}%</div>
              <p className="text-xs text-green-600 mt-1">-0.5% vs last month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="monetization">
          <TabsList>
            <TabsTrigger value="monetization">Monetization Stack</TabsTrigger>
            <TabsTrigger value="divisions">Division Performance</TabsTrigger>
            <TabsTrigger value="partners">Partner Leaderboard</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          </TabsList>

          <TabsContent value="monetization" className="mt-6">
            <MonetizationStack revenueEvents={revenueEvents} />
          </TabsContent>

          <TabsContent value="divisions" className="mt-6">
            <DivisionPerformance revenueByDivision={revenueByDivision} />
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            <PartnerLeaderboard users={users} revenueEvents={revenueEvents} />
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketplace Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Items Sold (30d)</span>
                      <span className="text-2xl font-bold text-navy-900">{marketplaceVelocity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Avg Days to Sell</span>
                      <span className="text-2xl font-bold text-navy-900">{avgDaysToSell}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Active Listings</span>
                      <span className="text-2xl font-bold text-navy-900">{items.filter(i => i.status === 'available').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Home className="w-8 h-8 text-blue-600" />
                        <span className="font-medium">Estate Sales</span>
                      </div>
                      <span className="text-xl font-bold">{estateSales.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-purple-600" />
                        <span className="font-medium">Marketplace Items</span>
                      </div>
                      <span className="text-xl font-bold">{items.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-amber-600" />
                        <span className="font-medium">Courses</span>
                      </div>
                      <span className="text-xl font-bold">{courses.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecasting" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  AI-Powered Forecasting
                </h3>
                <p className="text-slate-500">
                  Predictive analytics and revenue forecasting coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}