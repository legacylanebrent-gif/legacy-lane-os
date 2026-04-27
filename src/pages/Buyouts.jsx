import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, DollarSign, HandCoins, Plus, X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Buyouts() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [buyoutOffers, setBuyoutOffers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const accountType = userData.primary_account_type || 'consumer';
      const isConsumer = !accountType || accountType === 'consumer' || accountType === 'executor' || accountType === 'home_seller' || accountType === 'buyer' || accountType === 'downsizer' || accountType === 'diy_seller' || accountType === 'consignor';

      if (isConsumer) {
        // Consumers only see their own buyout offers
        setSales([]);
        const offers = await base44.entities.Offer.filter({ created_by: userData.email }, '-created_date');
        const buyouts = offers.filter(o => o.item_name?.startsWith('Buyout Offer') || o.full_name === 'Estate Buyout');
        setBuyoutOffers(buyouts);
      } else {
        // Operators see buyout offers on their own sales
        const salesData = await base44.entities.EstateSale.filter({ 
          operator_id: userData.id 
        }, '-created_date');
        setSales(salesData);

        const allOffers = await base44.entities.Offer.filter({}, '-created_date');
        const saleIds = new Set(salesData.map(s => s.id));
        const buyouts = allOffers.filter(o => 
          saleIds.has(o.sale_id) && (o.item_name?.startsWith('Buyout Offer') || o.full_name === 'Estate Buyout')
        );
        setBuyoutOffers(buyouts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalBuyouts = buyoutOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0);
  const pendingBuyouts = buyoutOffers.filter(o => o.status === 'pending').length;

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
    <div className="p-6 lg:p-8 space-y-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('MySales'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Estate Sale Buyouts</h1>
          <p className="text-slate-600">Manage all-or-nothing estate sale offers</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Buyout Value</span>
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              ${totalBuyouts.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">{pendingBuyouts} pending</div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Buyouts</span>
              <HandCoins className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {buyoutOffers.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buyouts List */}
      {buyoutOffers.length > 0 ? (
        <Card className="bg-white shadow-md">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Buyout Offers</h3>
            <div className="space-y-3">
              {buyoutOffers.map((offer) => (
                <div 
                  key={offer.id}
                  className="flex items-start justify-between p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors bg-purple-50/50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{offer.item_name}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                      <span>{offer.full_name}</span>
                      {offer.phone && (
                        <>
                          <span>•</span>
                          <span>{offer.phone}</span>
                        </>
                      )}
                      {offer.email && (
                        <>
                          <span>•</span>
                          <span>{offer.email}</span>
                        </>
                      )}
                    </div>
                    {offer.notes && (
                      <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                        <p className="text-sm text-slate-700 whitespace-pre-line">{offer.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-purple-600">
                      ${offer.offer_amount.toFixed(2)}
                    </p>
                    <Badge className={`mt-1 ${
                      offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {offer.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No buyout offers yet</p>
          <p className="text-slate-400 text-sm mt-2">Buyout offers will appear here when created</p>
        </Card>
      )}
    </div>
  );
}