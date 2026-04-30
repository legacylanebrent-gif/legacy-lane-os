import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'furniture',
  'art',
  'jewelry',
  'home_decor',
  'antiques',
  'collectibles',
  'estate_items',
  'other',
];

const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor'];

export default function UnifiedItemForm({
  item = null,
  saleId = null,
  onClose,
  onSaved,
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'estate_items',
    condition: 'good',
    price: '',
    quantity: 1,
    sku: '',
    images: [],
    sales_channels: [],
    inventory_display_status: 'active',
    marketplace_display_status: 'draft',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || 'estate_items',
        condition: item.condition || 'good',
        price: item.price || '',
        quantity: item.quantity || 1,
        sku: item.sku || '',
        images: item.images || [],
        sales_channels: item.sales_channels || [],
        inventory_display_status: item.inventory_display_status || 'active',
        marketplace_display_status: item.marketplace_display_status || 'draft',
      });
    }
  }, [item]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Valid price is required';
    if (formData.sales_channels.length === 0) newErrors.sales_channels = 'Select at least one sales channel';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        estate_sale_id: saleId,
      };

      if (item?.id) {
        await base44.entities.Item.update(item.id, payload);
        toast.success('Item updated successfully');
      } else {
        const user = await base44.auth.me();
        payload.seller_id = user.id;
        payload.seller_name = user.full_name;
        await base44.entities.Item.create(payload);
        toast.success('Item created successfully');
      }

      if (onSaved) onSaved();
    } catch (err) {
      toast.error('Error saving item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = channel => {
    setFormData(prev => ({
      ...prev,
      sales_channels: prev.sales_channels.includes(channel)
        ? prev.sales_channels.filter(c => c !== channel)
        : [...prev.sales_channels, channel],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-white border-b flex flex-row items-center justify-between">
          <CardTitle>{item ? 'Edit Item' : 'Create New Item'}</CardTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Sales Channels Selection */}
          <div className="space-y-3">
            <label className="font-semibold text-slate-900">Where do you want to sell this?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => toggleChannel('inventory')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.sales_channels.includes('inventory')
                    ? 'border-gold-600 bg-gold-50'
                    : 'border-slate-200 hover:border-gold-300'
                }`}
              >
                <div className="font-semibold text-sm">📦 Sale Inventory</div>
                <p className="text-xs text-slate-600 mt-1">Local sale with physical items</p>
              </button>

              <button
                onClick={() => toggleChannel('marketplace')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.sales_channels.includes('marketplace')
                    ? 'border-sage-600 bg-sage-50'
                    : 'border-slate-200 hover:border-sage-300'
                }`}
              >
                <div className="font-semibold text-sm">🌐 Marketplace</div>
                <p className="text-xs text-slate-600 mt-1">National auction or fixed price</p>
              </button>
            </div>
            {errors.sales_channels && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.sales_channels}
              </p>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            <label className="block font-semibold text-slate-900">Title *</label>
            <Input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Item name or description"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
          </div>

          <div className="space-y-3">
            <label className="block font-semibold text-slate-900">Description</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Item condition, features, history..."
              className="min-h-24"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Condition</label>
              <select
                value={formData.condition}
                onChange={e => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {CONDITIONS.map(cond => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">$</span>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="pl-6"
                />
              </div>
              {errors.price && <p className="text-xs text-red-600">{errors.price}</p>}
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Quantity</label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-900 text-sm">SKU (Optional)</label>
            <Input
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., VIN-001"
            />
          </div>

          {/* Channel-specific settings */}
          {formData.sales_channels.includes('inventory') && (
            <div className="space-y-3 bg-gold-50 border border-gold-200 rounded-lg p-4">
              <label className="font-semibold text-sm text-slate-900">Inventory Display</label>
              <select
                value={formData.inventory_display_status}
                onChange={e =>
                  setFormData({ ...formData, inventory_display_status: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="active">Show in Sale (Active)</option>
                <option value="inactive">Hide from Sale (Inactive)</option>
              </select>
            </div>
          )}

          {formData.sales_channels.includes('marketplace') && (
            <div className="space-y-3 bg-sage-50 border border-sage-200 rounded-lg p-4">
              <label className="font-semibold text-sm text-slate-900">Marketplace Display</label>
              <select
                value={formData.marketplace_display_status}
                onChange={e =>
                  setFormData({ ...formData, marketplace_display_status: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="draft">Draft (Not Published)</option>
                <option value="active">Live on Marketplace</option>
              </select>
            </div>
          )}

          {/* Sales channels display */}
          <div className="pt-4 border-t">
            <p className="text-sm text-slate-600 mb-2">Item will be tracked in:</p>
            <div className="flex gap-2 flex-wrap">
              {formData.sales_channels.includes('inventory') && (
                <Badge className="bg-gold-600">📦 Sale Inventory</Badge>
              )}
              {formData.sales_channels.includes('marketplace') && (
                <Badge className="bg-sage-600">🌐 Marketplace</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gold-600 hover:bg-gold-700 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}