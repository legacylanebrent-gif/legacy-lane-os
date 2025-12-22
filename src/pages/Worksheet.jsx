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
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, DollarSign, Users, Building2, Package, Receipt, 
  Printer, Mail, FileDown, Plus, X, Edit, Check, HandCoins, Truck, Camera
} from 'lucide-react';
import VenmoPaymentModal from '@/components/payment/VenmoPaymentModal';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [offers, setOffers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [activeTab, setActiveTab] = useState('transactions');
  
  // Transaction form state
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bundle mode state
  const [bundleMode, setBundleMode] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [bundleItems, setBundleItems] = useState([]);
  const [bundleItemInput, setBundleItemInput] = useState('');
  const [bundleItemPrice, setBundleItemPrice] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');

  // Photo mode state
  const [photoMode, setPhotoMode] = useState(false);
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoSuggestions, setPhotoSuggestions] = useState([]);
  const [searchingPhotos, setSearchingPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Offer form state
  const [offerItemName, setOfferItemName] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerFullName, setOfferFullName] = useState('');
  const [offerPhone, setOfferPhone] = useState('');
  const [offerEmail, setOfferEmail] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerPhotoMode, setOfferPhotoMode] = useState(false);
  const [offerPhotoQuery, setOfferPhotoQuery] = useState('');
  const [offerPhotoSuggestions, setOfferPhotoSuggestions] = useState([]);
  const [searchingOfferPhotos, setSearchingOfferPhotos] = useState(false);
  const [selectedOfferPhoto, setSelectedOfferPhoto] = useState(null);

  // Shipping form state
  const [showSmallShipForm, setShowSmallShipForm] = useState(false);
  const [showLargeShipForm, setShowLargeShipForm] = useState(false);
  const [shipItemName, setShipItemName] = useState('');
  const [shipBuyerName, setShipBuyerName] = useState('');
  const [shipBuyerEmail, setShipBuyerEmail] = useState('');
  const [shipBuyerPhone, setShipBuyerPhone] = useState('');
  const [shipStreet, setShipStreet] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipZip, setShipZip] = useState('');
  const [shipCarrier, setShipCarrier] = useState('usps');
  const [shipTracking, setShipTracking] = useState('');
  const [shipCost, setShipCost] = useState('');
  const [shipNotes, setShipNotes] = useState('');
  const [shipLength, setShipLength] = useState('');
  const [shipWidth, setShipWidth] = useState('');
  const [shipHeight, setShipHeight] = useState('');
  const [shipWeight, setShipWeight] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendorQuote, setVendorQuote] = useState('');

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editedTransaction, setEditedTransaction] = useState(null);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('credit_card');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState(null);
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Venmo payment modal state
  const [showVenmoModal, setShowVenmoModal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load current user
      const userData = await base44.auth.me();
      setUser(userData);

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

      // Load expenses
      const expenseData = await base44.entities.Expense.filter({ sale_id: saleId }, '-created_date');
      setExpenses(expenseData);

      // Load offers
      const offerData = await base44.entities.Offer.filter({ sale_id: saleId }, '-created_date');
      setOffers(offerData);

      // Load shipments
      const shipmentData = await base44.entities.Shipment.filter({ sale_id: saleId }, '-created_date');
      setShipments(shipmentData);

      // Load vendors for large item delivery
      const vendorData = await base44.entities.Vendor.list();
      setVendors(vendorData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction.id);
    setEditedTransaction({ ...transaction });
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditedTransaction(null);
  };

  const handleSaveEdit = async () => {
    if (!editedTransaction.item_name || !editedTransaction.price || editedTransaction.price <= 0) {
      alert('Please enter valid item name and price');
      return;
    }

    setSubmitting(true);
    try {
      const total = parseFloat(editedTransaction.price) * editedTransaction.quantity;
      const commissionRate = sale.commission_rate || 20;
      const companyAmount = total * (commissionRate / 100);
      const sellerAmount = total - companyAmount;

      await base44.entities.Transaction.update(editedTransaction.id, {
        item_name: editedTransaction.item_name,
        quantity: editedTransaction.quantity,
        price: parseFloat(editedTransaction.price),
        total: total,
        payment_method: editedTransaction.payment_method,
        notes: editedTransaction.notes,
        seller_amount: sellerAmount,
        company_amount: companyAmount
      });

      setEditingTransaction(null);
      setEditedTransaction(null);
      await loadData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await base44.entities.Transaction.delete(transactionId);
      await loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleAddOffer = async () => {
    if (!offerItemName.trim() || !offerAmount || offerAmount <= 0 || !offerFullName.trim()) {
      alert('Please enter item name, offer amount, and full name');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Offer.create({
        sale_id: sale.id,
        item_name: offerItemName,
        offer_amount: parseFloat(offerAmount),
        full_name: offerFullName,
        phone: offerPhone,
        email: offerEmail,
        notes: offerNotes,
        status: 'pending'
      });

      // Clear form
      setOfferItemName('');
      setOfferAmount('');
      setOfferFullName('');
      setOfferPhone('');
      setOfferEmail('');
      setOfferNotes('');
      setOfferPhotoMode(false);
      setSelectedOfferPhoto(null);
      setOfferPhotoQuery('');

      // Reload offers
      await loadData();
    } catch (error) {
      console.error('Error adding offer:', error);
      alert('Failed to add offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseCategory || !expenseAmount || expenseAmount <= 0) {
      alert('Please select a category and enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl = null;
      if (expenseReceipt) {
        setUploadingReceipt(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: expenseReceipt });
        receiptUrl = file_url;
        setUploadingReceipt(false);
      }

      await base44.entities.Expense.create({
        sale_id: sale.id,
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        vendor: expenseVendor,
        date: expenseDate,
        payment_method: expensePaymentMethod,
        description: expenseDescription,
        receipt_url: receiptUrl,
        is_reimbursable: isReimbursable
      });

      // Clear form
      setExpenseCategory('');
      setExpenseAmount('');
      setExpenseVendor('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpensePaymentMethod('credit_card');
      setExpenseDescription('');
      setExpenseReceipt(null);
      setIsReimbursable(false);
      setShowExpenseForm(false);

      // Reload expenses
      await loadData();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const addBundleItem = () => {
    if (bundleItemInput.trim() && bundleItemPrice && parseFloat(bundleItemPrice) > 0) {
      const newItems = [...bundleItems, { name: bundleItemInput.trim(), price: parseFloat(bundleItemPrice) }];
      setBundleItems(newItems);
      
      // Auto-calculate bundle price
      const total = newItems.reduce((sum, item) => sum + item.price, 0);
      setBundlePrice(total.toFixed(2));
      
      setBundleItemInput('');
      setBundleItemPrice('');
    }
  };

  const removeBundleItem = (index) => {
    const newItems = bundleItems.filter((_, i) => i !== index);
    setBundleItems(newItems);
    
    // Recalculate bundle price
    const total = newItems.reduce((sum, item) => sum + item.price, 0);
    setBundlePrice(total > 0 ? total.toFixed(2) : '');
  };

  const handleSaveBundle = async () => {
    if (!bundleName.trim() || bundleItems.length === 0 || !bundlePrice || parseFloat(bundlePrice) <= 0) {
      alert('Please enter bundle name, at least one item, and a valid price');
      return;
    }

    const total = parseFloat(bundlePrice);
    const bundleNotes = `Bundle: ${bundleItems.map(item => `${item.name} ($${item.price.toFixed(2)})`).join(', ')}`;

    // If Venmo payment, show modal first
    if (paymentMethod === 'venmo') {
      setPendingTransaction({
        item_name: bundleName,
        quantity: 1,
        price: total,
        total: total,
        notes: bundleNotes
      });
      setShowVenmoModal(true);
      return;
    }

    // Process non-Venmo bundle transactions directly
    setSubmitting(true);
    try {
      const commissionRate = sale.commission_rate || 20;
      const companyAmount = total * (commissionRate / 100);
      const sellerAmount = total - companyAmount;

      await base44.entities.Transaction.create({
        sale_id: sale.id,
        item_name: bundleName,
        quantity: 1,
        price: total,
        total: total,
        payment_method: paymentMethod,
        notes: bundleNotes,
        transaction_date: new Date().toISOString(),
        seller_amount: sellerAmount,
        company_amount: companyAmount
      });

      // Reset bundle form
      setBundleName('');
      setBundleItems([]);
      setBundleItemInput('');
      setBundlePrice('');
      setBundleMode(false);

      // Reload transactions
      await loadData();
    } catch (error) {
      console.error('Error saving bundle:', error);
      alert('Failed to save bundle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!itemName.trim() || !price || price <= 0) {
      alert('Please enter item name and valid price');
      return;
    }

    const total = parseFloat(price) * quantity;

    // If Venmo payment, show modal first
    if (paymentMethod === 'venmo') {
      setPendingTransaction({
        item_name: itemName,
        quantity: quantity,
        price: parseFloat(price),
        total: total,
        notes: notes
      });
      setShowVenmoModal(true);
      return;
    }

    // Process non-Venmo transactions directly
    await processTransaction({
      item_name: itemName,
      quantity: quantity,
      price: parseFloat(price),
      total: total,
      payment_method: paymentMethod,
      notes: notes
    });
  };

  const processTransaction = async (transactionData) => {
    setSubmitting(true);
    try {
      const commissionRate = sale.commission_rate || 20;
      const companyAmount = transactionData.total * (commissionRate / 100);
      const sellerAmount = transactionData.total - companyAmount;

      await base44.entities.Transaction.create({
        sale_id: sale.id,
        ...transactionData,
        transaction_date: new Date().toISOString(),
        seller_amount: sellerAmount,
        company_amount: companyAmount
      });

      // Update ProductDatabase with final sold price
      try {
        const productEntries = await base44.entities.ProductDatabase.filter({
          sale_id: sale.id,
          title: transactionData.item_name
        });

        if (productEntries.length > 0) {
          // Update the first matching entry with sold price
          await base44.entities.ProductDatabase.update(productEntries[0].id, {
            final_sold_price: transactionData.price,
            sold_date: new Date().toISOString()
          });
        }
      } catch (error) {
        console.log('Could not update product database:', error);
      }

      // Clear form
      setItemName('');
      setQuantity(1);
      setPrice('');
      setPaymentMethod('cash');
      setNotes('');
      setPendingTransaction(null);
      setShowVenmoModal(false);
      setPhotoMode(false);
      setSelectedPhoto(null);
      setPhotoSearchQuery('');
      setPhotoSuggestions([]);

      // Reload transactions
      await loadData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVenmoPaymentConfirm = async () => {
    if (pendingTransaction) {
      await processTransaction({
        ...pendingTransaction,
        payment_method: 'venmo'
      });
    }
  };

  const searchRequestId = React.useRef(0);

  const handlePhotoSearch = async (query) => {
    setPhotoSearchQuery(query);
    setPhotoSuggestions([]);
    
    if (!query || query.length < 2) {
      setSearchingPhotos(false);
      return;
    }

    const requestId = ++searchRequestId.current;
    setSearchingPhotos(true);
    
    try {
      const images = sale.images || [];
      
      if (images.length === 0) {
        if (searchRequestId.current === requestId) {
          setSearchingPhotos(false);
        }
        return;
      }

      const prompt = `You are helping an estate sale operator find items from their sale photos.

The operator is searching for: "${query}"

Available items from photos:
${images.map((img, idx) => `${idx + 1}. ${img.name || 'Unnamed item'} - ${img.description || 'No description'}`).join('\n')}

Return a JSON array of the top matching items (max 5). For each match, include:
- index: the item number from the list above
- name: the item name
- description: the item description
- confidence: how confident you are this matches the search (0-1)
- suggested_price: if you can infer a reasonable price from the description or name, suggest it, otherwise null

Only include items with confidence > 0.3. If no items match well, return an empty array.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  name: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  suggested_price: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Only update if this is still the latest search
      if (searchRequestId.current !== requestId) {
        return;
      }

      const matches = result?.matches || [];
      
      const suggestions = matches.map(match => {
        const imageData = images[match.index - 1];
        return {
          ...match,
          imageUrl: imageData?.url || imageData,
          name: match.name,
          description: match.description,
          suggested_price: match.suggested_price
        };
      });

      setPhotoSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching photos:', error);
      if (searchRequestId.current === requestId) {
        setPhotoSuggestions([]);
      }
    } finally {
      if (searchRequestId.current === requestId) {
        setSearchingPhotos(false);
      }
    }
  };

  const selectPhotoItem = (suggestion) => {
    setSelectedPhoto(suggestion);
    setItemName(suggestion.name);
    if (suggestion.suggested_price) {
      setPrice(suggestion.suggested_price.toString());
    }
    setPhotoSuggestions([]);
    setPhotoSearchQuery('');
  };

  const offerSearchRequestId = React.useRef(0);

  const handleOfferPhotoSearch = async (query) => {
    setOfferPhotoQuery(query);
    setOfferPhotoSuggestions([]);
    
    if (!query || query.length < 2) {
      setSearchingOfferPhotos(false);
      return;
    }

    const requestId = ++offerSearchRequestId.current;
    setSearchingOfferPhotos(true);
    
    try {
      const images = sale.images || [];
      
      if (images.length === 0) {
        if (offerSearchRequestId.current === requestId) {
          setSearchingOfferPhotos(false);
        }
        return;
      }

      const prompt = `You are helping an estate sale operator find items from their sale photos.

The operator is searching for: "${query}"

Available items from photos:
${images.map((img, idx) => `${idx + 1}. ${img.name || 'Unnamed item'} - ${img.description || 'No description'} - Price: ${img.price ? '$' + img.price : 'Not priced'}`).join('\n')}

Return a JSON array of the top matching items (max 5). For each match, include:
- index: the item number from the list above
- name: the item name
- description: the item description
- confidence: how confident you are this matches the search (0-1)
- suggested_price: the price if available, otherwise null

Only include items with confidence > 0.3. If no items match well, return an empty array.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  name: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  suggested_price: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (offerSearchRequestId.current !== requestId) {
        return;
      }

      const matches = result?.matches || [];
      
      const suggestions = matches.map(match => {
        const imageData = images[match.index - 1];
        return {
          ...match,
          imageUrl: imageData?.url || imageData,
          name: match.name,
          description: match.description,
          suggested_price: match.suggested_price
        };
      });

      setOfferPhotoSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching photos:', error);
      if (offerSearchRequestId.current === requestId) {
        setOfferPhotoSuggestions([]);
      }
    } finally {
      if (offerSearchRequestId.current === requestId) {
        setSearchingOfferPhotos(false);
      }
    }
  };

  const selectOfferPhotoItem = (suggestion) => {
    setSelectedOfferPhoto(suggestion);
    setOfferItemName(suggestion.name);
    if (suggestion.suggested_price) {
      setOfferAmount(suggestion.suggested_price.toString());
    }
    setOfferPhotoSuggestions([]);
  };

  const handleAddSmallShipment = async () => {
    if (!shipItemName.trim() || !shipBuyerName.trim() || !shipStreet.trim() || !shipCity.trim() || !shipState.trim() || !shipZip.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Shipment.create({
        sale_id: sale.id,
        item_name: shipItemName,
        size_category: 'small',
        buyer_name: shipBuyerName,
        buyer_email: shipBuyerEmail,
        buyer_phone: shipBuyerPhone,
        shipping_address: {
          street: shipStreet,
          city: shipCity,
          state: shipState,
          zip: shipZip
        },
        carrier: shipCarrier,
        tracking_number: shipTracking,
        shipping_cost: shipCost ? parseFloat(shipCost) : null,
        notes: shipNotes,
        dimensions: {
          length: shipLength ? parseFloat(shipLength) : null,
          width: shipWidth ? parseFloat(shipWidth) : null,
          height: shipHeight ? parseFloat(shipHeight) : null,
          weight: shipWeight ? parseFloat(shipWeight) : null
        },
        status: shipTracking ? 'shipped' : 'pending'
      });

      // Clear form
      setShipItemName('');
      setShipBuyerName('');
      setShipBuyerEmail('');
      setShipBuyerPhone('');
      setShipStreet('');
      setShipCity('');
      setShipState('');
      setShipZip('');
      setShipCarrier('usps');
      setShipTracking('');
      setShipCost('');
      setShipNotes('');
      setShipLength('');
      setShipWidth('');
      setShipHeight('');
      setShipWeight('');
      setShowSmallShipForm(false);

      await loadData();
    } catch (error) {
      console.error('Error adding shipment:', error);
      alert('Failed to add shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLargeShipment = async () => {
    if (!shipItemName.trim() || !shipBuyerName.trim() || !shipStreet.trim() || !shipCity.trim() || !shipState.trim() || !shipZip.trim() || !selectedVendor) {
      alert('Please fill in all required fields and select a vendor');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Shipment.create({
        sale_id: sale.id,
        item_name: shipItemName,
        size_category: 'large',
        buyer_name: shipBuyerName,
        buyer_email: shipBuyerEmail,
        buyer_phone: shipBuyerPhone,
        shipping_address: {
          street: shipStreet,
          city: shipCity,
          state: shipState,
          zip: shipZip
        },
        carrier: 'vendor',
        vendor_id: selectedVendor,
        vendor_quote: vendorQuote ? parseFloat(vendorQuote) : null,
        notes: shipNotes,
        dimensions: {
          length: shipLength ? parseFloat(shipLength) : null,
          width: shipWidth ? parseFloat(shipWidth) : null,
          height: shipHeight ? parseFloat(shipHeight) : null,
          weight: shipWeight ? parseFloat(shipWeight) : null
        },
        status: vendorQuote ? 'quoted' : 'pending'
      });

      // Clear form
      setShipItemName('');
      setShipBuyerName('');
      setShipBuyerEmail('');
      setShipBuyerPhone('');
      setShipStreet('');
      setShipCity('');
      setShipState('');
      setShipZip('');
      setSelectedVendor('');
      setVendorQuote('');
      setShipNotes('');
      setShipLength('');
      setShipWidth('');
      setShipHeight('');
      setShipWeight('');
      setShowLargeShipForm(false);

      await loadData();
    } catch (error) {
      console.error('Error adding large shipment:', error);
      alert('Failed to add shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const sellerTotal = transactions.reduce((sum, t) => sum + (t.seller_amount || 0), 0);
  const companyTotal = transactions.reduce((sum, t) => sum + (t.company_amount || 0), 0);
  const totalItemsSold = transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const currentTotal = price && quantity ? (parseFloat(price) * quantity) : 0;
  const commissionRate = sale?.commission_rate || 20;
  const sellerPercentage = 100 - commissionRate;

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const reimbursableExpenses = expenses.filter(e => e.is_reimbursable).reduce((sum, e) => sum + (e.amount || 0), 0);
  const nonReimbursableExpenses = expenses.filter(e => !e.is_reimbursable).reduce((sum, e) => sum + (e.amount || 0), 0);
  const reimbursableCount = expenses.filter(e => e.is_reimbursable).length;
  const nonReimbursableCount = expenses.filter(e => !e.is_reimbursable).length;

  const regularOffers = offers.filter(o => o.full_name !== 'Estate Buyout' && !o.item_name?.startsWith('Buyout Offer'));
  const buyoutOffers = offers.filter(o => o.full_name === 'Estate Buyout' || o.item_name?.startsWith('Buyout Offer'));
  
  const totalOffers = regularOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0);
  const pendingOffers = regularOffers.filter(o => o.status === 'pending').length;
  
  const totalBuyouts = buyoutOffers.reduce((sum, o) => sum + (o.offer_amount || 0), 0);
  const pendingBuyouts = buyoutOffers.filter(o => o.status === 'pending').length;

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
      {/* Venmo Payment Modal */}
      <VenmoPaymentModal
        open={showVenmoModal}
        onClose={() => {
          setShowVenmoModal(false);
          setPendingTransaction(null);
          setSubmitting(false);
        }}
        amount={pendingTransaction?.total || 0}
        venmoQRCode={user?.venmo_qr_code}
        onConfirm={handleVenmoPaymentConfirm}
        loading={submitting}
      />

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
          <TabsTrigger value="offers">
            <HandCoins className="w-4 h-4 mr-2" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="buyouts">
            <DollarSign className="w-4 h-4 mr-2" />
            Buyouts
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Building2 className="w-4 h-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="shipping">
            <Truck className="w-4 h-4 mr-2" />
            Shipping
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
                  <span className="text-sm text-slate-600">Seller Total ({sellerPercentage}%)</span>
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
                  <span className="text-sm text-slate-600">Company Total ({commissionRate}%)</span>
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

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Total Offers</span>
                  <HandCoins className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  ${totalOffers.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">{pendingOffers} pending</div>
              </CardContent>
            </Card>
            </div>

            {/* Payment Type Breakdown */}
            <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Transactions by Payment Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['cash', 'credit_card', 'venmo', 'zelle', 'check'].map(method => {
                  const methodTransactions = transactions.filter(t => t.payment_method === method);
                  const methodCount = methodTransactions.length;
                  const methodTotal = methodTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

                  return (
                    <div key={method} className="border rounded-lg p-3">
                      <div className="text-xs text-slate-600 mb-1 capitalize">
                        {method.replace('_', ' ')}
                      </div>
                      <div className="text-xl font-bold text-slate-900">
                        {methodCount}
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        ${methodTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            </Card>

            {/* Add Transaction Form */}
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {bundleMode ? 'Bundle Transaction' : photoMode ? 'Add from Photos' : 'Add New Transaction'}
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant={photoMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPhotoMode(!photoMode);
                      setBundleMode(false);
                      if (!photoMode) {
                        setItemName('');
                        setPrice('');
                        setSelectedPhoto(null);
                        setPhotoSearchQuery('');
                      }
                    }}
                    className={photoMode ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {photoMode ? 'Photo Mode' : 'From Photos'}
                  </Button>
                  <Button 
                    variant={bundleMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBundleMode(!bundleMode);
                      setPhotoMode(false);
                    }}
                    className={bundleMode ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {bundleMode ? 'Bundle Mode' : 'Create Bundle'}
                  </Button>
                </div>
              </div>

              {photoMode ? (
                <div className="space-y-4 border-2 border-cyan-200 rounded-lg p-4 bg-cyan-50">
                  <div>
                    <Label>
                      Search Items from Photos <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Start typing item name... (e.g., 'dining table', 'vase')"
                        value={photoSearchQuery}
                        onChange={(e) => handlePhotoSearch(e.target.value)}
                        className="pr-10"
                      />
                      {searchingPhotos && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-cyan-600 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>

                    {photoSuggestions.length > 0 && (
                      <div className="mt-2 border border-cyan-300 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
                        {photoSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectPhotoItem(suggestion)}
                            className="w-full flex items-start gap-3 p-3 hover:bg-cyan-50 border-b last:border-b-0 text-left"
                          >
                            {suggestion.imageUrl && (
                              <img 
                                src={typeof suggestion.imageUrl === 'string' ? suggestion.imageUrl : suggestion.imageUrl.url}
                                alt={suggestion.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{suggestion.name}</div>
                              {suggestion.description && (
                                <div className="text-sm text-slate-600 line-clamp-2">{suggestion.description}</div>
                              )}
                              {suggestion.suggested_price && (
                                <div className="text-sm font-semibold text-green-600 mt-1">
                                  Suggested: ${suggestion.suggested_price.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedPhoto && (
                      <div className="mt-3 p-3 bg-white border border-cyan-300 rounded-lg flex items-center gap-3">
                        {selectedPhoto.imageUrl && (
                          <img 
                            src={typeof selectedPhoto.imageUrl === 'string' ? selectedPhoto.imageUrl : selectedPhoto.imageUrl.url}
                            alt={selectedPhoto.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Selected: {selectedPhoto.name}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPhoto(null);
                            setItemName('');
                            setPrice('');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>
                      Item Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Item name (auto-filled from photo)"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>
                        Quantity <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label>
                        Payment <span className="text-red-500">*</span>
                      </Label>
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
                    <Label>
                      Price <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00 (auto-filled or override)"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <p className="text-xs text-slate-600 mt-1">Price auto-filled from photo metadata, or enter your own</p>
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
                    <Label>Notes (optional)</Label>
                    <Input
                      placeholder="Additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleAddTransaction}
                    disabled={submitting}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-base font-semibold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {submitting ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </div>
              ) : bundleMode ? (
                <div className="space-y-4 border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div>
                    <Label>
                      Bundle Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g., Kitchen Bundle, Living Room Set..."
                      value={bundleName}
                      onChange={(e) => setBundleName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Add Items to Bundle</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Item name..."
                        value={bundleItemInput}
                        onChange={(e) => setBundleItemInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addBundleItem()}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={bundleItemPrice}
                        onChange={(e) => setBundleItemPrice(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addBundleItem()}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        onClick={addBundleItem}
                        size="icon"
                        className="bg-slate-900 hover:bg-slate-800"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {bundleItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {bundleItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-sm">{item.name}</span>
                              <span className="text-sm font-semibold text-green-600">${item.price.toFixed(2)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBundleItem(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>
                      Bundle Price <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={bundlePrice}
                      onChange={(e) => setBundlePrice(e.target.value)}
                      className="font-semibold text-lg"
                    />
                    <p className="text-xs text-slate-600 mt-1">Auto-calculated from items, or enter manually</p>
                  </div>

                  <div>
                    <Label>
                      Payment Method <span className="text-red-500">*</span>
                    </Label>
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

                  <Button 
                    onClick={handleSaveBundle}
                    disabled={submitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base font-semibold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {submitting ? 'Saving...' : 'Save Bundle'}
                  </Button>
                </div>
              ) : (
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
                  )}
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
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {editingTransaction === transaction.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Item Name</Label>
                              <Input
                                value={editedTransaction.item_name}
                                onChange={(e) => setEditedTransaction({...editedTransaction, item_name: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editedTransaction.price}
                                onChange={(e) => setEditedTransaction({...editedTransaction, price: e.target.value})}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={editedTransaction.quantity}
                                onChange={(e) => setEditedTransaction({...editedTransaction, quantity: parseInt(e.target.value) || 1})}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Payment Method</Label>
                              <Select 
                                value={editedTransaction.payment_method} 
                                onValueChange={(value) => setEditedTransaction({...editedTransaction, payment_method: value})}
                              >
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
                            <Label className="text-xs">Notes</Label>
                            <Input
                              value={editedTransaction.notes || ''}
                              onChange={(e) => setEditedTransaction({...editedTransaction, notes: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={submitting}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {submitting ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
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
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">
                                ${transaction.total.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
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

        <TabsContent value="offers" className="space-y-6">
          {/* Add Offer Form */}
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {offerPhotoMode ? 'Add Offer from Photos' : 'Add New Offer'}
                </h3>
                <Button 
                  variant={offerPhotoMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOfferPhotoMode(!offerPhotoMode);
                    if (!offerPhotoMode) {
                      setOfferItemName('');
                      setOfferAmount('');
                      setSelectedOfferPhoto(null);
                      setOfferPhotoQuery('');
                    }
                  }}
                  className={offerPhotoMode ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {offerPhotoMode ? 'Photo Mode' : 'Search Photos'}
                </Button>
              </div>

              <div className="space-y-4">
                {offerPhotoMode && (
                  <div className="border-2 border-cyan-200 rounded-lg p-4 bg-cyan-50 mb-4">
                    <Label>
                      Search Items from Photos <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        placeholder="Start typing item name... (e.g., 'dining table', 'vase')"
                        value={offerPhotoQuery}
                        onChange={(e) => handleOfferPhotoSearch(e.target.value)}
                        className="pr-10"
                      />
                      {searchingOfferPhotos && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-cyan-600 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>

                    {offerPhotoSuggestions.length > 0 && (
                      <div className="mt-2 border border-cyan-300 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
                        {offerPhotoSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectOfferPhotoItem(suggestion)}
                            className="w-full flex items-start gap-3 p-3 hover:bg-cyan-50 border-b last:border-b-0 text-left"
                          >
                            {suggestion.imageUrl && (
                              <img 
                                src={typeof suggestion.imageUrl === 'string' ? suggestion.imageUrl : suggestion.imageUrl.url}
                                alt={suggestion.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{suggestion.name}</div>
                              {suggestion.description && (
                                <div className="text-sm text-slate-600 line-clamp-2">{suggestion.description}</div>
                              )}
                              {suggestion.suggested_price && (
                                <div className="text-sm font-semibold text-green-600 mt-1">
                                  Price: ${suggestion.suggested_price.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedOfferPhoto && (
                      <div className="mt-3 p-3 bg-white border border-cyan-300 rounded-lg flex items-center gap-3">
                        {selectedOfferPhoto.imageUrl && (
                          <img 
                            src={typeof selectedOfferPhoto.imageUrl === 'string' ? selectedOfferPhoto.imageUrl : selectedOfferPhoto.imageUrl.url}
                            alt={selectedOfferPhoto.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Selected: {selectedOfferPhoto.name}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOfferPhoto(null);
                            setOfferItemName('');
                            setOfferAmount('');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Item <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Item name..."
                      value={offerItemName}
                      onChange={(e) => setOfferItemName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Offer Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="John Doe"
                      value={offerFullName}
                      onChange={(e) => setOfferFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={offerPhone}
                      onChange={(e) => setOfferPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={offerEmail}
                      onChange={(e) => setOfferEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes (optional)
                  </label>
                  <Input
                    placeholder="Additional notes..."
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleAddOffer}
                  disabled={submitting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {submitting ? 'Adding...' : 'Add Offer'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Offers List */}
          {regularOffers.length > 0 && (
            <Card className="bg-white shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Offers</h3>
                <div className="space-y-3">
                  {regularOffers.map((offer) => (
                    <div 
                      key={offer.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
                          <p className="text-sm text-slate-500 mt-1">{offer.notes}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-amber-600">
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
          )}
        </TabsContent>

        <TabsContent value="buyouts" className="space-y-6">
          {/* Buyouts Stats */}
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
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Total Expenses</div>
                <div className="text-3xl font-bold text-slate-900">
                  ${totalExpenses.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">{expenses.length} items</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Reimbursable</div>
                <div className="text-3xl font-bold text-green-600">
                  ${reimbursableExpenses.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">{reimbursableCount} items</div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Non-Reimbursable</div>
                <div className="text-3xl font-bold text-red-600">
                  ${nonReimbursableExpenses.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">{nonReimbursableCount} items</div>
              </CardContent>
            </Card>
          </div>

          {/* Add Expense Form */}
          {showExpenseForm && (
            <Card className="bg-blue-50 border-blue-200 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Add New Expense</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowExpenseForm(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advertising_marketing">Advertising & Marketing</SelectItem>
                          <SelectItem value="cleaning_services">Cleaning Services</SelectItem>
                          <SelectItem value="dumpster_disposal">Dumpster & Disposal</SelectItem>
                          <SelectItem value="equipment_rental">Equipment Rental</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="labor_wages">Labor & Wages</SelectItem>
                          <SelectItem value="meals_entertainment">Meals & Entertainment</SelectItem>
                          <SelectItem value="permits_licenses">Permits & Licenses</SelectItem>
                          <SelectItem value="photography">Photography</SelectItem>
                          <SelectItem value="professional_services">Professional Services</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="signage_banners">Signage & Banners</SelectItem>
                          <SelectItem value="staging_setup">Staging & Setup</SelectItem>
                          <SelectItem value="supplies_materials">Supplies & Materials</SelectItem>
                          <SelectItem value="transportation_fuel">Transportation & Fuel</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Vendor
                      </label>
                      <Input
                        placeholder="Home Depot, Staples, etc."
                        value={expenseVendor}
                        onChange={(e) => setExpenseVendor(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <Select value={expensePaymentMethod} onValueChange={setExpensePaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="company_card">Company Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      placeholder="What was this expense for?"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Receipt
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setExpenseReceipt(e.target.files[0])}
                        className="flex-1"
                      />
                      {uploadingReceipt && <span className="text-sm text-slate-600">Uploading...</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="reimbursable"
                      checked={isReimbursable}
                      onChange={(e) => setIsReimbursable(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="reimbursable" className="text-sm text-blue-700 cursor-pointer">
                      This expense is reimbursable
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowExpenseForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddExpense}
                      disabled={submitting || uploadingReceipt}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {submitting ? 'Adding...' : 'Add Expense'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!showExpenseForm && (
            <Button 
              onClick={() => setShowExpenseForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Expense
            </Button>
          )}

          {/* Expense List */}
          {expenses.length > 0 ? (
            <Card className="bg-white shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Expenses</h3>
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div 
                      key={expense.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 capitalize">
                            {expense.category.replace('_', ' ')}
                          </p>
                          {expense.is_reimbursable && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Reimbursable
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                          {expense.vendor && <span>{expense.vendor}</span>}
                          {expense.vendor && <span>•</span>}
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="capitalize">{expense.payment_method.replace('_', ' ')}</span>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-slate-500 mt-1">{expense.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-slate-900">
                          ${expense.amount.toFixed(2)}
                        </p>
                        {expense.receipt_url && (
                          <a 
                            href={expense.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : !showExpenseForm && (
            <Card className="p-12 text-center">
              <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No expenses recorded for this sale</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Total Shipments</div>
                <div className="text-2xl font-bold text-slate-900">{shipments.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Small Items</div>
                <div className="text-2xl font-bold text-blue-600">
                  {shipments.filter(s => s.size_category === 'small').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Large Items</div>
                <div className="text-2xl font-bold text-purple-600">
                  {shipments.filter(s => s.size_category === 'large').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 mb-1">Shipped</div>
                <div className="text-2xl font-bold text-green-600">
                  {shipments.filter(s => s.status === 'shipped' || s.status === 'delivered').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Small Items Section */}
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Small Items (USPS / FedEx / UPS)</h3>
                  <p className="text-sm text-slate-600">Items that can be shipped via standard carriers</p>
                </div>
                {!showSmallShipForm && (
                  <Button 
                    onClick={() => setShowSmallShipForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Small Item
                  </Button>
                )}
              </div>

              {showSmallShipForm && (
                <div className="mb-6 border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">New Small Item Shipment</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowSmallShipForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Item Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g., Antique Vase, Jewelry Box..."
                        value={shipItemName}
                        onChange={(e) => setShipItemName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Buyer Name <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="John Doe"
                          value={shipBuyerName}
                          onChange={(e) => setShipBuyerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          value={shipBuyerEmail}
                          onChange={(e) => setShipBuyerEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          placeholder="(555) 123-4567"
                          value={shipBuyerPhone}
                          onChange={(e) => setShipBuyerPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Street Address <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="123 Main St"
                        value={shipStreet}
                        onChange={(e) => setShipStreet(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>City <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="City"
                          value={shipCity}
                          onChange={(e) => setShipCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>State <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="State"
                          value={shipState}
                          onChange={(e) => setShipState(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>ZIP <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="12345"
                          value={shipZip}
                          onChange={(e) => setShipZip(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Carrier <span className="text-red-500">*</span></Label>
                        <Select value={shipCarrier} onValueChange={setShipCarrier}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usps">USPS</SelectItem>
                            <SelectItem value="fedex">FedEx</SelectItem>
                            <SelectItem value="ups">UPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tracking Number</Label>
                        <Input
                          placeholder="1234567890"
                          value={shipTracking}
                          onChange={(e) => setShipTracking(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <Label>Length (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="12"
                          value={shipLength}
                          onChange={(e) => setShipLength(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Width (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="8"
                          value={shipWidth}
                          onChange={(e) => setShipWidth(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Height (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="6"
                          value={shipHeight}
                          onChange={(e) => setShipHeight(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Weight (lbs)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="5"
                          value={shipWeight}
                          onChange={(e) => setShipWeight(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Shipping Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="15.00"
                          value={shipCost}
                          onChange={(e) => setShipCost(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Input
                        placeholder="Additional notes..."
                        value={shipNotes}
                        onChange={(e) => setShipNotes(e.target.value)}
                      />
                    </div>

                    <Button 
                      onClick={handleAddSmallShipment}
                      disabled={submitting}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {submitting ? 'Adding...' : 'Add Small Item Shipment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Small Items List */}
              <div className="space-y-3">
                {shipments.filter(s => s.size_category === 'small').length > 0 ? (
                  shipments.filter(s => s.size_category === 'small').map((shipment) => (
                    <div key={shipment.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-slate-900">{shipment.item_name}</p>
                            <Badge className={
                              shipment.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                              shipment.status === 'delivered' ? 'bg-green-100 text-green-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>
                              {shipment.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <div>To: {shipment.buyer_name}</div>
                            <div>{shipment.shipping_address.street}, {shipment.shipping_address.city}, {shipment.shipping_address.state} {shipment.shipping_address.zip}</div>
                            <div className="flex items-center gap-3">
                              <span className="uppercase font-semibold">{shipment.carrier}</span>
                              {shipment.tracking_number && (
                                <>
                                  <span>•</span>
                                  <span>Tracking: {shipment.tracking_number}</span>
                                </>
                              )}
                              {shipment.shipping_cost && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 font-semibold">${shipment.shipping_cost.toFixed(2)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">No small item shipments yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Large Items Section */}
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Large Items (Vendor Delivery)</h3>
                  <p className="text-sm text-slate-600">Items requiring vendor delivery quotes</p>
                </div>
                {!showLargeShipForm && (
                  <Button 
                    onClick={() => setShowLargeShipForm(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Large Item
                  </Button>
                )}
              </div>

              {showLargeShipForm && (
                <div className="mb-6 border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">New Large Item Shipment</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowLargeShipForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Item Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g., Oak Dining Table, Piano..."
                        value={shipItemName}
                        onChange={(e) => setShipItemName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Buyer Name <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="John Doe"
                          value={shipBuyerName}
                          onChange={(e) => setShipBuyerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          value={shipBuyerEmail}
                          onChange={(e) => setShipBuyerEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          placeholder="(555) 123-4567"
                          value={shipBuyerPhone}
                          onChange={(e) => setShipBuyerPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Delivery Address <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="123 Main St"
                        value={shipStreet}
                        onChange={(e) => setShipStreet(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>City <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="City"
                          value={shipCity}
                          onChange={(e) => setShipCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>State <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="State"
                          value={shipState}
                          onChange={(e) => setShipState(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>ZIP <span className="text-red-500">*</span></Label>
                        <Input
                          placeholder="12345"
                          value={shipZip}
                          onChange={(e) => setShipZip(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label>Length (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="72"
                          value={shipLength}
                          onChange={(e) => setShipLength(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Width (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="36"
                          value={shipWidth}
                          onChange={(e) => setShipWidth(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Height (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="30"
                          value={shipHeight}
                          onChange={(e) => setShipHeight(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Weight (lbs)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="150"
                          value={shipWeight}
                          onChange={(e) => setShipWeight(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Select Vendor <span className="text-red-500">*</span></Label>
                        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a vendor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.length > 0 ? (
                              vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.business_name || vendor.contact_name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No vendors available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Vendor Quote</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="150.00"
                          value={vendorQuote}
                          onChange={(e) => setVendorQuote(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Input
                        placeholder="Special handling instructions..."
                        value={shipNotes}
                        onChange={(e) => setShipNotes(e.target.value)}
                      />
                    </div>

                    <Button 
                      onClick={handleAddLargeShipment}
                      disabled={submitting}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {submitting ? 'Adding...' : 'Request Vendor Delivery Quote'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Large Items List */}
              <div className="space-y-3">
                {shipments.filter(s => s.size_category === 'large').length > 0 ? (
                  shipments.filter(s => s.size_category === 'large').map((shipment) => {
                    const vendor = vendors.find(v => v.id === shipment.vendor_id);
                    return (
                      <div key={shipment.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-slate-900">{shipment.item_name}</p>
                              <Badge className={
                                shipment.status === 'quoted' ? 'bg-blue-100 text-blue-700' :
                                shipment.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                'bg-yellow-100 text-yellow-700'
                              }>
                                {shipment.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <div>To: {shipment.buyer_name}</div>
                              <div>{shipment.shipping_address.street}, {shipment.shipping_address.city}, {shipment.shipping_address.state} {shipment.shipping_address.zip}</div>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="font-semibold">Vendor: {vendor?.business_name || vendor?.contact_name || 'Unknown'}</span>
                                {shipment.vendor_quote && (
                                  <>
                                    <span>•</span>
                                    <span className="text-purple-600 font-semibold">Quote: ${shipment.vendor_quote.toFixed(2)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-slate-500 py-8">No large item shipments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-6">
          <Card className="bg-white shadow-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Sale Financial Summary</h3>

              <div className="space-y-4">
                {/* Total Revenue */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium text-slate-900">Total Revenue</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${totalRevenue.toFixed(2)}
                  </span>
                </div>

                {/* Seller Share */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="font-medium text-slate-700">Seller Share ({sellerPercentage}%)</span>
                  <span className="text-xl font-bold text-blue-700">
                    ${sellerTotal.toFixed(2)}
                  </span>
                </div>

                {/* Company Share */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="font-medium text-slate-700">Company Share ({commissionRate}%)</span>
                  <span className="text-xl font-bold text-purple-700">
                    ${companyTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Expenses Deducted */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-slate-900 mb-3">Expenses Deducted from Company Share</h4>
                {expenses.length > 0 ? (
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 capitalize">{expense.category.replace('_', ' ')}</span>
                        <span className="text-red-600">-${expense.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No expenses recorded</p>
                )}
              </div>

              {/* Final Totals */}
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <span className="font-semibold text-slate-900">Seller Total (Unchanged)</span>
                  <span className="text-2xl font-bold text-blue-700">
                    ${sellerTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                  <span className="font-semibold text-slate-900">Company Profit (After Expenses)</span>
                  <span className="text-2xl font-bold text-purple-700">
                    ${(companyTotal - totalExpenses).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment & Closing Details */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-slate-900 mb-4">Payment & Closing Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Seller Payment Method</Label>
                    <Select defaultValue="not_yet_paid">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_yet_paid">Not Yet Paid</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="zelle">Zelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Payment Date</Label>
                    <Input type="date" placeholder="mm/dd/yyyy" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}