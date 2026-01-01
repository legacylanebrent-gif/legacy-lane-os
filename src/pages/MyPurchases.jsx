import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Calendar, MapPin, DollarSign, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function MyPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const transactions = await base44.entities.Transaction.filter(
        { created_by: userData.email },
        '-created_date'
      );
      setPurchases(transactions);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    purchase.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    purchase.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpent = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
  const totalItems = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
                My Purchases
              </h1>
              <p className="text-slate-600">
                Track all your estate sale and marketplace purchases
              </p>
            </div>
            <Link to={createPageUrl('RecordPurchase')}>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Record Purchase
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-slate-900">{purchases.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Spent</p>
                  <p className="text-2xl font-bold text-slate-900">${totalSpent.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Items</p>
                  <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search purchases by item name, location, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Purchases List */}
        {filteredPurchases.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {searchQuery ? 'No purchases found' : 'No purchases yet'}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search criteria'
                  : 'Start recording your estate sale purchases to track your collection'}
              </p>
              {!searchQuery && (
                <Link to={createPageUrl('RecordPurchase')}>
                  <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Record Your First Purchase
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPurchases.map((purchase) => (
              <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            {purchase.item_name}
                          </h3>
                          <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="font-semibold text-green-600">
                                ${purchase.price?.toFixed(2)} × {purchase.quantity}
                              </span>
                              <span className="text-slate-500">
                                = ${(purchase.price * purchase.quantity).toFixed(2)}
                              </span>
                            </div>
                            {purchase.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-cyan-600" />
                                <span>{purchase.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-orange-600" />
                              <span>{format(new Date(purchase.created_date), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                            {purchase.notes && (
                              <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-700">{purchase.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                      +10 pts
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}