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
import BuyerMatchModal from '@/components/estate/BuyerMatchModal';
import SaleExpensesModal from '@/components/expenses/SaleExpensesModal';
import { 
        Plus, Search, Calendar, MapPin, Eye, Heart, DollarSign, 
        Package, Edit, TrendingUp, Star, Briefcase, Trash, FileText, BarChart3, Megaphone, Download, Globe, Users, Receipt, Sparkles, ChevronDown, ChevronUp, BookOpen, Pin, UserCheck, Rocket
      } from 'lucide-react';
import SocialCampaignModal from '@/components/social/SocialCampaignModal';
import LiquidationProgressModal from '@/components/estate/LiquidationProgressModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { getSaleDisplayStatus } from '@/components/estate/getSaleDisplayStatus';
import ProfileCompletionGate, { isProfileComplete } from '@/components/profile/ProfileCompletionGate';

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
  const [isElite, setIsElite] = useState(false);
  const [featuringId, setFeaturingId] = useState(null);
  const [matchingSaleId, setMatchingSaleId] = useState(null);
  const [buyerMatchData, setBuyerMatchData] = useState(null);
  const [liquidationModal, setLiquidationModal] = useState({ open: false, step: 'confirm', error: null });
  const [liquidationSale, setLiquidationSale] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const isTeamRole = ['team_admin', 'team_member', 'team_marketer'].includes(userData.primary_account_type);
      // Team members see their Estate Sale Company Owner's sales; operators see their own sales
      const operatorId = isTeamRole ? userData.operator_id : userData.id;
      const salesData = operatorId
        ? await base44.entities.EstateSale.filter({ operator_id: operatorId }, '-created_date')
        : [];
      setSales(salesData);

      // Check if user is on Elite subscription
      const subs = await base44.entities.Subscription.filter({ user_id: userData.id });
      if (subs.length > 0 && ['premium', 'enterprise', 'elite'].includes(subs[0].tier)) setIsElite(true);
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

  const handleToggleLocalFeatured = async (sale) => {
    const newVal = !sale.local_featured;

    // Enforce 4-sale cap when featuring
    if (newVal) {
      const currentlyFeatured = sales.filter(s => s.local_featured && s.id !== sale.id);
      if (currentlyFeatured.length >= 4) {
        alert('You can only have 4 locally featured sales at a time. Please un-feature one first.');
        return;
      }
    }

    setFeaturingId(sale.id);
    try {
      const updateData = { local_featured: newVal };
      if (newVal) {
        // Set expiry 30 days from now
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        updateData.local_featured_until = expiry.toISOString();
      } else {
        updateData.local_featured_until = null;
      }
      await base44.entities.EstateSale.update(sale.id, updateData);
      setSales(prev => prev.map(s => s.id === sale.id ? { ...s, ...updateData } : s));
    } catch (e) {
      alert('Failed to update featured status');
    } finally {
      setFeaturingId(null);
    }
  };

  const handleBuyerMatch = async (saleId) => {
    setMatchingSaleId(saleId);
    try {
      const res = await base44.functions.invoke('notifyOperatorOfMatchingBuyers', { saleId });
      if (res.data?.success) {
        setBuyerMatchData(res.data);
      }
    } catch (e) {
      setBuyerMatchData({ matchCount: 0, message: 'Failed to run buyer matching. Please try again.' });
    } finally {
      setMatchingSaleId(null);
    }
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

  const handleLiquidationStart = (sale) => {
    setLiquidationSale(sale);
    setLiquidationModal({ open: true, step: 'confirm', error: null });
  };

  const handleLiquidationConfirm = async () => {
    const sale = liquidationSale;
    if (!sale) return;

    setLiquidationModal({ open: true, step: 'details', error: null });

    const advance = (step) => {
      return new Promise(resolve => {
        setLiquidationModal(prev => ({ ...prev, step }));
        setTimeout(resolve, 400); // Brief pause so the UI updates visibly
      });
    };

    try {
      await advance('details');

      await advance('location');

      const copiedImages = (sale.images || []).map(img =>
        typeof img === 'string'
          ? { url: img, name: '', description: '' }
          : { ...img, price: null, ai_first_search_price: null, ai_deep_search_price: null, synopsis: '', skip_item: false, skip_serp_search: false, serp_search_status: null, categories: [] }
      );

      await advance('images');

      await advance('categories');

      await advance('creating');

      const newSale = await base44.entities.EstateSale.create({
        title: sale.title + ' — Liquidation Event',
        description: sale.description || '',
        sale_type: sale.sale_type || '',
        status: 'draft',
        property_address: sale.property_address ? { ...sale.property_address } : { street: '', city: '', state: '', zip: '' },
        location: sale.location ? { ...sale.location } : null,
        sale_dates: [],
        images: copiedImages,
        categories: sale.categories ? [...sale.categories] : [],
        commission_rate: sale.commission_rate || null,
        special_notes: sale.special_notes || '',
        payment_methods: sale.payment_methods ? [...sale.payment_methods] : [],
        operator_id: user.id,
        operator_name: user.full_name || user.company_name || '',
      });

      setLiquidationModal(prev => ({ ...prev, step: 'done' }));

      setTimeout(() => {
        setLiquidationModal({ open: false, step: 'confirm', error: null });
        setLiquidationSale(null);
        navigate(createPageUrl('SaleEditor') + '?saleId=' + newSale.id);
      }, 1200);
    } catch (error) {
      console.error('Error launching liquidation event:', error);
      setLiquidationModal(prev => ({ ...prev, error: error.message || 'Failed to duplicate sale' }));
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-4 gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-1 md:mb-2">My Estate Sales</h1>
          <p className="text-sm md:text-base text-slate-600">Manage your estate sale listings and track performance</p>
        </div>
        <div className="flex gap-2 md:self-start">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('MySalesGuide'))}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            EstateSalen 411
          </Button>
          <Button 
            onClick={() => {
              if (!isProfileComplete(user)) {
                alert('Please complete your profile first. Set your company name and location in My Profile.');
                navigate(createPageUrl('MyProfile'));
                return;
              }
              navigate(createPageUrl('SaleEditor'));
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Sale
          </Button>
        </div>
      </div>

      {/* Profile completion gate */}
      {user && !isProfileComplete(user) && (
        <ProfileCompletionGate user={user} actionLabel="create a sale" />
      )}



      <CreateVIPEventModal
        open={showVIPModal}
        onClose={() => {
          setShowVIPModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onSuccess={loadData}
      />

      <BuyerMatchModal
        open={!!buyerMatchData}
        onClose={() => setBuyerMatchData(null)}
        matchData={buyerMatchData}
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

      <LiquidationProgressModal
        open={liquidationModal.open}
        currentStep={liquidationModal.step}
        error={liquidationModal.error}
        saleTitle={liquidationSale?.title}
        onCancel={() => {
          setLiquidationModal({ open: false, step: 'confirm', error: null });
          setLiquidationSale(null);
        }}
        onConfirm={handleLiquidationConfirm}
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
                   <div className="relative md:w-56 md:min-h-[240px] h-48 md:h-auto overflow-hidden flex-shrink-0">
                     <img
                       src={typeof sale.images[0] === 'string' 
                         ? sale.images[0] 
                         : sale.images[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'}
                       alt={sale.title}
                       className="w-full h-full object-cover"
                     />
                     {(() => { const ds = getSaleDisplayStatus(sale); return <Badge className={`absolute top-2 right-2 text-[10px] ${getStatusColor(ds)}`}>{getStatusLabel(ds)}</Badge>; })()}
                   </div>
                 )}
                 <CardContent className="p-4 flex-1">
                   <div className="flex items-start justify-between mb-2">
                     <h3 className="text-base md:text-lg font-semibold text-slate-900 flex-1">{sale.title}</h3>
                     <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                         <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}><Eye className="w-3.5 h-3.5" /></Link>
                       </Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => handleDelete(sale.id)}>
                         <Trash className="w-3.5 h-3.5" />
                       </Button>
                     </div>
                   </div>
                   <div className="space-y-1.5 text-sm">
                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                       {sale.property_address && (
                         <div className="flex items-center gap-1.5">
                           <MapPin className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                           <span className="text-xs">{sale.property_address.street ? sale.property_address.street + ', ' : ''}{sale.property_address.city}, {sale.property_address.state} {sale.property_address.zip}</span>
                         </div>
                       )}
                       {sale.sale_dates && sale.sale_dates.length > 0 && sale.sale_dates.map((saleDate, idx) => (
                         <div key={idx} className="flex items-center gap-1.5 text-xs">
                           <Calendar className="w-3 h-3 text-orange-600 flex-shrink-0" />
                           <span>{format(new Date(saleDate.date + 'T00:00:00'), 'MMM d')}</span>
                           {(saleDate.start_time || saleDate.end_time) && (
                             <span className="text-slate-400">{formatTo12Hour(saleDate.start_time)} - {formatTo12Hour(saleDate.end_time)}</span>
                           )}
                         </div>
                       ))}
                     </div>
                     {(() => {
                       const isCompleted = getSaleDisplayStatus(sale) === 'completed';
                       const btnClass = "h-7 text-[11px] px-2 py-0 w-full justify-start";
                       return (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 mt-2">
                           {!isCompleted && (<Button variant="outline" size="sm" onClick={() => handleEdit(sale)} className={`${btnClass} border-blue-500 text-black hover:bg-blue-50`}><Edit className="w-3 h-3 mr-1 flex-shrink-0" />Edit Sale</Button>)}
                           {!isCompleted && (<Button variant="outline" size="sm" onClick={() => handleLiquidationStart(sale)} className={`${btnClass} border-orange-600 text-orange-700 hover:bg-orange-50`}><Rocket className="w-3 h-3 mr-1 flex-shrink-0" />Launch Liquidation</Button>)}
                           {!isCompleted && isElite && (
                             <Button variant="outline" size="sm" onClick={() => handleToggleLocalFeatured(sale)} disabled={featuringId === sale.id}
                               className={`${btnClass} ${sale.local_featured ? 'border-amber-500 bg-amber-50' : 'border-amber-400 hover:bg-amber-50'}`}
                             ><Pin className="w-3 h-3 mr-1 flex-shrink-0" />{featuringId === sale.id ? '...' : sale.local_featured ? 'Local Featured ★' : 'Feature Locally'}</Button>
                           )}
                           {!isCompleted && isElite && (
                             <Button variant="outline" size="sm" onClick={() => handleBuyerMatch(sale.id)} disabled={matchingSaleId === sale.id}
                               className={`${btnClass} border-emerald-500 hover:bg-emerald-50`}
                             ><UserCheck className="w-3 h-3 mr-1 flex-shrink-0" />{matchingSaleId === sale.id ? '...' : 'Buyer Match'}</Button>
                           )}
                           {!isCompleted && (<Button variant="outline" size="sm" asChild className={`${btnClass} border-teal-500 hover:bg-teal-50`}><Link to={createPageUrl('Worksheet') + '?saleId=' + sale.id}><DollarSign className="w-3 h-3 mr-1 flex-shrink-0" />Transactions</Link></Button>)}
                           <Button variant="outline" size="sm" asChild className={`${btnClass} border-purple-500 hover:bg-purple-50`}><Link to={createPageUrl('SaleInventory') + '?saleId=' + sale.id}><Package className="w-3 h-3 mr-1 flex-shrink-0" />Inventory</Link></Button>
                           <Button variant="outline" size="sm" asChild className={`${btnClass} border-cyan-500 hover:bg-cyan-50`}><Link to={createPageUrl('Attendance') + '?saleId=' + sale.id}><TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />Attendance</Link></Button>
                           {!isCompleted && (<Button variant="outline" size="sm" asChild className={`${btnClass} border-amber-500 hover:bg-amber-50`}><Link to={createPageUrl('SaleTasks') + '?saleId=' + sale.id}><FileText className="w-3 h-3 mr-1 flex-shrink-0" />Tasks</Link></Button>)}
                           <Button variant="outline" size="sm" asChild className={`${btnClass} border-indigo-500 hover:bg-indigo-50`}><Link to={createPageUrl('SaleStatistics') + '?saleId=' + sale.id}><BarChart3 className="w-3 h-3 mr-1 flex-shrink-0" />Statistics</Link></Button>
                           {!isCompleted && (<Button variant="outline" size="sm" asChild className={`${btnClass} border-red-500 hover:bg-red-50`}><Link to={createPageUrl('PrintSigns') + '?saleId=' + sale.id}><Megaphone className="w-3 h-3 mr-1 flex-shrink-0" />Signs</Link></Button>)}
                           <Button variant="outline" size="sm" asChild className={`${btnClass} border-slate-500 hover:bg-slate-50`}><Link to={createPageUrl('SaleExport') + '?saleId=' + sale.id}><Download className="w-3 h-3 mr-1 flex-shrink-0" />Export</Link></Button>
                           {!isCompleted && (<Button variant="outline" size="sm" onClick={async () => { const events = await base44.entities.VIPEvent.filter({ sale_id: sale.id }); if (events.length > 0) { window.location.href = createPageUrl('VIPEvent') + '?eventId=' + events[0].id; } else { setSelectedSale(sale); setShowVIPModal(true); }}} className={`${btnClass} border-yellow-500 hover:bg-yellow-50`}><Star className="w-3 h-3 mr-1 flex-shrink-0" />VIP Event</Button>)}
                           {!isCompleted && (<Button variant="outline" size="sm" onClick={() => { setBuyoutSale(sale); setShowBuyoutModal(true); }} className={`${btnClass} border-orange-600 hover:bg-orange-50`}><Briefcase className="w-3 h-3 mr-1 flex-shrink-0" />Buyout</Button>)}
                           <Button variant="outline" size="sm" onClick={() => { setExpensesSale(sale); setShowExpensesModal(true); }} className={`${btnClass} border-emerald-600 hover:bg-emerald-50`}><Receipt className="w-3 h-3 mr-1 flex-shrink-0" />Expenses</Button>
                           {!isCompleted && (<Button variant="outline" size="sm" asChild className={`${btnClass} border-pink-500 hover:bg-pink-50`}><Link to={createPageUrl('SaleMarketingCampaigns') + '?saleId=' + sale.id}><Megaphone className="w-3 h-3 mr-1 flex-shrink-0" />Marketing</Link></Button>)}
                           <Button variant="outline" size="sm" asChild className={`${btnClass} border-blue-600 hover:bg-blue-50`}><Link to={createPageUrl('SaleContracts') + '?saleId=' + sale.id}><FileText className="w-3 h-3 mr-1 flex-shrink-0" />Contracts</Link></Button>
                           {!isCompleted && (<Button variant="outline" size="sm" asChild className={`${btnClass} border-indigo-500 hover:bg-indigo-50`}><Link to={createPageUrl('EarlySignIn') + '?saleId=' + sale.id}><Users className="w-3 h-3 mr-1 flex-shrink-0" />Early Sign In</Link></Button>)}
                           {!isCompleted && (<Button variant="outline" size="sm" onClick={() => { setSocialSale(sale); setShowSocialModal(true); }} className={`${btnClass} border-purple-500 hover:bg-purple-50`}><Sparkles className="w-3 h-3 mr-1 flex-shrink-0" />Social Posts</Button>)}
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
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs border-purple-500 text-black hover:bg-purple-50 px-2"><Link to={`/ResellerPackupEventEditor?saleId=${sale.id}`}><Package className="w-3 h-3 mr-1" />Reseller Event</Link></Button>
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