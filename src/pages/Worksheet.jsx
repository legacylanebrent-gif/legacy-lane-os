import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, Users, Building2, Package, Receipt, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Worksheet() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

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
      const transData = await base44.entities.Transaction.filter({ sale_id: saleId }, '-created_date');
      setTransactions(transData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load sale data');
    } finally {
      setLoading(false);
    }
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

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('MySales'))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      <h1 className="text-3xl font-bold text-slate-900">Sale Worksheet</h1>
      <p className="text-slate-600">{sale?.title}</p>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions" className="whitespace-nowrap">
            <DollarSign className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="offers" className="whitespace-nowrap">Offers</TabsTrigger>
          <TabsTrigger value="expenses" className="whitespace-nowrap">Expenses</TabsTrigger>
          <TabsTrigger value="profit" className="whitespace-nowrap">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-green-600">
                  ${totalRevenue.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Transactions</div>
                <div className="text-2xl font-bold text-slate-900">
                  {transactions.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Transaction</h3>
              <div className="space-y-4">
                <div>
                  <Label>Item Name</Label>
                  <Input placeholder="Item name..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" defaultValue="1" />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            </CardContent>
          </Card>

          {transactions.length > 0 && (
            <Card className="bg-white shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Transactions</h3>
                <div className="space-y-3">
                  {transactions.map((t) => (
                    <div key={t.id} className="p-4 border rounded-lg">
                      <p className="font-medium">{t.item_name}</p>
                      <p className="text-sm text-slate-600">${t.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="offers"><Card><CardContent className="p-6">Coming soon</CardContent></Card></TabsContent>
        <TabsContent value="expenses"><Card><CardContent className="p-6">Coming soon</CardContent></Card></TabsContent>
        <TabsContent value="profit"><Card><CardContent className="p-6">Coming soon</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}