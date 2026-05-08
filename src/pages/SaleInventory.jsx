import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import UnifiedItemForm from '@/components/inventory/UnifiedItemForm';
import { Plus, Search, Edit2, Trash2, Package, Globe, AlertCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function SaleInventory() {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get('id');

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [saleId]);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (saleId) {
        const saleData = await base44.entities.EstateSale.filter({ id: saleId });
        setSale(saleData[0]);
      }

      const itemData = await base44.entities.Item.filter({
        estate_sale_id: saleId,
      });
      setItems(itemData || []);
    } catch (error) {
      toast.error('Error loading inventory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  };

  const handleDelete = async item => {
    if (!confirm(`Delete "${item.title}"?`)) return;

    try {
      await base44.entities.Item.delete(item.id);
      toast.success('Item deleted');
      loadData();
    } catch (error) {
      toast.error('Error deleting item: ' + error.message);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'sold') {
        updates.sold_date = new Date().toISOString();
        // Determine phase based on sale dates
        if (sale?.sale_dates?.length > 0) {
          const today = new Date();
          const saleStart = new Date(sale.sale_dates[0].date + 'T00:00:00');
          const saleEnd = new Date(sale.sale_dates[sale.sale_dates.length - 1].date + 'T23:59:59');
          if (today < saleStart) updates.sale_phase = 'pre_sale';
          else if (today > saleEnd) updates.sale_phase = 'post_sale';
          else updates.sale_phase = 'during_sale';
        }
      }
      await base44.entities.Item.update(item.id, updates);
      toast.success(`Item marked as ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error('Error updating item: ' + error.message);
    }
  };

  const handleTogglePrePost = async (item, field) => {
    try {
      await base44.entities.Item.update(item.id, { [field]: !item[field] });
      toast.success('Updated');
      loadData();
    } catch (error) {
      toast.error('Error updating item');
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'sold':
        return 'bg-slate-100 text-slate-700';
      case 'reserved':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Sale not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900">
                {sale.title} — Inventory
              </h1>
              <p className="text-slate-600 mt-2">Manage items for sale and marketplace</p>
            </div>
            <div className="flex gap-2">
              {saleId && (
                <Link to={`/SettlementStatement?saleId=${saleId}`}>
                  <Button variant="outline" className="gap-2 text-orange-600 border-orange-300">
                    <FileText className="w-4 h-4" /> Settlement
                  </Button>
                </Link>
              )}
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowForm(true);
                }}
                className="bg-gold-600 hover:bg-gold-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Pre/Post sale phase legend */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 print:hidden">
        <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Pre-Sale = sold before sale event</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">During Sale = sold during event dates</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">Post-Sale = sold after event ends</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">No items found</h3>
            <p className="text-slate-500 mt-2">
              {items.length === 0 ? 'Create your first item to get started' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between gap-4"
              >
                {/* Item Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>

                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary">{item.category}</Badge>
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>

                        {item.sales_channels?.includes('inventory') && (
                          <Badge className="bg-gold-100 text-gold-700 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Inventory
                          </Badge>
                        )}

                        {item.sales_channels?.includes('marketplace') && (
                          <Badge className="bg-sage-100 text-sage-700 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Marketplace
                          </Badge>
                        )}

                        {item.marketplace_item_id && item.status === 'sold' && (
                          <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Synced & Sold
                          </Badge>
                        )}
                        {item.status === 'sold' && item.sale_phase && (
                          <Badge className={`text-xs ${item.sale_phase === 'pre_sale' ? 'bg-blue-100 text-blue-700' : item.sale_phase === 'post_sale' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {item.sale_phase === 'pre_sale' ? 'Pre-Sale' : item.sale_phase === 'post_sale' ? 'Post-Sale' : 'During Sale'}
                          </Badge>
                        )}
                        {item.pre_sale_allowed && item.status !== 'sold' && (
                          <Badge className="bg-blue-50 text-blue-600 text-xs">Pre-Sale OK</Badge>
                        )}
                        {item.post_sale_allowed && item.status !== 'sold' && (
                          <Badge className="bg-purple-50 text-purple-600 text-xs">Post-Sale OK</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-gold-600">${item.price?.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                      {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap justify-end">
                  {item.status !== 'sold' && (
                    <div className="flex flex-col gap-1 text-right">
                      <button
                        onClick={() => handleTogglePrePost(item, 'pre_sale_allowed')}
                        className={`text-xs px-2 py-1 rounded border ${item.pre_sale_allowed ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-slate-200 text-slate-500'}`}
                        title="Toggle pre-sale selling"
                      >
                        {item.pre_sale_allowed ? '✓' : '+'} Pre-Sale
                      </button>
                      <button
                        onClick={() => handleTogglePrePost(item, 'post_sale_allowed')}
                        className={`text-xs px-2 py-1 rounded border ${item.post_sale_allowed ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-slate-200 text-slate-500'}`}
                        title="Toggle post-sale selling"
                      >
                        {item.post_sale_allowed ? '✓' : '+'} Post-Sale
                      </button>
                    </div>
                  )}
                  {item.status !== 'sold' && (
                    <select
                      value={item.status}
                      onChange={e => handleStatusChange(item, e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Form Modal */}
      {showForm && (
        <UnifiedItemForm
          item={editingItem}
          saleId={saleId}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}