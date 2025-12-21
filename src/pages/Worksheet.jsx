import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, DollarSign, Users, Building2, Package, Receipt, 
  Printer, Mail, FileDown, Plus
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Worksheet() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('transactions');
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      // Load transactions
      const transData = await base44.entities.Transaction.filter({ sale_id: saleId }, '-created_date');
      setTransactions(transData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!itemName.trim() || !price || price <= 0) {
      alert('Please enter item name and valid price');
      return;
    }

    setSubmitting(true);
    try {
      const total = parseFloat(price) * quantity;
      const sellerAmount = total * 0.8;
      const companyAmount = total * 0.2;

      await base44.entities.Transaction.create({
        sale_id: sale.id,
        item_name: itemName,
        quantity: quantity,
        price: parseFloat(price),
        total: total,
        payment_method: paymentMethod,
        notes: notes,
        transaction_date: new Date().toISOString(),
        seller_amount: sellerAmount,
        company_amount: companyAmount
      });

      // Clear form
      setItemName('');
      setQuantity(1);
      setPrice('');
      setPaymentMethod('cash');
      setNotes('');

      // Reload transactions
      await loadData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const sellerTotal = transactions.reduce((sum, t) => sum + (t.seller_amount || 0), 0);
  const companyTotal = transactions.reduce((sum, t) => sum + (t.company_amount || 0), 0);
  const totalItemsSold = transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const currentTotal = price && quantity ? (parseFloat(price) * quantity) : 0;

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
    <div className="p-6 lg:p-8 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('MySales'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Sale Transaction Worksheet</h1>
          <p className="text-slate-600">{sale?.title}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Assign Client
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">
            <DollarSign className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Building2 className="w-4 h-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="profit">
            <Receipt className="w-4 h-4 mr-2" />
            Profit Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Total Revenue</span>
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${totalRevenue.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Seller Total (80%)</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${sellerTotal.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Company Total (20%)</span>
                  <Building2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ${companyTotal.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Total Items Sold</span>
                  <Package className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {totalItemsSold}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Transactions</span>
                  <Receipt className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="text-2xl font-bold text-cyan-600">
                  {transactions.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Transaction Form */}
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Add New Transaction</h3>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bundle
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Item <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Item name..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Payment <span className="text-red-500">*</span>
                    </label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="zelle">Zelle</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Total</span>
                    <span className="text-2xl font-bold text-slate-900">
                      ${currentTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes (optional)
                  </label>
                  <Input
                    placeholder="Additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleAddTransaction}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {submitting ? 'Adding...' : 'Add Transaction'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction List */}
          {transactions.length > 0 && (
            <Card className="bg-white shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{transaction.item_name}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                          <span>Qty: {transaction.quantity}</span>
                          <span>•</span>
                          <span>${transaction.price.toFixed(2)} each</span>
                          <span>•</span>
                          <span className="capitalize">{transaction.payment_method.replace('_', ' ')}</span>
                        </div>
                        {transaction.notes && (
                          <p className="text-sm text-slate-500 mt-1">{transaction.notes}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-green-600">
                          ${transaction.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Footer */}
          <div className="flex items-center justify-between p-6 bg-white rounded-lg shadow-md border-2 border-slate-200">
            <div className="text-lg">
              <span className="text-slate-600">Total Transactions: </span>
              <span className="font-bold text-slate-900">{transactions.length}</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-600">
                ${totalRevenue.toFixed(2)}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Expense tracking coming soon</p>
          </Card>
        </TabsContent>

        <TabsContent value="profit">
          <Card className="p-12 text-center">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Profit summary coming soon</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}