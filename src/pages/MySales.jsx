import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateEstateSaleModal from '@/components/estate/CreateEstateSaleModal';
import { 
  Plus, Search, Calendar, MapPin, Eye, Heart, DollarSign, 
  Package, Edit, MoreVertical, TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export default function MySales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const salesData = await base44.entities.EstateSale.filter({ 
        operator_id: userData.id 
      }, '-created_date');
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
      active: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setShowCreateModal(true);
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
    
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'draft' && sale.status === 'draft') ||
      (activeTab === 'active' && (sale.status === 'upcoming' || sale.status === 'active')) ||
      (activeTab === 'completed' && sale.status === 'completed');
    
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: sales.length,
    draft: sales.filter(s => s.status === 'draft').length,
    active: sales.filter(s => s.status === 'upcoming' || s.status === 'active').length,
    completed: sales.filter(s => s.status === 'completed').length,
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Estate Sales</h1>
          <p className="text-slate-600">Manage your estate sale listings and track performance</p>
        </div>
        <Button 
          onClick={() => {
            setEditingSale(null);
            setShowCreateModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Sale
        </Button>
      </div>

      <CreateEstateSaleModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSale(null);
        }}
        sale={editingSale}
        onSuccess={loadData}
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
          {filteredSales.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-4">
                {searchQuery ? 'No sales match your search' : 'No estate sales yet'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Sale
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSales.map(sale => (
                <Card key={sale.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {sale.images && sale.images.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={sale.images[0]}
                        alt={sale.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge className={`absolute top-3 right-3 ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 flex-1">
                        {sale.title}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sale)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 text-sm">
                      {sale.property_address && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-cyan-600" />
                          <span>
                            {sale.property_address.city}, {sale.property_address.state}
                          </span>
                        </div>
                      )}

                      {sale.sale_dates && sale.sale_dates.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          <span>{format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-3 border-t">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Eye className="w-4 h-4" />
                          <span>{sale.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Heart className="w-4 h-4" />
                          <span>{sale.saves || 0}</span>
                        </div>
                        {sale.actual_revenue && (
                          <div className="flex items-center gap-1 text-green-600 ml-auto">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold">
                              {sale.actual_revenue.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}