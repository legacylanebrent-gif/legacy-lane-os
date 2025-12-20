import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Target, Clock, Zap, BarChart3 } from 'lucide-react';
import RevenueChart from '@/components/financial/RevenueChart';
import ConversionFunnel from '@/components/financial/ConversionFunnel';

export default function Revenue() {
  const [revenueEvents, setRevenueEvents] = useState([]);
  const [deals, setDeals] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      setUser(userData);

      const [revenueData, dealData, campaignData, leadData] = await Promise.all([
        base44.entities.RevenueEvent.filter({ user_id: userData.id }),
        base44.entities.Deal.filter({ owner_id: userData.id }),
        base44.entities.Campaign.filter({ creator_id: userData.id }),
        base44.entities.Lead.filter({ routed_to: userData.id })
      ]);

      setRevenueEvents(revenueData);
      setDeals(dealData);
      setCampaigns(campaignData);
      setLeads(leadData);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalRevenue = revenueEvents.reduce((sum, e) => sum + (e.net_amount || 0), 0);
  const wonDeals = deals.filter(d => d.stage === 'won');
  const avgDealValue = wonDeals.length > 0 ? wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length : 0;
  
  const conversionRate = leads.length > 0 ? (wonDeals.length / leads.length) * 100 : 0;
  
  const avgCloseTime = wonDeals.length > 0 
    ? wonDeals.reduce((sum, d) => {
        if (!d.created_date || !d.actual_close_date) return sum;
        const days = Math.floor((new Date(d.actual_close_date) - new Date(d.created_date)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / wonDeals.length
    : 0;

  const totalCampaignSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
  const costPerLead = leads.length > 0 ? totalCampaignSpent / leads.length : 0;
  
  const campaignRevenue = campaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0);
  const campaignROI = totalCampaignSpent > 0 ? ((campaignRevenue - totalCampaignSpent) / totalCampaignSpent) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
              Revenue & Performance
            </h1>
            <p className="text-slate-600">Track your financial metrics and growth</p>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">{revenueEvents.length} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Conversion Rate</CardTitle>
              <Target className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 mt-1">{wonDeals.length} / {leads.length} leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Deal Value</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${avgDealValue.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">From {wonDeals.length} closed deals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Close Time</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{Math.round(avgCloseTime)} days</div>
              <p className="text-xs text-slate-500 mt-1">Average deal lifecycle</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Cost Per Lead</CardTitle>
              <Zap className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${costPerLead.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">${totalCampaignSpent.toLocaleString()} spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Campaign ROI</CardTitle>
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{campaignROI.toFixed(0)}%</div>
              <p className="text-xs text-slate-500 mt-1">${campaignRevenue.toLocaleString()} generated</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
            <TabsTrigger value="conversion">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart events={revenueEvents} timeframe={timeframe} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversion" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead to Deal Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <ConversionFunnel leads={leads} deals={deals} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      revenueEvents.reduce((acc, e) => {
                        acc[e.revenue_type] = (acc[e.revenue_type] || 0) + (e.net_amount || 0);
                        return acc;
                      }, {})
                    ).map(([type, amount]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 capitalize">{type.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-navy-900">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueEvents.slice(0, 5).map(event => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-navy-900 capitalize">
                            {event.revenue_type?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(event.transaction_date || event.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="font-bold text-green-600">+${event.net_amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}