import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Package, TrendingUp, DollarSign, Users, ShoppingBag, Award, Sparkles, Megaphone } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

const PACKAGE_PRICES = {
  'Gold': 299,
  'Silver': 149,
  'Bronze': 35,
  'Platinum': 499,
  'Basic': 0
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
  const [vendorNewPerCityPerMonth, setVendorNewPerCityPerMonth] = useState(() => loadValue('vendorNewPerCityPerMonth', 2));

  // Marketplace Item Post Fee Inputs
  const [itemPostFee] = useState(3); // Fixed at $3 per item
  const [avgAnnualSalesPerOperator, setAvgAnnualSalesPerOperator] = useState(() => loadValue('avgAnnualSalesPerOperator', 6));
  const [avgItemsPostedPerSale, setAvgItemsPostedPerSale] = useState(() => loadValue('avgItemsPostedPerSale', 50));
  const [marketplaceGrowth, setMarketplaceGrowth] = useState(() => loadValue('marketplaceGrowth', 5));
  
  // Referral Inputs
  const [annualReferralConv, setAnnualReferralConv] = useState(() => loadValue('annualReferralConv', 3));
  const [refAvgPropertyValue, setRefAvgPropertyValue] = useState(() => loadValue('refAvgPropertyValue', 350000));
  const [platformIncomePercent, setPlatformIncomePercent] = useState(() => loadValue('platformIncomePercent', 70));
  const [referralGrowth, setReferralGrowth] = useState(() => loadValue('referralGrowth', 3));

  // Premium Placement Inputs
  const [nationalFeaturePrice, setNationalFeaturePrice] = useState(() => loadValue('nationalFeaturePrice', 179));
  const [localFeaturePrice, setLocalFeaturePrice] = useState(() => loadValue('localFeaturePrice', 97));
  const [featuresPerMonth, setFeaturesPerMonth] = useState(() => loadValue('featuresPerMonth', 12));
  const [featureGrowth, setFeatureGrowth] = useState(() => loadValue('featureGrowth', 5));
  const [nationalFeaturesPerMonth, setNationalFeaturesPerMonth] = useState(() => loadValue('nationalFeaturesPerMonth', 35));
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
      avgAnnualSalesPerOperator, avgItemsPostedPerSale, marketplaceGrowth,
      annualReferralConv, refAvgPropertyValue, platformIncomePercent, referralGrowth,
      nationalFeaturePrice, localFeaturePrice, featuresPerMonth, featureGrowth, nationalFeaturesPerMonth, localFeaturePercentOperators,
      adBasicPrice, adProPrice, adPremiumPrice, adNewPerMonth, adChurnRate, adGrowth, adNewPerCityPerMonth
    };
    
    Object.entries(values).forEach(([key, value]) => {
      localStorage.setItem(`comprehensive_revenue_${key}`, JSON.stringify(value));
    });
  }, [
    vendorSubPrice, vendorNewPerMonth, vendorChurnRate, vendorNewPerCityPerMonth,
    avgAnnualSalesPerOperator, avgItemsPostedPerSale, marketplaceGrowth,
    annualReferralConv, refAvgPropertyValue, platformIncomePercent, referralGrowth,
    nationalFeaturePrice, localFeaturePrice, featuresPerMonth, featureGrowth, nationalFeaturesPerMonth, localFeaturePercentOperators,
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

  const packageData = Object.entries(packageCounts).map(([name, value]) => {
    const displayName = name === 'Unknown' ? 'Basic' : name;
    const monthlyRevenue = value * (PACKAGE_PRICES[displayName] || 0);
    // Basic operators: $0/month + $99 per sale × 6 sales/year ÷ 12 months
    // Bronze operators: $35/month + $64 per sale × 1.25 sales/month
    let perSaleRevenue = 0;
    if (displayName === 'Basic') {
      perSaleRevenue = value * 99 * 6 / 12;
    } else if (displayName === 'Bronze') {
      perSaleRevenue = value * 64 * 1.25;
    }
    return {
      name: displayName,
      value,
      revenue: monthlyRevenue + perSaleRevenue
    };
  }).sort((a, b) => {
    if (a.name === 'Basic') return 1;
    if (b.name === 'Basic') return -1;
    return 0;
  });

  const stateCounts = operators.reduce((acc, op) => {
    const state = op.state || 'Unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  // Calculate unique cities from operators
  const uniqueCities = new Set(operators.map(op => `${op.city}, ${op.state}`).filter(Boolean));
  const totalCities = uniqueCities.size;

  const currentOperatorMonthlyRevenue = operators.reduce((sum, op) => {
    const packageType = op.package_type === 'Unknown' ? 'Basic' : op.package_type;
    const monthlyPrice = PACKAGE_PRICES[packageType] || 0;
    // Basic operators: $0/month + $99 per sale × 6 sales/year ÷ 12 months
    // Bronze operators: $35/month + $64 per sale × 1.25 sales/month
    let perSaleRevenue = 0;
    if (packageType === 'Basic') {
      perSaleRevenue = 99 * 6 / 12;
    } else if (packageType === 'Bronze') {
      perSaleRevenue = 64 * 1.25;
    }
    return sum + monthlyPrice + perSaleRevenue;
  }, 0);

  const currentOperatorYearlyRevenue = currentOperatorMonthlyRevenue * 12;

  // Derived calculations (all after loading is complete)
  const totalOperators = operators.length;
  // Use operator-based calculation for vendors: each operator refers up to N vendors
  const calculatedVendorNewPerMonth = totalOperators * vendorNewPerCityPerMonth;
  const vendorSubData = calculateSimpleSubRevenue(vendorSubPrice, calculatedVendorNewPerMonth, vendorChurnRate, 120);
  const vendorSubProjections = vendorSubData.projections;
  
  // Marketplace: operators × avg annual sales ÷ 12 × avg items per sale × $3 fee
  const marketplaceMonthlyItems = totalOperators * (avgAnnualSalesPerOperator / 12) * avgItemsPostedPerSale;
  const marketplaceProjections = calculateProjections(marketplaceMonthlyItems * itemPostFee, marketplaceGrowth, 120);
  
  // Referral calc: totalOperators × annualReferralConv ÷ 12 × avgPropValue × 2% × 25% × platformIncomePercent%
  const referralIncomePerConversion = refAvgPropertyValue * 0.02 * 0.25 * (platformIncomePercent / 100);
  const referralMonthlyRevenue = totalOperators * (annualReferralConv / 12) * referralIncomePerConversion;
  const referralProjections = calculateProjections(referralMonthlyRevenue, referralGrowth, 120);
  
  // Calculate features based on fixed national (35/month) and percentage local (20% per year)
  const localFeaturesPerMonth = (totalOperators * (localFeaturePercentOperators / 100)) / 12;
  const totalFeatureRevenuePerMonth = (nationalFeaturesPerMonth * nationalFeaturePrice) + (localFeaturesPerMonth * localFeaturePrice);
  const featureProjections = calculateProjections(totalFeatureRevenuePerMonth, featureGrowth, 120);
  
  // Calculate advertising: 1 advertiser per package per city per month
  const adRevenuePerMonth = totalCities * (adBasicPrice + adProPrice + adPremiumPrice);
  const adProjections = calculateProjections(adRevenuePerMonth, adGrowth, 120);

  // Create operator projections (assuming current base grows)
  const operatorProjections = Array(120).fill(currentOperatorMonthlyRevenue);

  const totalProjections = operatorProjections.map((_, i) => 
    operatorProjections[i] + vendorSubProjections[i] +
    marketplaceProjections[i] + referralProjections[i] + featureProjections[i] + adProjections[i]
  );

  const chartData = Array.from({ length: 36 }, (_, i) => ({
    month: `M${i + 1}`,
    'Future Operators': Math.round(operatorProjections[i]),
    'Vendor Subs': Math.round(vendorSubProjections[i]),
    Marketplace: Math.round(marketplaceProjections[i]),
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
    { name: 'Marketplace', value: getYearProjection(marketplaceProjections, 3) },
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
                <Area type="monotone" dataKey="Marketplace" stackId="1" stroke="#10b981" fill="#10b981" />
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
          <div className="overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0">
            <TabsList className="inline-flex w-max min-w-full lg:grid lg:grid-cols-6 gap-1">
              <TabsTrigger value="overview" className="whitespace-nowrap flex-shrink-0">
                <Package className="w-4 h-4 mr-1" />
                Operators
              </TabsTrigger>
              <TabsTrigger value="vendorSubs" className="whitespace-nowrap flex-shrink-0">
                <Users className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Vendor Subs</span>
                <span className="sm:hidden">Vendor</span>
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="whitespace-nowrap flex-shrink-0">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Marketplace
              </TabsTrigger>
              <TabsTrigger value="referrals" className="whitespace-nowrap flex-shrink-0">
                <Award className="w-4 h-4 mr-1" />
                Referrals
              </TabsTrigger>
              <TabsTrigger value="features" className="whitespace-nowrap flex-shrink-0">
                <Sparkles className="w-4 h-4 mr-1" />
                Features
              </TabsTrigger>
              <TabsTrigger value="advertising" className="whitespace-nowrap flex-shrink-0">
                <Megaphone className="w-4 h-4 mr-1" />
                Ads
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Future Operators Package Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {packageData.map((pkg, idx) => (
                    <div key={pkg.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-lg gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-sm font-medium">{pkg.name}</span>
                      </div>
                      <div className="text-left sm:text-right pl-7 sm:pl-0">
                        <div className="text-sm font-bold">${(pkg.revenue).toLocaleString()}/mo</div>
                        <div className="text-xs text-slate-500">
                          {pkg.value} operators
                          {pkg.name === 'Basic' && ' ($99/sale × 6 sales/yr)'}
                          {pkg.name === 'Bronze' && ' ($35/mo + $64/sale × 1.25/mo)'}
                        </div>
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

          {/* Vendor Subscriptions Tab */}
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
                    <strong>Total Operators:</strong> {totalOperators.toLocaleString()} operators
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Total Vendors per Month:</strong> {totalOperators.toLocaleString()} operators × {vendorNewPerCityPerMonth} vendors/operator = {calculatedVendorNewPerMonth.toLocaleString()} vendors/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input type="number" value={vendorSubPrice} onChange={(e) => setVendorSubPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Avg Vendors Per Operator</Label>
                    <Input type="number" value={vendorNewPerCityPerMonth} onChange={(e) => setVendorNewPerCityPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Total Vendors per Month</Label>
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

          {/* Marketplace Tab */}
          <TabsContent value="marketplace">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                  Marketplace Item Post Fee Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <div className="text-sm text-slate-700">
                    <strong>Total Operators:</strong> {totalOperators.toLocaleString()} operators
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Items Posted/Month:</strong> {totalOperators.toLocaleString()} operators × {avgAnnualSalesPerOperator} sales/yr ÷ 12 × {avgItemsPostedPerSale} items/sale = {Math.round(marketplaceMonthlyItems).toLocaleString()} items/month
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Monthly Revenue:</strong> {Math.round(marketplaceMonthlyItems).toLocaleString()} items × $3/item = ${(marketplaceMonthlyItems * itemPostFee).toLocaleString('en-US', { maximumFractionDigits: 0 })}/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <Label>Total Operators</Label>
                    <Input type="number" value={totalOperators} disabled className="bg-slate-100" />
                  </div>
                  <div>
                    <Label>Avg Annual Sales per Operator</Label>
                    <Input type="number" value={avgAnnualSalesPerOperator} onChange={(e) => setAvgAnnualSalesPerOperator(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Avg Items Posted / Sale</Label>
                    <Input type="number" value={avgItemsPostedPerSale} onChange={(e) => setAvgItemsPostedPerSale(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={marketplaceGrowth} onChange={(e) => setMarketplaceGrowth(Number(e.target.value))} />
                  </div>
                </div>
                <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg inline-block">
                  <span className="text-sm text-slate-600">Item Post Fee: </span>
                  <span className="text-sm font-bold text-slate-900">$3.00 per item (fixed)</span>
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <div className="text-sm text-slate-700">
                    <strong>Total Operators:</strong> {totalOperators.toLocaleString()} operators
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Formula:</strong> {totalOperators.toLocaleString()} operators × {annualReferralConv} annual conv ÷ 12 × ${refAvgPropertyValue.toLocaleString()} × 2% × 25% × {platformIncomePercent}% = <strong>${referralMonthlyRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo</strong>
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Income per Conversion:</strong> ${referralIncomePerConversion.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Annual Referral Conv (per operator)</Label>
                    <Input type="number" value={annualReferralConv} onChange={(e) => setAnnualReferralConv(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Avg Property Value ($)</Label>
                    <Input type="number" value={refAvgPropertyValue} onChange={(e) => setRefAvgPropertyValue(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Platform % Income</Label>
                    <Input type="number" value={platformIncomePercent} onChange={(e) => setPlatformIncomePercent(Number(e.target.value))} />
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
                    <strong>National Features/Month:</strong> {nationalFeaturesPerMonth} features/month (fixed)
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
                    <Label>National Features/Month</Label>
                    <Input type="number" value={nationalFeaturesPerMonth} onChange={(e) => setNationalFeaturesPerMonth(Number(e.target.value))} />
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