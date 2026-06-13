import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingBag, Target, Plus, X, Clock, DollarSign, MapPin,
  Package, Search, Trash2, Edit3, Check, Eye, EyeOff, Sparkles
} from 'lucide-react';
import CategorySuggestions from '@/components/profile/CategorySuggestions';
import AgentGuidedHunt from '@/components/profile/AgentGuidedHunt';

const CATEGORIES = [
  'Antiques', 'Art', 'Books & Media', 'Cameras & Photography',
  'China & Porcelain', 'Clothing & Accessories', 'Coins & Currency',
  'Collectibles', 'Comics', 'Electronics', 'Firearms', 'Furniture',
  'Garden & Outdoor', 'Glassware', 'Holiday & Seasonal', 'Jewelry',
  'Kitchen & Dining', 'Lighting & Lamps', 'Mid-Century Modern',
  'Musical Instruments', 'Other', 'Rugs & Textiles', 'Sporting Goods',
  'Tools & Hardware', 'Toys & Games', 'Vehicles', 'Victorian Era',
  'Vinyl Records', 'Vintage Fashion', 'Watches'
];

const CONDITIONS = [
  { value: 'any', label: 'Any Condition' },
  { value: 'new', label: 'New' },
  { value: 'used_like_new', label: 'Used - Like New' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
];

export default function BuyerPrefsTab({ user }) {
  const [purchases, setPurchases] = useState([]);
  const [wantedItems, setWantedItems] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [loadingWanted, setLoadingWanted] = useState(true);
  const [showWantedForm, setShowWantedForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [wantedForm, setWantedForm] = useState({
    title: '',
    description: '',
    brand: '',
    category: '',
    subcategory: '',
    era: '',
    budget_min: '',
    budget_max: '',
    condition: 'any',
    zip_code: '',
    distance: 50,
    shipping_ok: true,
    public_visibility: true,
  });

  const [suggestionsKey, setSuggestionsKey] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txns, marketplacePurchases, wantedData] = await Promise.all([
        base44.entities.Transaction.filter({ created_by_id: user.id, sale_id: { $ne: 'user_purchase' } }, '-created_date', 50),
        base44.entities.Purchase.filter({ buyer_id: user.id }, '-created_date', 50),
        base44.entities.WantedItem.filter({ buyer_id: user.id }, '-created_date', 50),
      ]);

      // Normalize Transaction → unified purchase shape
      const unifiedTxns = txns.map(t => ({
        id: t.id,
        item_name: t.item_name || 'Item',
        price: t.price || 0,
        total: t.total || t.price || 0,
        created_date: t.created_date,
        source: 'Transaction',
        payment_method: t.payment_method,
        quantity: t.quantity || 1,
      }));

      // Normalize Purchase → unified purchase shape
      const unifiedMp = marketplacePurchases.map(p => ({
        id: p.id,
        item_name: p.marketplace_item_id || 'Marketplace Item',
        price: p.final_price || 0,
        total: p.final_price || 0,
        created_date: p.created_date,
        source: 'Marketplace',
        payment_method: null,
        quantity: 1,
      }));

      const merged = [...unifiedTxns, ...unifiedMp].sort((a, b) =>
        new Date(b.created_date) - new Date(a.created_date)
      );

      setPurchases(merged);
      setWantedItems(wantedData);
    } catch (e) {
      console.error('Error loading buyer prefs:', e);
    } finally {
      setLoadingPurchases(false);
      setLoadingWanted(false);
    }
  };

  const resetForm = () => {
    setWantedForm({
      title: '',
      description: '',
      brand: '',
      category: '',
      subcategory: '',
      era: '',
      budget_min: '',
      budget_max: '',
      condition: 'any',
      zip_code: user?.address_zip || '',
      distance: 50,
      shipping_ok: true,
      public_visibility: true,
    });
    setEditingItem(null);
    setShowWantedForm(false);
    setSuggestionsKey(k => k + 1);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setWantedForm({
      title: item.title || '',
      description: item.description || '',
      brand: item.brand || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      era: item.era || '',
      budget_min: item.budget_min?.toString() || '',
      budget_max: item.budget_max?.toString() || '',
      condition: item.condition || 'any',
      zip_code: item.zip_code || user?.address_zip || '',
      distance: item.distance || 50,
      shipping_ok: item.shipping_ok !== false,
      public_visibility: item.public_visibility !== false,
    });
    setShowWantedForm(true);
    setSuggestionsKey(k => k + 1);
  };

  const handleSaveWantedItem = async () => {
    if (!wantedForm.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        buyer_id: user.id,
        buyer_name: user.full_name || user.email,
        title: wantedForm.title.trim(),
        description: wantedForm.description.trim(),
        brand: wantedForm.brand.trim(),
        category: wantedForm.category,
        subcategory: wantedForm.subcategory,
        era: wantedForm.era,
        budget_min: wantedForm.budget_min ? parseFloat(wantedForm.budget_min) : null,
        budget_max: wantedForm.budget_max ? parseFloat(wantedForm.budget_max) : null,
        condition: wantedForm.condition,
        zip_code: wantedForm.zip_code,
        distance: wantedForm.distance,
        shipping_ok: wantedForm.shipping_ok,
        public_visibility: wantedForm.public_visibility,
        status: 'active',
      };

      if (editingItem) {
        await base44.entities.WantedItem.update(editingItem.id, payload);
      } else {
        await base44.entities.WantedItem.create(payload);
      }

      resetForm();
      const wantedData = await base44.entities.WantedItem.filter({ buyer_id: user.id }, '-created_date', 50);
      setWantedItems(wantedData);
    } catch (e) {
      console.error('Error saving wanted item:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm('Remove this wanted item?')) return;
    try {
      await base44.entities.WantedItem.delete(item.id);
      setWantedItems(prev => prev.filter(i => i.id !== item.id));
    } catch (e) {
      console.error('Error deleting wanted item:', e);
    }
  };

  const handleToggleVisibility = async (item) => {
    try {
      await base44.entities.WantedItem.update(item.id, { public_visibility: !item.public_visibility });
      setWantedItems(prev => prev.map(i => i.id === item.id ? { ...i, public_visibility: !item.public_visibility } : i));
    } catch (e) {
      console.error('Error toggling visibility:', e);
    }
  };

  const handleAiGuidedHunt = async () => {
    if (purchases.length === 0) return;
    setLoadingAi(true);
    setAiSuggestions(null);
    try {
      const response = await base44.functions.invoke('suggestItemsFromPurchases', {
        purchases: purchases.map(p => ({ item_name: p.item_name })),
      });
      const suggestions = response.data.suggestions || [];
      setAiSuggestions(suggestions);
      setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
    } catch (e) {
      console.error('AI suggestion error:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAddAiSuggestions = async () => {
    if (selectedSuggestions.size === 0 || !aiSuggestions) return;
    setSaving(true);
    try {
      const toAdd = aiSuggestions.filter((_, i) => selectedSuggestions.has(i));
      for (const s of toAdd) {
        await base44.entities.WantedItem.create({
          buyer_id: user.id,
          buyer_name: user.full_name || user.email,
          title: s.title,
          category: s.category,
          subcategory: s.subcategory || '',
          era: s.era || '',
          status: 'active',
        });
      }
      setAiSuggestions(null);
      const wantedData = await base44.entities.WantedItem.filter({ buyer_id: user.id }, '-created_date', 50);
      setWantedItems(wantedData);
    } catch (e) {
      console.error('Error adding AI suggestions:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSuggestion = (index) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const formatCurrency = (val) => {
    if (!val) return '—';
    return `$${parseFloat(val).toLocaleString()}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loadingPurchases && loadingWanted) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── AI-Guided Hunt Builder ── */}
      <AgentGuidedHunt
        user={user}
        onItemsAdded={loadData}
      />

      {/* ── Wanted Items Section ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Items I'm Hunting For
            </CardTitle>
            <div className="flex items-center gap-2">
              {!showWantedForm && (
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => setShowWantedForm(true)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              )}
              {purchases.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={handleAiGuidedHunt}
                  disabled={loadingAi}
                >
                  {loadingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-1" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" /> Add from Past Purchases
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* ── Add/Edit Form ── */}
          {showWantedForm && (
            <div className="mb-6 p-5 bg-slate-50 rounded-xl border space-y-4">
              <h3 className="font-semibold text-slate-800">
                {editingItem ? 'Edit Wanted Item' : 'What Are You Looking For?'}
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={wantedForm.title}
                    onChange={e => setWantedForm(p => ({ ...p, title: e.target.value }))}
                    placeholder='e.g., "Mid-century Danish teak dining table"'
                  />
                </div>
                <div>
                  <Label>Brand / Maker</Label>
                  <Input
                    value={wantedForm.brand}
                    onChange={e => setWantedForm(p => ({ ...p, brand: e.target.value }))}
                    placeholder="e.g., Herman Miller, Rolex"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={wantedForm.category} onValueChange={v => setWantedForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── AI Category Suggestions ── */}
                <div className="md:col-span-2">
                  <CategorySuggestions
                    key={suggestionsKey}
                    category={wantedForm.category}
                    onSelectSubcategory={(sc) => setWantedForm(p => ({ ...p, subcategory: sc }))}
                    onSelectEra={(er) => setWantedForm(p => ({ ...p, era: er }))}
                  />
                </div>

                <div>
                  <Label>Subcategory</Label>
                  <Input
                    value={wantedForm.subcategory}
                    onChange={e => setWantedForm(p => ({ ...p, subcategory: e.target.value }))}
                    placeholder="e.g., Dining Tables, Brooches..."
                  />
                </div>
                <div>
                  <Label>Era / Period</Label>
                  <Input
                    value={wantedForm.era}
                    onChange={e => setWantedForm(p => ({ ...p, era: e.target.value }))}
                    placeholder="e.g., Victorian, Mid-Century..."
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Description / Details</Label>
                  <Textarea
                    value={wantedForm.description}
                    onChange={e => setWantedForm(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="Be specific — era, materials, dimensions, color, any identifying marks..."
                  />
                </div>
                <div>
                  <Label>Budget Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={wantedForm.budget_min}
                      onChange={e => setWantedForm(p => ({ ...p, budget_min: e.target.value }))}
                      placeholder="Min $"
                      className="flex-1"
                    />
                    <span className="text-slate-400 self-center">—</span>
                    <Input
                      type="number"
                      value={wantedForm.budget_max}
                      onChange={e => setWantedForm(p => ({ ...p, budget_max: e.target.value }))}
                      placeholder="Max $"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={wantedForm.condition} onValueChange={v => setWantedForm(p => ({ ...p, condition: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input
                    value={wantedForm.zip_code}
                    onChange={e => setWantedForm(p => ({ ...p, zip_code: e.target.value }))}
                    placeholder="Search radius center"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label>Search Distance (miles)</Label>
                  <Input
                    type="number"
                    value={wantedForm.distance}
                    onChange={e => setWantedForm(p => ({ ...p, distance: parseInt(e.target.value) || 50 }))}
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantedForm.shipping_ok}
                    onChange={e => setWantedForm(p => ({ ...p, shipping_ok: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Willing to pay shipping</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantedForm.public_visibility}
                    onChange={e => setWantedForm(p => ({ ...p, public_visibility: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Visible to estate sale companies</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={handleSaveWantedItem}
                  disabled={saving || !wantedForm.title.trim()}
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add to Hunt List'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Wanted Items List ── */}
          {wantedItems.length > 0 ? (
            <div className="space-y-3">
              {wantedItems.map(item => (
                <div key={item.id} className="flex items-start justify-between p-4 bg-white border rounded-lg hover:border-orange-200 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-800 text-sm">{item.title}</h4>
                      <Badge className={item.status === 'active' ? 'bg-green-100 text-green-700' : item.status === 'fulfilled' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                        {item.status}
                      </Badge>
                      {!item.public_visibility && (
                        <Badge variant="outline" className="text-slate-400 border-slate-300 gap-1">
                          <EyeOff className="w-3 h-3" /> Private
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      {item.brand && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{item.brand}</span>}
                      {item.category && <span>{item.category}</span>}
                      {item.subcategory && <span className="text-amber-600">{item.subcategory}</span>}
                      {item.era && <Badge variant="secondary" className="text-xs font-normal">{item.era}</Badge>}
                      {item.condition !== 'any' && <span className="capitalize">{item.condition?.replace(/_/g, ' ')}</span>}
                      {(item.budget_min || item.budget_max) && (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(item.budget_min)} – {formatCurrency(item.budget_max)}
                        </span>
                      )}
                      {item.zip_code && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{item.zip_code} ({item.distance || 50}mi)
                        </span>
                      )}
                      {item.shipping_ok && <Badge variant="secondary" className="text-xs">Shipping OK</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(item)} title={item.public_visibility ? 'Make private' : 'Make public'}>
                      {item.public_visibility ? <Eye className="w-4 h-4 text-slate-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                      <Edit3 className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showWantedForm && !aiSuggestions ? (
            <div className="text-center py-8">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm mb-1">No wanted items yet</p>
              <p className="text-xs text-slate-400 mb-3">Tell us what you're hunting for and we'll alert you when matches are found</p>
              <Button size="sm" variant="outline" onClick={() => setShowWantedForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Your First Item
              </Button>
            </div>
          ) : null}

          {/* ── AI Suggestions Panel ── */}
          {aiSuggestions && (
            <div className="mb-6 p-5 bg-purple-50 rounded-xl border border-purple-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  AI Suggestions Based on Your Purchases
                </h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAiSuggestions(null)}>
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={handleAddAiSuggestions}
                    disabled={saving || selectedSuggestions.size === 0}
                  >
                    {saving ? 'Adding...' : `Add Selected (${selectedSuggestions.size})`}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {aiSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSuggestions.has(i)
                        ? 'bg-white border-purple-300 shadow-sm'
                        : 'bg-purple-50/50 border-purple-100 opacity-60'
                    }`}
                    onClick={() => handleToggleSuggestion(i)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(i)}
                      onChange={() => handleToggleSuggestion(i)}
                      className="mt-0.5 rounded accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-800">{s.title}</p>
                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">{s.category}</Badge>
                        {s.subcategory && <Badge variant="secondary" className="text-[10px]">{s.subcategory}</Badge>}
                        {s.era && <Badge variant="outline" className="text-[10px]">{s.era}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{s.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Past Purchases ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Past Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-700">{purchases.length}</div>
                  <div className="text-xs text-slate-500">Purchases</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 rounded-lg">
                  <div className="text-xl font-bold text-cyan-700">
                    ${purchases.reduce((s, p) => s + (p.total || p.price || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">Total Spent</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-700">
                    {purchases.reduce((s, p) => s + (p.quantity || 1), 0)}
                  </div>
                  <div className="text-xs text-slate-500">Items</div>
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {purchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{p.item_name || 'Item'}</p>
                        <Badge className={p.source === 'Marketplace' ? 'bg-purple-100 text-purple-700 text-[10px]' : 'bg-cyan-100 text-cyan-700 text-[10px]'}>
                          {p.source === 'Marketplace' ? 'Marketplace' : 'Sale'}
                        </Badge>
                      </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(p.created_date)}
                          {p.payment_method && (
                            <span className="text-slate-300">• {p.payment_method.replace('_', ' ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 text-sm">{formatCurrency(p.total || p.price)}</p>
                      {p.quantity > 1 && (
                        <p className="text-xs text-slate-400">{p.quantity}x @ {formatCurrency(p.price)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No purchases recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Your estate sale and marketplace purchases will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}