import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateEstateSaleModal from '@/components/estate/CreateEstateSaleModal';
import OperatorSalesTable from '@/components/operator/OperatorSalesTable';
import OperatorMessagesWidget from '@/components/operator/OperatorMessagesWidget';
import {
  Home,
  DollarSign,
  TrendingUp,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EstateSaleOperatorDashboard({ user }) {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    activeSales: 0,
    upcomingSales: 0,
    totalRevenue: 0,
    totalViews: 0,
    totalSaves: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load operator's estate sales
      const allSales = await base44.entities.EstateSale.list('-created_date', 200);
      const operatorSales = allSales.filter((s) => s.operator_id === user.id);
      setSales(operatorSales);

      // Calculate stats
      const activeSales = operatorSales.filter((s) => s.status === 'active').length;
      const upcomingSales = operatorSales.filter((s) => s.status === 'upcoming').length;
      const totalRevenue = operatorSales.reduce(
        (sum, s) => sum + (s.commission_earned || 0),
        0
      );
      const totalViews = operatorSales.reduce((sum, s) => sum + (s.views || 0), 0);
      const totalSaves = operatorSales.reduce((sum, s) => sum + (s.saves || 0), 0);

      // Count unread messages
      const allMessages = await base44.entities.Message.list('-created_date', 100);
      const unreadMessages = allMessages.filter(
        (m) => m.recipient_id === user.id && !m.read
      ).length;

      setStats({
        totalSales: operatorSales.length,
        activeSales,
        upcomingSales,
        totalRevenue,
        totalViews,
        totalSaves,
        unreadMessages,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setCreateModalOpen(true);
  };

  const handleDeleteSale = async (sale) => {
    if (!confirm(`Are you sure you want to delete "${sale.title}"?`)) return;

    try {
      await base44.entities.EstateSale.delete(sale.id);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale');
    }
  };

  const handleModalClose = () => {
    setCreateModalOpen(false);
    setEditingSale(null);
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Estate Sale Dashboard</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Manage your estate sales and track performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => navigate(createPageUrl('MySales'))}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Settings className="w-4 h-4 mr-2" />
            My Sales Manager
          </Button>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Estate Sale
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalSales}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Sales</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeSales}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Upcoming Sales</p>
                <p className="text-3xl font-bold text-blue-600">{stats.upcomingSales}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Views</p>
                <p className="text-3xl font-bold text-cyan-600">{stats.totalViews}</p>
              </div>
              <div className="h-12 w-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Saves</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalSaves}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Unread Messages</p>
                <p className="text-3xl font-bold text-orange-600">{stats.unreadMessages}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">My Estate Sales</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estate Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600 mb-4">No estate sales yet</p>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Sale
                  </Button>
                </div>
              ) : (
                <OperatorSalesTable
                  sales={sales}
                  onEdit={handleEditSale}
                  onDelete={handleDeleteSale}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <OperatorMessagesWidget user={user} />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <CreateEstateSaleModal
        open={createModalOpen}
        onClose={handleModalClose}
        sale={editingSale}
      />
    </div>
  );
}