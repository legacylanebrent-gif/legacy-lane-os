import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Receipt, Gift } from 'lucide-react';

export default function RecordPurchaseModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    item_name: '',
    purchase_amount: 0,
    sale_location: '',
    category: 'furniture',
    notes: '',
    points_earned: 0
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await base44.auth.me();
      
      // Calculate points (1 point per $10 spent)
      const pointsEarned = Math.floor(formData.purchase_amount / 10);
      
      // Create purchase record as income (negative to track spending)
      await base44.entities.Income.create({
        income_date: new Date().toISOString().split('T')[0],
        source: formData.sale_location || 'Estate Sale Purchase',
        amount: -Math.abs(formData.purchase_amount),
        category: 'marketplace_sale',
        description: `Purchase: ${formData.item_name}${formData.notes ? ` - ${formData.notes}` : ''}`,
        is_automated: true
      });
      
      // Award points for purchase
      if (pointsEarned > 0) {
        await base44.entities.UserReward.create({
          user_id: user.id,
          action_id: 'purchase_reward',
          action_name: 'Purchase Reward',
          points_earned: pointsEarned,
          description: `Earned ${pointsEarned} points for $${formData.purchase_amount} purchase`
        });
      }
      
      alert(`Purchase recorded! You earned ${pointsEarned} points!`);
      onSuccess?.();
      onClose();
      
      setFormData({
        item_name: '',
        purchase_amount: 0,
        sale_location: '',
        category: 'furniture',
        notes: '',
        points_earned: 0
      });
    } catch (error) {
      console.error('Error recording purchase:', error);
      alert('Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  const estimatedPoints = Math.floor(formData.purchase_amount / 10);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-600" />
            Record Your Purchase
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Item Name *</Label>
            <Input
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="Vintage lamp, antique chair, etc."
              required
            />
          </div>

          <div>
            <Label>Purchase Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_amount}
                onChange={(e) => setFormData({ ...formData, purchase_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="pl-9"
                required
              />
            </div>
            {estimatedPoints > 0 && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <Gift className="w-3 h-3" />
                You'll earn {estimatedPoints} points! (1 point per $10 spent)
              </p>
            )}
          </div>

          <div>
            <Label>Sale Location</Label>
            <Input
              value={formData.sale_location}
              onChange={(e) => setFormData({ ...formData, sale_location: e.target.value })}
              placeholder="Smith Estate Sale, Downtown Antiques, etc."
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="art">Art & Decor</SelectItem>
                <SelectItem value="jewelry">Jewelry</SelectItem>
                <SelectItem value="collectibles">Collectibles</SelectItem>
                <SelectItem value="antiques">Antiques</SelectItem>
                <SelectItem value="clothing">Clothing & Accessories</SelectItem>
                <SelectItem value="books">Books & Media</SelectItem>
                <SelectItem value="tools">Tools & Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional details about your purchase..."
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4 text-orange-600" />
              Rewards Summary
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Purchase Amount:</span>
                <span className="font-semibold">${formData.purchase_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Points Earned:</span>
                <span className="font-semibold text-orange-600">{estimatedPoints} pts</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? 'Recording...' : 'Record Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}