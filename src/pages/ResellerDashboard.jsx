import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Package, DollarSign, Eye, Heart, TrendingUp, AlertCircle, Plus,
  Calendar, Grid3x3, List
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';

export default function ResellerDashboard() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState('stats');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const itemsData = await base44.entities.Item.filter(
        { seller_id: userData.id },
        '-created_date'
      );
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by selected month
  const monthItems = items.filter(item => {
    if (!item.created_date) return false;
    const itemMonth = item.created_date.slice(0, 7);
    return itemMonth === selectedMonth;
  });

  // Calculate metrics
  const SUBSCRIPTION_FEE = 49;
  const PER_ITEM_FEE = 2;
  const monthlyItemFee = monthItems.length * PER_ITEM_FEE;
  const totalMonthlyFee = SUBSCRIPTION_FEE + monthlyItemFee;

  const stats = {
    totalItems: monthItems.length,
    activeItems: monthItems.filter(i => i.status === 'available').length,
    soldItems: monthItems.filter(i => i.status === 'sold').length,
    totalViews: monthItems.reduce((sum, i) => sum + (i.views || 0), 0),
    totalSaves: monthItems.reduce((sum, i) => sum + (i.saves || 0), 0),
    totalValue: monthItems.reduce((sum, i) => sum + (i.price || 0), 0),
    soldValue: monthItems.filter(i => i.status === 'sold').reduce((sum, i) => sum + (i.sold_price || i.price || 0), 0),
  };

  const sellThroughRate = stats.totalItems > 0 ? ((stats.soldItems / stats.totalItems) * 100).toFixed(1) : 0;
  const avgPrice = stats.totalItems > 0 ? (stats.totalValue / stats.totalItems).toFixed(2) : 0;
  const avgViews = stats.totalItems > 0 ? (stats.totalViews / stats.totalItems).toFixed(1) : 0;

  // Category breakdown
  const categoryData = monthItems.reduce((acc, item) => {
    const existing = acc.find(c => c.name === item.category);
    if (existing) {
      existing.count += 1;
      existing.value += item.price || 0;
    } else {
      acc.push({
        name: item.category || 'Uncategorized',
        count: 1,
        value: item.price || 0
      });
    }
    return acc;
  }, []);

  // Performance by condition
  const conditionData = monthItems.reduce((acc, item) => {
    const existing = acc.find(c => c.name === item.condition);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        name: item.condition || 'Unknown',
        count: 1
      });
    }
    return acc;
  }, []);

  const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <UniversalHeader user={user} isAuthenticated={!!user} />
      <div className="p-6 lg:p-8 space-y-8">
        {/* CTA Button */}
        <div className="flex justify-end">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white w-fit gap-2">
            <Plus className="w-4 h-4" />
            List New Item
          </Button>
        </div>

      {/* Month Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <Calendar className="w-5 h-5 text-slate-400" />
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.length > 0 && Array.from({ length: 12 }).map((_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const monthStr = date.toISOString().slice(0, 7);
              const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <SelectItem key={monthStr} value={monthStr}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Fee Summary */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader>
          <CardTitle className="text-orange-900">Monthly Fees for {selectedMonth}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <p className="text-sm text-slate-600 mb-1">Subscription Fee</p>
              <p className="text-2xl font-bold text-orange-600">${SUBSCRIPTION_FEE}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <p className="text-sm text-slate-600 mb-1">Items ({monthItems.length} × ${PER_ITEM_FEE})</p>
              <p className="text-2xl font-bold text-cyan-600">${monthlyItemFee}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <p className="text-sm text-slate-600 mb-1">Total Monthly Fee</p>
              <p className="text-2xl font-bold text-slate-900">${totalMonthlyFee}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Listed</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalItems}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {stats.activeItems} active, {stats.soldItems} sold
                </p>
              </div>
              <Package className="w-10 h-10 text-orange-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Views</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {avgViews} per item
                </p>
              </div>
              <Eye className="w-10 h-10 text-cyan-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Sell-Through Rate</p>
                <p className="text-3xl font-bold text-slate-900">{sellThroughRate}%</p>
                <p className="text-xs text-slate-500 mt-2">
                  {stats.soldItems} items sold
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Inventory Value</p>
                <p className="text-3xl font-bold text-slate-900">${stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Avg: ${avgPrice}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.count}`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Condition Breakdown */}
        {conditionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items by Condition</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conditionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Items List */}
      {monthItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items Listed in {selectedMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Item</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Price</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Views</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthItems.slice(0, 10).map(item => (
                    <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
                      <td className="px-4 py-3 text-slate-600">{item.category || '-'}</td>
                      <td className="px-4 py-3 text-center text-slate-900 font-semibold">
                        ${item.price?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{item.views || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          item.status === 'sold' ? 'bg-green-100 text-green-700' :
                          item.status === 'available' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {monthItems.length > 10 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Showing 10 of {monthItems.length} items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {monthItems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-4">No items listed in {selectedMonth}</p>
            <p className="text-slate-400 text-sm">Start listing items to track your monthly performance</p>
          </CardContent>
        </Card>
      )}

        <SharedFooter />
      </div>
    </>
  );
}