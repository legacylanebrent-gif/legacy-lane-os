import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ImageIcon, DollarSign, Tag, Calendar, TrendingUp } from 'lucide-react';

export default function SoldInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const me = await base44.auth.me();
      setUser(me);

      // Fetch sold items for this operator
      const soldItems = await base44.entities.Item.filter({
        seller_id: me.id,
        status: 'sold',
      }, '-updated_date', 100);

      setItems(soldItems || []);
    } catch (error) {
      console.error('Error loading sold items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price_high':
        return (b.sold_price || 0) - (a.sold_price || 0);
      case 'price_low':
        return (a.sold_price || 0) - (b.sold_price || 0);
      case 'recent':
      default:
        return new Date(b.updated_date) - new Date(a.updated_date);
    }
  });

  const totalSales = sortedItems.reduce((sum, item) => sum + (item.sold_price || 0), 0);
  const avgPrice = sortedItems.length > 0 ? totalSales / sortedItems.length : 0;

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
    <div className="p-6 lg:p-8 space-y-6 pb-20">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Sold Inventory</h1>
        <p className="text-slate-600">Track and manage your sold items</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-cyan-600 mb-1">
              {sortedItems.length}
            </div>
            <div className="text-sm text-slate-600">Items Sold</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600 mb-1">
              ${totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-slate-600">Total Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              ${avgPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-slate-600">Average Price</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {sortedItems.filter(i => i.sold_price > i.price).length}
            </div>
            <div className="text-sm text-slate-600">Above List Price</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="price_high">Highest Price</SelectItem>
                <SelectItem value="price_low">Lowest Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {sortedItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map(item => {
            const priceDiff = item.sold_price - item.price;
            const priceDiffPercent = item.price > 0 ? ((priceDiff / item.price) * 100).toFixed(0) : 0;
            const soldAboveList = priceDiff > 0;

            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-square bg-slate-100">
                  {item.images?.[0] ? (
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
                  {soldAboveList && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{priceDiffPercent}%
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    {item.category && (
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Tag className="w-3 h-3" />
                        {item.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">List Price</span>
                      <span className="text-sm font-medium text-slate-500 line-through">
                        ${item.price?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Sold Price</span>
                      <span className="text-lg font-bold text-green-600">
                        ${item.sold_price?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  {item.updated_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 pt-2 border-t">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.updated_date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">No sold items yet</p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to Inventory
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}