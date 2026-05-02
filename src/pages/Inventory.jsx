import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CreateItemModal from '@/components/marketplace/CreateItemModal';
import { 
    Plus, Search, Package, DollarSign, Tag, Image as ImageIcon,
    Filter, Grid3x3, List, MoreVertical, Edit, Trash2, Sparkles, CheckCircle, ExternalLink, MapPin
  } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [seoLoading, setSeoLoading] = useState({});
  const [seoDone, setSeoDone] = useState({});
  const [postingEtsy, setPostingEtsy] = useState({});
  const [postingEbay, setPostingEbay] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const itemsData = await base44.entities.Item.filter({ 
        seller_id: userData.id 
      }, '-created_date');
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowCreateModal(true);
  };

  const handleGenerateSEO = async (e, itemId) => {
    e.stopPropagation();
    setSeoLoading(prev => ({ ...prev, [itemId]: true }));
    try {
      await base44.functions.invoke('generateItemSEO', { item_id: itemId });
      setSeoDone(prev => ({ ...prev, [itemId]: true }));
    } catch (err) {
      console.error('SEO generation failed:', err);
    } finally {
      setSeoLoading(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handlePostToEtsy = async (e, item) => {
    e.stopPropagation();
    const userData = user || await base44.auth.me();
    const creds = userData.etsy_credentials;
    if (!creds?.access_token || !creds?.api_key) {
      alert('Please set your Etsy API credentials in My Profile → Etsy tab first.');
      return;
    }
    setPostingEtsy(prev => ({ ...prev, [item.id]: true }));
    try {
      await base44.functions.invoke('postItemToEtsy', { item_id: item.id });
      alert(`"${item.title}" posted to Etsy successfully!`);
    } catch (err) {
      alert('Failed to post to Etsy: ' + err.message);
    } finally {
      setPostingEtsy(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handlePostToEbay = async (e, item) => {
    e.stopPropagation();
    const userData = user || await base44.auth.me();
    const creds = userData.ebay_credentials;
    if (!creds?.access_token || !creds?.api_key) {
      alert('Please set your eBay API credentials in My Profile → eBay tab first.');
      return;
    }
    setPostingEbay(prev => ({ ...prev, [item.id]: true }));
    try {
      await base44.functions.invoke('postItemToEbay', { item_id: item.id });
      alert(`"${item.title}" posted to eBay successfully!`);
    } catch (err) {
      alert('Failed to post to eBay: ' + err.message);
    } finally {
      setPostingEbay(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await base44.entities.Item.delete(itemId);
      await loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
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

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    // Exclude sold items from main inventory (they go to SoldInventory page)
    const isSold = item.status === 'sold';
    
    return !isSold && matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'available').length,
    sold: items.filter(i => i.status === 'sold').length,
    totalValue: items.filter(i => i.status === 'available').reduce((sum, i) => sum + (i.price || 0), 0),
    soldValue: items.filter(i => i.status === 'sold').reduce((sum, i) => sum + (i.price || 0), 0)
  };

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

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
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Active Inventory</h1>
          <p className="text-slate-600">Manage your estate sale items and listings</p>
        </div>
        <Button 
          onClick={() => {
            setEditingItem(null);
            setShowCreateModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <CreateItemModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSuccess={loadData}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div className="text-sm text-slate-600 mb-1">Inventory Value</div>
            <div className="text-2xl font-bold text-cyan-600">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Sold Value</div>
            <div className="text-2xl font-bold text-orange-600">
              ${stats.soldValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
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

      {/* Items Display */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">
            {searchQuery ? 'No items match your search' : 'No items in inventory'}
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Item
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleEdit(item)}>
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
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900 flex-1 line-clamp-1">
                    {item.title}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleGenerateSEO(e, item.id)} disabled={seoLoading[item.id]}>
                      {seoDone[item.id] ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <Sparkles className="w-4 h-4 mr-2 text-purple-500" />}
                      {seoLoading[item.id] ? 'Generating...' : seoDone[item.id] ? 'SEO Generated' : 'Generate SEO'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handlePostToEtsy(e, item)} disabled={postingEtsy[item.id]}>
                      <span className="mr-2">🧶</span>
                      {postingEtsy[item.id] ? 'Posting...' : 'Post to Etsy'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handlePostToEbay(e, item)} disabled={postingEbay[item.id]}>
                      <span className="mr-2">🛍️</span>
                      {postingEbay[item.id] ? 'Posting...' : 'Post to eBay'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                  {item.category && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Tag className="w-3 h-3" />
                      <span>{item.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </div>
                  )}
                  {item.storage_location_path && (
                    <div className="flex items-start gap-1 text-xs text-slate-600">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{item.storage_location_path}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-lg font-bold text-cyan-600">
                    <DollarSign className="w-5 h-5" />
                    <span>{item.price?.toLocaleString()}</span>
                  </div>
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
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Sold Price</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 cursor-pointer" onClick={() => handleEdit(item)}>
                        <p className="font-medium text-slate-900 hover:text-orange-600">{item.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-600">
                      {item.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      {item.storage_location_path && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.storage_location_path}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-900">
                    ${item.price?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Select
                      value={item.status}
                      onValueChange={async (newStatus) => {
                        base44.entities.Item.update(item.id, { status: newStatus });
                        setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
                        
                        // If marked as sold, cleanup images, trigger SEO, and remove from marketplace
                        if (newStatus === 'sold') {
                          try {
                            // Remove from marketplace
                            const marketplaceItems = await base44.entities.MarketplaceItem.filter({ item_id: item.id });
                            for (const mi of marketplaceItems) {
                              await base44.entities.MarketplaceItem.update(mi.id, { status: 'SOLD' });
                            }
                            
                            // Cleanup images and trigger SEO
                            if (item.sold_price) {
                              await base44.functions.invoke('processSoldItem', {
                                item_id: item.id,
                                sold_price: item.sold_price,
                                first_image_url: item.images?.[0] || null
                              });
                            }
                          } catch (error) {
                            console.warn('Note: Could not process sold item cleanup:', error.message);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-24 mx-auto" onClick={e => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'sold' ? (
                      <Input
                        type="number"
                        placeholder="$0.00"
                        value={item.sold_price || ''}
                        onChange={(e) => {
                          const newPrice = e.target.value ? parseFloat(e.target.value) : null;
                          base44.entities.Item.update(item.id, { sold_price: newPrice });
                          setItems(items.map(i => i.id === item.id ? { ...i, sold_price: newPrice } : i));
                        }}
                        className="w-32 text-center"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleGenerateSEO(e, item.id)} disabled={seoLoading[item.id]}>
                          {seoDone[item.id] ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <Sparkles className="w-4 h-4 mr-2 text-purple-500" />}
                          {seoLoading[item.id] ? 'Generating...' : seoDone[item.id] ? 'SEO Generated' : 'Generate SEO'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handlePostToEtsy(e, item)} disabled={postingEtsy[item.id]}>
                          <span className="mr-2">🧶</span>
                          {postingEtsy[item.id] ? 'Posting...' : 'Post to Etsy'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handlePostToEbay(e, item)} disabled={postingEbay[item.id]}>
                          <span className="mr-2">🛍️</span>
                          {postingEbay[item.id] ? 'Posting...' : 'Post to eBay'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}