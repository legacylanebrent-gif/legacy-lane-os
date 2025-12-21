import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Plus, Minus, Trash2, DollarSign, ShoppingCart, 
  CreditCard, Receipt, Calculator
} from 'lucide-react';

export default function Worksheet() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSale();
  }, []);

  const loadSale = async () => {
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
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // Example tax rate
  const total = subtotal + tax;

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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">{sale?.title}</h1>
            <p className="text-slate-600">Point of Sale Worksheet</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items / Scanner Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Add Items to Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Scan barcode or search item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-lg p-6"
              />
              
              <div className="mt-6 text-center text-slate-500">
                <Calculator className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                <p className="text-lg">POS System Coming Soon</p>
                <p className="text-sm mt-2">
                  Scan items, process payments, and track sales in real-time
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="h-20 flex-col">
                  <DollarSign className="w-6 h-6 mb-1" />
                  Custom Item
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Package className="w-6 h-6 mb-1" />
                  From Inventory
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Receipt className="w-6 h-6 mb-1" />
                  Bulk Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart / Checkout Area */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No items in cart</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-slate-600">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7">
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7">
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (8%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold pt-3 border-t">
                <span>Total:</span>
                <span className="text-cyan-600">${total.toFixed(2)}</span>
              </div>

              <div className="space-y-2 pt-4">
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Process Payment
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Receipt className="w-5 h-5 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}