import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign } from 'lucide-react';
import TransactionForm from '@/components/worksheet/TransactionForm';

export default function Worksheet() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Transaction form state
  const [photoMode, setPhotoMode] = useState(false);
  const [bundleMode, setBundleMode] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  // Bundle state
  const [bundleName, setBundleName] = useState('');
  const [bundleItems, setBundleItems] = useState([]);
  const [bundleItemInput, setBundleItemInput] = useState('');
  const [bundleItemPrice, setBundleItemPrice] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  
  // Photo mode state
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [searchingPhotos, setSearchingPhotos] = useState(false);
  const [photoSuggestions, setPhotoSuggestions] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

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

  const handleAddTransaction = async () => {
    if (!itemName || !price || !paymentMethod) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      const newTransaction = {
        sale_id: saleId,
        item_name: itemName,
        quantity: quantity,
        total: parseFloat(price) * quantity,
        payment_method: paymentMethod,
        notes: notes
      };

      await base44.entities.Transaction.create(newTransaction);
      
      // Reset form
      setItemName('');
      setQuantity(1);
      setPrice('');
      setPaymentMethod('cash');
      setNotes('');
      setPhotoMode(false);
      
      // Reload transactions
      const transData = await base44.entities.Transaction.filter({ sale_id: saleId }, '-created_date');
      setTransactions(transData);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBundle = async () => {
    if (!bundleName || !bundlePrice || bundleItems.length === 0) {
      alert('Please fill in all bundle fields');
      return;
    }

    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      const bundleTransaction = {
        sale_id: saleId,
        item_name: bundleName,
        quantity: 1,
        total: parseFloat(bundlePrice),
        payment_method: paymentMethod,
        notes: `Bundle: ${bundleItems.map(i => i.name).join(', ')}`
      };

      await base44.entities.Transaction.create(bundleTransaction);
      
      // Reset form
      setBundleName('');
      setBundleItems([]);
      setBundleItemInput('');
      setBundleItemPrice('');
      setBundlePrice('');
      setBundleMode(false);
      
      // Reload transactions
      const transData = await base44.entities.Transaction.filter({ sale_id: saleId }, '-created_date');
      setTransactions(transData);
    } catch (error) {
      console.error('Error saving bundle:', error);
      alert('Failed to save bundle');
    } finally {
      setSubmitting(false);
    }
  };

  const addBundleItem = () => {
    if (!bundleItemInput || !bundleItemPrice) return;
    setBundleItems([...bundleItems, { name: bundleItemInput, price: parseFloat(bundleItemPrice) }]);
    setBundleItemInput('');
    setBundleItemPrice('');
  };

  const removeBundleItem = (index) => {
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };

  const handlePhotoSearch = async (query) => {
    setPhotoSearchQuery(query);
    if (!query.trim() || !sale?.images) {
      setPhotoSuggestions([]);
      return;
    }

    setSearchingPhotos(true);
    try {
      const filtered = sale.images.filter(img => 
        img.name?.toLowerCase().includes(query.toLowerCase()) ||
        img.description?.toLowerCase().includes(query.toLowerCase())
      );
      setPhotoSuggestions(filtered.map(img => ({
        name: img.name || 'Item',
        description: img.description,
        imageUrl: img.url,
        suggested_price: img.price || null
      })));
    } catch (error) {
      console.error('Error searching photos:', error);
    } finally {
      setSearchingPhotos(false);
    }
  };

  const selectPhotoItem = (photo) => {
    setSelectedPhoto(photo);
    setItemName(photo.name);
    if (photo.suggested_price) {
      setPrice(photo.suggested_price.toString());
    }
  };

  const handleScanCart = () => {
    alert('Cart scanning not yet implemented');
  };

  const currentTotal = parseFloat(price) * quantity || 0;

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
                  ${(transactions.reduce((sum, t) => sum + (t.total || 0), 0)).toFixed(2)}
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

          <TransactionForm
            photoMode={photoMode}
            setPhotoMode={setPhotoMode}
            bundleMode={bundleMode}
            setBundleMode={setBundleMode}
            itemName={itemName}
            setItemName={setItemName}
            quantity={quantity}
            setQuantity={setQuantity}
            price={price}
            setPrice={setPrice}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            notes={notes}
            setNotes={setNotes}
            currentTotal={currentTotal}
            submitting={submitting}
            handleAddTransaction={handleAddTransaction}
            handleSaveBundle={handleSaveBundle}
            bundleName={bundleName}
            setBundleName={setBundleName}
            bundleItems={bundleItems}
            bundleItemInput={bundleItemInput}
            setBundleItemInput={setBundleItemInput}
            bundleItemPrice={bundleItemPrice}
            setBundleItemPrice={setBundleItemPrice}
            bundlePrice={bundlePrice}
            setBundlePrice={setBundlePrice}
            addBundleItem={addBundleItem}
            removeBundleItem={removeBundleItem}
            photoSearchQuery={photoSearchQuery}
            handlePhotoSearch={handlePhotoSearch}
            searchingPhotos={searchingPhotos}
            photoSuggestions={photoSuggestions}
            selectedPhoto={selectedPhoto}
            setSelectedPhoto={setSelectedPhoto}
            selectPhotoItem={selectPhotoItem}
            onScanCart={handleScanCart}
          />

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