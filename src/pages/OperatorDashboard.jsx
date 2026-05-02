import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Package, DollarSign, Target } from 'lucide-react';

export default function OperatorDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estateData, setEstateData] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [chartDataRevenue, setChartDataRevenue] = useState([]);
  const [chartDataSellThrough, setChartDataSellThrough] = useState([]);
  const [chartDataPrice, setChartDataPrice] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    avgSellThrough: 0,
    avgSalePrice: 0,
    totalSales: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Fetch operator's estate sales
      const sales = await base44.entities.EstateSale.filter({ operator_id: userData.id }, '-created_date');
      setEstateData(sales);

      // Fetch operator's items
      const items = await base44.entities.Item.filter({ seller_id: userData.id }, '-created_date');
      setItemData(items);

      // Process data for charts
      processChartData(sales, items);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (sales, items) => {
    // Group by month for revenue and metrics
    const monthlyData = {};

    // Process estate sales revenue
    sales.forEach(sale => {
      if (sale.created_date) {
        const date = new Date(sale.created_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
            revenue: 0,
            itemsTotal: 0,
            itemsSold: 0,
            totalPrice: 0,
            soldPrice: 0,
            salePriceCount: 0
          };
        }
        
        monthlyData[monthKey].revenue += sale.actual_revenue || 0;
      }
    });

    // Process items to calculate sell-through and average price
    items.forEach(item => {
      if (item.created_date) {
        const date = new Date(item.created_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
            revenue: 0,
            itemsTotal: 0,
            itemsSold: 0,
            totalPrice: 0,
            soldPrice: 0,
            salePriceCount: 0
          };
        }
        
        monthlyData[monthKey].itemsTotal += 1;
        if (item.status === 'sold') {
          monthlyData[monthKey].itemsSold += 1;
          monthlyData[monthKey].soldPrice += item.price || 0;
        }
        if (item.price) {
          monthlyData[monthKey].totalPrice += item.price;
          monthlyData[monthKey].salePriceCount += 1;
        }
      }
    });

    // Transform to arrays and calculate percentages
    const revenueData = [];
    const sellThroughData = [];
    const priceData = [];
    let totalRevenue = 0;
    let totalSellThrough = [];
    let totalAvgPrice = [];
    let totalSales = items.filter(i => i.status === 'sold').length;

    Object.keys(monthlyData).sort().forEach(key => {
      const data = monthlyData[key];
      
      revenueData.push({
        month: data.month,
        revenue: Math.round(data.revenue)
      });
      
      const sellThroughPct = data.itemsTotal > 0 ? Math.round((data.itemsSold / data.itemsTotal) * 100) : 0;
      sellThroughData.push({
        month: data.month,
        sellThrough: sellThroughPct
      });
      
      const avgPrice = data.salePriceCount > 0 ? Math.round(data.totalPrice / data.salePriceCount) : 0;
      priceData.push({
        month: data.month,
        avgPrice
      });
      
      totalRevenue += data.revenue;
      if (sellThroughPct > 0) totalSellThrough.push(sellThroughPct);
      if (avgPrice > 0) totalAvgPrice.push(avgPrice);
    });

    setChartDataRevenue(revenueData);
    setChartDataSellThrough(sellThroughData);
    setChartDataPrice(priceData);

    const avgSellThrough = totalSellThrough.length > 0 
      ? Math.round(totalSellThrough.reduce((a, b) => a + b, 0) / totalSellThrough.length)
      : 0;
    
    const avgSalePrice = totalAvgPrice.length > 0
      ? Math.round(totalAvgPrice.reduce((a, b) => a + b, 0) / totalAvgPrice.length)
      : 0;

    setMetrics({
      totalRevenue: Math.round(totalRevenue),
      avgSellThrough,
      avgSalePrice,
      totalSales
    });
  };

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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Performance Dashboard</h1>
        <p className="text-slate-600">Track your estate sale performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900">
                  ${metrics.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Avg Sell-Through</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.avgSellThrough}%</p>
              </div>
              <Target className="w-12 h-12 text-cyan-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Avg Sale Price</p>
                <p className="text-3xl font-bold text-slate-900">
                  ${metrics.avgSalePrice.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Items Sold</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.totalSales}</p>
              </div>
              <Package className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {chartDataRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartDataRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => `$${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sell-Through Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Item Sell-Through Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {chartDataSellThrough.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataSellThrough}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => `${value}%`}
                    contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="sellThrough" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No sell-through data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Average Sale Price Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Average Sale Price Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {chartDataPrice.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartDataPrice}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => `$${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgPrice" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No price data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}