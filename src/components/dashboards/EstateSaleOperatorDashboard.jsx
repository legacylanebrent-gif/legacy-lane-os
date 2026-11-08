import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateEstateSaleModal from '@/components/estate/CreateEstateSaleModal';
import OperatorMessagesWidget from '@/components/operator/OperatorMessagesWidget';
import OperatorHero from '@/components/operator/dashboard/OperatorHero';
import SaleSpotlight from '@/components/operator/dashboard/SaleSpotlight';
import TodayStrip from '@/components/operator/dashboard/TodayStrip';
import NeedsYouPanel from '@/components/operator/dashboard/NeedsYouPanel';
import MoneyPanel from '@/components/operator/dashboard/MoneyPanel';
import GoalRing from '@/components/operator/dashboard/GoalRing';
import SaleGallery from '@/components/operator/dashboard/SaleGallery';
import RecentActivity from '@/components/operator/dashboard/RecentActivity';
import CoolFindsCard from '@/components/operator/dashboard/CoolFindsCard';
import LocalIsoCard from '@/components/operator/dashboard/LocalIsoCard';
import MlsListingsCard from '@/components/operator/dashboard/MlsListingsCard';
import ReferralTrackerCard from '@/components/operator/dashboard/ReferralTrackerCard';
import { loadOperatorMoney } from '@/components/operator/dashboard/saleDayMetrics';
import { Home, Eye, Heart, MessageSquare, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProfileCompletionGate, { isProfileComplete } from '@/components/profile/ProfileCompletionGate';

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
  const [money, setMoney] = useState({ thisMonth: 0, lastMonth: 0, txCount: 0 });

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  useEffect(() => {
    if (!user?.id) return;
    loadOperatorMoney(user.id)
      .then(setMoney)
      .catch((e) => console.error('Operator money:', e));
  }, [refreshKey, user?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load Estate Sale Company Owner's estate sales
      const allSales = await base44.entities.EstateSale.list('-created_date', 200);
      const operatorSales = allSales.filter((s) => s.operator_id === user.id);
      // Sort: active/upcoming/draft first, completed/archived last
      const statusPriority = { active: 0, upcoming: 0, draft: 1, completed: 2, archived: 2 };
      operatorSales.sort((a, b) => (statusPriority[a.status] ?? 2) - (statusPriority[b.status] ?? 2));
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

  const activeSale = sales.find((s) => s.status === 'active') || null;

  const nextSale = (() => {
    const live = sales.find((s) => s.status === 'active');
    if (live) return live;
    const upcoming = sales
      .filter((s) => s.status === 'upcoming')
      .sort((a, b) => (a.sale_dates?.[0]?.date || '').localeCompare(b.sale_dates?.[0]?.date || ''));
    return upcoming[0] || sales.find((s) => s.status === 'draft') || sales[0] || null;
  })();

  const openCreateModal = () => {
    if (!isProfileComplete(user)) {
      alert('Please complete your profile first. Set your company name and location in My Profile.');
      navigate(createPageUrl('MyProfile'));
      return;
    }
    setCreateModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <OperatorHero
        user={user}
        stats={stats}
        loading={loading}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onCreateSale={openCreateModal}
        onOpenSales={() => navigate(createPageUrl('MySales'))}
      />

      <SaleSpotlight sale={nextSale} onCreateSale={openCreateModal} />

      <TodayStrip sale={activeSale || nextSale} />

      <NeedsYouPanel user={user} sales={sales} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <MoneyPanel sales={sales} money={money} />
          <LocalIsoCard user={user} />
          <CoolFindsCard user={user} />
        </div>
        <div className="space-y-4">
          <GoalRing user={user} monthRevenue={money.thisMonth} />
          <RecentActivity user={user} />
        </div>
      </div>

      {/* Profile completion gate */}
      {user && !isProfileComplete(user) && (
        <ProfileCompletionGate user={user} actionLabel="create a sale" />
      )}

      {/* Compact activity strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => navigate('/MySales')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-900 leading-none">{stats.totalSales}</p>
              <p className="text-xs text-slate-600 mt-1">Total sales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-900 leading-none">{stats.totalViews.toLocaleString()}</p>
              <p className="text-xs text-slate-600 mt-1">Public views</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-900 leading-none">{stats.totalSaves.toLocaleString()}</p>
              <p className="text-xs text-slate-600 mt-1">Saves</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          onClick={() => navigate(createPageUrl('Messages'))}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-900 leading-none">{stats.unreadMessages}</p>
              <p className="text-xs text-slate-600 mt-1">Unread messages</p>
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
          {sales.length > 0 ? (
            <SaleGallery sales={sales} limit={sales.length} />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Home className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 mb-4">No estate sales yet</p>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Sale
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <OperatorMessagesWidget user={user} />
        </TabsContent>
      </Tabs>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MlsListingsCard />
        <ReferralTrackerCard userId={user?.id} refreshKey={refreshKey} />
      </div>

      {/* Create/Edit Modal */}
      <CreateEstateSaleModal
        open={createModalOpen}
        onClose={handleModalClose}
        sale={editingSale}
      />
    </div>
  );
}