import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Package, TrendingUp, DollarSign, Users } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6'];

const PACKAGE_PRICES = {
  'Gold': 299,
  'Silver': 149,
  'Bronze': 35,
  'Platinum': 499,
  'Basic': 0
};


export default function FutureOperatorsAnalytics() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadOperators();
  }, []);

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
          
          // If we got less than batchSize, we've reached the end
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-900 text-xl font-serif">Loading operators data...</div>
      </div>
    );
  }

  // Count by package type
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

  // Count by state
  const stateCounts = operators.reduce((acc, op) => {
    const state = op.state || 'Unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const stateData = Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Calculate current monthly revenue (assuming all are subscribed)
  const currentMonthlyRevenue = operators.reduce((sum, op) => {
    const price = PACKAGE_PRICES[op.package_type] || 0;
    return sum + price;
  }, 0);

  const currentYearlyRevenue = currentMonthlyRevenue * 12;

  // Operators with phone numbers (contactable)
  const contactableOperators = operators.filter(op => op.phone).length;
  const contactablePercent = ((contactableOperators / operators.length) * 100).toFixed(1);

  // Operators with websites
  const operatorsWithWebsites = operators.filter(op => op.website).length;
  const websitePercent = ((operatorsWithWebsites / operators.length) * 100).toFixed(1);

  // Social media presence
  const socialMediaCounts = {
    Facebook: operators.filter(op => op.facebook).length,
    Instagram: operators.filter(op => op.instagram).length,
    Twitter: operators.filter(op => op.twitter).length,
    YouTube: operators.filter(op => op.youtube).length,
    Pinterest: operators.filter(op => op.pinterest).length
  };

  const socialMediaData = Object.entries(socialMediaCounts).map(([platform, count]) => ({
    platform,
    count,
    percentage: ((count / operators.length) * 100).toFixed(1)
  }));

  // Member since distribution
  const memberSinceCounts = operators.reduce((acc, op) => {
    const year = op.member_since || 'Unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const memberSinceData = Object.entries(memberSinceCounts)
    .map(([year, count]) => ({ year, count }))
    .filter(item => item.year !== 'Unknown')
    .sort((a, b) => a.year.localeCompare(b.year));

  // State revenue breakdown (top 15)
  const stateRevenue = Object.entries(stateCounts)
    .map(([state, count]) => {
      const stateOps = operators.filter(op => op.state === state);
      const revenue = stateOps.reduce((sum, op) => sum + (PACKAGE_PRICES[op.package_type] || 0), 0);
      return { state, count, monthlyRevenue: revenue, yearlyRevenue: revenue * 12 };
    })
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    .slice(0, 15);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-2">Future Total Operators</h1>
          <p className="text-slate-600">Current database overview and revenue potential analysis</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Total Operators</span>
                <Building2 className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">{operators.length.toLocaleString()}</div>
              <div className="text-xs opacity-75">{contactablePercent}% with phone numbers</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Current Monthly Revenue</span>
                <DollarSign className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(currentMonthlyRevenue / 1000).toFixed(0)}K</div>
              <div className="text-xs opacity-75">Based on current packages</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Current Yearly Revenue</span>
                <TrendingUp className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">${(currentYearlyRevenue / 1000000).toFixed(2)}M</div>
              <div className="text-xs opacity-75">Annual recurring revenue</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">States Covered</span>
                <MapPin className="w-5 h-5 opacity-75" />
              </div>
              <div className="text-3xl font-bold mb-1">{Object.keys(stateCounts).length}</div>
              <div className="text-xs opacity-75">Nationwide coverage</div>
            </CardContent>
          </Card>


        </div>

        {/* Package Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Package Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={packageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {packageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {packageData.map((pkg, idx) => (
                  <div key={pkg.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-slate-50 rounded gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-sm font-medium">{pkg.name}</span>
                    </div>
                    <div className="text-left sm:text-right pl-5 sm:pl-0">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 20 States by Operator Count</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
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

        {/* State Revenue Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Top 15 States by Revenue Potential</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stateRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="monthlyRevenue" name="Monthly Revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateRevenue.slice(0, 9).map((state) => (
                <div key={state.state} className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-slate-900">{state.state}</span>
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Operators:</span>
                      <span className="font-semibold">{state.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly:</span>
                      <span className="font-semibold text-green-600">${state.monthlyRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yearly:</span>
                      <span className="font-semibold text-purple-600">${(state.yearlyRevenue / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Social Media Presence */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Presence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {socialMediaData.map((social) => (
                <div key={social.platform} className="p-4 bg-gradient-to-br from-slate-50 to-purple-50 rounded-lg border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-purple-600">{social.count}</div>
                  <div className="text-sm text-slate-600">{social.platform}</div>
                  <div className="text-xs text-slate-500">{social.percentage}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Member Since Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Member Since Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={memberSinceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="New Members" stroke="#0891b2" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Contactable Operators</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{contactableOperators.toLocaleString()}</div>
              <div className="text-sm text-slate-500 mt-1">{contactablePercent}% of total</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Operators with Websites</span>
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{operatorsWithWebsites.toLocaleString()}</div>
              <div className="text-sm text-slate-500 mt-1">{websitePercent}% of total</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Avg Revenue per Operator</span>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">${(currentMonthlyRevenue / operators.length).toFixed(0)}</div>
              <div className="text-sm text-slate-500 mt-1">Per month</div>
            </CardContent>
          </Card>
          </div>


      </div>
    </div>
  );
}