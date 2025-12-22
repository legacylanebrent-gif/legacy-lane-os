import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Package, TrendingUp, DollarSign, Users, ShoppingBag, Award, BookOpen, Sparkles, Megaphone } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

const PACKAGE_PRICES = {
  'Gold': 299,
  'Silver': 149,
  'Bronze': 79,
  'Platinum': 499
};

export default function ComprehensiveRevenue() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Load saved values from localStorage or use defaults
  const loadValue = (key, defaultValue) => {
    const saved = localStorage.getItem(`comprehensive_revenue_${key}`);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  // Vendor Subscription Inputs
  const [vendorSubPrice, setVendorSubPrice] = useState(() => loadValue('vendorSubPrice', 79));
  const [vendorNewPerMonth, setVendorNewPerMonth] = useState(() => loadValue('vendorNewPerMonth', 15));
  const [vendorChurnRate, setVendorChurnRate] = useState(() => loadValue('vendorChurnRate', 4));
  const [vendorNewPerCityPerMonth, setVendorNewPerCityPerMonth] = useState(() => loadValue('vendorNewPerCityPerMonth', 4));

  // Agent Subscription Inputs
  const [agentSubPrice, setAgentSubPrice] = useState(() => loadValue('agentSubPrice', 149));
  const [agentNewPerMonth, setAgentNewPerMonth] = useState(() => loadValue('agentNewPerMonth', 10));
  const [agentChurnRate, setAgentChurnRate] = useState(() => loadValue('agentChurnRate', 3));
  const [agentNewPerCityPerMonth, setAgentNewPerCityPerMonth] = useState(() => loadValue('agentNewPerCityPerMonth', 4));

  // Marketplace Transaction Fee Inputs
  const [avgTransactionValue, setAvgTransactionValue] = useState(() => loadValue('avgTransactionValue', 90));
  const [transactionFeePercent, setTransactionFeePercent] = useState(() => loadValue('transactionFeePercent', 10));
  const [transactionsPerMonth, setTransactionsPerMonth] = useState(() => loadValue('transactionsPerMonth', 100));
  const [marketplaceGrowth, setMarketplaceGrowth] = useState(() => loadValue('marketplaceGrowth', 5));
  const [transactionsPerCityPerMonth, setTransactionsPerCityPerMonth] = useState(() => loadValue('transactionsPerCityPerMonth', 15));
  
  // Course Sales Inputs
  const [avgCoursePrice, setAvgCoursePrice] = useState(() => loadValue('avgCoursePrice', 49));
  const [courseSalesPerMonth, setCourseSalesPerMonth] = useState(() => loadValue('courseSalesPerMonth', 30));
  const [courseGrowth, setCourseGrowth] = useState(() => loadValue('courseGrowth', 5));
  
  // Referral Fee Inputs
  const [avgReferralFee, setAvgReferralFee] = useState(() => loadValue('avgReferralFee', 1000));
  const [referralsPerMonth, setReferralsPerMonth] = useState(() => loadValue('referralsPerMonth', 8));
  const [referralGrowth, setReferralGrowth] = useState(() => loadValue('referralGrowth', 3));
  const [referralsPerOperatorPerYear, setReferralsPerOperatorPerYear] = useState(() => loadValue('referralsPerOperatorPerYear', 1));

  // Premium Placement Inputs
  const [nationalFeaturePrice, setNationalFeaturePrice] = useState(() => loadValue('nationalFeaturePrice', 179));
  const [localFeaturePrice, setLocalFeaturePrice] = useState(() => loadValue('localFeaturePrice', 97));
  const [featuresPerMonth, setFeaturesPerMonth] = useState(() => loadValue('featuresPerMonth', 12));
  const [featureGrowth, setFeatureGrowth] = useState(() => loadValue('featureGrowth', 5));
  const [nationalFeaturePercentOperators, setNationalFeaturePercentOperators] = useState(() => loadValue('nationalFeaturePercentOperators', 1));
  const [localFeaturePercentOperators, setLocalFeaturePercentOperators] = useState(() => loadValue('localFeaturePercentOperators', 20));
  
  // Advertising Revenue Inputs
  const [adBasicPrice, setAdBasicPrice] = useState(() => loadValue('adBasicPrice', 29));
  const [adProPrice, setAdProPrice] = useState(() => loadValue('adProPrice', 49));
  const [adPremiumPrice, setAdPremiumPrice] = useState(() => loadValue('adPremiumPrice', 179));
  const [adNewPerMonth, setAdNewPerMonth] = useState(() => loadValue('adNewPerMonth', 10));
  const [adChurnRate, setAdChurnRate] = useState(() => loadValue('adChurnRate', 0));
  const [adGrowth, setAdGrowth] = useState(() => loadValue('adGrowth', 3));
  const [adNewPerCityPerMonth, setAdNewPerCityPerMonth] = useState(() => loadValue('adNewPerCityPerMonth', 1));

  useEffect(() => {
    loadOperators();
  }, []);

  // Auto-save to localStorage whenever values change
  useEffect(() => {
    const values = {
      vendorSubPrice, vendorNewPerMonth, vendorChurnRate, vendorNewPerCityPerMonth,
      agentSubPrice, agentNewPerMonth, agentChurnRate, agentNewPerCityPerMonth,
      avgTransactionValue, transactionFeePercent, transactionsPerMonth, marketplaceGrowth, transactionsPerCityPerMonth,
      avgCoursePrice, courseSalesPerMonth, courseGrowth,
      avgReferralFee, referralsPerMonth, referralGrowth, referralsPerOperatorPerYear,
      nationalFeaturePrice, localFeaturePrice, featuresPerMonth, featureGrowth, nationalFeaturePercentOperators, localFeaturePercentOperators,
      adBasicPrice, adProPrice, adPremiumPrice, adNewPerMonth, adChurnRate, adGrowth, adNewPerCityPerMonth
    };
    
    Object.entries(values).forEach(([key, value]) => {
      localStorage.setItem(`comprehensive_revenue_${key}`, JSON.stringify(value));
    });
  }, [
    vendorSubPrice, vendorNewPerMonth, vendorChurnRate, vendorNewPerCityPerMonth,
    agentSubPrice, agentNewPerMonth, agentChurnRate, agentNewPerCityPerMonth,
    avgTransactionValue, transactionFeePercent, transactionsPerMonth, marketplaceGrowth, transactionsPerCityPerMonth,
    avgCoursePrice, courseSalesPerMonth, courseGrowth,
    avgReferralFee, referralsPerMonth, referralGrowth, referralsPerOperatorPerYear,
    nationalFeaturePrice, localFeaturePrice, featuresPerMonth, featureGrowth, nationalFeaturePercentOperators, localFeaturePercentOperators,
    adBasicPrice, adProPrice, adPremiumPrice, adNewPerMonth, adChurnRate, adGrowth, adNewPerCityPerMonth
  ]);

  const loadOperators = async () => {
    setLoading(true);
    try {
      let allOperators = [];
      let skip = 0;
      const batchSize = 5000;
      let hasMore = true;

      while (hasMore) {
        const batch = await base44.entities.FutureEstateOperator.filter({}, '-created_date', batchSize, skip);
        
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allOperators = [...allOperators, ...batch];
          skip += batchSize;
          
          if (batch.length < batchSize) {
            hasMore = false;
          }
        }
      }

      console.log(`Loaded ${allOperators.length} total operators`);
      setOperators(allOperators);
    } catch (error) {
      console.error('Error loading operators:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = (monthlyBase, growthPercent, months) => {
    const projections = [];
    let current = monthlyBase;
    for (let i = 0; i < months; i++) {
      projections.push(current);
      current = current * (1 + growthPercent / 100);
    }
    return projections;
  };

  const calculateSimpleSubRevenue = (price, newPerMonth, churnRate, months) => {
    const projections = [];
    const quantities = [];
    let subs = newPerMonth;
    
    for (let i = 0; i < months; i++) {
      const churnFactor = (1 - churnRate / 100);
      const revenue = subs * price * churnFactor;
      projections.push(revenue);
      quantities.push(subs);
      subs = Math.floor(subs * churnFactor + newPerMonth);
    }
    return { projections, quantities };
  };

  const calculateSubscriptionRevenue = (months, basicPrice, proPrice, premiumPrice, newPerMonth, churnRate) => {
    const projections = [];
    const quantities = [];
    let basicSubs = Math.floor(newPerMonth * 0.5);
    let proSubs = Math.floor(newPerMonth * 0.3);
    let premiumSubs = Math.floor(newPerMonth * 0.2);
    
    for (let i = 0; i < months; i++) {
      const churnFactor = (1 - churnRate / 100);
      const revenue = (basicSubs * basicPrice + proSubs * proPrice + premiumSubs * premiumPrice) * churnFactor;
      const totalSubs = basicSubs + proSubs + premiumSubs;
      projections.push(revenue);
      quantities.push(totalSubs);
      
      basicSubs = Math.floor(basicSubs * churnFactor + newPerMonth * 0.5);
      proSubs = Math.floor(proSubs * churnFactor + newPerMonth * 0.3);
      premiumSubs = Math.floor(premiumSubs * churnFactor + newPerMonth * 0.2);
    }
    return { projections, quantities };
  };

  const getYearProjection = (projections, year) => {
    const endMonth = year * 12;
    return projections.slice(0, endMonth).reduce((sum, val) => sum + val, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-900 text-xl font-serif">Loading comprehensive revenue data...</div>
      </div>
    );
  }

  // Calculate Future Operators data
  const packageCounts = operators.reduce((acc, op) => {
    const pkg = op.package_type || 'Unknown';
    acc[pkg] = (acc[pkg] || 0) + 1;
    return acc;
  }, {});

  const packageData = Object.entries(packageCounts).map(([name, value]) => ({
    name,
    value,
    revenue: value * (PACKAGE_PRICES[name] || 0)
  }));

  const stateCounts = operators.reduce((acc, op) => {
    const state = op.state || 'Unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  // Calculate unique cities from operators
  const uniqueCities = new Set(operators.map(op => `${op.city}, ${op.state}`).filter(Boolean));
  const totalCities = uniqueCities.size;

  const currentOperatorMonthlyRevenue = operators.reduce((sum, op) => {
    const price = PACKAGE_PRICES[op.package_type] || 0;
    return sum + price;
  }, 0);

  const currentOperatorYearlyRevenue = currentOperatorMonthlyRevenue * 12;

  // Calculate all additional revenue streams
  // Use city-based calculation for vendors: total cities * new vendors per city per month
  const calculatedVendorNewPerMonth = totalCities * vendorNewPerCityPerMonth;
  const vendorSubData = calculateSimpleSubRevenue(vendorSubPrice, calculatedVendorNewPerMonth, vendorChurnRate, 120);
  const vendorSubProjections = vendorSubData.projections;
  
  // Use city-based calculation for agents: total cities * new agents per city per month
  const calculatedAgentNewPerMonth = totalCities * agentNewPerCityPerMonth;
  const agentSubData = calculateSimpleSubRevenue(agentSubPrice, calculatedAgentNewPerMonth, agentChurnRate, 120);
  const agentSubProjections = agentSubData.projections;
  
  // Use city-based calculation for marketplace: total cities * transactions per city per month
  const calculatedTransactionsPerMonth = totalCities * transactionsPerCityPerMonth;
  const marketplaceProjections = calculateProjections(calculatedTransactionsPerMonth * avgTransactionValue * (transactionFeePercent / 100), marketplaceGrowth, 120);
  
  const courseProjections = calculateProjections(courseSalesPerMonth * avgCoursePrice, courseGrowth, 120);
  
  // Calculate referrals based on 10% of total operators referring 1 deal per year
  const totalOperators = operators.length;
  const calculatedReferralsPerMonth = (totalOperators * 0.10 * referralsPerOperatorPerYear) / 12;
  const referralProjections = calculateProjections(calculatedReferralsPerMonth * avgReferralFee, referralGrowth, 120);
  
  // Calculate features based on operator percentages: 1% national, 20% local per year
  const nationalFeaturesPerMonth = (totalOperators * (nationalFeaturePercentOperators / 100)) / 12;
  const localFeaturesPerMonth = (totalOperators * (localFeaturePercentOperators / 100)) / 12;
  const totalFeatureRevenuePerMonth = (nationalFeaturesPerMonth * nationalFeaturePrice) + (localFeaturesPerMonth * localFeaturePrice);
  const featureProjections = calculateProjections(totalFeatureRevenuePerMonth, featureGrowth, 120);
  
  // Calculate advertising: 1 advertiser per package per city per month
  const adRevenuePerMonth = totalCities * (adBasicPrice + adProPrice + adPremiumPrice);
  const adProjections = calculateProjections(adRevenuePerMonth, adGrowth, 120);

  // Create operator projections (assuming current base grows)
  const operatorProjections = Array(120).fill(currentOperatorMonthlyRevenue);

  const totalProjections = operatorProjections.map((_, i) => 
    operatorProjections[i] + vendorSubProjections[i] + agentSubProjections[i] + 
    marketplaceProjections[i] + courseProjections[i] + 
    referralProjections[i] + featureProjections[i] + adProjections[i]
  );

  const chartData = Array.from({ length: 36 }, (_, i) => ({
    month: `M${i + 1}`,
    'Future Operators': Math.round(operatorProjections[i]),
    'Vendor Subs': Math.round(vendorSubProjections[i]),
    'Agent Subs': Math.round(agentSubProjections[i]),
    Marketplace: Math.round(marketplaceProjections[i]),
    Courses: Math.round(courseProjections[i]),
    Referrals: Math.round(referralProjections[i]),
    Features: Math.round(featureProjections[i]),
    Advertising: Math.round(adProjections[i]),
    Total: Math.round(totalProjections[i])
  }));

  const year1Total = getYearProjection(totalProjections, 1);
  const year3Total = getYearProjection(totalProjections, 3);
  const year5Total = getYearProjection(totalProjections, 5);
  const year10Total = getYearProjection(totalProjections, 10);

  const pieData = [
    { name: 'Future Operators', value: getYearProjection(operatorProjections, 3) },
    { name: 'Vendor Subs', value: getYearProjection(vendorSubProjections, 3) },
    { name: 'Agent Subs', value: getYearProjection(agentSubProjections, 3) },
    { name: 'Marketplace', value: getYearProjection(marketplaceProjections, 3) },
    { name: 'Courses', value: getYearProjection(courseProjections, 3) },
    { name: 'Referrals', value: getYearProjection(referralProjections, 3) },
    { name: 'Features', value: getYearProjection(featureProjections, 3) },
    { name: 'Advertising', value: getYearProjection(adProjections, 3) },
  ];

  const stateData = Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Comprehensive Revenue Dashboard</h1>
          <p className="text-slate-600">Future Operators + Additional Revenue Streams Analysis</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">1-Year Total</span>
                <DollarSign className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year1Total / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">All revenue streams</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">3-Year Total</span>
                <TrendingUp className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year3Total / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">Cumulative revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Future Operators</span>
                <Building2 className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">{operators.length.toLocaleString()}</div>
              <div className="text-xs opacity-75">${(currentOperatorMonthlyRevenue / 1000).toFixed(0)}K/month</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">States Covered</span>
                <MapPin className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">{Object.keys(stateCounts).length}</div>
              <div className="text-xs opacity-75">Nationwide reach</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>36-Month Revenue Projection - All Streams</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="Future Operators" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                <Area type="monotone" dataKey="Vendor Subs" stackId="1" stroke="#a78bfa" fill="#a78bfa" />
                <Area type="monotone" dataKey="Agent Subs" stackId="1" stroke="#c4b5fd" fill="#c4b5fd" />
                <Area type="monotone" dataKey="Marketplace" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="Courses" stackId="1" stroke="#0891b2" fill="#0891b2" />
                <Area type="monotone" dataKey="Referrals" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="Features" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="Advertising" stackId="1" stroke="#14b8a6" fill="#14b8a6" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Mix */}
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

          {/* Future Operators by State */}
          <Card>
            <CardHeader>
              <CardTitle>Top 20 States - Future Operators</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stateData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="state" type="category" width={50} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-8 gap-2">
            <TabsTrigger value="overview">
              <Package className="w-4 h-4 mr-1" />
              Operators
            </TabsTrigger>
            <TabsTrigger value="vendorSubs">
              <Users className="w-4 h-4 mr-1" />
              Vendor Subs
            </TabsTrigger>
            <TabsTrigger value="agentSubs">
              <Users className="w-4 h-4 mr-1" />
              Agent Subs
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
            <TabsTrigger value="features">
              <Sparkles className="w-4 h-4 mr-1" />
              Features
            </TabsTrigger>
            <TabsTrigger value="advertising">
              <Megaphone className="w-4 h-4 mr-1" />
              Ads
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Future Operators Package Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {packageData.map((pkg, idx) => (
                    <div key={pkg.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-sm font-medium">{pkg.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">${(pkg.revenue).toLocaleString()}/mo</div>
                        <div className="text-xs text-slate-500">{pkg.value} operators</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <div className="text-sm text-slate-600 mb-1">Current Monthly Revenue</div>
                    <div className="text-3xl font-bold text-purple-600">${(currentOperatorMonthlyRevenue / 1000).toFixed(0)}K</div>
                    <div className="text-sm text-slate-500 mt-1">${(currentOperatorYearlyRevenue / 1000000).toFixed(2)}M annually</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendor Subs Tab */}
          <TabsContent value="vendorSubs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Vendor Subscription Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Cities Identified:</strong> {totalCities.toLocaleString()} cities from Future Operators data
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Calculated New Vendors/Month:</strong> {totalCities.toLocaleString()} cities × {vendorNewPerCityPerMonth} vendors/city = {calculatedVendorNewPerMonth.toLocaleString()} vendors/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input type="number" value={vendorSubPrice} onChange={(e) => setVendorSubPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>New Vendors Per City Per Month</Label>
                    <Input type="number" value={vendorNewPerCityPerMonth} onChange={(e) => setVendorNewPerCityPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Total New Vendors/Month</Label>
                    <Input type="number" value={calculatedVendorNewPerMonth} disabled className="bg-slate-100" />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={vendorChurnRate} onChange={(e) => setVendorChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(vendorSubProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(vendorSubProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(vendorSubProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(vendorSubProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Subs Tab */}
          <TabsContent value="agentSubs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-300" />
                  Agent Subscription Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Cities Identified:</strong> {totalCities.toLocaleString()} cities from Future Operators data
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Calculated New Agents/Month:</strong> {totalCities.toLocaleString()} cities × {agentNewPerCityPerMonth} agents/city = {calculatedAgentNewPerMonth.toLocaleString()} agents/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input type="number" value={agentSubPrice} onChange={(e) => setAgentSubPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>New Agents Per City Per Month</Label>
                    <Input type="number" value={agentNewPerCityPerMonth} onChange={(e) => setAgentNewPerCityPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Total New Agents/Month</Label>
                    <Input type="number" value={calculatedAgentNewPerMonth} disabled className="bg-slate-100" />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={agentChurnRate} onChange={(e) => setAgentChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(agentSubProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(agentSubProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(agentSubProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(agentSubProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Cities Identified:</strong> {totalCities.toLocaleString()} cities from Future Operators data
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Calculated Transactions/Month:</strong> {totalCities.toLocaleString()} cities × {transactionsPerCityPerMonth} transactions/city = {calculatedTransactionsPerMonth.toLocaleString()} transactions/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                  <div>
                    <Label>Avg Transaction Value ($)</Label>
                    <Input type="number" value={avgTransactionValue} onChange={(e) => setAvgTransactionValue(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Transaction Fee (%)</Label>
                    <Input type="number" value={transactionFeePercent} onChange={(e) => setTransactionFeePercent(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Transactions Per City/Month</Label>
                    <Input type="number" value={transactionsPerCityPerMonth} onChange={(e) => setTransactionsPerCityPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Total Transactions/Month</Label>
                    <Input type="number" value={calculatedTransactionsPerMonth} disabled className="bg-slate-100" />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={marketplaceGrowth} onChange={(e) => setMarketplaceGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(marketplaceProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(courseProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  RE Referral Fee Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Total Operators:</strong> {totalOperators.toLocaleString()} operators
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Calculated Referrals/Month:</strong> {totalOperators.toLocaleString()} operators × 10% × {referralsPerOperatorPerYear} referral/yr ÷ 12 months = {calculatedReferralsPerMonth.toFixed(1)} referrals/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Avg Referral Fee ($)</Label>
                    <Input type="number" value={avgReferralFee} onChange={(e) => setAvgReferralFee(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Referrals Per Operator/Year</Label>
                    <Input type="number" value={referralsPerOperatorPerYear} onChange={(e) => setReferralsPerOperatorPerYear(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Total Referrals/Month</Label>
                    <Input type="number" value={calculatedReferralsPerMonth.toFixed(1)} disabled className="bg-slate-100" />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={referralGrowth} onChange={(e) => setReferralGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(referralProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Total Operators:</strong> {totalOperators.toLocaleString()} operators
                  </div>
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>National Features/Month:</strong> {totalOperators.toLocaleString()} operators × {nationalFeaturePercentOperators}% ÷ 12 months = {nationalFeaturesPerMonth.toFixed(1)} national/month
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Local Features/Month:</strong> {totalOperators.toLocaleString()} operators × {localFeaturePercentOperators}% ÷ 12 months = {localFeaturesPerMonth.toFixed(1)} local/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
                  <div>
                    <Label>National Feature Price ($)</Label>
                    <Input type="number" value={nationalFeaturePrice} onChange={(e) => setNationalFeaturePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Local Feature Price ($)</Label>
                    <Input type="number" value={localFeaturePrice} onChange={(e) => setLocalFeaturePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>National % of Operators/Year</Label>
                    <Input type="number" value={nationalFeaturePercentOperators} onChange={(e) => setNationalFeaturePercentOperators(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Local % of Operators/Year</Label>
                    <Input type="number" value={localFeaturePercentOperators} onChange={(e) => setLocalFeaturePercentOperators(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={featureGrowth} onChange={(e) => setFeatureGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(featureProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advertising Tab */}
          <TabsContent value="advertising">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-teal-600" />
                  Advertising Space Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Cities Identified:</strong> {totalCities.toLocaleString()} cities from Future Operators data
                  </div>
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Assumption:</strong> 1 advertiser per package type per city per month
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Total Advertisers/Month:</strong> {totalCities.toLocaleString()} cities × 3 packages = {(totalCities * 3).toLocaleString()} advertisers/month
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Monthly Revenue:</strong> {totalCities.toLocaleString()} × (${adBasicPrice} + ${adProPrice} + ${adPremiumPrice}) = ${adRevenuePerMonth.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Basic Ad Price ($)</Label>
                    <Input type="number" value={adBasicPrice} onChange={(e) => setAdBasicPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Pro Ad Price ($)</Label>
                    <Input type="number" value={adProPrice} onChange={(e) => setAdProPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Premium Ad Price ($)</Label>
                    <Input type="number" value={adPremiumPrice} onChange={(e) => setAdPremiumPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={adGrowth} onChange={(e) => setAdGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(adProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                  </div>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}