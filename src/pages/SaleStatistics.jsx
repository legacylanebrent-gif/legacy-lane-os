import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Eye, Heart, DollarSign, Package, Users, 
  TrendingUp, Calendar, MapPin, ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';

export default function SaleStatistics() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      
      if (!saleId) {
        alert('Sale ID not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        alert('Sale not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      setSale(saleData[0]);

      // Load items for this sale
      const itemsData = await base44.entities.Item.filter({ estate_sale_id: saleId });
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const stats = {
    views: sale?.views || 0,
    saves: sale?.saves || 0,
    totalItems: sale?.total_items || 0,
    estimatedValue: sale?.estimated_value || 0,
    actualRevenue: sale?.actual_revenue || 0,
    commissionEarned: sale?.commission_earned || 0,
    marketplaceItems: items.length,
    soldItems: items.filter(i => i.status === 'sold').length,
    marketplaceRevenue: items.filter(i => i.status === 'sold').reduce((sum, i) => sum + (i.price || 0), 0)
  };

  const daysUntilSale = sale?.sale_dates?.[0]?.date 
    ? Math.ceil((new Date(sale.sale_dates[0].date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">{sale?.title}</h1>
            <p className="text-slate-600">Sale Statistics & Analytics</p>
          </div>
        </div>
      </div>

      {/* Sale Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Sale Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <p className="text-lg font-semibold text-slate-900 capitalize">{sale?.status}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Sale Date</p>
              <p className="text-lg font-semibold text-slate-900">
                {sale?.sale_dates?.[0]?.date 
                  ? format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')
                  : 'Not scheduled'}
              </p>
              {daysUntilSale !== null && daysUntilSale > 0 && (
                <p className="text-sm text-orange-600">{daysUntilSale} days until sale</p>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Location</p>
              <p className="text-lg font-semibold text-slate-900">
                {sale?.property_address?.city}, {sale?.property_address?.state}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-cyan-50 rounded-lg">
              <Eye className="w-10 h-10 text-cyan-600" />
              <div>
                <p className="text-3xl font-bold text-cyan-600">{stats.views}</p>
                <p className="text-sm text-slate-600">Total Views</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
              <Heart className="w-10 h-10 text-red-600" />
              <div>
                <p className="text-3xl font-bold text-red-600">{stats.saves}</p>
                <p className="text-sm text-slate-600">Saves/Favorites</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
              <Users className="w-10 h-10 text-purple-600" />
              <div>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.saves > 0 ? Math.round((stats.saves / stats.views) * 100) : 0}%
                </p>
                <p className="text-sm text-slate-600">Engagement Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventory Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Physical Sale</h4>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <Package className="w-10 h-10 text-slate-600" />
                <div>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalItems}</p>
                  <p className="text-sm text-slate-600">Total Items</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-cyan-50 rounded-lg">
                <DollarSign className="w-10 h-10 text-cyan-600" />
                <div>
                  <p className="text-3xl font-bold text-cyan-600">${stats.estimatedValue.toLocaleString()}</p>
                  <p className="text-sm text-slate-600">Estimated Value</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Online Marketplace</h4>
              <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
                <ShoppingBag className="w-10 h-10 text-orange-600" />
                <div>
                  <p className="text-3xl font-bold text-orange-600">{stats.marketplaceItems}</p>
                  <p className="text-sm text-slate-600">Listed Items</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                <DollarSign className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-3xl font-bold text-green-600">${stats.marketplaceRevenue.toLocaleString()}</p>
                  <p className="text-sm text-slate-600">Marketplace Sales</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Total Revenue</p>
              <p className="text-4xl font-bold text-slate-900">${stats.actualRevenue.toLocaleString()}</p>
            </div>
            <div className="p-6 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Commission Earned</p>
              <p className="text-4xl font-bold text-green-600">${stats.commissionEarned.toLocaleString()}</p>
            </div>
            <div className="p-6 bg-cyan-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Commission Rate</p>
              <p className="text-4xl font-bold text-cyan-600">
                {sale?.commission_rate ? `${sale.commission_rate}%` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Analytics Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-lg">Coming Soon</p>
            <p className="text-sm mt-2">
              Traffic sources, peak viewing times, demographic data, and more
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}