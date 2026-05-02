import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X } from 'lucide-react';
import CategoryFields from './CategoryFields';

const CATEGORIES = [
  'antiques', 'art', 'artwork_prints_posters', 'books_media',
  'china_porcelain', 'clocks_watches', 'clothing_accessories', 'coins_currency',
  'collectibles', 'craft_sewing', 'electronics', 'furniture',
  'garden_outdoor', 'glassware_crystal', 'gold_silver_jewelry', 'holiday_seasonal',
  'home_decor', 'jewelry', 'kitchen_dining', 'lighting_lamps',
  'medical_mobility', 'musical_instruments', 'office_business', 'rugs_textiles',
  'sporting_goods', 'tools_hardware', 'toys_games', 'vehicles', 'other'
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used_like_new', label: 'Used - Like New' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
  { value: 'for_parts', label: 'For Parts or Not Working' },
];

export default function CreateItemModal({ open, onClose, onSuccess, item, saleId }) {
  const [loading, setLoading] = useState(false);
  const [categorySpecs, setCategorySpecs] = useState({});
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'furniture',
    condition: 'used_good',
    price: '',
    quantity: 1,
    fulfillment_options: ['pickup'],
    shipping_cost: 0
  });

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || 'furniture',
        condition: item.condition || 'used_good',
        price: item.price || '',
        quantity: item.quantity || 1,
        fulfillment_options: item.fulfillment_options || ['pickup'],
        shipping_cost: item.shipping_cost || 0
      });
      setImages(item.images || []);
      setCategorySpecs(item.category_specs || {});
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'furniture',
        condition: 'used_good',
        price: '',
        quantity: 1,
        fulfillment_options: ['pickup'],
        shipping_cost: 0
      });
      setImages([]);
      setCategorySpecs({});
    }
  }, [item, open]);

  const handleImageFiles = async (files) => {
    setUploadingImages(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setImages(prev => [...prev, ...uploaded]);
    setUploadingImages(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) handleImageFiles(files);
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      if (item) {
        await base44.entities.Item.update(item.id, {
          ...formData,
          price: parseFloat(formData.price),
          images,
          category_specs: categorySpecs
        });
      } else {
        await base44.entities.Item.create({
          ...formData,
          price: parseFloat(formData.price),
          seller_id: user.id,
          seller_name: user.full_name,
          estate_sale_id: saleId,
          status: 'available',
          images,
          category_specs: categorySpecs
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const toggleFulfillment = (option) => {
    const current = formData.fulfillment_options || [];
    if (current.includes(option)) {
      setFormData({
        ...formData,
        fulfillment_options: current.filter(o => o !== option)
      });
    } else {
      setFormData({
        ...formData,
        fulfillment_options: [...current, option]
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-navy-900">
            {item ? 'Edit Listing' : 'Create New Listing'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Item title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your item..."
              rows={4}
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label className="mb-2 block">Photos</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)}
              />
              {uploadingImages ? (
                <p className="text-sm text-slate-500">Uploading...</p>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Drag & drop or <span className="text-orange-600 font-medium">click to upload</span></p>
                  <p className="text-xs text-slate-400 mt-1">Multiple images supported</p>
                </>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">Main</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition">Condition *</Label>
              <Select value={formData.condition} onValueChange={(val) => setFormData({...formData, condition: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(cond => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                min="1"
              />
            </div>
          </div>

          {/* Category-specific fields */}
          <CategoryFields
            category={formData.category}
            specs={categorySpecs}
            onChange={setCategorySpecs}
          />

          <div>
            <Label className="mb-3 block">Fulfillment Options *</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="shipping"
                  checked={formData.fulfillment_options?.includes('shipping')}
                  onCheckedChange={() => toggleFulfillment('shipping')}
                />
                <Label htmlFor="shipping" className="cursor-pointer">Shipping Available</Label>
              </div>

              {formData.fulfillment_options?.includes('shipping') && (
                <div className="ml-6">
                  <Label htmlFor="shipping_cost">Shipping Cost</Label>
                  <Input
                    id="shipping_cost"
                    type="number"
                    step="0.01"
                    value={formData.shipping_cost}
                    onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="pickup"
                  checked={formData.fulfillment_options?.includes('pickup')}
                  onCheckedChange={() => toggleFulfillment('pickup')}
                />
                <Label htmlFor="pickup" className="cursor-pointer">Local Pickup</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="digital"
                  checked={formData.fulfillment_options?.includes('digital')}
                  onCheckedChange={() => toggleFulfillment('digital')}
                />
                <Label htmlFor="digital" className="cursor-pointer">Digital Download</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
              {loading ? 'Saving...' : (item ? 'Update Listing' : 'Create Listing')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}