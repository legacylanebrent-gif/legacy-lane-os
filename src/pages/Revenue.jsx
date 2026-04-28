import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Package, TrendingUp, DollarSign, Users, ShoppingBag, Award, Sparkles, Megaphone, Globe } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts';

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

// Avg monthly revenue per operator based on package mix assumption
// Mix: 60% Basic ($99/sale × 6/yr ÷ 12 = $49.50), 25% Bronze ($35 + $64×1.25 = $115), 10% Silver ($149), 5% Gold ($299)
const AVG_OPERATOR_MONTHLY_REVENUE = 0.60 * 49.5 + 0.25 * 115 + 0.10 * 149 + 0.05 * 299;

export default function Revenue() {
  const [activeTab, setActiveTab] = useState('operators');

  // Load saved values from localStorage or use defaults
  const loadValue = (key, defaultValue) => {
    const saved = localStorage.getItem(`revenue_proj_${key}`);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  // Operator Growth Inputs
  const [launchOperators, setLaunchOperators] = useState(() => loadValue('launchOperators', 100));
  const [operatorGrowthRate, setOperatorGrowthRate] = useState(() => loadValue('operatorGrowthRate', 10)); // % per month
  const [avgMonthlyRevenuePerOp, setAvgMonthlyRevenuePerOp] = useState(() => loadValue('avgMonthlyRevenuePerOp', Math.round(AVG_OPERATOR_MONTHLY_REVENUE)));

  // Vendor Subscription Inputs
  const [vendorSubPrice, setVendorSubPrice] = useState(() => loadValue('vendorSubPrice', 79));
  const [vendorChurnRate, setVendorChurnRate] = useState(() => loadValue('vendorChurnRate', 4));
  const [vendorPerOperator, setVendorPerOperator] = useState(() => loadValue('vendorPerOperator', 2));

  // Marketplace Inputs
  const [avgAnnualSalesPerOperator, setAvgAnnualSalesPerOperator] = useState(() => loadValue('avgAnnualSalesPerOperator', 6));
  const [avgItemsPostedPerSale, setAvgItemsPostedPerSale] = useState(() => loadValue('avgItemsPostedPerSale', 50));
  const [marketplaceGrowth, setMarketplaceGrowth] = useState(() => loadValue('marketplaceGrowth', 5));
  const itemPostFee = 3;

  // Referral Inputs
  const [annualReferralConv, setAnnualReferralConv] = useState(() => loadValue('annualReferralConv', 3));
  const [refAvgPropertyValue, setRefAvgPropertyValue] = useState(() => loadValue('refAvgPropertyValue', 350000));
  const [platformIncomePercent, setPlatformIncomePercent] = useState(() => loadValue('platformIncomePercent', 70));
  const [referralGrowth, setReferralGrowth] = useState(() => loadValue('referralGrowth', 3));

  // Premium Placement Inputs
  const [nationalFeaturePrice, setNationalFeaturePrice] = useState(() => loadValue('nationalFeaturePrice', 179));
  const [localFeaturePrice, setLocalFeaturePrice] = useState(() => loadValue('localFeaturePrice', 97));
  const [featureGrowth, setFeatureGrowth] = useState(() => loadValue('featureGrowth', 5));

  // Website Inputs
  const [websiteSetupFee, setWebsiteSetupFee] = useState(() => loadValue('websiteSetupFee', 397));
  const [websiteMonthlyFee, setWebsiteMonthlyFee] = useState(() => loadValue('websiteMonthlyFee', 79));
  const [websiteNewPerMonth, setWebsiteNewPerMonth] = useState(() => loadValue('websiteNewPerMonth', 10));
  const [websiteGrowthAfterY1, setWebsiteGrowthAfterY1] = useState(() => loadValue('websiteGrowthAfterY1', 5));

  // Advertising Inputs
  const [adBasicPrice, setAdBasicPrice] = useState(() => loadValue('adBasicPrice', 29));
  const [adProPrice, setAdProPrice] = useState(() => loadValue('adProPrice', 49));
  const [adPremiumPrice, setAdPremiumPrice] = useState(() => loadValue('adPremiumPrice', 179));
  const [adGrowth, setAdGrowth] = useState(() => loadValue('adGrowth', 3));
  const [citiesPerOperator, setCitiesPerOperator] = useState(() => loadValue('citiesPerOperator', 1));

  // Auto-save
  useEffect(() => {
    const values = {
      launchOperators, operatorGrowthRate, avgMonthlyRevenuePerOp,
      vendorSubPrice, vendorChurnRate, vendorPerOperator,
      avgAnnualSalesPerOperator, avgItemsPostedPerSale, marketplaceGrowth,
      annualReferralConv, refAvgPropertyValue, platformIncomePercent, referralGrowth,
      nationalFeaturePrice, localFeaturePrice, featureGrowth,
      websiteSetupFee, websiteMonthlyFee, websiteNewPerMonth, websiteGrowthAfterY1,
      adBasicPrice, adProPrice, adPremiumPrice, adGrowth, citiesPerOperator,
    };
    Object.entries(values).forEach(([key, value]) => {
      localStorage.setItem(`revenue_proj_${key}`, JSON.stringify(value));
    });
  }, [
    launchOperators, operatorGrowthRate, avgMonthlyRevenuePerOp,
    vendorSubPrice, vendorChurnRate, vendorPerOperator,
    avgAnnualSalesPerOperator, avgItemsPostedPerSale, marketplaceGrowth,
    annualReferralConv, refAvgPropertyValue, platformIncomePercent, referralGrowth,
    nationalFeaturePrice, localFeaturePrice, featureGrowth,
    websiteSetupFee, websiteMonthlyFee, websiteNewPerMonth, websiteGrowthAfterY1,
    adBasicPrice, adProPrice, adPremiumPrice, adGrowth, citiesPerOperator,
  ]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getYearProjection = (projections, year) =>
    projections.slice(0, year * 12).reduce((s, v) => s + v, 0);

  // Build operator count curve: starts at launchOperators, grows at operatorGrowthRate% per month
  const operatorCounts = Array.from({ length: 120 }, (_, i) =>
    Math.round(launchOperators * Math.pow(1 + operatorGrowthRate / 100, i))
  );

  // Operator revenue = operator count × avg monthly revenue per operator
  const operatorProjections = operatorCounts.map(count => count * avgMonthlyRevenuePerOp);

  // Vendor subs: operator count × vendorPerOperator = new vendors that month (with churn)
  const vendorSubProjections = (() => {
    const proj = [];
    let subs = 0;
    for (let i = 0; i < 120; i++) {
      const newVendors = operatorCounts[i] * vendorPerOperator;
      const churnFactor = 1 - vendorChurnRate / 100;
      subs = subs * churnFactor + newVendors;
      proj.push(subs * vendorSubPrice);
    }
    return proj;
  })();

  // Marketplace
  const marketplaceProjections = (() => {
    const proj = [];
    for (let i = 0; i < 120; i++) {
      const base = operatorCounts[i] * (avgAnnualSalesPerOperator / 12) * avgItemsPostedPerSale * itemPostFee;
      proj.push(base * Math.pow(1 + marketplaceGrowth / 100, i));
    }
    return proj;
  })();

  // Referrals
  const referralIncomePerConversion = refAvgPropertyValue * 0.02 * 0.25 * (platformIncomePercent / 100);
  const referralProjections = (() => {
    const proj = [];
    for (let i = 0; i < 120; i++) {
      const base = operatorCounts[i] * (annualReferralConv / 12) * referralIncomePerConversion;
      proj.push(base * Math.pow(1 + referralGrowth / 100, i));
    }
    return proj;
  })();

  // Features
  const featureProjections = (() => {
    const proj = [];
    for (let i = 0; i < 120; i++) {
      const localPerMonth = operatorCounts[i] / 12;
      const nationalPerMonth = (operatorCounts[i] * 0.10) / 12;
      const base = (nationalPerMonth * nationalFeaturePrice) + (localPerMonth * localFeaturePrice);
      proj.push(base * Math.pow(1 + featureGrowth / 100, i));
    }
    return proj;
  })();

  // Advertising: cities = operators × citiesPerOperator
  const adProjections = (() => {
    const proj = [];
    for (let i = 0; i < 120; i++) {
      const cities = operatorCounts[i] * citiesPerOperator;
      const base = cities * (adBasicPrice + adProPrice + adPremiumPrice);
      proj.push(base * Math.pow(1 + adGrowth / 100, i));
    }
    return proj;
  })();

  // Websites
  const websiteSetupProjections = [];
  const websiteRecurringProjections = [];
  let cumulativeSites = 0;
  let currentNewSites = websiteNewPerMonth;
  for (let i = 0; i < 120; i++) {
    if (i >= 12) currentNewSites = currentNewSites * (1 + websiteGrowthAfterY1 / 100);
    cumulativeSites += currentNewSites;
    websiteSetupProjections.push(currentNewSites * websiteSetupFee);
    websiteRecurringProjections.push(cumulativeSites * websiteMonthlyFee);
  }
  const websiteTotalProjections = websiteSetupProjections.map((s, i) => s + websiteRecurringProjections[i]);

  // Total
  const totalProjections = operatorProjections.map((_, i) =>
    operatorProjections[i] + vendorSubProjections[i] + marketplaceProjections[i] +
    referralProjections[i] + featureProjections[i] + adProjections[i] + websiteTotalProjections[i]
  );

  const year1Total = getYearProjection(totalProjections, 1);
  const year3Total = getYearProjection(totalProjections, 3);
  const year5Total = getYearProjection(totalProjections, 5);
  const year10Total = getYearProjection(totalProjections, 10);

  const chartData = Array.from({ length: 36 }, (_, i) => ({
    month: `M${i + 1}`,
    'Operators': Math.round(operatorProjections[i]),
    'Vendor Subs': Math.round(vendorSubProjections[i]),
    Marketplace: Math.round(marketplaceProjections[i]),
    Referrals: Math.round(referralProjections[i]),
    Features: Math.round(featureProjections[i]),
    Advertising: Math.round(adProjections[i]),
    Websites: Math.round(websiteTotalProjections[i]),
    Total: Math.round(totalProjections[i]),
    'Operator Count': operatorCounts[i],
  }));

  const pieData = [
    { name: 'Operators', value: getYearProjection(operatorProjections, 3) },
    { name: 'Vendor Subs', value: getYearProjection(vendorSubProjections, 3) },
    { name: 'Marketplace', value: getYearProjection(marketplaceProjections, 3) },
    { name: 'Referrals', value: getYearProjection(referralProjections, 3) },
    { name: 'Features', value: getYearProjection(featureProjections, 3) },
    { name: 'Advertising', value: getYearProjection(adProjections, 3) },
    { name: 'Websites', value: getYearProjection(websiteTotalProjections, 3) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Revenue Projections</h1>
          <p className="text-slate-600">Launch-based growth model — starting from {launchOperators} operators, all revenue streams included</p>
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
                <span className="text-sm font-medium opacity-90">Launch Operators</span>
                <Building2 className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">{launchOperators.toLocaleString()}</div>
              <div className="text-xs opacity-75">→ {operatorCounts[35].toLocaleString()} by Month 36</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">10-Year Total</span>
                <Award className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year10Total / 1000000).toFixed(0)}M</div>
              <div className="text-xs opacity-75">Cumulative revenue</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>36-Month Revenue Projection — All Streams</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="Operators" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                <Area type="monotone" dataKey="Vendor Subs" stackId="1" stroke="#a78bfa" fill="#a78bfa" />
                <Area type="monotone" dataKey="Marketplace" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="Referrals" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="Features" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="Advertising" stackId="1" stroke="#14b8a6" fill="#14b8a6" />
                <Area type="monotone" dataKey="Websites" stackId="1" stroke="#6366f1" fill="#6366f1" />
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

          {/* Operator Growth Curve */}
          <Card>
            <CardHeader>
              <CardTitle>Operator Growth Curve (36 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="Operator Count" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0">
            <TabsList className="inline-flex w-max min-w-full lg:grid lg:grid-cols-7 gap-1">
              <TabsTrigger value="operators" className="whitespace-nowrap flex-shrink-0">
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
                RE Referrals
              </TabsTrigger>
              <TabsTrigger value="features" className="whitespace-nowrap flex-shrink-0">
                <Sparkles className="w-4 h-4 mr-1" />
                Features
              </TabsTrigger>
              <TabsTrigger value="advertising" className="whitespace-nowrap flex-shrink-0">
                <Megaphone className="w-4 h-4 mr-1" />
                Ads
              </TabsTrigger>
              <TabsTrigger value="websites" className="whitespace-nowrap flex-shrink-0">
                <Globe className="w-4 h-4 mr-1" />
                Websites
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Operators Tab */}
          <TabsContent value="operators">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Operator Growth & Revenue Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
                  <div className="text-sm text-slate-700">
                    <strong>Model:</strong> Start with {launchOperators} operators at launch, grow {operatorGrowthRate}% per month (compounding).
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Month 1 Operators:</strong> {operatorCounts[0].toLocaleString()} &nbsp;→&nbsp;
                    <strong>Month 12:</strong> {operatorCounts[11].toLocaleString()} &nbsp;→&nbsp;
                    <strong>Month 36:</strong> {operatorCounts[35].toLocaleString()} &nbsp;→&nbsp;
                    <strong>Month 120:</strong> {operatorCounts[119].toLocaleString()}
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    <strong>Avg Monthly Revenue / Operator:</strong> ${avgMonthlyRevenuePerOp}/mo (blended package mix)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Launch Operators (Month 1)</Label>
                    <Input type="number" value={launchOperators} onChange={(e) => setLaunchOperators(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={operatorGrowthRate} onChange={(e) => setOperatorGrowthRate(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Avg Revenue / Operator / Month ($)</Label>
                    <Input type="number" value={avgMonthlyRevenuePerOp} onChange={(e) => setAvgMonthlyRevenuePerOp(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 3, 5, 10].map((yr, i) => {
                    const colors = ['green', 'cyan', 'purple', 'orange'];
                    return (
                      <div key={yr} className={`p-4 bg-${colors[i]}-50 rounded-lg border border-${colors[i]}-200`}>
                        <div className="text-sm text-slate-600 mb-1">{yr}-Year Total</div>
                        <div className={`text-2xl font-bold text-${colors[i]}-600`}>
                          ${(getYearProjection(operatorProjections, yr) / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{operatorCounts[yr * 12 - 1].toLocaleString()} ops by end</div>
                      </div>
                    );
                  })}
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <div className="text-sm text-slate-700">
                    <strong>Model:</strong> Each operator brings {vendorPerOperator} vendors/month. Vendors pay ${vendorSubPrice}/mo with {vendorChurnRate}% monthly churn.
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Month 1 Vendors:</strong> {(operatorCounts[0] * vendorPerOperator).toLocaleString()} &nbsp;→&nbsp;
                    <strong>Month 36:</strong> {Math.round(vendorSubProjections[35] / vendorSubPrice).toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input type="number" value={vendorSubPrice} onChange={(e) => setVendorSubPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Vendors Per Operator / Month</Label>
                    <Input type="number" value={vendorPerOperator} onChange={(e) => setVendorPerOperator(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={vendorChurnRate} onChange={(e) => setVendorChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">${(getYearProjection(vendorSubProjections, 1) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">${(getYearProjection(vendorSubProjections, 3) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">${(getYearProjection(vendorSubProjections, 5) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">${(getYearProjection(vendorSubProjections, 10) / 1000000).toFixed(2)}M</div>
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
                    <strong>Month 1:</strong> {operatorCounts[0].toLocaleString()} ops × {avgAnnualSalesPerOperator} sales/yr ÷ 12 × {avgItemsPostedPerSale} items × $3 = ${Math.round(operatorCounts[0] * (avgAnnualSalesPerOperator / 12) * avgItemsPostedPerSale * itemPostFee).toLocaleString()}/mo
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Avg Annual Sales per Operator</Label>
                    <Input type="number" value={avgAnnualSalesPerOperator} onChange={(e) => setAvgAnnualSalesPerOperator(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Avg Items Posted / Sale</Label>
                    <Input type="number" value={avgItemsPostedPerSale} onChange={(e) => setAvgItemsPostedPerSale(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Additional Monthly Growth (%)</Label>
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
                    <div className="text-2xl font-bold text-green-600">${(getYearProjection(marketplaceProjections, 1) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">${(getYearProjection(marketplaceProjections, 3) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">${(getYearProjection(marketplaceProjections, 5) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">${(getYearProjection(marketplaceProjections, 10) / 1000000).toFixed(2)}M</div>
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
                    <strong>Month 1:</strong> {operatorCounts[0].toLocaleString()} ops × {annualReferralConv} annual conv ÷ 12 × ${refAvgPropertyValue.toLocaleString()} × 2% × 25% × {platformIncomePercent}% = <strong>${Math.round(operatorCounts[0] * (annualReferralConv / 12) * referralIncomePerConversion).toLocaleString()}/mo</strong>
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
                    <div className="text-2xl font-bold text-green-600">${(getYearProjection(referralProjections, 1) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">${(getYearProjection(referralProjections, 3) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">${(getYearProjection(referralProjections, 5) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">${(getYearProjection(referralProjections, 10) / 1000000).toFixed(2)}M</div>
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <div className="text-sm text-slate-700">
                    <strong>Month 1:</strong> {operatorCounts[0].toLocaleString()} ops → {(operatorCounts[0] / 12).toFixed(1)} local features/mo × ${localFeaturePrice} + {(operatorCounts[0] * 0.1 / 12).toFixed(1)} national × ${nationalFeaturePrice}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>National Feature Price ($)</Label>
                    <Input type="number" value={nationalFeaturePrice} onChange={(e) => setNationalFeaturePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Local Feature Price ($)</Label>
                    <Input type="number" value={localFeaturePrice} onChange={(e) => setLocalFeaturePrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Additional Monthly Growth (%)</Label>
                    <Input type="number" value={featureGrowth} onChange={(e) => setFeatureGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">${(getYearProjection(featureProjections, 1) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">${(getYearProjection(featureProjections, 3) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">${(getYearProjection(featureProjections, 5) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">${(getYearProjection(featureProjections, 10) / 1000000).toFixed(2)}M</div>
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
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <div className="text-sm text-slate-700">
                    <strong>Month 1 Cities:</strong> {operatorCounts[0].toLocaleString()} ops × {citiesPerOperator} city/op = {(operatorCounts[0] * citiesPerOperator).toLocaleString()} cities
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Month 1 Revenue:</strong> {(operatorCounts[0] * citiesPerOperator).toLocaleString()} × (${adBasicPrice} + ${adProPrice} + ${adPremiumPrice}) = ${(operatorCounts[0] * citiesPerOperator * (adBasicPrice + adProPrice + adPremiumPrice)).toLocaleString()}/mo
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
                    <Label>Cities Per Operator</Label>
                    <Input type="number" value={citiesPerOperator} onChange={(e) => setCitiesPerOperator(Number(e.target.value))} />
                  </div>
                </div>
                <div className="mb-6">
                  <Label>Additional Monthly Growth (%)</Label>
                  <Input type="number" value={adGrowth} onChange={(e) => setAdGrowth(Number(e.target.value))} className="max-w-xs" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">${(getYearProjection(adProjections, 1) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">${(getYearProjection(adProjections, 3) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">${(getYearProjection(adProjections, 5) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">${(getYearProjection(adProjections, 10) / 1000000).toFixed(2)}M</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Websites Tab */}
          <TabsContent value="websites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  Operator Website Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1">
                  <div className="text-sm text-slate-700">
                    <strong>Model:</strong> Flat {websiteNewPerMonth} new sites/month in Year 1, then {websiteGrowthAfterY1}% monthly growth after that.
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Setup Revenue (one-time):</strong> new sites/month × ${websiteSetupFee} setup fee
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Recurring Revenue:</strong> cumulative hosted sites × ${websiteMonthlyFee}/month
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div>
                    <Label>Setup Fee per Site ($)</Label>
                    <Input type="number" value={websiteSetupFee} onChange={(e) => setWebsiteSetupFee(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Hosting Fee ($)</Label>
                    <Input type="number" value={websiteMonthlyFee} onChange={(e) => setWebsiteMonthlyFee(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>New Sites / Month (Year 1)</Label>
                    <Input type="number" value={websiteNewPerMonth} onChange={(e) => setWebsiteNewPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth After Y1 (%)</Label>
                    <Input type="number" value={websiteGrowthAfterY1} onChange={(e) => setWebsiteGrowthAfterY1(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">One-Time Setup Revenue</div>
                    <div className="text-3xl font-bold text-amber-600 mb-1">${(getYearProjection(websiteSetupProjections, 1) / 1000).toFixed(0)}K <span className="text-base font-normal text-amber-500">Year 1</span></div>
                    <div className="text-sm text-slate-600">${(getYearProjection(websiteSetupProjections, 3) / 1000000).toFixed(2)}M over 3 years &nbsp;·&nbsp; ${(getYearProjection(websiteSetupProjections, 5) / 1000000).toFixed(2)}M over 5 years</div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-1">Recurring Hosting Revenue</div>
                    <div className="text-3xl font-bold text-indigo-600 mb-1">${(getYearProjection(websiteRecurringProjections, 1) / 1000).toFixed(0)}K <span className="text-base font-normal text-indigo-400">Year 1</span></div>
                    <div className="text-sm text-slate-600">${(getYearProjection(websiteRecurringProjections, 3) / 1000000).toFixed(2)}M over 3 years &nbsp;·&nbsp; ${(getYearProjection(websiteRecurringProjections, 5) / 1000000).toFixed(2)}M over 5 years</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">${(getYearProjection(websiteTotalProjections, 1) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">${(getYearProjection(websiteTotalProjections, 3) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">${(getYearProjection(websiteTotalProjections, 5) / 1000000).toFixed(2)}M</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">${(getYearProjection(websiteTotalProjections, 10) / 1000000).toFixed(2)}M</div>
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