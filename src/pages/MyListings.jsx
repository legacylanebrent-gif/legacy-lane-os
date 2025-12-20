import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Package, Eye, DollarSign } from 'lucide-react';
import CreateItemModal from '@/components/marketplace/CreateItemModal';

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');

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

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'available').length,
    sold: items.filter(i => i.status === 'sold').length,
    revenue: items.filter(i => i.status === 'sold').reduce((sum, i) => sum + i.price, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
              My Listings
            </h1>
            <p className="text-slate-600">Manage your marketplace items</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gold-600 hover:bg-gold-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Listing
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Listings</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{stats.total}</p>
                </div>
                <Package className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Available</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{stats.available}</p>
                </div>
                <Eye className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Sold</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{stats.sold}</p>
                </div>
                <Package className="w-10 h-10 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Revenue</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">
                    ${stats.revenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="available">Available ({stats.available})</TabsTrigger>
            <TabsTrigger value="sold">Sold ({stats.sold})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {filteredItems.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No listings yet
                </h3>
                <p className="text-slate-500 mb-6">
                  Create your first listing to start selling
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gold-600 hover:bg-gold-700"
                >
                  Create Listing
                </Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          {item.status}
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
                        <span>{item.category}</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link to={createPageUrl(`ItemDetail?id=${item.id}`)} className="flex-1">
                          <Button variant="outline" className="w-full">View</Button>
                        </Link>
                        <Button variant="outline">Edit</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showCreateModal && (
        <CreateItemModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}