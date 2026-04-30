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
  'vehicles',
  'estate_items',
  'other',
];

const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor'];

const CATEGORY_SPECS = {
  furniture: [
    { key: 'furniture_material', label: 'Material', placeholder: 'Wood type, leather, fabric, metal...' },
    { key: 'furniture_style', label: 'Style/Era', placeholder: 'Victorian, Mid-Century Modern, Farmhouse...' },
    { key: 'furniture_color', label: 'Color/Pattern', placeholder: 'Color or pattern description' },
    { key: 'furniture_upholstery_condition', label: 'Upholstery Condition (if applicable)', placeholder: 'Excellent, good, worn, etc.' },
  ],
  art: [
    { key: 'art_artist_name', label: 'Artist Name', placeholder: 'Artist or unknown' },
    { key: 'art_medium', label: 'Medium', placeholder: 'Oil painting, watercolor, sculpture, print...' },
    { key: 'art_estimated_era', label: 'Estimated Era', placeholder: 'Approximate period' },
    { key: 'art_is_signed', label: 'Is Signed?', type: 'checkbox' },
    { key: 'art_is_framed', label: 'Is Framed?', type: 'checkbox' },
    { key: 'art_provenance', label: 'Provenance/Story', placeholder: 'Where it came from, history...' },
  ],
  jewelry: [
    { key: 'jewelry_material', label: 'Material', placeholder: '14K gold, sterling silver, platinum, costume...' },
    { key: 'jewelry_gemstone', label: 'Primary Gemstone', placeholder: 'Diamond, emerald, ruby, sapphire...' },
    { key: 'jewelry_gemstone_weight', label: 'Gemstone Weight', placeholder: 'Carat weight or description' },
    { key: 'jewelry_metal_weight', label: 'Metal Weight', placeholder: 'If known, in grams' },
    { key: 'jewelry_authenticity', label: 'Authenticity', placeholder: 'Hallmarked, certified, etc.' },
  ],
  vehicles: [
    { key: 'vehicle_make_model', label: 'Make/Model', placeholder: 'E.g., Ford F-150' },
    { key: 'vehicle_year', label: 'Year', placeholder: 'YYYY' },
    { key: 'vehicle_mileage', label: 'Mileage', placeholder: 'Approx. miles' },
    { key: 'vehicle_color', label: 'Color', placeholder: 'Exterior color' },
    { key: 'vehicle_fuel_type', label: 'Fuel Type', placeholder: 'Gas, diesel, electric, hybrid' },
    { key: 'vehicle_condition', label: 'Condition', placeholder: 'Runs great, needs work, non-running' },
    { key: 'vehicle_vin', label: 'VIN (Optional)', placeholder: 'For verification' },
  ],
  home_decor: [
    { key: 'decor_style_theme', label: 'Style/Theme', placeholder: 'Coastal, bohemian, modern, farmhouse...' },
    { key: 'decor_material', label: 'Material', placeholder: 'Wood, metal, ceramic, glass...' },
    { key: 'decor_color', label: 'Color', placeholder: 'Primary color(s)' },
    { key: 'decor_purpose', label: 'Purpose', placeholder: 'Wall art, centerpiece, outdoor, etc.' },
  ],
  antiques: [
    { key: 'antique_era', label: 'Estimated Era', placeholder: 'Victorian, Edwardian, 1920s, etc.' },
    { key: 'antique_maker', label: 'Maker/Manufacturer', placeholder: 'Known maker or unknown' },
    { key: 'antique_rarity', label: 'Rarity Level', placeholder: 'Common, rare, very rare' },
    { key: 'antique_authenticity_notes', label: 'Authenticity Notes', placeholder: 'Original parts, restored, etc.' },
    { key: 'antique_provenance', label: 'Provenance', placeholder: 'Documented history or story' },
  ],
  collectibles: [
    { key: 'collectible_model_edition', label: 'Model/Edition', placeholder: 'Limited edition number, variant, etc.' },
    { key: 'collectible_condition_grade', label: 'Condition Grade', placeholder: 'Mint, near-mint, good, fair' },
    { key: 'collectible_rarity', label: 'Rarity', placeholder: 'Common, rare, very rare' },
    { key: 'collectible_authentication', label: 'Authentication', placeholder: 'Original packaging, certificate, etc.' },
  ],
  estate_items: [
    { key: 'estate_origin_story', label: 'Origin Story', placeholder: 'Family heirloom, purchased where, etc.' },
    { key: 'estate_era', label: 'Estimated Era', placeholder: 'When it was likely made/acquired' },
    { key: 'estate_significance', label: 'Special Significance', placeholder: 'Why it matters or unique details' },
  ],
};

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
    brand: '',
    size: '',
    shipping_weight: '',
    images: [],
    sales_channels: [],
    inventory_display_status: 'active',
    marketplace_display_status: 'draft',
    specs: {},
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
        brand: item.brand || '',
        size: item.size || '',
        shipping_weight: item.shipping_weight || '',
        images: item.images || [],
        sales_channels: item.sales_channels || [],
        inventory_display_status: item.inventory_display_status || 'active',
        marketplace_display_status: item.marketplace_display_status || 'draft',
        specs: item.specs || {},
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

          {/* Brand, Size, Shipping Weight */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Brand (Optional)</label>
              <Input
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Brand/manufacturer"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Size (Optional)</label>
              <Input
                value={formData.size}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
                placeholder="S/M/L, dimensions, etc."
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Shipping Weight (lbs)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.shipping_weight}
                onChange={e => setFormData({ ...formData, shipping_weight: e.target.value })}
                placeholder="Approx. weight"
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

          {/* Category-specific specs */}
          {CATEGORY_SPECS[formData.category] && (
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="font-semibold text-sm text-slate-900">Additional Details for {formData.category}</p>
              <div className="space-y-3">
                {CATEGORY_SPECS[formData.category].map(spec => (
                  <div key={spec.key}>
                    <label className="block text-sm text-slate-700 font-medium mb-1">
                      {spec.label}
                    </label>
                    {spec.type === 'checkbox' ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.specs[spec.key] || false}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              specs: { ...formData.specs, [spec.key]: e.target.checked },
                            })
                          }
                        />
                        <span className="text-sm">{spec.label}</span>
                      </label>
                    ) : (
                      <Input
                        value={formData.specs[spec.key] || ''}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            specs: { ...formData.specs, [spec.key]: e.target.value },
                          })
                        }
                        placeholder={spec.placeholder}
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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