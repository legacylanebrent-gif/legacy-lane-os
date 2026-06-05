import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, QrCode, X, Check, AlertCircle } from 'lucide-react';
import TransactionForm from '@/components/worksheet/TransactionForm';
import { Html5QrcodeScanner } from 'html5-qrcode';

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

  // Cart scanner state
  const [showCartScanner, setShowCartScanner] = useState(false);
  const [cartScanMessage, setCartScanMessage] = useState(null);
  const [cartScanning, setCartScanning] = useState(false);
  const scannerRef = useRef(null);
  const qrScannerRef = useRef(null);

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
    setShowCartScanner(true);
    setCartScanMessage(null);
    setTimeout(() => {
      if (scannerRef.current) {
        const scanner = new Html5QrcodeScanner('worksheet-qr-scanner', { fps: 10, qrbox: 250 }, false);
        const onScanSuccess = async (decodedText) => {
          scanner.clear();
          qrScannerRef.current = null;
          setCartScanning(true);
          try {
            let userId = decodedText;
            if (decodedText.startsWith('cart:')) userId = decodedText.replace('cart:', '');
            else if (decodedText.includes('userId=')) {
              const url = new URL(decodedText, window.location.origin);
              userId = url.searchParams.get('userId');
            }
            if (!userId) throw new Error('Invalid cart QR code');

            const carts = await base44.entities.Cart.filter({ user_id: userId });
            if (carts.length === 0) throw new Error('No cart found for this customer');

            const cart = carts[0];
            const params = new URLSearchParams(window.location.search);
            const saleId = params.get('saleId');

            // Bulk-create a transaction for each item in the cart
            for (const item of cart.items || []) {
              await base44.entities.Transaction.create({
                sale_id: saleId,
                item_name: item.item_title || item.name || 'Cart Item',
                quantity: item.quantity || 1,
                total: (item.price || 0) * (item.quantity || 1),
                payment_method: paymentMethod,
                notes: 'Imported from customer cart QR scan',
              });
            }

            // Clear the cart after import
            await base44.entities.Cart.delete(cart.id);

            setCartScanMessage({ type: 'success', text: `${cart.items?.length || 0} items imported from cart!` });
            const transData = await base44.entities.Transaction.filter({ sale_id: saleId }, '-created_date');
            setTransactions(transData);
          } catch (error) {
            setCartScanMessage({ type: 'error', text: error.message });
          } finally {
            setCartScanning(false);
          }
        };
        scanner.render(onScanSuccess, () => {});
        qrScannerRef.current = scanner;
      }
    }, 100);
  };

  const closeCartScanner = () => {
    if (qrScannerRef.current) { qrScannerRef.current.clear(); qrScannerRef.current = null; }
    setShowCartScanner(false);
    setCartScanMessage(null);
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

      {/* Cart Scanner Modal */}
      {showCartScanner && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-6 h-6 text-orange-600" />
                Scan Customer Cart
              </h2>
              <Button variant="ghost" size="icon" onClick={closeCartScanner}><X className="w-5 h-5" /></Button>
            </div>
            <p className="text-sm text-slate-600">Ask the customer to show their cart QR code. All items will be added to this worksheet automatically.</p>
            {cartScanMessage && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-white text-sm ${cartScanMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {cartScanMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {cartScanMessage.text}
              </div>
            )}
            {cartScanning ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full"></div>
                <span className="ml-3 text-slate-600">Importing cart items...</span>
              </div>
            ) : !cartScanMessage?.type === 'success' && (
              <div id="worksheet-qr-scanner" ref={scannerRef} className="w-full rounded-lg overflow-hidden bg-slate-100 min-h-[300px]" />
            )}
            {cartScanMessage?.type === 'success' && (
              <Button onClick={closeCartScanner} className="w-full bg-green-600 hover:bg-green-700">Done</Button>
            )}
          </div>
        </div>
      )}

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