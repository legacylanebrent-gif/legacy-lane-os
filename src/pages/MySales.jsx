import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateVIPEventModal from '@/components/vip/CreateVIPEventModal';
import BuyoutModal from '@/components/estate/BuyoutModal';
import SaleExpensesModal from '@/components/expenses/SaleExpensesModal';
import { 
        Plus, Search, Calendar, MapPin, Eye, Heart, DollarSign, 
        Package, Edit, TrendingUp, Star, Briefcase, Trash, FileText, BarChart3, Megaphone, Download, Globe, Users, Receipt, Sparkles, ChevronDown, ChevronUp, BookOpen
      } from 'lucide-react';
import SocialCampaignModal from '@/components/social/SocialCampaignModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { getSaleDisplayStatus } from '@/components/estate/getSaleDisplayStatus';

const formatTo12Hour = (time) => {
  if (!time) return '';
  // If already has AM/PM, return cleaned up version
  if (/am|pm/i.test(time)) {
    return time.replace(/\s*(am|pm)/i, (m) => ' ' + m.trim().toLowerCase());
  }
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function MySales() {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'active') return 'active';
    if (status === 'upcoming') return 'active'; // upcoming is under "active" tab
    if (status === 'completed') return 'completed';
    if (status === 'draft') return 'draft';
    return 'all';
  });
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showBuyoutModal, setShowBuyoutModal] = useState(false);
  const [buyoutSale, setBuyoutSale] = useState(null);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [expensesSale, setExpensesSale] = useState(null);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialSale, setSocialSale] = useState(null);
  const [showCompletedSection, setShowCompletedSection] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const isTeamRole = ['team_admin', 'team_member', 'team_marketer'].includes(userData.primary_account_type);
      // Team members see their operator's sales; operators see their own sales
      const operatorId = isTeamRole ? userData.operator_id : userData.id;
      const salesData = operatorId
        ? await base44.entities.EstateSale.filter({ operator_id: operatorId }, '-created_date')
        : [];
      setSales(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700',
      upcoming: 'bg-blue-100 text-blue-700',
      starts_tomorrow: 'bg-amber-100 text-amber-700',
      starts_today: 'bg-orange-100 text-orange-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
      archived: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      starts_tomorrow: 'Starts Tomorrow',
      starts_today: 'Starts Today',
    };
    return labels[status] || status;
  };

  const handleEdit = (sale) => {
    navigate(createPageUrl('SaleEditor') + '?saleId=' + sale.id);
  };

  const handleDelete = async (saleId) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;
    
    try {
      await base44.entities.EstateSale.delete(saleId);
      await loadData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale');
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchQuery || 
      sale.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.property_address?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const displayStatus = getSaleDisplayStatus(sale);
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'draft' && displayStatus === 'draft') ||
      (activeTab === 'active' && ['upcoming', 'starts_tomorrow', 'starts_today', 'active'].includes(displayStatus)) ||
      (activeTab === 'completed' && displayStatus === 'completed');
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: sales.length,
    draft: sales.filter(s => getSaleDisplayStatus(s) === 'draft').length,
    active: sales.filter(s => ['upcoming', 'starts_tomorrow', 'starts_today', 'active'].includes(getSaleDisplayStatus(s))).length,
    completed: sales.filter(s => getSaleDisplayStatus(s) === 'completed').length,
    totalRevenue: sales.reduce((sum, s) => sum + (s.actual_revenue || 0), 0),
    totalViews: sales.reduce((sum, s) => sum + (s.views || 0), 0)
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
    <div className="p-6 lg:p-8 space-y-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mt-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Estate Sales</h1>
          <p className="text-slate-600">Manage your estate sale listings and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('MySalesGuide'))}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            How to Use
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('SaleEditor'))}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Sale
          </Button>
        </div>
      </div>



      <CreateVIPEventModal
        open={showVIPModal}
        onClose={() => {
          setShowVIPModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onSuccess={loadData}
      />

      <BuyoutModal
        open={showBuyoutModal}
        onClose={() => {
          setShowBuyoutModal(false);
          setBuyoutSale(null);
        }}
        sale={buyoutSale}
      />

      <SaleExpensesModal
        open={showExpensesModal}
        onClose={() => {
          setShowExpensesModal(false);
          setExpensesSale(null);
        }}
        sale={expensesSale}
        user={user}
      />

      <SocialCampaignModal
        open={showSocialModal}
        onClose={() => {
          setShowSocialModal(false);
          setSocialSale(null);
        }}
        sale={socialSale}
        user={user}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Sales</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Draft</div>
            <div className="text-2xl font-bold text-slate-700">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Completed</div>
            <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-cyan-600">
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Views</div>
            <div className="text-2xl font-bold text-orange-600">{stats.totalViews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search sales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({stats.draft})</TabsTrigger>
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {(() => {
            const activeSales = filteredSales.filter(s => getSaleDisplayStatus(s) !== 'completed');
            const completedSales = filteredSales.filter(s => getSaleDisplayStatus(s) === 'completed');

            const renderSaleCard = (sale) => (
              <Card key={sale.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                {sale.images && sale.images.length > 0 && (
                  <div className="relative h-full md:w-44 overflow-hidden flex-shrink-0">
                    <img
                      src={typeof sale.images[0] === 'string' 
                        ? sale.images[0] 
                        : sale.images[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'}
                      alt={sale.title}
                      className="w-full h-full object-cover"
                    />
                    {(() => { const ds = getSaleDisplayStatus(sale); return <Badge className={`absolute top-2 right-2 text-xs ${getStatusColor(ds)}`}>{getStatusLabel(ds)}</Badge>; })()}
                  </div>
                )}
                <CardContent className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 flex-1">{sale.title}</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(sale.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-4 text-slate-600 mb-3">
                      {sale.property_address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-600" />
                          <span>{sale.property_address.city}, {sale.property_address.state}</span>
                        </div>
                      )}
                    </div>
                    {sale.sale_dates && sale.sale_dates.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-3">
                        {sale.sale_dates.map((saleDate, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <span>{format(new Date(saleDate.date + 'T00:00:00'), 'MMM d')}</span>
                            {(saleDate.start_time || saleDate.end_time) && (
                              <span className="text-slate-500 text-xs">{formatTo12Hour(saleDate.start_time)} - {formatTo12Hour(saleDate.end_time)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const isCompleted = getSaleDisplayStatus(sale) === 'completed';
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {!isCompleted && (<Button variant="outline" size="sm" onClick={() => handleEdit(sale)} className="w-full border-blue-500 text-black hover:bg-blue-50"><Edit className="w-3 h-3 mr-1" />Edit</Button>)}
                          {!isCompleted && (<Button variant="outline" size="sm" asChild className="w-full border-teal-500 text-black hover:bg-teal-50"><Link to={createPageUrl('Worksheet') + '?saleId=' + sale.id}><DollarSign className="w-3 h-3 mr-1" />Worksheet</Link></Button>)}
                          <Button variant="outline" size="sm" asChild className="w-full border-purple-500 text-black hover:bg-purple-50"><Link to={createPageUrl('SaleInventory') + '?saleId=' + sale.id}><Package className="w-3 h-3 mr-1" />Inventory</Link></Button>
                          <Button variant="outline" size="sm" asChild className="w-full border-cyan-500 text-black hover:bg-cyan-50"><Link to={createPageUrl('Attendance') + '?saleId=' + sale.id}><TrendingUp className="w-3 h-3 mr-1" />Attendance</Link></Button>
                          {!isCompleted && (<Button variant="outline" size="sm" asChild className="w-full border-amber-500 text-black hover:bg-amber-50"><Link to={createPageUrl('SaleTasks') + '?saleId=' + sale.id}><FileText className="w-3 h-3 mr-1" />Tasks</Link></Button>)}
                          <Button variant="outline" size="sm" asChild className="w-full border-indigo-500 text-black hover:bg-indigo-50"><Link to={createPageUrl('SaleStatistics') + '?saleId=' + sale.id}><BarChart3 className="w-3 h-3 mr-1" />Statistics</Link></Button>
                          {!isCompleted && (<Button variant="outline" size="sm" asChild className="w-full border-red-500 text-black hover:bg-red-50"><Link to={createPageUrl('PrintSigns') + '?saleId=' + sale.id}><Megaphone className="w-3 h-3 mr-1" />Signs</Link></Button>)}
                          <Button variant="outline" size="sm" asChild className="w-full border-slate-500 text-black hover:bg-slate-50"><Link to={createPageUrl('SaleExport') + '?saleId=' + sale.id}><Download className="w-3 h-3 mr-1" />Export</Link></Button>
                          {!isCompleted && (<Button variant="outline" size="sm" onClick={async () => { const events = await base44.entities.VIPEvent.filter({ sale_id: sale.id }); if (events.length > 0) { window.location.href = createPageUrl('VIPEvent') + '?eventId=' + events[0].id; } else { setSelectedSale(sale); setShowVIPModal(true); }}} className="w-full border-yellow-500 text-black hover:bg-yellow-50"><Star className="w-3 h-3 mr-1" />VIP Event</Button>)}
                          {!isCompleted && (<Button variant="outline" size="sm" onClick={() => { setBuyoutSale(sale); setShowBuyoutModal(true); }} className="w-full border-orange-600 text-black hover:bg-orange-50"><Briefcase className="w-3 h-3 mr-1" />Buyout</Button>)}
                          <Button variant="outline" size="sm" onClick={() => { setExpensesSale(sale); setShowExpensesModal(true); }} className="w-full border-emerald-600 text-black hover:bg-emerald-50"><Receipt className="w-3 h-3 mr-1" />Expenses/Mileage</Button>
                          {!isCompleted && (<Button variant="outline" size="sm" asChild className="w-full border-pink-500 text-black hover:bg-pink-50"><Link to={createPageUrl('SaleMarketingCampaigns') + '?saleId=' + sale.id}><Megaphone className="w-3 h-3 mr-1" />Marketing</Link></Button>)}
                          <Button variant="outline" size="sm" asChild className="w-full border-blue-600 text-black hover:bg-blue-50"><Link to={createPageUrl('SaleContracts') + '?saleId=' + sale.id}><FileText className="w-3 h-3 mr-1" />Contracts</Link></Button>
                          {!isCompleted && (<Button variant="outline" size="sm" asChild className="w-full border-indigo-500 text-black hover:bg-indigo-50"><Link to={createPageUrl('EarlySignIn') + '?saleId=' + sale.id}><Users className="w-3 h-3 mr-1" />Early Sign In</Link></Button>)}
                          {!isCompleted && (<Button variant="outline" size="sm" onClick={() => { setSocialSale(sale); setShowSocialModal(true); }} className="w-full border-purple-500 text-black hover:bg-purple-50"><Sparkles className="w-3 h-3 mr-1" />Social Media Posts</Button>)}
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            );

            if (filteredSales.length === 0) return (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-4">{searchQuery ? 'No sales match your search' : 'No estate sales yet'}</p>
                {!searchQuery && (
                  <Button onClick={() => navigate(createPageUrl('SaleEditor'))} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />Create Your First Sale
                  </Button>
                )}
              </Card>
            );

            return (
              <div className="space-y-4">
                {/* Active / Draft / Upcoming sales — full cards */}
                {activeSales.map(sale => renderSaleCard(sale))}

                {/* Completed sales — collapsible compact section */}
                {completedSales.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCompletedSection(v => !v)}
                      className="flex items-center gap-2 w-full text-left py-3 px-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      {showCompletedSection ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                      <span className="font-semibold text-purple-800">Completed Sales ({completedSales.length})</span>
                      <span className="text-xs text-purple-500 ml-1">— click to {showCompletedSection ? 'collapse' : 'expand'}</span>
                    </button>
                    {showCompletedSection && (
                      <div className="space-y-3 mt-3">
                        {completedSales.map(sale => (
                          <Card key={sale.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-row opacity-90">
                            {sale.images && sale.images.length > 0 && (
                              <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden">
                                <img
                                  src={typeof sale.images[0] === 'string' ? sale.images[0] : sale.images[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'}
                                  alt={sale.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardContent className="p-3 flex-1 flex flex-col justify-between">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-800 leading-tight">{sale.title}</h3>
                                  {sale.property_address && (
                                    <p className="text-xs text-slate-500 mt-0.5">{sale.property_address.city}, {sale.property_address.state}</p>
                                  )}
                                  {sale.sale_dates && sale.sale_dates.length > 0 && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {format(new Date(sale.sale_dates[0].date + 'T00:00:00'), 'MMM d')}
                                      {sale.sale_dates.length > 1 && ` – ${format(new Date(sale.sale_dates[sale.sale_dates.length - 1].date + 'T00:00:00'), 'MMM d, yyyy')}`}
                                    </p>
                                  )}
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50 flex-shrink-0" onClick={() => handleDelete(sale.id)}>
                                  <Trash className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs border-purple-400 text-black hover:bg-purple-50 px-2"><Link to={createPageUrl('SaleInventory') + '?saleId=' + sale.id}><Package className="w-3 h-3 mr-1" />Inventory</Link></Button>
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs border-indigo-400 text-black hover:bg-indigo-50 px-2"><Link to={createPageUrl('SaleStatistics') + '?saleId=' + sale.id}><BarChart3 className="w-3 h-3 mr-1" />Statistics</Link></Button>
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs border-cyan-400 text-black hover:bg-cyan-50 px-2"><Link to={createPageUrl('Attendance') + '?saleId=' + sale.id}><TrendingUp className="w-3 h-3 mr-1" />Attendance</Link></Button>
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs border-slate-400 text-black hover:bg-slate-50 px-2"><Link to={createPageUrl('SaleExport') + '?saleId=' + sale.id}><Download className="w-3 h-3 mr-1" />Export</Link></Button>
                                <Button variant="outline" size="sm" onClick={() => { setExpensesSale(sale); setShowExpensesModal(true); }} className="h-7 text-xs border-emerald-500 text-black hover:bg-emerald-50 px-2"><Receipt className="w-3 h-3 mr-1" />Expenses</Button>
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs border-blue-500 text-black hover:bg-blue-50 px-2"><Link to={createPageUrl('SaleContracts') + '?saleId=' + sale.id}><FileText className="w-3 h-3 mr-1" />Contracts</Link></Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}