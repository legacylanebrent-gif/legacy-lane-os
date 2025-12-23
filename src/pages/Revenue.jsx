import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, ShoppingBag, Award, BookOpen, Briefcase, Megaphone, Sparkles, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

export default function Revenue() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [bizInBoxPricing, setBizInBoxPricing] = useState(null);
  const [operatorPackages, setOperatorPackages] = useState({ basic: null, pro: null, premium: null });
  const [vendorPackage, setVendorPackage] = useState(null);
  const [agentPackage, setAgentPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pieChartYear, setPieChartYear] = useState(3);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Load saved values from localStorage or use defaults
  const loadValue = (key, defaultValue) => {
    const saved = localStorage.getItem(`revenue_${key}`);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  // Operator Subscription Inputs
  const [subBasicPrice, setSubBasicPrice] = useState(() => loadValue('subBasicPrice', 49));
  const [subProPrice, setSubProPrice] = useState(() => loadValue('subProPrice', 99));
  const [subPremiumPrice, setSubPremiumPrice] = useState(() => loadValue('subPremiumPrice', 199));
  const [subListingFee, setSubListingFee] = useState(() => loadValue('subListingFee', 0));
  const [subNewPerMonth, setSubNewPerMonth] = useState(() => loadValue('subNewPerMonth', 25));
  const [subChurnRate, setSubChurnRate] = useState(() => loadValue('subChurnRate', 5));

  // Vendor Subscription Inputs
  const [vendorSubPrice, setVendorSubPrice] = useState(() => loadValue('vendorSubPrice', 79));
  const [vendorNewPerMonth, setVendorNewPerMonth] = useState(() => loadValue('vendorNewPerMonth', 15));
  const [vendorChurnRate, setVendorChurnRate] = useState(() => loadValue('vendorChurnRate', 4));

  // Agent Subscription Inputs
  const [agentSubPrice, setAgentSubPrice] = useState(() => loadValue('agentSubPrice', 149));
  const [agentNewPerMonth, setAgentNewPerMonth] = useState(() => loadValue('agentNewPerMonth', 10));
  const [agentChurnRate, setAgentChurnRate] = useState(() => loadValue('agentChurnRate', 3));

  // Marketplace Transaction Fee Inputs
  const [avgTransactionValue, setAvgTransactionValue] = useState(() => loadValue('avgTransactionValue', 250));
  const [transactionFeePercent, setTransactionFeePercent] = useState(() => loadValue('transactionFeePercent', 10));
  const [transactionsPerMonth, setTransactionsPerMonth] = useState(() => loadValue('transactionsPerMonth', 100));
  const [marketplaceGrowth, setMarketplaceGrowth] = useState(() => loadValue('marketplaceGrowth', 20));
  
  // Course Sales Inputs
  const [avgCoursePrice, setAvgCoursePrice] = useState(() => loadValue('avgCoursePrice', 199));
  const [courseSalesPerMonth, setCourseSalesPerMonth] = useState(() => loadValue('courseSalesPerMonth', 15));
  const [courseGrowth, setCourseGrowth] = useState(() => loadValue('courseGrowth', 10));
  
  // Referral Fee Inputs
  const [avgReferralFee, setAvgReferralFee] = useState(() => loadValue('avgReferralFee', 500));
  const [referralsPerMonth, setReferralsPerMonth] = useState(() => loadValue('referralsPerMonth', 8));
  const [referralGrowth, setReferralGrowth] = useState(() => loadValue('referralGrowth', 12));

  // Premium Placement Inputs
  const [nationalFeaturePrice, setNationalFeaturePrice] = useState(() => loadValue('nationalFeaturePrice', 299));
  const [localFeaturePrice, setLocalFeaturePrice] = useState(() => loadValue('localFeaturePrice', 99));
  const [featuresPerMonth, setFeaturesPerMonth] = useState(() => loadValue('featuresPerMonth', 12));
  const [featureGrowth, setFeatureGrowth] = useState(() => loadValue('featureGrowth', 15));
  
  // Advertising Revenue Inputs
  const [adBasicPrice, setAdBasicPrice] = useState(() => loadValue('adBasicPrice', 500));
  const [adProPrice, setAdProPrice] = useState(() => loadValue('adProPrice', 1500));
  const [adPremiumPrice, setAdPremiumPrice] = useState(() => loadValue('adPremiumPrice', 3000));
  const [adNewPerMonth, setAdNewPerMonth] = useState(() => loadValue('adNewPerMonth', 10));
  const [adChurnRate, setAdChurnRate] = useState(() => loadValue('adChurnRate', 8));

  // Biz in a Box Inputs
  const [bizNewPerMonth, setBizNewPerMonth] = useState(() => loadValue('bizNewPerMonth', 5));
  const [bizChurnRate, setBizChurnRate] = useState(() => loadValue('bizChurnRate', 2));
  const [avgSaleProfit, setAvgSaleProfit] = useState(() => loadValue('avgSaleProfit', 1500));
  const [salesPerMonth, setSalesPerMonth] = useState(() => loadValue('salesPerMonth', 2));

  const handleSave = () => {
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Fetch all pricing from packages
  useEffect(() => {
    const loadAllPricing = async () => {
      try {
        // Load Biz in a Box
        const bizPackages = await base44.entities.SubscriptionPackage.filter({
          account_type: 'biz_in_a_box'
        });
        if (bizPackages.length > 0) {
          setBizInBoxPricing(bizPackages[0]);
        }

        // Load Operator packages
        const operatorPackages = await base44.entities.SubscriptionPackage.filter({
          account_type: 'estate_sale_operator'
        });
        const opPkgs = { basic: null, pro: null, premium: null };
        operatorPackages.forEach(pkg => {
          if (pkg.tier_level === 'basic') opPkgs.basic = pkg;
          if (pkg.tier_level === 'pro') opPkgs.pro = pkg;
          if (pkg.tier_level === 'premium') opPkgs.premium = pkg;
        });
        setOperatorPackages(opPkgs);

        // Load Vendor packages
        const vendorPackages = await base44.entities.SubscriptionPackage.filter({
          account_type: 'vendor'
        });
        if (vendorPackages.length > 0) {
          setVendorPackage(vendorPackages[0]);
        }

        // Load Agent packages
        const agentPackages = await base44.entities.SubscriptionPackage.filter({
          account_type: 'real_estate_agent'
        });
        if (agentPackages.length > 0) {
          setAgentPackage(agentPackages[0]);
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAllPricing();
  }, []);

  // Auto-save to localStorage whenever values change
  useEffect(() => {
    const values = {
      subBasicPrice, subProPrice, subPremiumPrice, subNewPerMonth, subChurnRate,
      vendorSubPrice, vendorNewPerMonth, vendorChurnRate,
      agentSubPrice, agentNewPerMonth, agentChurnRate,
      avgTransactionValue, transactionFeePercent, transactionsPerMonth, marketplaceGrowth,
      avgCoursePrice, courseSalesPerMonth, courseGrowth,
      avgReferralFee, referralsPerMonth, referralGrowth,
      nationalFeaturePrice, localFeaturePrice, featuresPerMonth, featureGrowth,
      adBasicPrice, adProPrice, adPremiumPrice, adNewPerMonth, adChurnRate,
      bizNewPerMonth, bizChurnRate, avgSaleProfit, salesPerMonth, subListingFee
    };
    
    Object.entries(values).forEach(([key, value]) => {
      localStorage.setItem(`revenue_${key}`, JSON.stringify(value));
    });
  }, [
    subBasicPrice, subProPrice, subPremiumPrice, subListingFee, subNewPerMonth, subChurnRate,
    vendorSubPrice, vendorNewPerMonth, vendorChurnRate,
    agentSubPrice, agentNewPerMonth, agentChurnRate,
    avgTransactionValue, transactionFeePercent, transactionsPerMonth, marketplaceGrowth,
    avgCoursePrice, courseSalesPerMonth, courseGrowth,
    avgReferralFee, referralsPerMonth, referralGrowth,
    nationalFeaturePrice, localFeaturePrice, featuresPerMonth, featureGrowth,
    adBasicPrice, adProPrice, adPremiumPrice, adNewPerMonth, adChurnRate,
    bizNewPerMonth, bizChurnRate, avgSaleProfit, salesPerMonth
  ]);

  const calculateProjections = (monthlyBase, growthPercent, months) => {
    const projections = [];
    let current = monthlyBase;
    for (let i = 0; i < months; i++) {
      projections.push(current);
      current = current * (1 + growthPercent / 100);
    }
    return projections;
  };

  const calculateSubscriptionRevenue = (months, basicPrice = subBasicPrice, proPrice = subProPrice, premiumPrice = subPremiumPrice, newPerMonth = subNewPerMonth, churnRate = subChurnRate, listingFee = 0) => {
    const projections = [];
    const quantities = [];
    let basicSubs = Math.floor(newPerMonth * 0.5);
    let proSubs = Math.floor(newPerMonth * 0.3);
    let premiumSubs = Math.floor(newPerMonth * 0.2);
    
    for (let i = 0; i < months; i++) {
      const churnFactor = (1 - churnRate / 100);
      const subscriptionRevenue = (basicSubs * basicPrice + proSubs * proPrice + premiumSubs * premiumPrice) * churnFactor;
      const listingRevenue = (basicSubs + proSubs + premiumSubs) * listingFee * churnFactor;
      const revenue = subscriptionRevenue + listingRevenue;
      const totalSubs = basicSubs + proSubs + premiumSubs;
      projections.push(revenue);
      quantities.push(totalSubs);
      
      basicSubs = Math.floor(basicSubs * churnFactor + newPerMonth * 0.5);
      proSubs = Math.floor(proSubs * churnFactor + newPerMonth * 0.3);
      premiumSubs = Math.floor(premiumSubs * churnFactor + newPerMonth * 0.2);
    }
    return { projections, quantities };
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

  const getYearProjection = (projections, year) => {
    const endMonth = year * 12;
    return projections.slice(0, endMonth).reduce((sum, val) => sum + val, 0);
  };

  // Calculate all revenue streams
  const subData = calculateSubscriptionRevenue(120, 
    operatorPackages.basic?.monthly_price || subBasicPrice, 
    operatorPackages.pro?.monthly_price || subProPrice, 
    operatorPackages.premium?.monthly_price || subPremiumPrice, 
    subNewPerMonth, 
    subChurnRate,
    subListingFee
  );
  const subProjections = subData.projections;
  const subQuantities = subData.quantities;
  
  const vendorSubData = calculateSimpleSubRevenue(vendorPackage?.monthly_price || vendorSubPrice, vendorNewPerMonth, vendorChurnRate, 120);
  const vendorSubProjections = vendorSubData.projections;
  const vendorSubQuantities = vendorSubData.quantities;
  
  const agentSubData = calculateSimpleSubRevenue(agentPackage?.monthly_price || agentSubPrice, agentNewPerMonth, agentChurnRate, 120);
  const agentSubProjections = agentSubData.projections;
  const agentSubQuantities = agentSubData.quantities;
  
  const marketplaceProjections = calculateProjections(transactionsPerMonth * avgTransactionValue * (transactionFeePercent / 100), marketplaceGrowth, 120);
  const marketplaceQuantities = calculateProjections(transactionsPerMonth, marketplaceGrowth, 120);
  
  const courseProjections = calculateProjections(courseSalesPerMonth * avgCoursePrice, courseGrowth, 120);
  const courseQuantities = calculateProjections(courseSalesPerMonth, courseGrowth, 120);
  
  const referralProjections = calculateProjections(referralsPerMonth * avgReferralFee, referralGrowth, 120);
  const referralQuantities = calculateProjections(referralsPerMonth, referralGrowth, 120);
  
  const featureProjections = calculateProjections(featuresPerMonth * (nationalFeaturePrice * 0.03 + localFeaturePrice * 0.97), featureGrowth, 120);
  const featureQuantities = calculateProjections(featuresPerMonth, featureGrowth, 120);
  
  const adData = calculateSubscriptionRevenue(120, adBasicPrice, adProPrice, adPremiumPrice, adNewPerMonth, adChurnRate);
  const adProjections = adData.projections;
  const adQuantities = adData.quantities;

  // Calculate Biz in a Box revenue
  const calculateBizInBoxRevenue = (months) => {
    const projections = [];
    const quantities = [];
    let operators = bizNewPerMonth;
    
    const setupFee = bizInBoxPricing?.biz_in_a_box_setup_fee || 2997;
    const monthlyFee = bizInBoxPricing?.biz_in_a_box_monthly_year1 || 149;
    const revenueSharePercent = bizInBoxPricing?.biz_in_a_box_revenue_share || 3;
    
    for (let i = 0; i < months; i++) {
      const churnFactor = (1 - bizChurnRate / 100);
      
      // One-time setup fees for new operators
      const setupRevenue = bizNewPerMonth * setupFee;
      
      // Monthly platform fees
      const monthlyRevenue = operators * monthlyFee * churnFactor;
      
      // Revenue share based on sales per month and avg sale profit
      const revenueShareRevenue = operators * salesPerMonth * avgSaleProfit * (revenueSharePercent / 100) * churnFactor;
      
      const totalRevenue = setupRevenue + monthlyRevenue + revenueShareRevenue;
      
      projections.push(totalRevenue);
      quantities.push(operators);
      
      operators = Math.floor(operators * churnFactor + bizNewPerMonth);
    }
    return { projections, quantities };
  };

  const bizInBoxData = calculateBizInBoxRevenue(120);
  const bizInBoxProjections = bizInBoxData.projections;
  const bizInBoxQuantities = bizInBoxData.quantities;

  const totalProjections = subProjections.map((_, i) => 
    subProjections[i] + vendorSubProjections[i] + agentSubProjections[i] + 
    marketplaceProjections[i] + courseProjections[i] + 
    referralProjections[i] + featureProjections[i] + adProjections[i] + bizInBoxProjections[i]
  );

  const chartData = Array.from({ length: 36 }, (_, i) => ({
    month: `M${i + 1}`,
    'Operator Subs': Math.round(subProjections[i]),
    'Operator Subs Qty': Math.round(subQuantities[i]),
    'Vendor Subs': Math.round(vendorSubProjections[i]),
    'Vendor Subs Qty': Math.round(vendorSubQuantities[i]),
    'Agent Subs': Math.round(agentSubProjections[i]),
    'Agent Subs Qty': Math.round(agentSubQuantities[i]),
    Marketplace: Math.round(marketplaceProjections[i]),
    'Marketplace Qty': Math.round(marketplaceQuantities[i]),
    Courses: Math.round(courseProjections[i]),
    'Courses Qty': Math.round(courseQuantities[i]),
    Referrals: Math.round(referralProjections[i]),
    'Referrals Qty': Math.round(referralQuantities[i]),
    Features: Math.round(featureProjections[i]),
    'Features Qty': Math.round(featureQuantities[i]),
    Advertising: Math.round(adProjections[i]),
    'Advertising Qty': Math.round(adQuantities[i]),
    'Biz in a Box': Math.round(bizInBoxProjections[i]),
    'Biz in a Box Qty': Math.round(bizInBoxQuantities[i]),
    Total: Math.round(totalProjections[i])
  }));

  const year1Total = getYearProjection(totalProjections, 1);
  const year3Total = getYearProjection(totalProjections, 3);
  const year5Total = getYearProjection(totalProjections, 5);
  const year10Total = getYearProjection(totalProjections, 10);

  const pieData = [
    { name: 'Operator Subs', value: getYearProjection(subProjections, pieChartYear) },
    { name: 'Vendor Subs', value: getYearProjection(vendorSubProjections, pieChartYear) },
    { name: 'Agent Subs', value: getYearProjection(agentSubProjections, pieChartYear) },
    { name: 'Marketplace', value: getYearProjection(marketplaceProjections, pieChartYear) },
    { name: 'Courses', value: getYearProjection(courseProjections, pieChartYear) },
    { name: 'Referrals', value: getYearProjection(referralProjections, pieChartYear) },
    { name: 'Features', value: getYearProjection(featureProjections, pieChartYear) },
    { name: 'Advertising', value: getYearProjection(adProjections, pieChartYear) },
    { name: 'Biz in a Box', value: getYearProjection(bizInBoxProjections, pieChartYear) },
  ];

  const yearlyComparisonData = [
    {
      year: 'Year 3',
      'Operator Subs': getYearProjection(subProjections, 3),
      'Vendor Subs': getYearProjection(vendorSubProjections, 3),
      'Agent Subs': getYearProjection(agentSubProjections, 3),
      Marketplace: getYearProjection(marketplaceProjections, 3),
      Courses: getYearProjection(courseProjections, 3),
      Referrals: getYearProjection(referralProjections, 3),
      Features: getYearProjection(featureProjections, 3),
      Advertising: getYearProjection(adProjections, 3),
      'Biz in a Box': getYearProjection(bizInBoxProjections, 3),
    },
    {
      year: 'Year 5',
      'Operator Subs': getYearProjection(subProjections, 5),
      'Vendor Subs': getYearProjection(vendorSubProjections, 5),
      'Agent Subs': getYearProjection(agentSubProjections, 5),
      Marketplace: getYearProjection(marketplaceProjections, 5),
      Courses: getYearProjection(courseProjections, 5),
      Referrals: getYearProjection(referralProjections, 5),
      Features: getYearProjection(featureProjections, 5),
      Advertising: getYearProjection(adProjections, 5),
      'Biz in a Box': getYearProjection(bizInBoxProjections, 5),
    },
    {
      year: 'Year 10',
      'Operator Subs': getYearProjection(subProjections, 10),
      'Vendor Subs': getYearProjection(vendorSubProjections, 10),
      'Agent Subs': getYearProjection(agentSubProjections, 10),
      Marketplace: getYearProjection(marketplaceProjections, 10),
      Courses: getYearProjection(courseProjections, 10),
      Referrals: getYearProjection(referralProjections, 10),
      Features: getYearProjection(featureProjections, 10),
      Advertising: getYearProjection(adProjections, 10),
      'Biz in a Box': getYearProjection(bizInBoxProjections, 10),
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">1-Year Projection</span>
                <DollarSign className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(year1Total / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">Cumulative Revenue</div>
            </CardContent>
          </Card>

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
                <Area type="monotone" dataKey="Operator Subs" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                <Area type="monotone" dataKey="Vendor Subs" stackId="1" stroke="#a78bfa" fill="#a78bfa" />
                <Area type="monotone" dataKey="Agent Subs" stackId="1" stroke="#c4b5fd" fill="#c4b5fd" />
                <Area type="monotone" dataKey="Marketplace" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="Courses" stackId="1" stroke="#0891b2" fill="#0891b2" />
                <Area type="monotone" dataKey="Referrals" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="Features" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="Advertising" stackId="1" stroke="#14b8a6" fill="#14b8a6" />
                <Area type="monotone" dataKey="Biz in a Box" stackId="1" stroke="#f97316" fill="#f97316" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{pieChartYear}-Year Revenue Mix</CardTitle>
                <Select value={pieChartYear.toString()} onValueChange={(value) => setPieChartYear(Number(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Year</SelectItem>
                    <SelectItem value="3">3 Years</SelectItem>
                    <SelectItem value="5">5 Years</SelectItem>
                    <SelectItem value="10">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <Bar dataKey="Operator Subs" fill="#8b5cf6" />
                  <Bar dataKey="Vendor Subs" fill="#a78bfa" />
                  <Bar dataKey="Agent Subs" fill="#c4b5fd" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Stream Calculators */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0">
            <TabsList className="inline-flex w-max min-w-full lg:grid lg:grid-cols-9 gap-1">
              <TabsTrigger value="subscriptions" className="whitespace-nowrap flex-shrink-0">
                <Users className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Operator Subs</span>
                <span className="sm:hidden">Operator</span>
              </TabsTrigger>
              <TabsTrigger value="vendorSubs" className="whitespace-nowrap flex-shrink-0">
                <Users className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Vendor Subs</span>
                <span className="sm:hidden">Vendor</span>
              </TabsTrigger>
              <TabsTrigger value="agentSubs" className="whitespace-nowrap flex-shrink-0">
                <Users className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Agent Subs</span>
                <span className="sm:hidden">Agent</span>
              </TabsTrigger>
              <TabsTrigger value="bizInBox" className="whitespace-nowrap flex-shrink-0">
                <Briefcase className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Biz in a Box</span>
                <span className="sm:hidden">Biz</span>
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="whitespace-nowrap flex-shrink-0">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Marketplace
              </TabsTrigger>
              <TabsTrigger value="courses" className="whitespace-nowrap flex-shrink-0">
                <BookOpen className="w-4 h-4 mr-1" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="referrals" className="whitespace-nowrap flex-shrink-0">
                <Award className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Leads & Referrals</span>
                <span className="sm:hidden">Leads</span>
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

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Operator Subscription Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                  <div className="text-sm font-semibold text-slate-700 mb-3">Package Pricing (from Subscription Packages)</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <Label className="text-slate-500 text-xs mb-1">Basic Plan Price</Label>
                      <div className="text-2xl font-bold text-slate-400">
                        ${operatorPackages.basic?.monthly_price || subBasicPrice}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1">Pro Plan Price</Label>
                      <div className="text-2xl font-bold text-slate-400">
                        ${operatorPackages.pro?.monthly_price || subProPrice}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1">Premium Plan Price</Label>
                      <div className="text-2xl font-bold text-slate-400">
                        ${operatorPackages.premium?.monthly_price || subPremiumPrice}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs mb-1">Basic + Listing Fee</Label>
                      <div className="text-2xl font-bold text-slate-900">
                        ${subListingFee}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">$/month per operator</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label>New Subscribers/Month</Label>
                    <Input type="number" value={subNewPerMonth} onChange={(e) => setSubNewPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={subChurnRate} onChange={(e) => setSubChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(subProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(subQuantities[11])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(subProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(subQuantities[35])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(subProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(subQuantities[59])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(subProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(subQuantities[119])} subscribers
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Operator Subs" name="Revenue" stroke="#8b5cf6" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Operator Subs Qty" name="Subscribers" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendor Subs Tab */}
          <TabsContent value="vendorSubs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Vendor Subscription Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                  <Label className="text-slate-500 text-xs mb-1">Monthly Price (from package)</Label>
                  <div className="text-2xl font-bold text-slate-400">
                    ${vendorPackage?.monthly_price || vendorSubPrice}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label>New Subscribers/Month</Label>
                    <Input type="number" value={vendorNewPerMonth} onChange={(e) => setVendorNewPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={vendorChurnRate} onChange={(e) => setVendorChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(vendorSubProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(vendorSubQuantities[11])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(vendorSubProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(vendorSubQuantities[35])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(vendorSubProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(vendorSubQuantities[59])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(vendorSubProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(vendorSubQuantities[119])} subscribers
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Vendor Subs" name="Revenue" stroke="#a78bfa" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Vendor Subs Qty" name="Subscribers" stroke="#ddd6fe" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Subs Tab */}
          <TabsContent value="agentSubs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-300" />
                    Agent Subscription Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                  <Label className="text-slate-500 text-xs mb-1">Monthly Price (from package)</Label>
                  <div className="text-2xl font-bold text-slate-400">
                    ${agentPackage?.monthly_price || agentSubPrice}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label>New Subscribers/Month</Label>
                    <Input type="number" value={agentNewPerMonth} onChange={(e) => setAgentNewPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={agentChurnRate} onChange={(e) => setAgentChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(agentSubProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(agentSubQuantities[11])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(agentSubProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(agentSubQuantities[35])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(agentSubProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(agentSubQuantities[59])} subscribers
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(agentSubProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(agentSubQuantities[119])} subscribers
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Agent Subs" name="Revenue" stroke="#c4b5fd" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Agent Subs Qty" name="Subscribers" stroke="#ede9fe" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                    Marketplace Transaction Fee Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(marketplaceProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(marketplaceQuantities, 1)).toLocaleString()} transactions
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(marketplaceProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(marketplaceQuantities, 3)).toLocaleString()} transactions
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(marketplaceProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(marketplaceQuantities, 5)).toLocaleString()} transactions
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(marketplaceProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(marketplaceQuantities, 10)).toLocaleString()} transactions
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Marketplace" name="Revenue" stroke="#10b981" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Marketplace Qty" name="Transactions" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    Course Sales Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(courseProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(courseQuantities, 1)).toLocaleString()} sales
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(courseProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(courseQuantities, 3)).toLocaleString()} sales
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(courseProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(courseQuantities, 5)).toLocaleString()} sales
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(courseProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(courseQuantities, 10)).toLocaleString()} sales
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Courses" name="Revenue" stroke="#0891b2" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Courses Qty" name="Sales" stroke="#67e8f9" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    Leads & Referral Fee Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(referralProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(referralQuantities, 1)).toLocaleString()} referrals
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(referralProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(referralQuantities, 3)).toLocaleString()} referrals
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(referralProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(referralQuantities, 5)).toLocaleString()} referrals
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(referralProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(referralQuantities, 10)).toLocaleString()} referrals
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Referrals" name="Revenue" stroke="#f59e0b" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Referrals Qty" name="Referrals" stroke="#fcd34d" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    Premium Feature Placement Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
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
                    <Label>Features Per Month (3% national, 97% local)</Label>
                    <Input type="number" value={featuresPerMonth} onChange={(e) => setFeaturesPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Growth Rate (%)</Label>
                    <Input type="number" value={featureGrowth} onChange={(e) => setFeatureGrowth(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(featureProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(featureQuantities, 1)).toLocaleString()} features
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(featureProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(featureQuantities, 3)).toLocaleString()} features
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(featureProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(featureQuantities, 5)).toLocaleString()} features
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(featureProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(getYearProjection(featureQuantities, 10)).toLocaleString()} features
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Features" name="Revenue" stroke="#3b82f6" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Features Qty" name="Features" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biz in a Box Tab */}
          <TabsContent value="bizInBox">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                    Biz in a Box Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bizInBoxPricing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                      <div>
                        <Label className="text-slate-500 text-xs mb-1">Setup Fee (from package)</Label>
                        <div className="text-2xl font-bold text-slate-400">
                          ${bizInBoxPricing.biz_in_a_box_setup_fee?.toLocaleString() || '2,997'}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                      </div>
                      <div>
                        <Label className="text-slate-500 text-xs mb-1">Monthly Fee Year 1 (from package)</Label>
                        <div className="text-2xl font-bold text-slate-400">
                          ${bizInBoxPricing.biz_in_a_box_monthly_year1 || '149'}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                      </div>
                      <div>
                        <Label className="text-slate-500 text-xs mb-1">Revenue Share (from package)</Label>
                        <div className="text-2xl font-bold text-slate-400">
                          {bizInBoxPricing.biz_in_a_box_revenue_share || '3'}%
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Edit in Subscription Packages</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div>
                        <Label>New Operators/Month</Label>
                        <Input 
                          type="number" 
                          value={bizNewPerMonth} 
                          onChange={(e) => setBizNewPerMonth(Number(e.target.value))} 
                        />
                      </div>
                      <div>
                        <Label>Monthly Churn Rate (%)</Label>
                        <Input 
                          type="number" 
                          value={bizChurnRate} 
                          onChange={(e) => setBizChurnRate(Number(e.target.value))} 
                        />
                      </div>
                      <div>
                        <Label>Avg Sale Profit ($)</Label>
                        <Input 
                          type="number" 
                          value={avgSaleProfit} 
                          onChange={(e) => setAvgSaleProfit(Number(e.target.value))} 
                        />
                      </div>
                      <div>
                        <Label>Sales Per Month (per operator)</Label>
                        <Input 
                          type="number" 
                          value={salesPerMonth} 
                          onChange={(e) => setSalesPerMonth(Number(e.target.value))} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${(getYearProjection(bizInBoxProjections, 1) / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {Math.round(bizInBoxQuantities[11])} operators
                        </div>
                      </div>
                      <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                        <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                        <div className="text-2xl font-bold text-cyan-600">
                          ${(getYearProjection(bizInBoxProjections, 3) / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {Math.round(bizInBoxQuantities[35])} operators
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                        <div className="text-2xl font-bold text-purple-600">
                          ${(getYearProjection(bizInBoxProjections, 5) / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {Math.round(bizInBoxQuantities[59])} operators
                        </div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                        <div className="text-2xl font-bold text-orange-600">
                          ${(getYearProjection(bizInBoxProjections, 10) / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {Math.round(bizInBoxQuantities[119])} operators
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="text-sm font-semibold text-slate-700 mb-2">Revenue Breakdown per Operator:</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Setup Fee:</span>
                          <span className="font-bold text-slate-900 ml-2">
                            ${bizInBoxPricing.biz_in_a_box_setup_fee?.toLocaleString() || '2,997'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600">Year 1 Monthly Fees:</span>
                          <span className="font-bold text-slate-900 ml-2">
                            ${((bizInBoxPricing.biz_in_a_box_monthly_year1 || 149) * 12).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600">Avg Revenue Share (per month):</span>
                          <span className="font-bold text-slate-900 ml-2">
                            ${(salesPerMonth * avgSaleProfit * (bizInBoxPricing.biz_in_a_box_revenue_share || 3) / 100).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData.slice(0, 36)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="Biz in a Box" name="Revenue" stroke="#f97316" strokeWidth={3} />
                        <Line yAxisId="right" type="monotone" dataKey="Biz in a Box Qty" name="Operators" stroke="#fdba74" strokeWidth={2} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="text-center p-8 text-slate-500">
                    Loading Biz in a Box pricing...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advertising Tab */}
          <TabsContent value="advertising">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-teal-600" />
                    Advertising Space Calculator
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                    <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <Label>Basic Ad Space Price ($)</Label>
                    <Input type="number" value={adBasicPrice} onChange={(e) => setAdBasicPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Pro Ad Space Price ($)</Label>
                    <Input type="number" value={adProPrice} onChange={(e) => setAdProPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Premium Ad Space Price ($)</Label>
                    <Input type="number" value={adPremiumPrice} onChange={(e) => setAdPremiumPrice(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>New Advertisers/Month (total, split 50/30/20)</Label>
                    <Input type="number" value={adNewPerMonth} onChange={(e) => setAdNewPerMonth(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Monthly Churn Rate (%)</Label>
                    <Input type="number" value={adChurnRate} onChange={(e) => setAdChurnRate(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-slate-600 mb-1">1-Year Total</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${(getYearProjection(adProjections, 1) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(adQuantities[11])} advertisers
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-sm text-slate-600 mb-1">3-Year Total</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(getYearProjection(adProjections, 3) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(adQuantities[35])} advertisers
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">5-Year Total</div>
                    <div className="text-2xl font-bold text-purple-600">
                      ${(getYearProjection(adProjections, 5) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(adQuantities[59])} advertisers
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-slate-600 mb-1">10-Year Total</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${(getYearProjection(adProjections, 10) / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(adQuantities[119])} advertisers
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slice(0, 36)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="Advertising" name="Revenue" stroke="#14b8a6" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="Advertising Qty" name="Advertisers" stroke="#5eead4" strokeWidth={2} strokeDasharray="5 5" />
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