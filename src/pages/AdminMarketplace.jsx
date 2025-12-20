import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, DollarSign, Eye, Bookmark } from 'lucide-react';

export default function AdminMarketplace() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, statusFilter, categoryFilter, items]);

  const loadItems = async () => {
    try {
      const data = await base44.entities.Item.list();
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seller_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    setFilteredItems(filtered);
  };

  const getStatusBadge = (status) => {
    const configs = {
      available: { label: 'Available', className: 'bg-green-100 text-green-700' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      sold: { label: 'Sold', className: 'bg-slate-100 text-slate-700' },
      reserved: { label: 'Reserved', className: 'bg-blue-100 text-blue-700' }
    };
    const config = configs[status] || configs.available;
    return <Badge className={config.className}>{config.label}</Badge>;
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
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Marketplace Management</h1>
        <p className="text-slate-600">{items.length} total items</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by title or seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="pending">Pending</option>
          <option value="sold">Sold</option>
          <option value="reserved">Reserved</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Categories</option>
          <option value="furniture">Furniture</option>
          <option value="art">Art</option>
          <option value="jewelry">Jewelry</option>
          <option value="collectibles">Collectibles</option>
          <option value="antiques">Antiques</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {item.images && item.images.length > 0 && (
                  <img 
                    src={item.images[0]} 
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                    {getStatusBadge(item.status)}
                  </div>
                  {item.featured && (
                    <Badge className="bg-orange-600 text-white">Featured</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  {item.seller_name && (
                    <div>
                      <span className="font-medium">Seller:</span> {item.seller_name}
                    </div>
                  )}
                  
                  {item.category && (
                    <div>
                      <span className="font-medium">Category:</span> {item.category}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-slate-900">${item.price?.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {item.views || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="w-4 h-4" />
                      {item.saves || 0}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No items found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}