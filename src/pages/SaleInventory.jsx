import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import CreateItemModal from '@/components/marketplace/CreateItemModal';
import { 
  ArrowLeft, Plus, Search, Package, DollarSign, Tag, 
  Image as ImageIcon, ShoppingBag, Store
} from 'lucide-react';

export default function SaleInventory() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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
      const itemsData = await base44.entities.Item.filter({ 
        estate_sale_id: saleId 
      }, '-created_date');
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      sold: 'bg-purple-100 text-purple-700',
      reserved: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const filteredItems = items.filter(item => 
    !searchQuery || 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'available').length,
    sold: items.filter(i => i.status === 'sold').length,
    totalValue: items.filter(i => i.status === 'available').reduce((sum, i) => sum + (i.price || 0), 0)
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
            <p className="text-slate-600">Marketplace Inventory</p>
          </div>
        </div>
        <Button 
          onClick={() => {
            setEditingItem(null);
            setShowCreateModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Marketplace
        </Button>
      </div>

      <CreateItemModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItem(null);
        }}
        item={editingItem}
        saleId={sale?.id}
        onSuccess={loadData}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Items</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Available</div>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Sold</div>
            <div className="text-2xl font-bold text-purple-600">{stats.sold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-cyan-600">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search marketplace items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items Display */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">
            {searchQuery ? 'No items match your search' : 'No items listed on marketplace yet'}
          </p>
          {!searchQuery && (
            <>
              <p className="text-slate-600 mb-4">
                Add items from this estate sale to the online marketplace to reach more buyers
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item to Marketplace
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <Badge className={`absolute top-3 right-3 ${getStatusColor(item.status)}`}>
                  {item.status}
                </Badge>
                <Badge className="absolute top-3 left-3 bg-orange-600">
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  Marketplace
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                  {item.title}
                </h3>

                <div className="space-y-2">
                  {item.category && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Tag className="w-3 h-3" />
                      <span>{item.category}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-lg font-bold text-cyan-600">
                      <DollarSign className="w-5 h-5" />
                      <span>{item.price?.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.views || 0} views
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}