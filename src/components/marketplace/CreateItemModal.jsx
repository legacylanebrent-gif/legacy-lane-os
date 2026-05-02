import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const CATEGORIES = [
  'furniture', 'art', 'jewelry', 'vehicles', 'antiques',
  'collectibles', 'clothing_accessories', 'home_decor', 'kitchen_dining',
  'tools_hardware', 'electronics', 'books_media', 'sporting_goods',
  'estate_items', 'other'
];

const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor'];

export default function CreateItemModal({ open, onClose, onSuccess, item, saleId }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'furniture',
    condition: 'good',
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
        condition: item.condition || 'good',
        price: item.price || '',
        quantity: item.quantity || 1,
        fulfillment_options: item.fulfillment_options || ['pickup'],
        shipping_cost: item.shipping_cost || 0
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'furniture',
        condition: 'good',
        price: '',
        quantity: 1,
        fulfillment_options: ['pickup'],
        shipping_cost: 0
      });
    }
  }, [item, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      if (item) {
        await base44.entities.Item.update(item.id, {
          ...formData,
          price: parseFloat(formData.price)
        });
      } else {
        await base44.entities.Item.create({
          ...formData,
          price: parseFloat(formData.price),
          seller_id: user.id,
          seller_name: user.full_name,
          estate_sale_id: saleId,
          status: 'available'
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
                    <SelectItem key={cond} value={cond} className="capitalize">
                      {cond}
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
            <Button type="submit" disabled={loading} className="bg-gold-600 hover:bg-gold-700">
              {loading ? 'Saving...' : (item ? 'Update Listing' : 'Create Listing')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}