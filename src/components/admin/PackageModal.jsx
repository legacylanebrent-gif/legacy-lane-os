import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function PackageModal({ open, onClose, package: pkg, onSuccess }) {
  const [formData, setFormData] = useState({
    account_type: '',
    package_name: '',
    tier_level: 'basic',
    pricing_model: 'subscription',
    monthly_price: '',
    annual_price: '',
    per_item_price: '',
    platform_fee_percentage: '',
    biz_in_a_box_setup_fee: '',
    biz_in_a_box_monthly_year1: '',
    biz_in_a_box_revenue_share: '',
    description: '',
    features: [],
    limits: {
      listings: '',
      photos: '',
      leads: '',
      campaigns: '',
      storage: ''
    },
    is_active: true,
    featured: false
  });
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pkg) {
      setFormData({
        account_type: pkg.account_type || '',
        package_name: pkg.package_name || '',
        tier_level: pkg.tier_level || 'basic',
        pricing_model: pkg.pricing_model || 'subscription',
        monthly_price: pkg.monthly_price || '',
        annual_price: pkg.annual_price || '',
        per_item_price: pkg.per_item_price || '',
        platform_fee_percentage: pkg.platform_fee_percentage || '',
        biz_in_a_box_setup_fee: pkg.biz_in_a_box_setup_fee || '',
        biz_in_a_box_monthly_year1: pkg.biz_in_a_box_monthly_year1 || '',
        biz_in_a_box_revenue_share: pkg.biz_in_a_box_revenue_share || '',
        description: pkg.description || '',
        features: pkg.features || [],
        limits: pkg.limits || {
          listings: '',
          photos: '',
          leads: '',
          campaigns: '',
          storage: ''
        },
        is_active: pkg.is_active !== false,
        featured: pkg.featured || false
      });
    }
  }, [pkg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        monthly_price: formData.monthly_price ? parseFloat(formData.monthly_price) : null,
        annual_price: formData.annual_price ? parseFloat(formData.annual_price) : null,
        per_item_price: formData.per_item_price ? parseFloat(formData.per_item_price) : null,
        platform_fee_percentage: formData.platform_fee_percentage ? parseFloat(formData.platform_fee_percentage) : null,
        biz_in_a_box_setup_fee: formData.biz_in_a_box_setup_fee ? parseFloat(formData.biz_in_a_box_setup_fee) : null,
        biz_in_a_box_monthly_year1: formData.biz_in_a_box_monthly_year1 ? parseFloat(formData.biz_in_a_box_monthly_year1) : null,
        biz_in_a_box_revenue_share: formData.biz_in_a_box_revenue_share ? parseFloat(formData.biz_in_a_box_revenue_share) : null
      };

      if (pkg?.id) {
        await base44.entities.SubscriptionPackage.update(pkg.id, data);
      } else {
        await base44.entities.SubscriptionPackage.create(data);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Failed to save package: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(formData.features);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFormData({
      ...formData,
      features: items
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pkg?.id ? 'Edit Package' : 'Create New Package'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="package_name">Package Name *</Label>
              <Input
                id="package_name"
                value={formData.package_name}
                onChange={(e) => setFormData({...formData, package_name: e.target.value})}
                placeholder="Growth, Professional, Enterprise"
                required
              />
            </div>

            <div>
              <Label htmlFor="tier_level">Tier Level *</Label>
              <Select
                value={formData.tier_level}
                onValueChange={(value) => setFormData({...formData, tier_level: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Perfect for getting started..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="pricing_model">Pricing Model *</Label>
            <Select
              value={formData.pricing_model}
              onValueChange={(value) => setFormData({...formData, pricing_model: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">Subscription (Monthly/Annual)</SelectItem>
                <SelectItem value="per_item">Per Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.pricing_model === 'subscription' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_price">Monthly Price ($)</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  step="0.01"
                  value={formData.monthly_price}
                  onChange={(e) => {
                    const monthlyPrice = parseFloat(e.target.value) || 0;
                    const calculatedAnnual = monthlyPrice > 0 ? (monthlyPrice * 12 * 0.9).toFixed(2) : '';
                    setFormData({
                      ...formData,
                      monthly_price: e.target.value,
                      annual_price: calculatedAnnual
                    });
                  }}
                />
              </div>

              <div>
                <Label htmlFor="annual_price">Annual Price ($) <span className="text-xs text-slate-500">10% off auto-calculated</span></Label>
                <Input
                  id="annual_price"
                  type="number"
                  step="0.01"
                  value={formData.annual_price}
                  onChange={(e) => setFormData({...formData, annual_price: e.target.value})}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="per_item_price">Price Per Item ($)</Label>
                <Input
                  id="per_item_price"
                  type="number"
                  step="0.01"
                  value={formData.per_item_price}
                  onChange={(e) => setFormData({...formData, per_item_price: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="platform_fee">Platform Fee (%)</Label>
                <Input
                  id="platform_fee"
                  type="number"
                  step="0.1"
                  value={formData.platform_fee_percentage}
                  onChange={(e) => setFormData({...formData, platform_fee_percentage: e.target.value})}
                  placeholder="e.g., 5"
                />
              </div>
            </div>
          )}

          {formData.account_type === 'biz_in_a_box' && (
           <div className="space-y-4 border-t pt-4">
             <Label className="text-base font-semibold">Biz in a Box Pricing</Label>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="setup_fee">One-Time Investment ($)</Label>
                 <Input
                   id="setup_fee"
                   type="number"
                   step="0.01"
                   value={formData.biz_in_a_box_setup_fee}
                   onChange={(e) => setFormData({...formData, biz_in_a_box_setup_fee: e.target.value})}
                   placeholder="2997"
                 />
               </div>

               <div>
                 <Label htmlFor="revenue_share">Royalty Fee (%)</Label>
                 <Input
                   id="revenue_share"
                   type="number"
                   step="0.1"
                   value={formData.biz_in_a_box_revenue_share}
                   onChange={(e) => setFormData({...formData, biz_in_a_box_revenue_share: e.target.value})}
                   placeholder="3"
                 />
               </div>
             </div>

             <div>
               <Label htmlFor="monthly_year1">Monthly Fee - Year 1 ($)</Label>
               <Input
                 id="monthly_year1"
                 type="number"
                 step="0.01"
                 value={formData.biz_in_a_box_monthly_year1}
                 onChange={(e) => setFormData({...formData, biz_in_a_box_monthly_year1: e.target.value})}
                 placeholder="149"
               />
             </div>
           </div>
          )}

          <div className="space-y-3 border-t pt-4">
           <Label>Package Limits</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Listings (e.g., 10/month)"
                value={formData.limits.listings}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: {...formData.limits, listings: e.target.value}
                })}
              />
              <Input
                placeholder="Photos (e.g., 20/listing)"
                value={formData.limits.photos}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: {...formData.limits, photos: e.target.value}
                })}
              />
              <Input
                placeholder="Leads (e.g., 50/month)"
                value={formData.limits.leads}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: {...formData.limits, leads: e.target.value}
                })}
              />
              <Input
                placeholder="Campaigns (e.g., 5 active)"
                value={formData.limits.campaigns}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: {...formData.limits, campaigns: e.target.value}
                })}
              />
              <Input
                placeholder="Storage (e.g., 10GB)"
                value={formData.limits.storage}
                onChange={(e) => setFormData({
                  ...formData,
                  limits: {...formData.limits, storage: e.target.value}
                })}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label>Features</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add feature..."
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="features">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {formData.features.map((feature, idx) => (
                      <Draggable key={`feature-${idx}`} draggableId={`feature-${idx}`} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-2 bg-slate-50 p-2 rounded ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-500' : ''
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4 text-slate-400" />
                            </div>
                            <span className="flex-1 text-sm">{feature}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFeature(idx)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="flex gap-6 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
              />
              <Label htmlFor="featured" className="cursor-pointer">Featured/Recommended</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? 'Saving...' : pkg?.id ? 'Update Package' : 'Create Package'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}