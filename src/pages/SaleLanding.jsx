import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import ConsumerHeader from '@/components/layout/ConsumerHeader';
import { 
  MapPin, Calendar, Search, Tag, DollarSign, Heart, ShoppingBag,
  Image as ImageIcon, LogIn, LogOut, MessageSquare, LayoutDashboard, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

export default function SaleLanding() {
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const user = await base44.auth.me();
        setCurrentUser(user);
      }
    } catch (error) {
      console.log('Auth check error:', error);
    }
  };

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      
      if (!saleId) {
        alert('Sale ID not found');
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        alert('Sale not found');
        return;
      }

      setSale(saleData[0]);

      const itemsData = await base44.entities.Item.filter({ 
        estate_sale_id: saleId,
        status: ['available', 'pending', 'reserved']
      }, '-created_date');
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      reserved: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const formatLabel = (val) => {
    if (!val) return '';
    return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!sale || items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-8">
        <Card className="p-12 text-center max-w-md">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Items Available</h2>
          <p className="text-slate-600 mb-6">
            This sale doesn't have any items listed in the marketplace yet.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Other Sales
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {isAuthenticated && currentUser ? (
        <ConsumerHeader user={currentUser} />
      ) : (
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to={createPageUrl('Home')} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">LL</span>
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-white">Legacy Lane</h1>
                  <p className="text-xs text-orange-400">Discover Amazing Estate Sales</p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => base44.auth.redirectToLogin(window.location.href)} className="text-white hover:text-orange-400 hover:bg-orange-500/20">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
                  Get Started Free
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Sale Info */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
                {sale.title}
              </h1>
              
              <div className="space-y-2">
                {sale.property_address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {sale.property_address.city}, {sale.property_address.state} {sale.property_address.zip}
                    </span>
                  </div>
                )}
                
                {sale.sale_dates && sale.sale_dates.length > 0 && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(sale.sale_dates[0].date), 'MMMM d, yyyy')}
                      {sale.sale_dates[0].start_time && 
                        ` • ${sale.sale_dates[0].start_time} - ${sale.sale_dates[0].end_time}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-cyan-50 rounded-xl p-6 border-2 border-orange-200">
              <div className="text-sm text-slate-600 mb-1">Available Items</div>
              <div className="text-4xl font-bold text-orange-600">{items.filter(i => i.status === 'available').length}</div>
              <div className="text-xs text-slate-500 mt-1">of {items.length} total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                >
                  All Items
                </Button>
                {categories.map(category => (
                   <Button
                     key={category}
                     variant={selectedCategory === category ? 'default' : 'outline'}
                     onClick={() => setSelectedCategory(category)}
                     className={selectedCategory === category ? 'bg-orange-600 hover:bg-orange-700' : ''}
                   >
                     {formatLabel(category)}
                   </Button>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredItems.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-500 text-lg">No items match your search</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <Link
                key={item.id}
                to={createPageUrl('ItemDetail') + '?itemId=' + item.id}
                className="block group"
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="relative h-56 bg-slate-100 overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-16 h-16 text-slate-300" />
                      </div>
                    )}
                    <Badge className={`absolute top-3 left-3 ${getStatusColor(item.status)}`}>
                      {formatLabel(item.status)}
                    </Badge>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {item.title}
                    </h3>
                    
                    {item.category && (
                      <div className="flex items-center gap-1 text-sm text-slate-600 mb-2">
                        <Tag className="w-3 h-3" />
                        <span>{formatLabel(item.category)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xl font-bold text-cyan-600">
                        <DollarSign className="w-5 h-5" />
                        <span>{item.price?.toLocaleString()}</span>
                      </div>
                      {item.views > 0 && (
                        <div className="text-xs text-slate-500">
                          {item.views} views
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">LL</span>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold">Legacy Lane</h3>
                  <p className="text-sm text-orange-400">Estate Sale Finder</p>
                </div>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Discover amazing estate sales and find treasures near you. Connect with trusted estate sale companies nationwide.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('Home')} className="text-slate-400 hover:text-white transition-colors">Find Sales</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('OperatorPackages')} className="text-slate-400 hover:text-white transition-colors">List Your Company</Link></li>
                <li><Link to={createPageUrl('StartYourCompany')} className="text-orange-400 hover:text-orange-300 transition-colors font-semibold">Start Your Own Estate Sale Company</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500">
              © {new Date().getFullYear()} Legacy Lane. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}