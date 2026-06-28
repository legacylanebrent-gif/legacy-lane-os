import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Package, Eye, EyeOff, DollarSign, Grid3x3, List, Trash2, RotateCcw } from 'lucide-react';
import CreateItemModal from '@/components/marketplace/CreateItemModal';

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('available');
  const [viewMode, setViewMode] = useState('grid');
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      setUser(userData);

      const itemsData = await base44.entities.Item.filter({ seller_id: userData.id });
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Item.delete(item.id);
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleToggleActive = async (item) => {
    const isInactive = item.inventory_display_status === 'inactive';
    try {
      await base44.entities.Item.update(item.id, {
        inventory_display_status: isInactive ? 'active' : 'inactive'
      });
      loadData();
    } catch (error) {
      console.error('Error toggling item status:', error);
      alert('Failed to update item');
    }
  };

  const isInactive = (item) => item.inventory_display_status === 'inactive';

  const activeItems = items.filter(i => !isInactive(i));
  const deactivatedItems = items.filter(isInactive);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'deactivated') return isInactive(item);
    return !isInactive(item) && item.status === filter;
  });

  const stats = {
    total: items.length,
    available: activeItems.filter(i => i.status === 'available').length,
    pending: activeItems.filter(i => i.status === 'pending').length,
    reserved: activeItems.filter(i => i.status === 'reserved').length,
    sold: activeItems.filter(i => i.status === 'sold').length,
    deactivated: deactivatedItems.length,
    revenue: activeItems.filter(i => i.status === 'sold').reduce((sum, i) => sum + i.price, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-serif font-bold text-navy-900 mb-1">
              My Listings
            </h1>
            <p className="text-slate-600">Manage your marketplace items</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Listing
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Listings</p>
                  <p className="text-2xl md:text-3xl font-bold text-navy-900 mt-1">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Available</p>
                  <p className="text-2xl md:text-3xl font-bold text-navy-900 mt-1">{stats.available}</p>
                </div>
                <Eye className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Sold</p>
                  <p className="text-2xl md:text-3xl font-bold text-navy-900 mt-1">{stats.sold}</p>
                </div>
                <Package className="w-8 h-8 md:w-10 md:h-10 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Revenue</p>
                  <p className="text-2xl md:text-3xl font-bold text-navy-900 mt-1">
                    ${stats.revenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mb-4">
            <TabsList className="w-full md:w-auto overflow-x-auto justify-start md:justify-center">
              <TabsTrigger value="available">Available ({stats.available})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="reserved">Reserved ({stats.reserved})</TabsTrigger>
              <TabsTrigger value="sold">Sold ({stats.sold})</TabsTrigger>
              <TabsTrigger value="deactivated">Deactivated ({stats.deactivated})</TabsTrigger>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 self-end md:self-auto">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value={filter} className="mt-6">
            {filteredItems.length === 0 ? (
              <Card className="p-6 md:p-12 text-center">
                {filter === 'deactivated' ? (
                  <>
                    <EyeOff className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                      No deactivated items
                    </h3>
                    <p className="text-slate-500">
                      Items you deactivate will appear here. You can reactivate them anytime.
                    </p>
                  </>
                ) : (
                  <>
                    <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                      No {filter !== 'all' ? filter : ''} listings
                    </h3>
                    <p className="text-slate-500 mb-6">
                      Create your first listing to start selling
                    </p>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Create Listing
                    </Button>
                  </>
                )}
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredItems.map(item => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <img
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-navy-900 line-clamp-2">
                          {item.title}
                        </h3>
                        <Badge className={
                          item.status === 'available' ? 'bg-green-100 text-green-800' :
                          item.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-navy-900 mb-3">
                        ${item.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.views || 0}
                        </span>
                        <span>•</span>
                        <span>{item.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link to={createPageUrl(`ItemDetail?id=${item.id}`)}>
                          <Button variant="outline" className="w-full">View</Button>
                        </Link>
                        <Button variant="outline" onClick={() => { setEditingItem(item); setShowCreateModal(true); }}>Edit</Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title={item.inventory_display_status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                          onClick={() => handleToggleActive(item)}
                          className={item.inventory_display_status === 'inactive' ? 'text-amber-600 border-amber-400' : 'text-slate-500'}
                        >
                          {item.inventory_display_status === 'inactive' ? <RotateCcw className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Delete permanently"
                          onClick={() => handleDelete(item)}
                          className="text-red-600 border-red-400 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Item</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Price</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Views</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={item.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100'}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-navy-900">{item.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-navy-900">
                          ${item.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={
                            item.status === 'available' ? 'bg-green-100 text-green-800' :
                            item.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {item.views || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <Link to={createPageUrl(`ItemDetail?id=${item.id}`)}>
                              <Button variant="outline" size="sm">View</Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => { setEditingItem(item); setShowCreateModal(true); }}>Edit</Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title={item.inventory_display_status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                              onClick={() => handleToggleActive(item)}
                              className={item.inventory_display_status === 'inactive' ? 'text-amber-600 border-amber-400' : 'text-slate-500'}
                            >
                              {item.inventory_display_status === 'inactive' ? <RotateCcw className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Delete permanently"
                              onClick={() => handleDelete(item)}
                              className="text-red-600 border-red-400 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showCreateModal && (
        <CreateItemModal
          open={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditingItem(null); }}
          item={editingItem}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}