import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, Calendar, DollarSign } from 'lucide-react';

export default function RecordPurchase() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    purchase_amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    sale_location: '',
    notes: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name || !formData.purchase_amount) {
      alert('Please fill in item name and amount');
      return;
    }

    setLoading(true);
    try {
      // Record the purchase
      await base44.entities.Transaction.create({
        user_id: user.id,
        transaction_type: 'purchase',
        amount: parseFloat(formData.purchase_amount),
        item_name: formData.item_name,
        transaction_date: formData.purchase_date,
        location: formData.sale_location,
        notes: formData.notes
      });

      // Award points for purchase
      await base44.entities.UserReward.create({
        user_id: user.id,
        action_id: 'purchase',
        action_name: 'Purchase at Estate Sale',
        points_earned: 10,
        reference_id: formData.sale_location,
        notes: `Purchase: ${formData.item_name}`
      });

      alert('Purchase recorded successfully! +10 points earned');
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error recording purchase:', error);
      alert('Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Record Purchase</CardTitle>
                <p className="text-sm text-slate-600">Track your estate sale finds and earn points</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="e.g., Vintage Chair, Antique Lamp"
                  required
                />
              </div>

              <div>
                <Label htmlFor="purchase_amount">Purchase Amount * ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="purchase_amount"
                    type="number"
                    step="0.01"
                    value={formData.purchase_amount}
                    onChange={(e) => setFormData({ ...formData, purchase_amount: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sale_location">Sale Location</Label>
                <Input
                  id="sale_location"
                  value={formData.sale_location}
                  onChange={(e) => setFormData({ ...formData, sale_location: e.target.value })}
                  placeholder="e.g., Estate Sale on Main St"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional details about your purchase..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Dashboard'))}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? 'Recording...' : 'Record Purchase (+10 points)'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}