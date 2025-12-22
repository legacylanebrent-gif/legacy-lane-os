import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, ShoppingBag, Award, BookOpen, Briefcase, Megaphone, Sparkles, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

export default function Revenue() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  
  // Subscription Revenue Inputs
  const [subBasicPrice, setSubBasicPrice] = useState(49);
  const [subProPrice, setSubProPrice] = useState(99);
  const [subPremiumPrice, setSubPremiumPrice] = useState(199);
  const [subNewPerMonth, setSubNewPerMonth] = useState(25);
  const [subChurnRate, setSubChurnRate] = useState(5);
  

  
  // Marketplace Transaction Fee Inputs
  const [avgTransactionValue, setAvgTransactionValue] = useState(250);
  const [transactionFeePercent, setTransactionFeePercent] = useState(10);
  const [transactionsPerMonth, setTransactionsPerMonth] = useState(100);
  const [marketplaceGrowth, setMarketplaceGrowth] = useState(20);
  
  // Course Sales Inputs
  const [avgCoursePrice, setAvgCoursePrice] = useState(199);
  const [courseSalesPerMonth, setCourseSalesPerMonth] = useState(15);
  const [courseGrowth, setCourseGrowth] = useState(10);
  
  // Referral Fee Inputs
  const [avgReferralFee, setAvgReferralFee] = useState(500);
  const [referralsPerMonth, setReferralsPerMonth] = useState(8);
  const [referralGrowth, setReferralGrowth] = useState(12);
  
  // Vendor Commission Inputs
  const [avgVendorDeal, setAvgVendorDeal] = useState(2000);
  const [vendorCommission, setVendorCommission] = useState(15);
  const [vendorDealsPerMonth, setVendorDealsPerMonth] = useState(5);
  const [vendorGrowth, setVendorGrowth] = useState(8);
  
  // Premium Placement Inputs
  const [nationalFeaturePrice, setNationalFeaturePrice] = useState(299);
  const [localFeaturePrice, setLocalFeaturePrice] = useState(99);
  const [featuresPerMonth, setFeaturesPerMonth] = useState(12);
  const [featureGrowth, setFeatureGrowth] = useState(15);
  
  // Advertising Revenue Inputs
  const [avgAdRevenue, setAvgAdRevenue] = useState(3000);
  const [adGrowth, setAdGrowth] = useState(25);

  const calculateProjections = (monthlyBase, growthPercent, months) => {
    const projections = [];
    let current = monthlyBase;
    for (let i = 0; i < months; i++) {
      projections.push(current);
      current = current * (1 + growthPercent / 100);
    }
    return projections;
  };

  const calculateSubscriptionRevenue = (months) => {
    const projections = [];
    let basicSubs = Math.floor(subNewPerMonth * 0.5);
    let proSubs = Math.floor(subNewPerMonth * 0.3);
    let premiumSubs = Math.floor(subNewPerMonth * 0.2);
    
    for (let i = 0; i < months; i++) {
      const churnFactor = (1 - subChurnRate / 100);
      const revenue = (basicSubs * subBasicPrice + proSubs * subProPrice + premiumSubs * subPremiumPrice) * churnFactor;
      projections.push(revenue);
      
      basicSubs = Math.floor(basicSubs * churnFactor + subNewPerMonth * 0.5);
      proSubs = Math.floor(proSubs * churnFactor + subNewPerMonth * 0.3);
      premiumSubs = Math.floor(premiumSubs * churnFactor + subNewPerMonth * 0.2);
    }
    return projections;
  };

  const getYearProjection = (projections, year) => {
    const endMonth = year * 12;
    return projections.slice(0, endMonth).reduce((sum, val) => sum + val, 0);
  };

  // Calculate all revenue streams
  const subProjections = calculateSubscriptionRevenue(120);
  const marketplaceProjections = calculateProjections(transactionsPerMonth * avgTransactionValue * (transactionFeePercent / 100), marketplaceGrowth, 120);
  const courseProjections = calculateProjections(courseSalesPerMonth * avgCoursePrice, courseGrowth, 120);
  const referralProjections = calculateProjections(referralsPerMonth * avgReferralFee, referralGrowth, 120);
  const vendorProjections = calculateProjections(vendorDealsPerMonth * avgVendorDeal * (vendorCommission / 100), vendorGrowth, 120);
  const featureProjections = calculateProjections(featuresPerMonth * ((nationalFeaturePrice + localFeaturePrice) / 2), featureGrowth, 120);
  const adProjections = calculateProjections(avgAdRevenue, adGrowth, 120);

  const totalProjections = subProjections.map((_, i) => 
    subProjections[i] + marketplaceProjections[i] + courseProjections[i] + 
    referralProjections[i] + vendorProjections[i] + featureProjections[i] + adProjections[i]
  );

  const chartData = Array.from({ length: 36 }, (_, i) => ({
    month: `M${i + 1}`,
    Subscriptions: Math.round(subProjections[i]),
    Marketplace: Math.round(marketplaceProjections[i]),
    Courses: Math.round(courseProjections[i]),
    Referrals: Math.round(referralProjections[i]),
    Vendors: Math.round(vendorProjections[i]),
    Features: Math.round(featureProjections[i]),
    Advertising: Math.round(adProjections[i]),
    Total: Math.round(totalProjections[i])
  }));

  const year3Total = getYearProjection(totalProjections, 3);
  const year5Total = getYearProjection(totalProjections, 5);
  const year10Total = getYearProjection(totalProjections, 10);

  const pieData = [
    { name: 'Subscriptions', value: getYearProjection(subProjections, 3) },
    { name: 'Marketplace', value: getYearProjection(marketplaceProjections, 3) },
    { name: 'Courses', value: getYearProjection(courseProjections, 3) },
    { name: 'Referrals', value: getYearProjection(referralProjections, 3) },
    { name: 'Vendors', value: getYearProjection(vendorProjections, 3) },
    { name: 'Features', value: getYearProjection(featureProjections, 3) },
    { name: 'Advertising', value: getYearProjection(adProjections, 3) },
  ];

  const yearlyComparisonData = [
    {
      year: 'Year 3',
      Subscriptions: getYearProjection(subProjections, 3),
      Marketplace: getYearProjection(marketplaceProjections, 3),
      Courses: getYearProjection(courseProjections, 3),
      Referrals: getYearProjection(referralProjections, 3),
      Vendors: getYearProjection(vendorProjections, 3),
      Features: getYearProjection(featureProjections, 3),
      Advertising: getYearProjection(adProjections, 3),
    },
    {
      year: 'Year 5',
      Subscriptions: getYearProjection(subProjections, 5),
      Marketplace: getYearProjection(marketplaceProjections, 5),
      Courses: getYearProjection(courseProjections, 5),
      Referrals: getYearProjection(referralProjections, 5),
      Vendors: getYearProjection(vendorProjections, 5),
      Features: getYearProjection(featureProjections, 5),
      Advertising: getYearProjection(adProjections, 5),
    },
    {
      year: 'Year 10',
      Subscriptions: getYearProjection(subProjections, 10),
      Marketplace: getYearProjection(marketplaceProjections, 10),
      Courses: getYearProjection(courseProjections, 10),
      Referrals: getYearProjection(referralProjections, 10),
      Vendors: getYearProjection(vendorProjections, 10),
      Features: getYearProjection(featureProjections, 10),
      Advertising: getYearProjection(adProjections, 10),
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Revenue Projections</h1>
          <p className="text-slate-600">Model your revenue streams with 3, 5, and 10-year projections</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">3-Year Projection</span>
                <TrendingUp className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year3Total / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">Cumulative Revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">5-Year Projection</span>
                <Sparkles className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year5Total / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">Cumulative Revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">10-Year Projection</span>
                <Award className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year10Total / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">Cumulative Revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts */}
        <Card>
          <CardHeader>
            <CardTitle>36-Month Revenue Projection by Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="Subscriptions" stackId="1" stroke="#0891b2" fill="#0891b2" />
                <Area type="monotone" dataKey="Marketplace" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                <Area type="monotone" dataKey="Courses" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="Referrals" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="Vendors" stackId="1" stroke="#ec4899" fill="#ec4899" />
                <Area type="monotone" dataKey="Features" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="Advertising" stackId="1" stroke="#14b8a6" fill="#14b8a6" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>3-Year Revenue Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Year Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Revenue Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => `$${(value / 1000000).toFixed(2)}M`} />
                  <Bar dataKey="Subscriptions" fill="#0891b2" />
                  <Bar dataKey="Marketplace" fill="#8b5cf6" />
                  <Bar dataKey="Courses" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Stream Calculators */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2">
            <TabsTrigger value="subscriptions">
              <Users className="w-4 h-4 mr-1" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="marketplace">
              <ShoppingBag className="w-4 h-4 mr-1" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="w-4 h-4 mr-1" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Award className="w-4 h-4 mr-1" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="vendors">
              <Package className="w-4 h-4 mr-1" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="features">
              <Sparkles className="w-4 h-4 mr-1" />
              Features
            </TabsTrigger>
            <TabsTrigger value="advertising">
              <Megaphone className="w-4 h-4 mr-1" />
              Ads
            </TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-600" />
                  Subscription Revenue Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Basic Plan Price ($)</Label>
                    <Input type="number" value={subBasicPrice} onChange={(e) => setSubBasicPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Pro Plan Price ($)</Label>
                    <Input type="number" value={subProPrice} onChange={(e) => setSubProPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Premium Plan Price ($)</Label>
                    <Input type="number" value={subPremiumPrice} onChange={(e) => setSubPremiumPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>New Subscribers/Month</Label>
                    <Input type="number" value={subNewPerMonth} onChange={(e) => setSubNewPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={subChurnRate} onChange={(e) => setSubChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(subProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(subProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(subProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Subscriptions" stroke="#0891b2" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                  Marketplace Transaction Fee Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Avg Transaction Value ($)</Label>
                    <Input type="number" value={avgTransactionValue} onChange={(e) => setAvgTransactionValue(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Transaction Fee (%)</Label>
                    <Input type="number" value={transactionFeePercent} onChange={(e) => setTransactionFeePercent(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Transactions Per Month</Label>
                    <Input type="number" value={transactionsPerMonth} onChange={(e) => setTransactionsPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={marketplaceGrowth} onChange={(e) => setMarketplaceGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(marketplaceProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(marketplaceProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(marketplaceProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Marketplace" stroke="#8b5cf6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  Course Sales Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Avg Course Price ($)</Label>
                    <Input type="number" value={avgCoursePrice} onChange={(e) => setAvgCoursePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Sales Per Month</Label>
                    <Input type="number" value={courseSalesPerMonth} onChange={(e) => setCourseSalesPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={courseGrowth} onChange={(e) => setCourseGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(courseProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(courseProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(courseProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Courses" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  Referral Fee Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Avg Referral Fee ($)</Label>
                    <Input type="number" value={avgReferralFee} onChange={(e) => setAvgReferralFee(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Referrals Per Month</Label>
                    <Input type="number" value={referralsPerMonth} onChange={(e) => setReferralsPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={referralGrowth} onChange={(e) => setReferralGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(referralProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(referralProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(referralProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Referrals" stroke="#f59e0b" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-pink-600" />
                  Vendor Commission Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Avg Vendor Deal ($)</Label>
                    <Input type="number" value={avgVendorDeal} onChange={(e) => setAvgVendorDeal(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Commission Rate (%)</Label>
                    <Input type="number" value={vendorCommission} onChange={(e) => setVendorCommission(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Deals Per Month</Label>
                    <Input type="number" value={vendorDealsPerMonth} onChange={(e) => setVendorDealsPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={vendorGrowth} onChange={(e) => setVendorGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(vendorProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(vendorProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(vendorProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Vendors" stroke="#ec4899" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Premium Feature Placement Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>National Feature Price ($)</Label>
                    <Input type="number" value={nationalFeaturePrice} onChange={(e) => setNationalFeaturePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Local Feature Price ($)</Label>
                    <Input type="number" value={localFeaturePrice} onChange={(e) => setLocalFeaturePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Features Per Month</Label>
                    <Input type="number" value={featuresPerMonth} onChange={(e) => setFeaturesPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={featureGrowth} onChange={(e) => setFeatureGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(featureProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(featureProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(featureProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Features" stroke="#3b82f6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advertising Tab */}
          <TabsContent value="advertising">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-teal-600" />
                  Advertising Revenue Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label>Avg Monthly Ad Revenue ($)</Label>
                    <Input type="number" value={avgAdRevenue} onChange={(e) => setAvgAdRevenue(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={adGrowth} onChange={(e) => setAdGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(adProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(adProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(adProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Advertising" stroke="#14b8a6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}